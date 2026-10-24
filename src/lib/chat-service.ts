import { supabase } from './supabase';
import type { Database, RelationshipIntent } from '../types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface MatchListItem {
  match_id: string;
  matched_user_id: string;
  name: string;
  age: number;
  city: string;
  intent: RelationshipIntent;
  avatar_url: string | null;
  last_message_body: string | null;
  last_message_sent_at: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
}

export interface MessageItem {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}

export interface FetchMessagesOptions {
  limit?: number;
  offset?: number;
  beforeSentAt?: string;
}

export interface SubscribeMessagesOptions {
  onMessageUpdated?: (msg: MessageItem) => void;
  onStatusChange?: (status: 'connected' | 'error' | 'disconnected') => void;
}

export class ChatService {
  /**
   * Fetches active matches for the authenticated caller via the SECURITY DEFINER RPC.
   * Excludes blocked, banned, suspended, or unadmitted partners.
   */
  static async fetchMatchesList(
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    matches: MatchListItem[];
    offline?: boolean;
    error?: string;
  }> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        success: false,
        matches: [],
        offline: true,
        error: 'You are offline. Cannot load matches.'
      };
    }

    try {
      const { data, error } = await client.rpc('get_matches_list');

      if (error) {
        return {
          success: false,
          matches: [],
          error: error.message
        };
      }

      return {
        success: true,
        matches: (data || []) as MatchListItem[]
      };
    } catch (err: any) {
      return {
        success: false,
        matches: [],
        error: err.message || 'Failed to fetch matches'
      };
    }
  }

  /**
   * Fetches messages for a given match, ordered chronologically by sent_at ASC.
   * Supports pagination options: limit, offset, and beforeSentAt.
   * Note: The database column is strictly `sent_at` (NOT `created_at`).
   */
  static async fetchMessages(
    matchId: string,
    client: SupabaseClient<Database> = supabase,
    options?: FetchMessagesOptions
  ): Promise<{
    success: boolean;
    messages: MessageItem[];
    hasMore?: boolean;
    offline?: boolean;
    error?: string;
  }> {
    if (!matchId || !matchId.trim()) {
      return {
        success: false,
        messages: [],
        error: 'Match ID is required'
      };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        success: false,
        messages: [],
        offline: true,
        error: 'You are offline. Cannot load messages.'
      };
    }

    try {
      let query: any = client
        .from('messages')
        .select('*')
        .eq('match_id', matchId.trim());

      if (options?.beforeSentAt) {
        query = query.lt('sent_at', options.beforeSentAt);
      }

      query = query.order('sent_at', { ascending: true });

      if (options?.limit !== undefined) {
        const offset = options.offset || 0;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          messages: [],
          error: error.message
        };
      }

      const msgs = (data || []) as MessageItem[];
      return {
        success: true,
        messages: msgs,
        hasMore: options?.limit !== undefined ? msgs.length >= options.limit : false
      };
    } catch (err: any) {
      return {
        success: false,
        messages: [],
        error: err.message || 'Failed to fetch messages'
      };
    }
  }

  /**
   * Sends a message in a match.
   * Validates length (1-2000 chars) and relies on DB triggers to verify active sender
   * and enforce bidirectional block check.
   */
  static async sendMessage(
    matchId: string,
    senderId: string,
    body: string,
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    message?: MessageItem;
    offline?: boolean;
    error?: string;
  }> {
    if (!matchId || !matchId.trim()) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }

    if (!senderId || !senderId.trim()) {
      return {
        success: false,
        error: 'Sender ID is required'
      };
    }

    const trimmedBody = (body || '').trim();
    if (trimmedBody.length < 1 || trimmedBody.length > 2000) {
      return {
        success: false,
        error: 'Message body must be between 1 and 2000 characters'
      };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        success: false,
        offline: true,
        error: 'You are offline. Cannot send message.'
      };
    }

    try {
      const { data, error } = await client
        .from('messages')
        .insert({
          match_id: matchId.trim(),
          sender_id: senderId.trim(),
          body: trimmedBody,
          sent_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        message: data as MessageItem
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to send message'
      };
    }
  }

  /**
   * Calls the SECURITY DEFINER function `mark_messages_read` to update incoming messages' read_at.
   */
  static async markMessagesRead(
    matchId: string,
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    offline?: boolean;
    error?: string;
  }> {
    if (!matchId || !matchId.trim()) {
      return {
        success: false,
        error: 'Match ID is required'
      };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        success: false,
        offline: true,
        error: 'You are offline. Cannot mark messages as read.'
      };
    }

    try {
      const { error } = await client.rpc('mark_messages_read', {
        p_match_id: matchId.trim()
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to mark messages as read'
      };
    }
  }

  /**
   * Subscribes to realtime messages (INSERT and UPDATE for read receipts) for a given match.
   * Cleans up channel cleanly on unsubscribe.
   */
  static subscribeToMessages(
    matchId: string,
    onNewMessage: (msg: MessageItem) => void,
    client: SupabaseClient<Database> = supabase,
    options?: SubscribeMessagesOptions
  ) {
    const channelName = `messages:${matchId}`;
    let activeChannel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`
        },
        (payload: any) => {
          if (payload?.new) {
            onNewMessage(payload.new as MessageItem);
          }
        }
      );

    if (options?.onMessageUpdated) {
      activeChannel = activeChannel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`
        },
        (payload: any) => {
          if (payload?.new && options.onMessageUpdated) {
            options.onMessageUpdated(payload.new as MessageItem);
          }
        }
      );
    }

    const subscription = activeChannel.subscribe((status: string) => {
      if (options?.onStatusChange) {
        if (status === 'SUBSCRIBED') {
          options.onStatusChange('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          options.onStatusChange('error');
        } else if (status === 'CLOSED') {
          options.onStatusChange('disconnected');
        }
      }
    });

    return {
      channel: activeChannel,
      unsubscribe: async () => {
        try {
          if (typeof subscription?.unsubscribe === 'function') {
            subscription.unsubscribe();
          } else if (typeof activeChannel?.unsubscribe === 'function') {
            activeChannel.unsubscribe();
          }
        } catch {
          // ignore
        }

        try {
          if (typeof client?.removeChannel === 'function') {
            await client.removeChannel(activeChannel);
          }
        } catch {
          // ignore
        }
      }
    };
  }
}
