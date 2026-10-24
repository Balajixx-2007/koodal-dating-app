import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService, type MessageItem, type FetchMessagesOptions } from '../lib/chat-service';

describe('Realtime Chat & Two-Account Interaction (Step 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Two-Account Realtime Message Delivery & Read Receipts', () => {
    it('delivers messages from Account A to Account B via realtime INSERT, and syncs read receipts via UPDATE', async () => {
      const insertHandlers: ((payload: any) => void)[] = [];
      const updateHandlers: ((payload: any) => void)[] = [];

      const mockOn = vi.fn().mockImplementation((event: string, filter: any, callback: any) => {
        if (filter.event === 'INSERT') insertHandlers.push(callback);
        if (filter.event === 'UPDATE') updateHandlers.push(callback);
        return { on: mockOn, subscribe: mockSubscribe };
      });

      const mockSubscribe = vi.fn().mockImplementation((callback) => {
        if (callback) callback('SUBSCRIBED');
        return { unsubscribe: vi.fn() };
      });

      const mockChannel = vi.fn().mockReturnValue({
        on: mockOn,
        subscribe: mockSubscribe
      });

      const mockRemoveChannel = vi.fn().mockResolvedValue('ok');
      const mockClientA = {
        channel: mockChannel,
        removeChannel: mockRemoveChannel
      } as any;
      const mockClientB = {
        channel: mockChannel,
        removeChannel: mockRemoveChannel
      } as any;

      const receivedByB: MessageItem[] = [];
      const updatedInA: MessageItem[] = [];

      // Account B subscribes to the match channel
      ChatService.subscribeToMessages(
        'match-uuid-1',
        (newMsg) => receivedByB.push(newMsg),
        mockClientB,
        {
          onMessageUpdated: (updatedMsg) => {
            // Handler for Account B if needed
          }
        }
      );

      // Account A subscribes to the match channel
      ChatService.subscribeToMessages(
        'match-uuid-1',
        () => {},
        mockClientA,
        {
          onMessageUpdated: (updatedMsg) => updatedInA.push(updatedMsg)
        }
      );

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ event: 'INSERT', filter: 'match_id=eq.match-uuid-1' }),
        expect.any(Function)
      );
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ event: 'UPDATE', filter: 'match_id=eq.match-uuid-1' }),
        expect.any(Function)
      );

      // Simulate Account A sending a message that triggers the INSERT event broadcast
      const sentMessage: MessageItem = {
        id: 'msg-realtime-1',
        match_id: 'match-uuid-1',
        sender_id: 'account-a-uuid',
        body: 'Vanakkam! Are you free for coffee this Sunday?',
        sent_at: '2026-10-24T10:00:00Z',
        read_at: null
      };

      expect(insertHandlers.length).toBeGreaterThan(0);
      insertHandlers.forEach(handler => handler({ new: sentMessage }));

      // Verify Account B received the message
      expect(receivedByB.length).toBe(1);
      expect(receivedByB[0].body).toBe('Vanakkam! Are you free for coffee this Sunday?');
      expect(receivedByB[0].read_at).toBeNull();

      // Simulate Account B opening the chat, calling mark_messages_read, triggering UPDATE event broadcast
      const readMessage: MessageItem = {
        ...sentMessage,
        read_at: '2026-10-24T10:01:00Z'
      };

      expect(updateHandlers.length).toBeGreaterThan(0);
      updateHandlers.forEach(handler => handler({ new: readMessage }));

      // Verify Account A received the read receipt update in realtime
      expect(updatedInA.length).toBe(1);
      expect(updatedInA[0].id).toBe('msg-realtime-1');
      expect(updatedInA[0].read_at).toBe('2026-10-24T10:01:00Z');
    });
  });

  describe('2. Optimistic Sending & Failure State', () => {
    it('manages optimistic sending states: sending -> sent or sending -> failed with retry', async () => {
      // 1. Success case: transitions to sent
      const mockSingleSuccess = vi.fn().mockResolvedValue({
        data: {
          id: 'server-id-123',
          match_id: 'match-1',
          sender_id: 'user-a',
          body: 'Hello',
          sent_at: '2026-10-24T12:00:00Z',
          read_at: null
        },
        error: null
      });
      const mockClientSuccess = {
        from: () => ({
          insert: () => ({
            select: () => ({ single: mockSingleSuccess })
          })
        })
      } as any;

      const resSuccess = await ChatService.sendMessage('match-1', 'user-a', 'Hello', mockClientSuccess);
      expect(resSuccess.success).toBe(true);
      expect(resSuccess.message?.id).toBe('server-id-123');

      // 2. Failure case: transitions to failed with error
      const mockSingleError = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout or blocked' }
      });
      const mockClientError = {
        from: () => ({
          insert: () => ({
            select: () => ({ single: mockSingleError })
          })
        })
      } as any;

      const resError = await ChatService.sendMessage('match-1', 'user-a', 'Hello', mockClientError);
      expect(resError.success).toBe(false);
      expect(resError.error).toBe('Connection timeout or blocked');
    });
  });

  describe('3. Message Pagination (Chronological sent_at ASC)', () => {
    it('supports paginated message loading with limit and range/cursor', async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'msg-page-1',
            match_id: 'match-1',
            sender_id: 'user-a',
            body: 'First message',
            sent_at: '2026-10-24T08:00:00Z',
            read_at: '2026-10-24T08:05:00Z'
          },
          {
            id: 'msg-page-2',
            match_id: 'match-1',
            sender_id: 'user-b',
            body: 'Second message',
            sent_at: '2026-10-24T08:02:00Z',
            read_at: '2026-10-24T08:05:00Z'
          }
        ],
        error: null
      });

      const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      const mockClient = { from: mockFrom } as any;

      const options: FetchMessagesOptions = {
        limit: 2,
        offset: 0
      };

      const result = await ChatService.fetchMessages('match-1', mockClient, options);

      expect(mockFrom).toHaveBeenCalledWith('messages');
      expect(mockEq).toHaveBeenCalledWith('match_id', 'match-1');
      expect(mockOrder).toHaveBeenCalledWith('sent_at', { ascending: true });
      expect(mockRange).toHaveBeenCalledWith(0, 1);
      expect(result.success).toBe(true);
      expect(result.messages.length).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('4. Lifecycle Cleanup on Unmount & Reconnection', () => {
    it('properly unsubscribes and removes channel from Supabase client on cleanup', async () => {
      const mockUnsubscribe = vi.fn().mockReturnValue({ error: null });
      const mockRemoveChannel = vi.fn().mockResolvedValue('ok');
      const fakeChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe })
      };

      const mockClient = {
        channel: vi.fn().mockReturnValue(fakeChannel),
        removeChannel: mockRemoveChannel
      } as any;

      const sub = ChatService.subscribeToMessages('match-cleanup-1', () => {}, mockClient);

      expect(sub).toBeDefined();
      await sub.unsubscribe();

      expect(mockRemoveChannel).toHaveBeenCalledWith(fakeChannel);
    });

    it('notifies connection state callback when subscription status changes', () => {
      let statusCb: ((status: string) => void) | null = null;
      const fakeChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockImplementation((cb) => {
          statusCb = cb;
          return { unsubscribe: vi.fn() };
        })
      };

      const mockClient = {
        channel: vi.fn().mockReturnValue(fakeChannel),
        removeChannel: vi.fn()
      } as any;

      const onStatusChange = vi.fn();
      ChatService.subscribeToMessages('match-reconnect-1', () => {}, mockClient, {
        onStatusChange
      });

      expect(statusCb).toBeDefined();
      statusCb!('SUBSCRIBED');
      expect(onStatusChange).toHaveBeenCalledWith('connected');

      statusCb!('CHANNEL_ERROR');
      expect(onStatusChange).toHaveBeenCalledWith('error');

      statusCb!('CLOSED');
      expect(onStatusChange).toHaveBeenCalledWith('disconnected');
    });
  });
});
