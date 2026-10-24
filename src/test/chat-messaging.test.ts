import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService, type MatchListItem, type MessageItem } from '../lib/chat-service';

describe('Chat and Messaging Data Layer (Step 2 - Group 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Matches List Retrieval (get_matches_list)', () => {
    it('calls get_matches_list RPC and returns structured matches with unread count and partner preview', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [
          {
            match_id: 'match-uuid-1',
            matched_user_id: 'partner-uuid-1',
            name: 'Pooja V.',
            age: 23,
            city: 'Chennai',
            intent: 'long_term',
            avatar_url: 'https://images.unsplash.com/photo-cover.jpg',
            last_message_body: 'Looking forward to the Mylapore coffee walk!',
            last_message_sent_at: '2026-10-24T10:00:00Z',
            last_message_sender_id: 'partner-uuid-1',
            unread_count: 2
          }
        ],
        error: null
      });

      const mockClient = { rpc: mockRpc } as any;
      const result = await ChatService.fetchMatchesList(mockClient);

      expect(mockRpc).toHaveBeenCalledWith('get_matches_list');
      expect(result.success).toBe(true);
      expect(result.matches.length).toBe(1);

      const m = result.matches[0];
      expect(m.match_id).toBe('match-uuid-1');
      expect(m.matched_user_id).toBe('partner-uuid-1');
      expect(m.name).toBe('Pooja V.');
      expect(m.age).toBe(23);
      expect(m.city).toBe('Chennai');
      expect(m.intent).toBe('long_term');
      expect(m.avatar_url).toBe('https://images.unsplash.com/photo-cover.jpg');
      expect(m.last_message_body).toBe('Looking forward to the Mylapore coffee walk!');
      expect(m.unread_count).toBe(2);

      // Verify no private/forbidden data returned
      expect((m as any).email).toBeUndefined();
      expect((m as any).birth_date).toBeUndefined();
      expect((m as any).distanceKm).toBeUndefined();
    });

    it('returns an offline error when navigator is offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true
      });

      const result = await ChatService.fetchMatchesList();
      expect(result.success).toBe(false);
      expect(result.offline).toBe(true);
      expect(result.matches).toEqual([]);
      expect(result.error).toMatch(/offline/i);

      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true
      });
    });

    it('handles RPC errors gracefully', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database query failed' }
      });
      const mockClient = { rpc: mockRpc } as any;

      const result = await ChatService.fetchMatchesList(mockClient);
      expect(result.success).toBe(false);
      expect(result.matches).toEqual([]);
      expect(result.error).toBe('Database query failed');
    });
  });

  describe('2. Messages Query and Ordering (sent_at)', () => {
    it('queries messages table filtering by match_id and ordering strictly by sent_at ASC', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'msg-uuid-1',
            match_id: 'match-uuid-1',
            sender_id: 'partner-uuid-1',
            body: 'Hello from Chennai!',
            sent_at: '2026-10-24T09:00:00Z',
            read_at: '2026-10-24T09:05:00Z'
          },
          {
            id: 'msg-uuid-2',
            match_id: 'match-uuid-1',
            sender_id: 'me-uuid',
            body: 'Vanakkam! Nice to connect.',
            sent_at: '2026-10-24T09:02:00Z',
            read_at: null
          }
        ],
        error: null
      });

      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      const mockClient = { from: mockFrom } as any;

      const result = await ChatService.fetchMessages('match-uuid-1', mockClient);

      expect(mockFrom).toHaveBeenCalledWith('messages');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('match_id', 'match-uuid-1');
      // Critical check: Ensure order column is 'sent_at' and NOT 'created_at'
      expect(mockOrder).toHaveBeenCalledWith('sent_at', { ascending: true });

      expect(result.success).toBe(true);
      expect(result.messages.length).toBe(2);
      expect(result.messages[0].body).toBe('Hello from Chennai!');
      expect(result.messages[1].body).toBe('Vanakkam! Nice to connect.');
    });

    it('returns error when matchId is missing', async () => {
      const result = await ChatService.fetchMessages('');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/match id is required/i);
    });

    it('handles query error when fetching messages', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Permission denied' }
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      const mockClient = { from: mockFrom } as any;

      const result = await ChatService.fetchMessages('match-uuid-1', mockClient);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
      expect(result.messages).toEqual([]);
    });
  });

  describe('3. Message Insertion & Security Validation', () => {
    it('validates message length and rejects empty or whitespace-only messages', async () => {
      const resultEmpty = await ChatService.sendMessage('match-1', 'sender-1', '');
      expect(resultEmpty.success).toBe(false);
      expect(resultEmpty.error).toMatch(/between 1 and 2000 characters/i);

      const resultWhitespace = await ChatService.sendMessage('match-1', 'sender-1', '    ');
      expect(resultWhitespace.success).toBe(false);
      expect(resultWhitespace.error).toMatch(/between 1 and 2000 characters/i);
    });

    it('rejects message exceeding 2000 characters', async () => {
      const longMessage = 'A'.repeat(2001);
      const result = await ChatService.sendMessage('match-1', 'sender-1', longMessage);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/between 1 and 2000 characters/i);
    });

    it('inserts message into messages table with sent_at and trimmed body', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'new-msg-uuid',
          match_id: 'match-uuid-1',
          sender_id: 'sender-uuid-1',
          body: 'Hello there!',
          sent_at: '2026-10-24T10:15:00Z',
          read_at: null
        },
        error: null
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      const mockClient = { from: mockFrom } as any;

      const result = await ChatService.sendMessage(
        'match-uuid-1',
        'sender-uuid-1',
        '  Hello there!  ',
        mockClient
      );

      expect(mockFrom).toHaveBeenCalledWith('messages');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          match_id: 'match-uuid-1',
          sender_id: 'sender-uuid-1',
          body: 'Hello there!'
        })
      );
      expect(result.success).toBe(true);
      expect(result.message?.id).toBe('new-msg-uuid');
      expect(result.message?.body).toBe('Hello there!');
    });

    it('captures database trigger errors (e.g. blocked participant)', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Cannot send message: blocked by or blocking recipient' }
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      const mockClient = { from: mockFrom } as any;

      const result = await ChatService.sendMessage(
        'match-uuid-1',
        'sender-uuid-1',
        'Test message',
        mockClient
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot send message: blocked by or blocking recipient');
    });

    it('handles offline condition when sending a message', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true
      });

      const result = await ChatService.sendMessage('match-1', 'sender-1', 'Test message');
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

  describe('4. Read Receipts (mark_messages_read RPC)', () => {
    it('calls mark_messages_read RPC with p_match_id parameter', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockClient = { rpc: mockRpc } as any;

      const result = await ChatService.markMessagesRead('match-uuid-1', mockClient);

      expect(mockRpc).toHaveBeenCalledWith('mark_messages_read', { p_match_id: 'match-uuid-1' });
      expect(result.success).toBe(true);
    });

    it('handles RPC error when marking messages read', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not a participant in this match' }
      });
      const mockClient = { rpc: mockRpc } as any;

      const result = await ChatService.markMessagesRead('match-uuid-1', mockClient);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not a participant in this match');
    });

    it('returns error when matchId is not provided', async () => {
      const result = await ChatService.markMessagesRead('');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/match id is required/i);
    });
  });

  describe('5. Realtime Channel Subscription', () => {
    it('sets up a realtime channel filtered by match_id for message inserts', () => {
      const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
      const mockOn = vi.fn().mockReturnThis();
      const mockChannel = vi.fn().mockReturnValue({
        on: mockOn,
        subscribe: mockSubscribe
      });
      const mockClient = { channel: mockChannel } as any;

      const onNewMsg = vi.fn();
      const subscription = ChatService.subscribeToMessages('match-uuid-99', onNewMsg, mockClient);

      expect(mockChannel).toHaveBeenCalledWith('messages:match-uuid-99');
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'match_id=eq.match-uuid-99'
        },
        expect.any(Function)
      );
      expect(mockSubscribe).toHaveBeenCalled();
      expect(subscription).toBeDefined();
    });
  });
});
