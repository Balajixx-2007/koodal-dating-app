import { supabase } from './supabase';
import type { Database } from '../types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProfilePhotoItem {
  id: string;
  owner: string;
  storage_path: string;
  position: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg';
}

export class StorageService {
  private static ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private static MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

  /**
   * Calculates proportional dimensions keeping maximum dimension <= maxDimension
   */
  static calculateDimensions(
    width: number,
    height: number,
    maxDimension: number = 1200
  ): { width: number; height: number } {
    if (width <= maxDimension && height <= maxDimension) {
      return { width, height };
    }

    if (width > height) {
      const scaledWidth = maxDimension;
      const scaledHeight = Math.round((height * maxDimension) / width);
      return { width: scaledWidth, height: scaledHeight };
    } else {
      const scaledHeight = maxDimension;
      const scaledWidth = Math.round((width * maxDimension) / height);
      return { width: scaledWidth, height: scaledHeight };
    }
  }

  /**
   * Validates and compresses an image file using browser HTML5 canvas.
   * Rejects non-image files or files exceeding 5MB.
   */
  static async compressImage(
    file: File | Blob,
    options?: CompressOptions
  ): Promise<Blob> {
    if (!file) {
      throw new Error('No image file provided');
    }

    const mimeType = file.type;
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error('Allowed image formats are JPEG, PNG, or WebP');
    }

    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      throw new Error('Image exceeds 5MB size limit');
    }

    const maxDimension = options?.maxDimension || 1200;
    const quality = options?.quality ?? 0.8;
    const format = options?.format || 'image/webp';

    // If running in browser with DOM canvas support
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof Image !== 'undefined') {
      return new Promise<Blob>((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const { width, height } = this.calculateDimensions(img.naturalWidth, img.naturalHeight, maxDimension);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(new Blob([file], { type: format }));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(new Blob([file], { type: format }));
              }
            },
            format,
            quality
          );
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to read and process image file'));
        };

        img.src = objectUrl;
      });
    }

    // Fallback for non-browser/test environments
    return new Blob([file], { type: format });
  }

  /**
   * Uploads a compressed profile photo under the user's isolated folder in the private 'photos' bucket.
   * Creates a row in public.profile_photos with status = 'pending'.
   */
  static async uploadProfilePhoto(
    userId: string,
    file: File | Blob,
    position: number = 0,
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    photo?: ProfilePhotoItem;
    error?: string;
  }> {
    if (!userId || !userId.trim()) {
      return { success: false, error: 'User ID is required' };
    }

    try {
      const compressedBlob = await this.compressImage(file);
      const filename = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;
      const storagePath = `${userId.trim()}/${filename}`;

      const { error: uploadError } = await client.storage
        .from('photos')
        .upload(storagePath, compressedBlob, {
          contentType: 'image/webp',
          upsert: false
        });

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      const { data, error: dbError } = await client
        .from('profile_photos')
        .insert({
          owner: userId.trim(),
          storage_path: storagePath,
          position,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        return { success: false, error: dbError.message };
      }

      return {
        success: true,
        photo: data as ProfilePhotoItem
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to upload profile photo' };
    }
  }

  /**
   * Uploads a compressed verification selfie under the user's isolated folder in the private 'selfies' bucket.
   * Creates a row in public.verifications with result = 'pending'.
   */
  static async uploadVerificationSelfie(
    userId: string,
    file: File | Blob,
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    verification?: any;
    error?: string;
  }> {
    if (!userId || !userId.trim()) {
      return { success: false, error: 'User ID is required' };
    }

    try {
      const compressedBlob = await this.compressImage(file);
      const filename = `selfie-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;
      const storagePath = `${userId.trim()}/${filename}`;

      const { error: uploadError } = await client.storage
        .from('selfies')
        .upload(storagePath, compressedBlob, {
          contentType: 'image/webp',
          upsert: false
        });

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      const { data, error: dbError } = await client
        .from('verifications')
        .insert({
          user_id: userId.trim(),
          selfie_path: storagePath,
          result: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        return { success: false, error: dbError.message };
      }

      return {
        success: true,
        verification: data
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to upload verification selfie' };
    }
  }

  /**
   * Generates a signed URL with expiration for reading private photos or selfies.
   */
  static async getSignedUrl(
    bucket: 'photos' | 'selfies',
    storagePath: string,
    expiresIn: number = 3600,
    client: SupabaseClient<Database> = supabase
  ): Promise<string | null> {
    if (!storagePath || !storagePath.trim()) return null;

    try {
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(storagePath.trim(), expiresIn);

      if (error || !data?.signedUrl) {
        return null;
      }

      return data.signedUrl;
    } catch {
      return null;
    }
  }

  /**
   * Deletes a profile photo from both database and storage bucket.
   */
  static async deleteProfilePhoto(
    photoId: string,
    storagePath: string,
    client: SupabaseClient<Database> = supabase
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error: dbError } = await client
        .from('profile_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) {
        return { success: false, error: dbError.message };
      }

      if (storagePath) {
        await client.storage.from('photos').remove([storagePath]);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete photo' };
    }
  }

  /**
   * Deletes a selfie object from the private selfies bucket.
   */
  static async deleteSelfie(
    storagePath: string,
    client: SupabaseClient<Database> = supabase
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!storagePath) return { success: true };
      const { error } = await client.storage.from('selfies').remove([storagePath]);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete selfie' };
    }
  }
}
