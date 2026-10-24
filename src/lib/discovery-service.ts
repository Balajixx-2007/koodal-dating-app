import { supabase, isOnline } from './supabase';
import type { Database, RelationshipIntent } from '../types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface DiscoveryProfile {
  user_id: string;
  name: string;
  age: number;
  city: string;
  intent: RelationshipIntent;
  bio: string;
  bio_ta: string | null;
  interests: string[];
  prompts: Array<{ id?: string; question: string; answer: string; questionTa?: string }>;
  photos: string[];
}

export interface FetchFeedResult {
  success: boolean;
  profiles: DiscoveryProfile[];
  offline?: boolean;
  error?: string;
}

export interface LikeResult {
  success: boolean;
  isMatch?: boolean;
  match?: any;
  limitReached?: boolean;
  offline?: boolean;
  error?: string;
}

export interface PassResult {
  success: boolean;
  offline?: boolean;
  error?: string;
}

export const DiscoveryService = {
  /**
   * Fetches the discovery feed via the server-side `get_discovery_feed` SECURITY DEFINER RPC.
   * Strips all untrusted fields; enforces same-city, admission, approved photo, and non-blocked filters.
   */
  async fetchFeed(
    options?: { limit?: number; offset?: number },
    client?: SupabaseClient<Database>
  ): Promise<FetchFeedResult> {
    if (!isOnline()) {
      return {
        success: false,
        offline: true,
        profiles: [],
        error: 'You appear to be offline. Please check your internet connection.'
      };
    }

    try {
      const supabaseClient = client || (supabase as any);
      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;

      const { data, error } = await supabaseClient.rpc('get_discovery_feed', {
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        return {
          success: false,
          profiles: [],
          error: error.message
        };
      }

      const profiles: DiscoveryProfile[] = (data || []).map((row: any) => ({
        user_id: row.user_id,
        name: row.name,
        age: row.age,
        city: row.city,
        intent: row.intent,
        bio: row.bio,
        bio_ta: row.bio_ta || null,
        interests: row.interests || [],
        prompts: Array.isArray(row.prompts) ? row.prompts : [],
        photos: row.photos || []
      }));

      return {
        success: true,
        profiles
      };
    } catch (err: any) {
      return {
        success: false,
        profiles: [],
        error: err.message || 'Failed to fetch discovery feed.'
      };
    }
  },

  /**
   * Records a like in the `likes` table.
   * Catches database 20 likes/day trigger exception and checks for mutual match creation.
   */
  async likeProfile(
    callerId: string,
    targetUserId: string,
    client?: SupabaseClient<Database>
  ): Promise<LikeResult> {
    if (!isOnline()) {
      return {
        success: false,
        offline: true,
        error: 'You appear to be offline. Likes cannot be submitted while offline.'
      };
    }

    try {
      const supabaseClient = client || (supabase as any);

      const { error: likeError } = await supabaseClient
        .from('likes')
        .insert({
          from_user: callerId,
          to_user: targetUserId
        });

      if (likeError) {
        if (likeError.message && likeError.message.includes('20 likes in a 24-hour window')) {
          return {
            success: false,
            limitReached: true,
            error: 'Daily like limit reached (20 likes per day). Please try again tomorrow!'
          };
        }
        return {
          success: false,
          error: likeError.message
        };
      }

      // Check if mutual match was created by database trigger
      const { data: match, error: matchError } = await supabaseClient
        .from('matches')
        .select('*')
        .or(`and(user_a.eq.${callerId},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${callerId})`)
        .maybeSingle();

      if (!matchError && match) {
        return {
          success: true,
          isMatch: true,
          match
        };
      }

      return {
        success: true,
        isMatch: false
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to record like.'
      };
    }
  },

  /**
   * Records a pass in the `passes` table.
   */
  async passProfile(
    callerId: string,
    targetUserId: string,
    client?: SupabaseClient<Database>
  ): Promise<PassResult> {
    if (!isOnline()) {
      return {
        success: false,
        offline: true,
        error: 'You appear to be offline.'
      };
    }

    try {
      const supabaseClient = client || (supabase as any);
      const { error } = await supabaseClient
        .from('passes')
        .insert({
          user_id: callerId,
          target_id: targetUserId
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to record pass.'
      };
    }
  },

  /**
   * Fetches full profile details for a target member via `get_member_profile` RPC.
   * Only returns the profile if caller has view permissions (can_view_member).
   */
  async getMemberProfile(
    targetUserId: string,
    client?: SupabaseClient<Database>
  ): Promise<DiscoveryProfile | null> {
    try {
      const supabaseClient = client || (supabase as any);
      const { data, error } = await supabaseClient.rpc('get_member_profile', {
        p_target_id: targetUserId
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const row = data[0];
      return {
        user_id: row.user_id,
        name: row.name,
        age: row.age,
        city: row.city,
        intent: row.intent,
        bio: row.bio,
        bio_ta: row.bio_ta || null,
        interests: row.interests || [],
        prompts: Array.isArray(row.prompts) ? row.prompts : [],
        photos: row.photos || []
      };
    } catch {
      return null;
    }
  }
};
