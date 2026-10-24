import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { WaitlistService } from '../lib/waitlist-service';
import { EmailService } from '../lib/email-service';
import { canAccessMemberRoutes, getClaimWindowDetails } from '../lib/waitlist-gate';

describe('Step 6: Waitlist for Real (Join Flow, Real Position, Referrals, 7-Day Window, Emails & Route Gate)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Real Position and Wait Estimate from get_waitlist_position', () => {
    it('queries get_waitlist_position RPC with email and returns database rank & wait estimate', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          found: true,
          id: 'wl-uuid-1',
          email: 'chennai.user@example.com',
          city: 'Chennai',
          gender: 'woman',
          lane: 'women_and_others',
          score: 35,
          status: 'waiting',
          rank: 7,
          lane_total: 120,
          estimated_days: 7,
          has_selfie_approved: true,
          has_profile_complete: true,
          referral_count: 1
        },
        error: null
      });

      const mockClient = { rpc: mockRpc } as unknown as SupabaseClient<Database>;

      const result = await WaitlistService.fetchWaitlistPosition(
        'chennai.user@example.com',
        undefined,
        mockClient
      );

      expect(mockRpc).toHaveBeenCalledWith('get_waitlist_position', {
        p_email: 'chennai.user@example.com'
      });
      expect(result.success).toBe(true);
      expect(result.position).toBe(7);
      expect(result.total).toBe(120);
      expect(result.estimatedDays).toBe(7);
    });

    it('returns found: false when email is not registered on waitlist', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: { found: false },
        error: null
      });

      const mockClient = { rpc: mockRpc } as unknown as SupabaseClient<Database>;

      const result = await WaitlistService.fetchWaitlistPosition(
        'unknown@example.com',
        undefined,
        mockClient
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });
  });

  describe('2. 7-Day Claim Window & Expiry', () => {
    it('identifies an admitted entry inside the 7-day claim window', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const details = getClaimWindowDetails('admitted', threeDaysAgo);

      expect(details.isAdmitted).toBe(true);
      expect(details.isExpired).toBe(false);
      expect(details.daysRemaining).toBeGreaterThanOrEqual(3);
      expect(details.hoursRemaining).toBeGreaterThan(0);
    });

    it('identifies an admitted entry that exceeded the 7-day claim window as expired', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const details = getClaimWindowDetails('admitted', eightDaysAgo);

      expect(details.isAdmitted).toBe(true);
      expect(details.isExpired).toBe(true);
      expect(details.daysRemaining).toBe(0);
    });

    it('returns non-admitted status for waiting entry', () => {
      const details = getClaimWindowDetails('waiting', null);
      expect(details.isAdmitted).toBe(false);
      expect(details.isExpired).toBe(false);
    });
  });

  describe('3. Unadmitted Member Route Gatekeeper', () => {
    it('blocks signed-in member whose waitlist status is waiting from member routes', () => {
      const user = { id: 'u1', email: 'u1@example.com', role: 'member' };
      const waitlistEntry = { id: 'w1', email: 'u1@example.com', status: 'waiting' as const };

      const canAccess = canAccessMemberRoutes(user, waitlistEntry);
      expect(canAccess).toBe(false);
    });

    it('blocks signed-in member whose claim window expired from member routes', () => {
      const user = { id: 'u2', email: 'u2@example.com', role: 'member' };
      const waitlistEntry = { id: 'w2', email: 'u2@example.com', status: 'expired' as const };

      const canAccess = canAccessMemberRoutes(user, waitlistEntry);
      expect(canAccess).toBe(false);
    });

    it('permits admitted member to access member routes', () => {
      const user = { id: 'u3', email: 'u3@example.com', role: 'member' };
      const waitlistEntry = { id: 'w3', email: 'u3@example.com', status: 'admitted' as const };

      const canAccess = canAccessMemberRoutes(user, waitlistEntry);
      expect(canAccess).toBe(true);
    });

    it('permits admin to access all routes regardless of waitlist status', () => {
      const admin = { id: 'a1', email: 'admin@koodal.app', role: 'admin' };
      const waitlistEntry = { id: 'w4', email: 'admin@koodal.app', status: 'waiting' as const };

      const canAccess = canAccessMemberRoutes(admin, waitlistEntry);
      expect(canAccess).toBe(true);
    });
  });

  describe('4. Email Notification Templates and Delivery', () => {
    it('creates waitlist join confirmation email with referral link and initial position', async () => {
      const emailPayload = await EmailService.sendWaitlistJoinEmail({
        email: 'priya.chennai@example.com',
        city: 'Chennai',
        lane: 'women_and_others',
        initialScore: 21,
        referralCode: 'REF_PRIYA_123'
      });

      expect(emailPayload.success).toBe(true);
      expect(emailPayload.subject).toMatch(/waitlist/i);
      expect(emailPayload.body).toContain('Chennai');
      expect(emailPayload.body).toContain('REF_PRIYA_123');
      expect(emailPayload.body).toContain('gesture selfie');
    });

    it('creates weekly status email with honest position and queue movement', async () => {
      const emailPayload = await EmailService.sendWeeklyStatusEmail({
        email: 'karthik.blr@example.com',
        city: 'Bangalore',
        rank: 14,
        totalInLane: 190,
        estimatedDays: 14,
        referralCount: 2
      });

      expect(emailPayload.success).toBe(true);
      expect(emailPayload.subject).toContain('#14');
      expect(emailPayload.body).toContain('Bangalore');
      expect(emailPayload.body).toContain('14 days');
    });

    it('creates batch admission email with 7-day claim deadline and onboarding link', async () => {
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const emailPayload = await EmailService.sendBatchAdmissionEmail({
        email: 'admitted.user@example.com',
        city: 'Chennai',
        claimDeadline: deadline
      });

      expect(emailPayload.success).toBe(true);
      expect(emailPayload.subject).toMatch(/off the waitlist/i);
      expect(emailPayload.body).toContain('7-day');
      expect(emailPayload.body).toContain('/onboarding');
    });
  });
});
