import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { AccountDeletionService } from '../lib/account-deletion-service';
import { ConsentService, ConsentType } from '../lib/consent-service';
import { SecurityCompliance } from '../lib/security-compliance';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => { storageMap.set(key, String(val)); }),
  removeItem: vi.fn((key: string) => { storageMap.delete(key); }),
  clear: vi.fn(() => { storageMap.clear(); }),
  length: 0,
  key: vi.fn((idx: number) => Array.from(storageMap.keys())[idx] ?? null),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('Step 7: Safety, Privacy & Compliance (Account Deletion, Consent & Security Headers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('1. Cascading Account Deletion (Storage Purge & DB Records)', () => {
    it('purges files from profile-photos and verification-selfies storage buckets', async () => {
      const mockPhotoList = vi.fn().mockResolvedValue({
        data: [{ name: 'pic1.jpg' }, { name: 'pic2.jpg' }],
        error: null
      });
      const mockPhotoRemove = vi.fn().mockResolvedValue({ data: [], error: null });

      const mockSelfieList = vi.fn().mockResolvedValue({
        data: [{ name: 'selfie_gesture.jpg' }],
        error: null
      });
      const mockSelfieRemove = vi.fn().mockResolvedValue({ data: [], error: null });

      const mockStorage = {
        from: vi.fn((bucket: string) => {
          if (bucket === 'profile-photos') {
            return { list: mockPhotoList, remove: mockPhotoRemove };
          }
          if (bucket === 'verification-selfies') {
            return { list: mockSelfieList, remove: mockSelfieRemove };
          }
          return { list: vi.fn(), remove: vi.fn() };
        })
      };

      const mockRpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
      const mockSignOut = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        storage: mockStorage,
        rpc: mockRpc,
        auth: { signOut: mockSignOut }
      } as unknown as SupabaseClient<Database>;

      localStorage.setItem('koodal_my_profile', JSON.stringify({ name: 'Test' }));
      localStorage.setItem('koodal_my_waitlist_id', 'wl_123');

      const result = await AccountDeletionService.deleteAccount('user-uuid-123', mockClient);

      expect(result.success).toBe(true);
      expect(mockStorage.from).toHaveBeenCalledWith('profile-photos');
      expect(mockPhotoList).toHaveBeenCalledWith('user-uuid-123');
      expect(mockPhotoRemove).toHaveBeenCalledWith(['user-uuid-123/pic1.jpg', 'user-uuid-123/pic2.jpg']);

      expect(mockStorage.from).toHaveBeenCalledWith('verification-selfies');
      expect(mockSelfieList).toHaveBeenCalledWith('user-uuid-123');
      expect(mockSelfieRemove).toHaveBeenCalledWith(['user-uuid-123/selfie_gesture.jpg']);

      expect(mockRpc).toHaveBeenCalledWith('delete_user_account', { p_user_id: 'user-uuid-123' });
      expect(mockSignOut).toHaveBeenCalled();
      expect(localStorage.getItem('koodal_my_profile')).toBeNull();
      expect(localStorage.getItem('koodal_my_waitlist_id')).toBeNull();
    });

    it('falls back to direct table deletion if RPC is unavailable', async () => {
      const mockStorage = {
        from: vi.fn(() => ({
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          remove: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
      };

      const mockDeleteFrom = vi.fn((table: string) => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      }));

      const mockClient = {
        storage: mockStorage,
        rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'function not found' } }),
        from: mockDeleteFrom,
        auth: { signOut: vi.fn().mockResolvedValue({ error: null }) }
      } as unknown as SupabaseClient<Database>;

      const result = await AccountDeletionService.deleteAccount('user-uuid-fallback', mockClient);

      expect(result.success).toBe(true);
      expect(mockDeleteFrom).toHaveBeenCalledWith('profiles');
      expect(mockDeleteFrom).toHaveBeenCalledWith('users');
    });
  });

  describe('2. Explicit Consent Tracking (DPDP Act 2023 & GDPR Compliance)', () => {
    it('records user explicit consent with version and timestamp', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockClient = {
        from: vi.fn(() => ({ insert: mockInsert }))
      } as unknown as SupabaseClient<Database>;

      const result = await ConsentService.recordConsent(
        {
          userId: 'user-uuid-123',
          consentType: 'privacy',
          version: '1.0',
          granted: true,
          ipAddress: '127.0.0.1'
        },
        mockClient
      );

      expect(result.success).toBe(true);
      expect(mockClient.from).toHaveBeenCalledWith('user_consents');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-uuid-123',
          consent_type: 'privacy',
          version: '1.0',
          granted: true
        })
      );
    });

    it('verifies that mandatory consents (terms, privacy, guidelines) are all granted', () => {
      const activeConsents: Record<ConsentType, boolean> = {
        terms: true,
        privacy: true,
        guidelines: true,
        selfie_verification: true,
        geolocation: false
      };

      const isCompliant = ConsentService.hasRequiredConsents(activeConsents);
      expect(isCompliant).toBe(true);

      const missingPrivacy = { ...activeConsents, privacy: false };
      expect(ConsentService.hasRequiredConsents(missingPrivacy)).toBe(false);
    });

    it('allows withdrawal of optional consent (geolocation) while rejecting mandatory terms withdrawal without deletion', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      });
      const mockClient = {
        from: vi.fn(() => ({ update: mockUpdate }))
      } as unknown as SupabaseClient<Database>;

      const geoResult = await ConsentService.withdrawConsent('user-uuid-123', 'geolocation', mockClient);
      expect(geoResult.success).toBe(true);

      const termsResult = await ConsentService.withdrawConsent('user-uuid-123', 'terms', mockClient);
      expect(termsResult.success).toBe(false);
      expect(termsResult.error).toMatch(/mandatory/i);
    });
  });

  describe('3. Strict Content Security Policy & Security Headers', () => {
    it('generates compliant CSP restricting frame embedding and unauthorized scripts', () => {
      const csp = SecurityCompliance.getCspString();

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
      expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
      expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
    });

    it('validates mandatory HTTP security headers against OWASP standards', () => {
      const headers = SecurityCompliance.getRequiredSecurityHeaders();

      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Permissions-Policy']).toContain('camera=(self)');
      expect(headers['Permissions-Policy']).toContain('microphone=()');
    });
  });
});
