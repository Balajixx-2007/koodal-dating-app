import { supabase } from './supabase';
import type { Database, RelationshipIntent, WaitlistLane } from '../types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface JoinWaitlistPayload {
  userId: string;
  email: string;
  city: string;
  gender: string;
  intent: RelationshipIntent;
  referredBy?: string;
}

export class WaitlistService {
  /**
   * Automatically computes the proper lane ('women_and_others' or 'men') and inserts entry.
   */
  static async joinWaitlist(
    data: JoinWaitlistPayload,
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    entry?: any;
    offline?: boolean;
    error?: string;
  }> {
    if (!data.userId || !data.email) {
      return { success: false, error: 'User ID and email are required' };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { success: false, offline: true, error: 'You are offline. Cannot join waitlist.' };
    }

    const lane: WaitlistLane =
      data.gender === 'woman' || data.gender === 'non_binary' || data.gender === 'other'
        ? 'women_and_others'
        : 'men';

    try {
      const { data: entry, error } = await client
        .from('waitlist_entries')
        .insert({
          user_id: data.userId,
          email: data.email,
          city: data.city,
          gender: data.gender,
          intent: data.intent,
          lane,
          referred_by: data.referredBy || null
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, entry };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to join waitlist' };
    }
  }

  /**
   * Fetches waitlist rank and total in city via the SECURITY DEFINER RPC.
   */
  static async fetchWaitlistPosition(
    city: string,
    userId: string,
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    position?: number;
    total?: number;
    offline?: boolean;
    error?: string;
  }> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { success: false, offline: true, error: 'You are offline.' };
    }

    try {
      const { data, error } = await client.rpc('get_waitlist_position', {
        p_city: city,
        p_user_id: userId
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const row = data?.[0];
      return {
        success: true,
        position: row?.position ?? 0,
        total: row?.total ?? 0
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetches the user's waitlist row.
   */
  static async fetchUserWaitlistEntry(
    userId: string,
    client: SupabaseClient<Database> = supabase
  ): Promise<{ success: boolean; entry?: any; error?: string }> {
    try {
      const { data, error } = await client
        .from('waitlist_entries')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, entry: data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetches all waitlist entries for a given city for admin ratio management.
   */
  static async fetchAdminWaitlistQueues(
    city: string,
    client: SupabaseClient<Database> = supabase
  ): Promise<{ success: boolean; entries: any[]; error?: string }> {
    try {
      const { data, error } = await client
        .from('waitlist_entries')
        .select('*')
        .ilike('city', `%${city}%`)
        .order('score', { ascending: false });

      if (error) {
        return { success: false, entries: [], error: error.message };
      }

      return { success: true, entries: data || [] };
    } catch (err: any) {
      return { success: false, entries: [], error: err.message };
    }
  }

  /**
   * Executes batch admission for ratio control via admit_batch RPC.
   */
  static async executeBatchAdmission(
    city: string,
    womenLimit: number,
    menLimit: number,
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    admittedWomen?: number;
    admittedMen?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await client.rpc('admit_batch', {
        p_city: city,
        p_women_limit: womenLimit,
        p_men_limit: menLimit
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const row = data?.[0];
      return {
        success: true,
        admittedWomen: row?.admitted_women ?? 0,
        admittedMen: row?.admitted_men ?? 0
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
