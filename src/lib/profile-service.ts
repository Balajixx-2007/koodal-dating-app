import { supabase } from './supabase';
import type { Database, RelationshipIntent } from '../types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '../types';

export class ProfileService {
  /**
   * Fetches the member's profile, approved photos, and verification status from Supabase.
   */
  static async fetchMyProfile(
    userId: string,
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    profile?: any;
    photos?: string[];
    verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
    offline?: boolean;
    error?: string;
  }> {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { success: false, offline: true, error: 'You are offline. Cannot load profile.' };
    }

    try {
      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }

      // Fetch photos
      const { data: photos } = await client
        .from('profile_photos')
        .select('storage_path')
        .eq('owner', userId)
        .order('position', { ascending: true });

      // Fetch verification status
      const { data: verifications } = await client
        .from('verifications')
        .select('result')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      const latestVerification = verifications?.[0]?.result;
      const verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected' =
        latestVerification === 'approved'
          ? 'verified'
          : latestVerification === 'rejected'
          ? 'rejected'
          : latestVerification === 'pending'
          ? 'pending'
          : 'unverified';

      return {
        success: true,
        profile,
        photos: (photos || []).map(p => p.storage_path),
        verificationStatus
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch profile' };
    }
  }

  /**
   * Updates allowed profile attributes in the public.profiles table.
   */
  static async updateProfile(
    userId: string,
    updates: Partial<Profile> & { name?: string; is_paused?: boolean },
    client: SupabaseClient<Database> = supabase
  ): Promise<{ success: boolean; offline?: boolean; error?: string }> {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    if (updates.name !== undefined && !updates.name.trim()) {
      return { success: false, error: 'Name cannot be empty' };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { success: false, offline: true, error: 'You are offline. Cannot save changes.' };
    }

    const payload: Database['public']['Tables']['profiles']['Update'] = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.bioTa !== undefined) payload.bio_ta = updates.bioTa;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.intent !== undefined) payload.intent = updates.intent;
    if (updates.interests !== undefined) payload.interests = updates.interests;
    if (updates.prompts !== undefined) payload.prompts = updates.prompts as any;
    if (updates.isPaused !== undefined) payload.is_paused = updates.isPaused;
    if (updates.is_paused !== undefined) payload.is_paused = updates.is_paused;

    try {
      const { error } = await client
        .from('profiles')
        .update(payload)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  }

  /**
   * Toggles profile pause visibility in the database.
   */
  static async togglePauseProfile(
    userId: string,
    isPaused: boolean,
    client: SupabaseClient<Database> = supabase
  ): Promise<{ success: boolean; offline?: boolean; error?: string }> {
    return this.updateProfile(userId, { is_paused: isPaused }, client);
  }

  /**
   * Signs the active member out cleanly.
   */
  static async deleteAccount(
    client: SupabaseClient<Database> = supabase
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await client.auth.signOut();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to sign out' };
    }
  }
}
