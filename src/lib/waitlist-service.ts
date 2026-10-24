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
   * Supports both real DB schema (p_women_cap, p_dry_run) and simulation params (p_women_limit, p_men_limit).
   */
  static async executeBatchAdmission(
    city: string,
    womenLimit: number = 20,
    menLimitOrDryRun: number | boolean = false,
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    admittedWomen?: number;
    admittedMen?: number;
    activeWomen?: number;
    activeMen?: number;
    ratioBefore?: number;
    ratioAfter?: number;
    isHealthy?: boolean;
    error?: string;
  }> {
    try {
      const isDryRun = typeof menLimitOrDryRun === 'boolean' ? menLimitOrDryRun : false;
      const menLimit = typeof menLimitOrDryRun === 'number' ? menLimitOrDryRun : undefined;

      const rpcArgs: any = { p_city: city };
      if (typeof menLimitOrDryRun === 'boolean') {
        rpcArgs.p_women_cap = womenLimit;
        rpcArgs.p_dry_run = isDryRun;
      } else {
        rpcArgs.p_women_limit = womenLimit;
        rpcArgs.p_men_limit = menLimit;
      }

      const { data, error } = await client.rpc('admit_batch', rpcArgs);

      if (error) {
        return { success: false, error: error.message };
      }

      const row: any = Array.isArray(data) ? data[0] : (data || {});
      return {
        success: true,
        admittedWomen: row?.women_admitted ?? row?.admitted_women ?? 0,
        admittedMen: row?.men_admitted ?? row?.admitted_men ?? 0,
        activeWomen: row?.active_women_registered ?? row?.effective_women_before ?? 0,
        activeMen: row?.active_men_registered ?? row?.effective_men_before ?? 0,
        ratioBefore: row?.ratio_before ?? 1.0,
        ratioAfter: row?.ratio_after ?? 1.0,
        isHealthy: row?.is_ratio_after_healthy ?? true
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
