import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '../lib/storage-service';
import { ModerationService } from '../lib/moderation-service';

describe('Step 4: Photos and Selfies (Storage, Compression, and Privacy)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Browser-Side Image Resizing & Compression', () => {
    it('validates file MIME type and rejects non-image files', async () => {
      const textFile = new File(['fake content'], 'test.txt', { type: 'text/plain' });
      await expect(StorageService.compressImage(textFile)).rejects.toThrow(/allowed image format/i);

      const pdfFile = new File(['fake content'], 'doc.pdf', { type: 'application/pdf' });
      await expect(StorageService.compressImage(pdfFile)).rejects.toThrow(/allowed image format/i);
    });

    it('rejects image files exceeding the 5MB upload limit before compression', async () => {
      // 5MB + 1 byte
      const largeData = new Uint8Array(5 * 1024 * 1024 + 1);
      const largeFile = new File([largeData], 'large.jpg', { type: 'image/jpeg' });
      await expect(StorageService.compressImage(largeFile)).rejects.toThrow(/5MB/i);
    });

    it('calculates proportional resized dimensions keeping max dimension <= 1200px', () => {
      // 2400 x 1600 (Landscape) -> 1200 x 800
      const dims1 = StorageService.calculateDimensions(2400, 1600, 1200);
      expect(dims1.width).toBe(1200);
      expect(dims1.height).toBe(800);

      // 1000 x 3000 (Portrait) -> 400 x 1200
      const dims2 = StorageService.calculateDimensions(1000, 3000, 1200);
      expect(dims2.width).toBe(400);
      expect(dims2.height).toBe(1200);

      // 800 x 600 (Smaller than max) -> stays 800 x 600
      const dims3 = StorageService.calculateDimensions(800, 600, 1200);
      expect(dims3.width).toBe(800);
      expect(dims3.height).toBe(600);
    });
  });

  describe('2. Member Profile Photo Upload & RLS Folder Isolation', () => {
    it('uploads compressed photo under member own folder and creates pending profile_photos row', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'user-uuid-1/photo-123.webp' },
        error: null
      });

      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: mockUpload
      });

      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'photo-row-1',
          owner: 'user-uuid-1',
          storage_path: 'user-uuid-1/photo-123.webp',
          position: 0,
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          created_at: '2026-10-24T12:00:00Z'
        },
        error: null
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: () => ({ single: mockInsertSingle })
      });

      const mockClient = {
        storage: { from: mockStorageFrom },
        from: vi.fn().mockReturnValue({ insert: mockInsert })
      } as any;

      const dummyFile = new File(['fake-image-bytes'], 'me.jpg', { type: 'image/jpeg' });
      // Stub compressImage to return a mock Blob
      vi.spyOn(StorageService, 'compressImage').mockResolvedValue(new Blob(['compressed-webp'], { type: 'image/webp' }));

      const res = await StorageService.uploadProfilePhoto('user-uuid-1', dummyFile, 0, mockClient);

      expect(res.success).toBe(true);
      expect(mockStorageFrom).toHaveBeenCalledWith('photos');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-uuid-1\/[a-zA-Z0-9_\-.]+\.webp$/),
        expect.any(Blob),
        expect.objectContaining({ contentType: 'image/webp' })
      );

      expect(mockClient.from).toHaveBeenCalledWith('profile_photos');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'user-uuid-1',
          position: 0,
          status: 'pending'
        })
      );
    });

    it('rejects photo upload if userId is missing or invalid', async () => {
      const dummyFile = new File(['img'], 'me.jpg', { type: 'image/jpeg' });
      const res = await StorageService.uploadProfilePhoto('', dummyFile, 0);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/user id is required/i);
    });
  });

  describe('3. Verification Selfie Upload', () => {
    it('uploads compressed selfie under selfies bucket and inserts pending verifications row', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'user-uuid-1/selfie-123.webp' },
        error: null
      });

      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: mockUpload
      });

      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'verif-row-1',
          user_id: 'user-uuid-1',
          selfie_path: 'user-uuid-1/selfie-123.webp',
          result: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          created_at: '2026-10-24T12:00:00Z'
        },
        error: null
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: () => ({ single: mockInsertSingle })
      });

      const mockClient = {
        storage: { from: mockStorageFrom },
        from: vi.fn().mockReturnValue({ insert: mockInsert })
      } as any;

      const dummyFile = new File(['selfie-raw'], 'selfie.png', { type: 'image/png' });
      vi.spyOn(StorageService, 'compressImage').mockResolvedValue(new Blob(['compressed-selfie'], { type: 'image/webp' }));

      const res = await StorageService.uploadVerificationSelfie('user-uuid-1', dummyFile, mockClient);

      expect(res.success).toBe(true);
      expect(mockStorageFrom).toHaveBeenCalledWith('selfies');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-uuid-1\/[a-zA-Z0-9_\-.]+\.webp$/),
        expect.any(Blob),
        expect.objectContaining({ contentType: 'image/webp' })
      );

      expect(mockClient.from).toHaveBeenCalledWith('verifications');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-uuid-1',
          result: 'pending'
        })
      );
    });
  });

  describe('4. Privacy Compliance: Post-Review Selfie Deletion', () => {
    it('purges the selfie image file from selfies storage bucket once reviewed by admin', async () => {
      // Mock verification record lookup returning selfie_path
      const mockSelectSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'verif-100',
          user_id: 'target-user-1',
          selfie_path: 'target-user-1/selfie-proof.webp',
          result: 'pending'
        },
        error: null
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      const mockRemove = vi.fn().mockResolvedValue({
        data: [{ name: 'target-user-1/selfie-proof.webp' }],
        error: null
      });

      const mockStorageFrom = vi.fn().mockReturnValue({
        remove: mockRemove
      });

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'verifications') {
            return {
              select: () => ({ eq: () => ({ single: mockSelectSingle }) }),
              update: mockUpdate
            };
          }
          if (table === 'audit_log') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null })
            };
          }
          return {};
        }),
        storage: { from: mockStorageFrom }
      } as any;

      const res = await ModerationService.reviewSelfie('verif-100', true, 'admin-uuid-1', mockClient);

      expect(res.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'approved',
          reviewed_by: 'admin-uuid-1'
        })
      );

      // Verify privacy requirement: selfie file in storage is permanently purged
      expect(mockStorageFrom).toHaveBeenCalledWith('selfies');
      expect(mockRemove).toHaveBeenCalledWith(['target-user-1/selfie-proof.webp']);
    });
  });

  describe('5. Signed URL Access for Private Buckets', () => {
    it('generates a signed URL with configurable expiration for private photo access', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/photos/user-1/photo.webp?token=xyz123' },
        error: null
      });

      const mockStorageFrom = vi.fn().mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      });

      const mockClient = {
        storage: { from: mockStorageFrom }
      } as any;

      const signedUrl = await StorageService.getSignedUrl('photos', 'user-1/photo.webp', 3600, mockClient);

      expect(mockStorageFrom).toHaveBeenCalledWith('photos');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('user-1/photo.webp', 3600);
      expect(signedUrl).toBe('https://supabase.co/storage/v1/object/sign/photos/user-1/photo.webp?token=xyz123');
    });

    it('returns null if createSignedUrl encounters an error or file does not exist', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Object not found' }
      });

      const mockStorageFrom = vi.fn().mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      });

      const mockClient = {
        storage: { from: mockStorageFrom }
      } as any;

      const signedUrl = await StorageService.getSignedUrl('photos', 'nonexistent.webp', 3600, mockClient);
      expect(signedUrl).toBeNull();
    });
  });
});
