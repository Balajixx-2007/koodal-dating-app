import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModerationService } from '../lib/moderation-service';
import { WaitlistService } from '../lib/waitlist-service';

describe('Moderation, Safety & Waitlist Data Layer (Step 2 - Group 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Member Safety: Blocking & Reporting', () => {
    it('prevents self-blocking and rejects when blocker equals blocked', async () => {
      const result = await ModerationService.blockUser('user-1', 'user-1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/cannot block yourself/i);
    });

    it('inserts a block record into public.blocks table', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      const mockClient = { from: mockFrom } as any;

      const result = await ModerationService.blockUser('caller-uuid-1', 'bad-actor-uuid-2', mockClient);

      expect(mockFrom).toHaveBeenCalledWith('blocks');
      expect(mockInsert).toHaveBeenCalledWith({
        blocker: 'caller-uuid-1',
        blocked: 'bad-actor-uuid-2'
      });
      expect(result.success).toBe(true);
    });

    it('handles offline condition when blocking', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true
      });

      const result = await ModerationService.blockUser('caller-uuid', 'target-uuid');
      expect(result.success).toBe(false);
      expect(result.offline).toBe(true);
      expect(result.error).toMatch(/offline/i);

      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true
      });
    });

    it('submits a report and maps UI reason to valid database ReportReason', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      const mockClient = { from: mockFrom } as any;

      const result = await ModerationService.submitReport(
        'caller-uuid-1',
        'reported-uuid-2',
        'scam', // UI reason
        'Asked to transfer money via UPI',
        mockClient
      );

      expect(mockFrom).toHaveBeenCalledWith('reports');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          reporter_id: 'caller-uuid-1',
          reported_id: 'reported-uuid-2',
          reason: 'other', // Mapped to valid DB enum 'other'
          details: 'Asked to transfer money via UPI'
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('2. Admin Incident & Queue Moderation', () => {
    it('reviews a report, updates report status, and logs an audit trail', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'reports') return { update: mockUpdate };
        if (table === 'audit_log') return { insert: mockAuditInsert };
        return {};
      });

      const mockClient = { from: mockFrom } as any;

      const result = await ModerationService.reviewReport(
        'report-uuid-1',
        'dismiss',
        'admin-uuid-1',
        mockClient
      );

      expect(mockFrom).toHaveBeenCalledWith('reports');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'dismissed',
          action_taken: 'dismiss',
          reviewed_by: 'admin-uuid-1'
        })
      );
      expect(mockFrom).toHaveBeenCalledWith('audit_log');
      expect(result.success).toBe(true);
    });

    it('updates user status when banning or suspending via report review', async () => {
      const mockReportsUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockUsersUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'reports') return { update: mockReportsUpdate };
        if (table === 'users') return { update: mockUsersUpdate };
        if (table === 'audit_log') return { insert: mockAuditInsert };
        return {};
      });

      const mockClient = { from: mockFrom } as any;

      const result = await ModerationService.reviewReport(
        'report-uuid-1',
        'ban',
        'admin-uuid-1',
        mockClient,
        'offending-user-uuid'
      );

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockUsersUpdate).toHaveBeenCalledWith({ status: 'banned' });
      expect(result.success).toBe(true);
    });

    it('reviews a selfie verification and updates verifications table', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'verifications') return { update: mockUpdate };
        if (table === 'audit_log') return { insert: mockAuditInsert };
        return {};
      });

      const mockClient = { from: mockFrom } as any;

      const result = await ModerationService.reviewSelfie(
        'verification-uuid-1',
        true,
        'admin-uuid-1',
        mockClient
      );

      expect(mockFrom).toHaveBeenCalledWith('verifications');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'approved',
          reviewed_by: 'admin-uuid-1'
        })
      );
      expect(result.success).toBe(true);
    });

    it('reviews a profile photo and updates profile_photos table', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      const mockAuditInsert = vi.fn().mockResolvedValue({ error: null });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'profile_photos') return { update: mockUpdate };
        if (table === 'audit_log') return { insert: mockAuditInsert };
        return {};
      });

      const mockClient = { from: mockFrom } as any;

      const result = await ModerationService.reviewPhoto(
        'photo-uuid-1',
        true,
        'admin-uuid-1',
        mockClient
      );

      expect(mockFrom).toHaveBeenCalledWith('profile_photos');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          reviewed_by: 'admin-uuid-1'
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('3. Waitlist & Ratio Control Layer', () => {
    it('determines lane automatically and inserts waitlist entry', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'wl-uuid-1',
          user_id: 'user-uuid-1',
          email: 'priya@example.com',
          city: 'Chennai',
          gender: 'woman',
          intent: 'long_term',
          lane: 'women_and_others',
          score: 50,
          status: 'waiting'
        },
        error: null
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      const mockClient = { from: mockFrom } as any;

      const result = await WaitlistService.joinWaitlist(
        {
          userId: 'user-uuid-1',
          email: 'priya@example.com',
          city: 'Chennai',
          gender: 'woman',
          intent: 'long_term'
        },
        mockClient
      );

      expect(mockFrom).toHaveBeenCalledWith('waitlist_entries');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-uuid-1',
          email: 'priya@example.com',
          city: 'Chennai',
          gender: 'woman',
          lane: 'women_and_others'
        })
      );
      expect(result.success).toBe(true);
      expect(result.entry?.lane).toBe('women_and_others');
    });

    it('assigns men to the men lane', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'wl-uuid-2',
          lane: 'men'
        },
        error: null
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      const mockClient = { from: mockFrom } as any;

      const result = await WaitlistService.joinWaitlist(
        {
          userId: 'user-uuid-2',
          email: 'karthik@example.com',
          city: 'Chennai',
          gender: 'man',
          intent: 'long_term'
        },
        mockClient
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          gender: 'man',
          lane: 'men'
        })
      );
      expect(result.success).toBe(true);
    });

    it('fetches waitlist position using get_waitlist_position RPC', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ position: 12, total: 180 }],
        error: null
      });
      const mockClient = { rpc: mockRpc } as any;

      const result = await WaitlistService.fetchWaitlistPosition('Chennai', 'user-uuid-1', mockClient);

      expect(mockRpc).toHaveBeenCalledWith('get_waitlist_position', {
        p_city: 'Chennai',
        p_user_id: 'user-uuid-1'
      });
      expect(result.position).toBe(12);
      expect(result.total).toBe(180);
    });

    it('executes batch admission using admit_batch RPC', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ admitted_women: 10, admitted_men: 15 }],
        error: null
      });
      const mockClient = { rpc: mockRpc } as any;

      const result = await WaitlistService.executeBatchAdmission('Chennai', 10, 15, mockClient);

      expect(mockRpc).toHaveBeenCalledWith('admit_batch', {
        p_city: 'Chennai',
        p_women_limit: 10,
        p_men_limit: 15
      });
      expect(result.success).toBe(true);
      expect(result.admittedWomen).toBe(10);
      expect(result.admittedMen).toBe(15);
    });
  });
});
