import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  validateBirthDateAge, 
  validateEmail, 
  mapOnboardingToProfilePayload,
  AuthService,
  ProfileService,
  resolveUserRole
} from '../lib/auth-service';

describe('Auth & Onboarding Data Layer (Step 2 - Group 1)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. 18+ Age Gate & Email Validation', () => {
    it('rejects users under 18 years of age', () => {
      // 17 years old today
      const today = new Date();
      const under18 = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate())
        .toISOString().split('T')[0];
      
      const result = validateBirthDateAge(under18);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/18 years of age or older/i);
    });

    it('accepts users who are exactly 18 or older', () => {
      // 18 years old today
      const today = new Date();
      const exactly18 = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
        .toISOString().split('T')[0];
      
      const result18 = validateBirthDateAge(exactly18);
      expect(result18.valid).toBe(true);
      expect(result18.age).toBe(18);

      // 25 years old
      const result25 = validateBirthDateAge('2001-01-01');
      expect(result25.valid).toBe(true);
      expect(result25.age).toBeGreaterThanOrEqual(25);
    });

    it('rejects invalid or future birth dates', () => {
      expect(validateBirthDateAge('2099-01-01').valid).toBe(false);
      expect(validateBirthDateAge('invalid-date').valid).toBe(false);
      expect(validateBirthDateAge('').valid).toBe(false);
    });

    it('validates email addresses properly', () => {
      expect(validateEmail('test@example.com').valid).toBe(true);
      expect(validateEmail('student@iitm.ac.in').valid).toBe(true);
      expect(validateEmail('invalid-email').valid).toBe(false);
      expect(validateEmail('').valid).toBe(false);
      expect(validateEmail('no-domain@').valid).toBe(false);
    });
  });

  describe('2. Onboarding Payload Mapping (Untrusted Client Isolation)', () => {
    it('correctly maps onboarding form state to profiles database schema', () => {
      const formData = {
        name: '  Karthik Raj  ',
        birthDate: '1998-05-20',
        gender: 'man' as const,
        intent: 'long_term' as const,
        city: 'Chennai',
        bio: 'Love filter coffee and tech.',
        bioTa: 'காபி மற்றும் தொழில்நுட்பம் பிடிக்கும்.',
        interests: ['Filter Coffee', 'Trekking', 'Carnatic Music', 'Tech & Startups'],
        prompts: [
          { question: 'A non-negotiable for me is...', answer: 'Honesty and mutual respect.' },
          { question: 'My ideal Sunday is...', answer: 'Beach walk at Besant Nagar.' }
        ]
      };

      const payload = mapOnboardingToProfilePayload('user-uuid-1234', formData);

      expect(payload).toEqual({
        user_id: 'user-uuid-1234',
        name: 'Karthik Raj',
        birth_date: '1998-05-20',
        gender: 'man',
        intent: 'long_term',
        city: 'Chennai',
        bio: 'Love filter coffee and tech.',
        bio_ta: 'காபி மற்றும் தொழில்நுட்பம் பிடிக்கும்.',
        interests: ['Filter Coffee', 'Trekking', 'Carnatic Music', 'Tech & Startups'],
        prompts: [
          { question: 'A non-negotiable for me is...', answer: 'Honesty and mutual respect.' },
          { question: 'My ideal Sunday is...', answer: 'Beach walk at Besant Nagar.' }
        ],
        is_paused: false
      });

      // Verify client cannot inject admin fields or verification results into profile payload
      expect((payload as any).role).toBeUndefined();
      expect((payload as any).status).toBeUndefined();
      expect((payload as any).verification_status).toBeUndefined();
    });

    it('caps interests at maximum 6 entries', () => {
      const formData = {
        name: 'Ananya',
        birthDate: '2000-01-01',
        gender: 'woman' as const,
        intent: 'casual' as const,
        city: 'Chennai',
        bio: 'Hello world',
        interests: ['1', '2', '3', '4', '5', '6', '7', '8'],
        prompts: []
      };

      const payload = mapOnboardingToProfilePayload('user-uuid-5678', formData);
      expect(payload.interests.length).toBe(6);
    });
  });

  describe('3. AuthService Sign-In Flow & Offline Handling', () => {
    it('refuses to send magic link if age gate checkbox is not confirmed', async () => {
      const result = await AuthService.signInWithMagicLink('valid@example.com', false);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/18 years of age or older/i);
    });

    it('handles offline state cleanly when network is disconnected', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true
      });

      const result = await AuthService.signInWithMagicLink('valid@example.com', true);
      expect(result.success).toBe(false);
      expect(result.offline).toBe(true);
      expect(result.error).toMatch(/offline/i);

      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true
      });
    });
  });

  describe('4. ProfileService Onboarding & Server Role Resolution', () => {
    it('refuses to save onboarding profile if user is under 18', async () => {
      const result = await ProfileService.saveOnboardingProfile('user-uuid-1234', {
        name: 'Minor User',
        birthDate: '2010-01-01',
        gender: 'man',
        intent: 'casual',
        city: 'Chennai',
        bio: 'Too young',
        interests: [],
        prompts: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/18 years of age or older/i);
    });

    it('resolves user role strictly from server is_admin RPC and not client switch', async () => {
      // Mock server RPC returning false (regular member)
      const mockRpc = vi.fn().mockResolvedValue({ data: false, error: null });
      const role = await resolveUserRole('regular-user-id', { rpc: mockRpc } as any);
      expect(role).toBe('member');
      expect(mockRpc).toHaveBeenCalledWith('is_admin', { user_uuid: 'regular-user-id' });

      // Mock server RPC returning true (admin)
      const mockAdminRpc = vi.fn().mockResolvedValue({ data: true, error: null });
      const adminRole = await resolveUserRole('admin-user-id', { rpc: mockAdminRpc } as any);
      expect(adminRole).toBe('admin');
    });
  });
});
