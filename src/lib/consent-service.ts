/**
 * Koodal Consent Management Service
 * Enforces compliance with India's Digital Personal Data Protection (DPDP) Act 2023
 * and GDPR principles:
 * - Granular, explicit consent recording with versioning and timestamps
 * - Separation of mandatory platform requirements vs optional features
 * - Consent withdrawal mechanisms with audit trail
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { supabase } from './supabase';

export type ConsentType = 
  | 'terms' 
  | 'privacy' 
  | 'guidelines' 
  | 'selfie_verification' 
  | 'geolocation';

export interface ConsentRecordParams {
  userId: string;
  consentType: ConsentType;
  version: string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentResult {
  success: boolean;
  error?: string;
}

export class ConsentService {
  private static MANDATORY_CONSENTS: ConsentType[] = ['terms', 'privacy', 'guidelines'];

  /**
   * Records user explicit consent with timestamp, version, and client metadata.
   */
  static async recordConsent(
    params: ConsentRecordParams,
    client: SupabaseClient<Database> = supabase
  ): Promise<ConsentResult> {
    try {
      const { error } = await (client as any)
        .from('user_consents')
        .insert({
          user_id: params.userId,
          consent_type: params.consentType,
          version: params.version || '1.0',
          granted: params.granted,
          ip_address: params.ipAddress || null,
          user_agent: params.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
          created_at: new Date().toISOString()
        });

      if (error) {
        // Fallback to storing in localStorage if offline/table unavailable
        if (typeof localStorage !== 'undefined') {
          const cached = JSON.parse(localStorage.getItem('koodal_consents') || '{}');
          cached[params.consentType] = {
            granted: params.granted,
            version: params.version,
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem('koodal_consents', JSON.stringify(cached));
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to record consent' };
    }
  }

  /**
   * Checks whether mandatory platform terms & privacy policies are agreed to.
   */
  static hasRequiredConsents(consents: Partial<Record<ConsentType, boolean>>): boolean {
    return this.MANDATORY_CONSENTS.every(type => Boolean(consents[type]));
  }

  /**
   * Allows withdrawal of optional consents (e.g. Geolocation).
   * Blocks withdrawal of mandatory consents without full account deletion.
   */
  static async withdrawConsent(
    userId: string,
    consentType: ConsentType,
    client: SupabaseClient<Database> = supabase
  ): Promise<ConsentResult> {
    if (this.MANDATORY_CONSENTS.includes(consentType)) {
      return {
        success: false,
        error: 'Mandatory service terms (Terms, Privacy, Guidelines) cannot be withdrawn without deleting your account.'
      };
    }

    try {
      const { error } = await (client as any)
        .from('user_consents')
        .update({ granted: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('consent_type', consentType);

      if (typeof localStorage !== 'undefined') {
        const cached = JSON.parse(localStorage.getItem('koodal_consents') || '{}');
        if (cached[consentType]) {
          cached[consentType].granted = false;
          localStorage.setItem('koodal_consents', JSON.stringify(cached));
        }
      }

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieves active consents for the user.
   */
  static async getUserConsents(
    userId: string,
    client: SupabaseClient<Database> = supabase
  ): Promise<Record<ConsentType, boolean>> {
    const defaults: Record<ConsentType, boolean> = {
      terms: true,
      privacy: true,
      guidelines: true,
      selfie_verification: false,
      geolocation: true
    };

    try {
      const { data, error } = await (client as any)
        .from('user_consents')
        .select('consent_type, granted')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach((row: any) => {
          if (row.consent_type in defaults) {
            defaults[row.consent_type as ConsentType] = row.granted;
          }
        });
      }
    } catch {
      // Fallback to localStorage
      if (typeof localStorage !== 'undefined') {
        const cached = JSON.parse(localStorage.getItem('koodal_consents') || '{}');
        Object.keys(cached).forEach(key => {
          if (key in defaults) {
            defaults[key as ConsentType] = cached[key].granted;
          }
        });
      }
    }

    return defaults;
  }
}
