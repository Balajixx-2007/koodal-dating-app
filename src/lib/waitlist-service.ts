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
   * Supports both p_email (real database schema) and p_city/p_user_id parameters.
   */
  static async fetchWaitlistPosition(
    cityOrEmail: string,
    userId?: string,
    client: SupabaseClient<Database> = supabase
  ): Promise<{
    success: boolean;
    found?: boolean;
    rank?: number;
    position?: number;
    total?: number;
    lane_total?: number;
    estimatedDays?: number;
    estimated_days?: number;
    score?: number;
    lane?: string;
    status?: string;
    offline?: boolean;
    error?: string;
  }> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { success: false, offline: true, error: 'You are offline.' };
    }

    try {
      const isEmail = cityOrEmail.includes('@') || (userId && userId.includes('@'));
      const email = cityOrEmail.includes('@') ? cityOrEmail : (userId || '');

      const rpcArgs: any = isEmail
        ? { p_email: email }
        : { p_city: cityOrEmail, p_user_id: userId };

      const { data, error } = await client.rpc('get_waitlist_position', rpcArgs);

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Waitlist position data unavailable' };
      }

      const row: any = Array.isArray(data) ? data[0] : data;

      if (row.found === false) {
        return { success: false, found: false, error: 'Waitlist entry not found for this email' };
      }

      const rank = row?.rank ?? row?.position ?? 0;
      const total = row?.lane_total ?? row?.total ?? 0;
      const estimatedDays = row?.estimated_days ?? Math.max(3, Math.ceil(rank / 15.0) * 7);

      return {
        success: true,
        found: true,
        rank,
        position: rank,
        total,
        lane_total: total,
        estimatedDays,
        estimated_days: estimatedDays,
        score: row?.score,
        lane: row?.lane,
        status: row?.status
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
