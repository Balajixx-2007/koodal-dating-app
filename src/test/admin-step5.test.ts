import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { ModerationService } from '../lib/moderation-service';
import { resolveUserRole } from '../lib/auth-service';
import { verifyAdmin2FA } from '../lib/admin-auth-service';

describe('Step 5: Admin Panel, Moderation, Audit Logging & 2FA', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Server-Side is_admin() Role Resolution', () => {
    it('resolves admin role via server is_admin RPC and rejects regular members', async () => {
      const mockAdminClient = {
        rpc: vi.fn().mockResolvedValue({ data: true, error: null })
      } as unknown as SupabaseClient<Database>;

      const role = await resolveUserRole('admin-uuid-1', mockAdminClient);
      expect(role).toBe('admin');
      expect(mockAdminClient.rpc).toHaveBeenCalledWith('is_admin', { user_uuid: 'admin-uuid-1' });

      const mockMemberClient = {
        rpc: vi.fn().mockResolvedValue({ data: false, error: null })
      } as unknown as SupabaseClient<Database>;

      const memberRole = await resolveUserRole('member-uuid-2', mockMemberClient);
      expect(memberRole).toBe('member');
    });
  });

  describe('2. Photo Moderation with Immutable Audit Log', () => {
    it('approves a photo, updates profile_photos, and writes target_type photo to audit_log', async () => {
      const mockPhotoUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profile_photos') return { update: mockPhotoUpdate };
          if (table === 'audit_log') return { insert: mockAuditInsert };
          return {};
        })
      } as unknown as SupabaseClient<Database>;

      const result = await ModerationService.reviewPhoto(
        'photo-uuid-123',
        true,
        'admin-uuid-1',
        mockClient
      );

      expect(result.success).toBe(true);
      expect(mockPhotoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          reviewed_by: 'admin-uuid-1'
        })
      );
      expect(mockAuditInsert).toHaveBeenCalledWith({
        admin_id: 'admin-uuid-1',
        action: 'review_photo',
        target_type: 'photo',
        target_id: 'photo-uuid-123',
        details: { approved: true }
      });
    });

    it('rejects a photo and logs rejection to audit_log', async () => {
      const mockPhotoUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profile_photos') return { update: mockPhotoUpdate };
          if (table === 'audit_log') return { insert: mockAuditInsert };
          return {};
        })
      } as unknown as SupabaseClient<Database>;

      const result = await ModerationService.reviewPhoto(
        'photo-uuid-456',
        false,
        'admin-uuid-1',
        mockClient
      );

      expect(result.success).toBe(true);
      expect(mockPhotoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
          reviewed_by: 'admin-uuid-1'
        })
      );
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'review_photo',
          target_type: 'photo',
          target_id: 'photo-uuid-456',
          details: { approved: false }
        })
      );
    });
  });

  describe('3. Selfie Moderation with Storage Purge and Audit Log', () => {
    it('reviews a gesture selfie, purges file from selfies bucket, and writes audit record', async () => {
      const mockVerifSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'verif-uuid-1', user_id: 'user-uuid-9', selfie_path: 'user-uuid-9/selfie.webp' },
            error: null
          })
        })
      });
      const mockVerifUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockStorageRemove = vi.fn().mockResolvedValue({ error: null });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'verifications') return { select: mockVerifSelect, update: mockVerifUpdate };
          if (table === 'audit_log') return { insert: mockAuditInsert };
          return {};
        }),
        storage: {
          from: vi.fn().mockImplementation((bucket: string) => {
            if (bucket === 'selfies') return { remove: mockStorageRemove };
            return {};
          })
        }
      } as unknown as SupabaseClient<Database>;

      const result = await ModerationService.reviewSelfie(
        'verif-uuid-1',
        true,
        'admin-uuid-1',
        mockClient
      );

      expect(result.success).toBe(true);
      expect(mockVerifUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'approved',
          reviewed_by: 'admin-uuid-1'
        })
      );
      expect(mockStorageRemove).toHaveBeenCalledWith(['user-uuid-9/selfie.webp']);
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: 'admin-uuid-1',
          action: 'review_selfie',
          target_type: 'selfie',
          target_id: 'verif-uuid-1'
        })
      );
    });
  });

  describe('4. Reports Moderation: warn, suspend, ban, dismiss', () => {
    it('handles "warn" action: marks report resolved and writes audit log without changing user status', async () => {
      const mockReportUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockUserUpdate = vi.fn();
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'reports') return { update: mockReportUpdate };
          if (table === 'users') return { update: mockUserUpdate };
          if (table === 'audit_log') return { insert: mockAuditInsert };
          return {};
        })
      } as unknown as SupabaseClient<Database>;

      const result = await ModerationService.reviewReport(
        'report-uuid-10',
        'warn',
        'admin-uuid-1',
        mockClient,
        'target-user-uuid-5'
      );

      expect(result.success).toBe(true);
      expect(mockReportUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          reviewed_by: 'admin-uuid-1'
        })
      );
      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(mockAuditInsert).toHaveBeenCalledWith({
        admin_id: 'admin-uuid-1',
        action: 'review_report',
        target_type: 'report',
        target_id: 'report-uuid-10',
        details: { action: 'warn', targetUserId: 'target-user-uuid-5' }
      });
    });

    it('handles "ban" action: marks report resolved, updates users status to banned, and logs audit', async () => {
      const mockReportUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockUserUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUserUpdate = vi.fn().mockReturnValue({ eq: mockUserUpdateEq });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'reports') return { update: mockReportUpdate };
          if (table === 'users') return { update: mockUserUpdate };
          if (table === 'audit_log') return { insert: mockAuditInsert };
          return {};
        })
      } as unknown as SupabaseClient<Database>;

      const result = await ModerationService.reviewReport(
        'report-uuid-20',
        'ban',
        'admin-uuid-1',
        mockClient,
        'target-user-uuid-99'
      );

      expect(result.success).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalledWith({ status: 'banned' });
      expect(mockUserUpdateEq).toHaveBeenCalledWith('id', 'target-user-uuid-99');
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'review_report',
          target_type: 'report',
          target_id: 'report-uuid-20',
          details: { action: 'ban', targetUserId: 'target-user-uuid-99' }
        })
      );
    });

    it('handles "dismiss" action: marks report dismissed and logs audit', async () => {
      const mockReportUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'reports') return { update: mockReportUpdate };
          if (table === 'audit_log') return { insert: mockAuditInsert };
          return {};
        })
      } as unknown as SupabaseClient<Database>;

      const result = await ModerationService.reviewReport(
        'report-uuid-30',
        'dismiss',
        'admin-uuid-1',
        mockClient
      );

      expect(result.success).toBe(true);
      expect(mockReportUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'dismissed',
          reviewed_by: 'admin-uuid-1'
        })
      );
      expect(mockAuditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'review_report',
          target_type: 'report',
          target_id: 'report-uuid-30'
        })
      );
    });
  });

  describe('5. Users Management and Status Toggle', () => {
    it('toggles user status to suspended and logs target_type user in audit_log', async () => {
      const mockUserUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'users') return { update: mockUserUpdate };
          if (table === 'audit_log') return { insert: mockAuditInsert };
          return {};
        })
      } as unknown as SupabaseClient<Database>;

      const result = await ModerationService.toggleUserStatus(
        'user-uuid-50',
        'suspended',
        'admin-uuid-1',
        mockClient
      );

      expect(result.success).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalledWith({ status: 'suspended' });
      expect(mockAuditInsert).toHaveBeenCalledWith({
        admin_id: 'admin-uuid-1',
        action: 'toggle_user_status',
        target_type: 'user',
        target_id: 'user-uuid-50',
        details: { newStatus: 'suspended' }
      });
    });
  });

  describe('6. Admin Two-Step Verification (2FA)', () => {
    it('verifies a valid 6-digit TOTP / admin 2FA code', async () => {
      const mockClient = {
        auth: {
          mfa: {
            challengeAndVerify: vi.fn().mockResolvedValue({ data: { user: {} }, error: null })
          }
        }
      } as any;

      const result = await verifyAdmin2FA('123456', mockClient);
      expect(result.success).toBe(true);
    });

    it('rejects an invalid or malformed 2FA code', async () => {
      const result = await verifyAdmin2FA('invalid-code');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/6-digit/i);
    });
  });
});
