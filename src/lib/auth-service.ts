import { supabase, isOnline } from './supabase';
import type { Database, RelationshipIntent } from '../types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface OnboardingFormData {
  name: string;
  birthDate: string;
  gender: 'woman' | 'man' | 'non_binary' | 'other';
  intent: RelationshipIntent;
  city: string;
  bio: string;
  bioTa?: string | null;
  interests: string[];
  prompts?: Array<{ question: string; answer: string; questionTa?: string }>;
}

export interface ProfilePayload {
  user_id: string;
  name: string;
  birth_date: string;
  gender: 'woman' | 'man' | 'non_binary' | 'other';
  intent: RelationshipIntent;
  city: string;
  bio: string;
  bio_ta: string | null;
  interests: string[];
  prompts: any;
  is_paused: boolean;
}

/**
 * Validates birth date strictly enforcing the 18+ legal requirement.
 */
export function validateBirthDateAge(birthDateStr: string): { valid: boolean; age?: number; error?: string } {
  if (!birthDateStr || typeof birthDateStr !== 'string') {
    return { valid: false, error: 'Please enter a valid birth date.' };
  }

  // Parse YYYY-MM-DD safely
  const parts = birthDateStr.split('-');
  if (parts.length !== 3) {
    return { valid: false, error: 'Please enter a valid birth date in YYYY-MM-DD format.' };
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed month
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return { valid: false, error: 'Please enter a valid birth date.' };
  }

  const birthDate = new Date(year, month, day);
  if (
    birthDate.getFullYear() !== year || 
    birthDate.getMonth() !== month || 
    birthDate.getDate() !== day
  ) {
    return { valid: false, error: 'Please enter a valid calendar date.' };
  }

  const today = new Date();
  if (birthDate > today) {
    return { valid: false, error: 'Birth date cannot be in the future.' };
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 18) {
    return { valid: false, error: 'You must be 18 years of age or older to join.' };
  }

  return { valid: true, age };
}

/**
 * Validates email format with standard email regex.
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required.' };
  }

  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  return { valid: true };
}

/**
 * Maps untrusted client onboarding form state strictly to allowed database profile columns.
 * Enforces interests cap of 6, strips any client-injected role, status, or verification fields.
 */
export function mapOnboardingToProfilePayload(userId: string, formData: OnboardingFormData): ProfilePayload {
  return {
    user_id: userId,
    name: formData.name.trim(),
    birth_date: formData.birthDate,
    gender: formData.gender,
    intent: formData.intent,
    city: formData.city.trim(),
    bio: formData.bio.trim(),
    bio_ta: formData.bioTa ? formData.bioTa.trim() : null,
    interests: (formData.interests || []).slice(0, 6),
    prompts: formData.prompts || [],
    is_paused: false
  };
}

/**
 * Authentication operations with offline detection and age gating.
 */
export const AuthService = {
  async signInWithMagicLink(
    email: string, 
    ageConfirmed: boolean
  ): Promise<{ success: boolean; offline?: boolean; error?: string }> {
    if (!ageConfirmed) {
      return { success: false, error: 'You must confirm that you are 18 years of age or older.' };
    }

    if (!isOnline()) {
      return { 
        success: false, 
        offline: true, 
        error: 'You appear to be offline. Please check your internet connection.' 
      };
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return { success: false, error: emailCheck.error };
    }

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred during sign-in.' };
    }
  },

  async signOut(): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to sign out.' };
    }
  },

  async getSession() {
    return await supabase.auth.getSession();
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

/**
 * Profile database operations enforcing age gating and untrusted client protections.
 */
export const ProfileService = {
  async saveOnboardingProfile(
    userId: string, 
    data: OnboardingFormData
  ): Promise<{ success: boolean; offline?: boolean; error?: string; profile?: any }> {
    const ageCheck = validateBirthDateAge(data.birthDate);
    if (!ageCheck.valid) {
      return { success: false, error: ageCheck.error };
    }

    if (!isOnline()) {
      return { 
        success: false, 
        offline: true, 
        error: 'You appear to be offline. Please check your internet connection.' 
      };
    }

    const payload = mapOnboardingToProfilePayload(userId, data);

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, profile };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save profile.' };
    }
  },

  async getMyProfile(userId: string) {
    return await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
  }
};

/**
 * Resolves user role strictly from the server-side `is_admin` RPC.
 * Untrusted client cannot claim admin privileges through client-side state.
 */
export async function resolveUserRole(
  userId: string, 
  client?: SupabaseClient<Database>
): Promise<'member' | 'admin'> {
  try {
    const supabaseClient = client || (supabase as any);
    const { data, error } = await supabaseClient.rpc('is_admin', { user_uuid: userId });

    if (error || !data) {
      return 'member';
    }

    return data === true ? 'admin' : 'member';
  } catch {
    return 'member';
  }
}
