import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  DiscoveryService, 
  type DiscoveryProfile 
} from '../lib/discovery-service';

describe('Discovery & Matching Data Layer (Step 2 - Group 2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Discovery Feed & Untrusted Client Protections', () => {
    it('calls get_discovery_feed RPC and maps allowed fields only', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            user_id: 'target-uuid-1',
            name: 'Pooja V.',
            age: 23,
            city: 'Chennai',
            intent: 'long_term',
            bio: 'Carnatic violinist & designer.',
            bio_ta: 'கர்நாடக வயலின் கலைஞர்.',
            interests: ['Carnatic Music', 'Design', 'Filter Coffee'],
            prompts: [
              { question: 'A non-negotiable for me is...', answer: 'Kindness.' }
            ],
            photos: ['photos/target-uuid-1/cover.jpg']
          }
        ],
        error: null
      });

      const mockClient = { rpc: mockRpc } as any;
      const result = await DiscoveryService.fetchFeed({ limit: 10, offset: 0 }, mockClient);

      expect(mockRpc).toHaveBeenCalledWith('get_discovery_feed', { p_limit: 10, p_offset: 0 });
      expect(result.success).toBe(true);
      expect(result.profiles.length).toBe(1);

      const profile = result.profiles[0];
      expect(profile.name).toBe('Pooja V.');
      expect(profile.age).toBe(23);
      expect(profile.city).toBe('Chennai');
      expect(profile.intent).toBe('long_term');

      // Assert forbidden fields are not present
      expect((profile as any).email).toBeUndefined();
      expect((profile as any).birth_date).toBeUndefined();
      expect((profile as any).role).toBeUndefined();
      expect((profile as any).score).toBeUndefined();
      expect((profile as any).distanceKm).toBeUndefined();
    });

    it('handles offline state cleanly when fetching discovery feed', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true
      });

      const result = await DiscoveryService.fetchFeed();
      expect(result.success).toBe(false);
      expect(result.offline).toBe(true);
      expect(result.profiles).toEqual([]);
      expect(result.error).toMatch(/offline/i);

      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true
      });
    });
  });

  describe('2. Liking, Daily Limit Enforcement & Mutual Matches', () => {
    it('successfully records a like in the likes table', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });
      const mockMatchesSelect = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      const mockClient = {
        from: (table: string) => {
          if (table === 'likes') return { insert: mockInsert };
          if (table === 'matches') return mockMatchesSelect();
          return {};
        }
      } as any;

      const result = await DiscoveryService.likeProfile('caller-uuid', 'target-uuid', mockClient);
      expect(result.success).toBe(true);
      expect(result.isMatch).toBe(false);
      expect(mockInsert).toHaveBeenCalledWith({
        from_user: 'caller-uuid',
        to_user: 'target-uuid'
      });
    });

    it('catches database 20-likes-per-day trigger exception and returns limitReached', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        error: { message: 'Cannot exceed 20 likes in a 24-hour window' }
      });
      const mockClient = {
        from: () => ({ insert: mockInsert })
      } as any;

      const result = await DiscoveryService.likeProfile('caller-uuid', 'target-uuid', mockClient);
      expect(result.success).toBe(false);
      expect(result.limitReached).toBe(true);
      expect(result.error).toMatch(/20.*likes.*day|limit reached/i);
    });

    it('detects mutual match creation when trigger creates a match', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockMatchRow = {
        id: 'match-1234',
        user_a: 'caller-uuid',
        user_b: 'target-uuid',
        created_at: new Date().toISOString()
      };

      const mockClient = {
        from: (table: string) => {
          if (table === 'likes') return { insert: mockInsert };
          if (table === 'matches') {
            return {
              select: () => ({
                or: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockMatchRow, error: null })
                })
              })
            };
          }
          return {};
        }
      } as any;

      const result = await DiscoveryService.likeProfile('caller-uuid', 'target-uuid', mockClient);
      expect(result.success).toBe(true);
      expect(result.isMatch).toBe(true);
      expect(result.match?.id).toBe('match-1234');
    });
  });

  describe('3. Passing Profiles', () => {
    it('records a pass in the passes table', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockClient = {
        from: (table: string) => {
          if (table === 'passes') return { insert: mockInsert };
          return {};
        }
      } as any;

      const result = await DiscoveryService.passProfile('caller-uuid', 'target-uuid', mockClient);
      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'caller-uuid',
        target_id: 'target-uuid'
      });
    });
  });

  describe('4. Member Profile Detail via RPC', () => {
    it('calls get_member_profile RPC for full profile details', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            user_id: 'target-uuid-2',
            name: 'Divya S.',
            age: 24,
            city: 'Chennai',
            intent: 'casual',
            bio: 'Coffee connoisseur.',
            bio_ta: null,
            interests: ['Filter Coffee'],
            prompts: [],
            photos: ['photos/target-uuid-2/1.jpg']
          }
        ],
        error: null
      });

      const mockClient = { rpc: mockRpc } as any;
      const profile = await DiscoveryService.getMemberProfile('target-uuid-2', mockClient);

      expect(mockRpc).toHaveBeenCalledWith('get_member_profile', { p_target_id: 'target-uuid-2' });
      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('Divya S.');
      expect(profile?.age).toBe(24);
    });

    it('returns null if target is not visible or RPC returns empty', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });

      const mockClient = { rpc: mockRpc } as any;
      const profile = await DiscoveryService.getMemberProfile('hidden-uuid', mockClient);

      expect(profile).toBeNull();
    });
  });
});
