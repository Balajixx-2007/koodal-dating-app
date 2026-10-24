import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../lib/profile-service';

describe('My Profile & Settings Data Layer (Step 2 - Group 5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Profile Retrieval', () => {
    it('queries profiles table for the authenticated user', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          user_id: 'user-uuid-1',
          name: 'Meena K.',
          birth_date: '2000-01-15',
          gender: 'woman',
          intent: 'long_term',
          city: 'Chennai',
          bio: 'Architect passionate about heritage preservation.',
          bio_ta: 'பாரம்பரிய கட்டிடக்கலைஞர்.',
          interests: ['Architecture', 'Filter Coffee'],
          prompts: [{ question: 'My Sunday looks like...', answer: 'Besant Nagar beach walks.' }],
          is_paused: false,
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z'
        },
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      const mockPhotos = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [{ storage_path: 'photos/photo1.jpg' }], error: null })
          })
        })
      });

      const mockVerifications = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [{ result: 'approved' }], error: null })
            })
          })
        })
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') return { select: mockSelect };
        if (table === 'profile_photos') return mockPhotos();
        if (table === 'verifications') return mockVerifications();
        return {};
      });

      const mockClient = { from: mockFrom } as any;

      const result = await ProfileService.fetchMyProfile('user-uuid-1', mockClient);

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-uuid-1');
      expect(result.success).toBe(true);
      expect(result.profile?.name).toBe('Meena K.');
      expect(result.profile?.city).toBe('Chennai');
      expect(result.profile?.is_paused).toBe(false);
    });

    it('handles offline condition when fetching profile', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true
      });

      const result = await ProfileService.fetchMyProfile('user-uuid-1');
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

  describe('2. Profile Updates', () => {
    it('validates name and rejects empty or whitespace-only name updates', async () => {
      const result = await ProfileService.updateProfile('user-uuid-1', { name: '   ' });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/name cannot be empty/i);
    });

    it('updates allowed profile fields in profiles table', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      const mockClient = { from: mockFrom } as any;

      const result = await ProfileService.updateProfile(
        'user-uuid-1',
        {
          name: 'Meena K. Raman',
          bio: 'Updated bio about art and heritage.',
          city: 'Chennai',
          intent: 'marriage'
        },
        mockClient
      );

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Meena K. Raman',
          bio: 'Updated bio about art and heritage.',
          city: 'Chennai',
          intent: 'marriage'
        })
      );
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-uuid-1');
      expect(result.success).toBe(true);
    });

    it('handles offline state when updating profile', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true
      });

      const result = await ProfileService.updateProfile('user-uuid-1', { bio: 'New bio' });
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

  describe('3. Pause Profile Visibility', () => {
    it('toggles is_paused state in profiles table', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
      const mockClient = { from: mockFrom } as any;

      const result = await ProfileService.togglePauseProfile('user-uuid-1', true, mockClient);

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_paused: true
        })
      );
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-uuid-1');
      expect(result.success).toBe(true);
    });
  });

  describe('4. Account Deletion & Sign-Out', () => {
    it('signs out the user on account deletion', async () => {
      const mockSignOut = vi.fn().mockResolvedValue({ error: null });
      const mockClient = {
        auth: { signOut: mockSignOut }
      } as any;

      const result = await ProfileService.deleteAccount(mockClient);
      expect(mockSignOut).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
