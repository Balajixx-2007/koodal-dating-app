export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RelationshipIntent = 'casual' | 'long_term' | 'marriage' | 'friendship';
export type UserStatus = 'active' | 'suspended' | 'banned';
export type VerificationResult = 'pending' | 'approved' | 'rejected';
export type PhotoStatus = 'pending' | 'approved' | 'rejected';
export type ReportReason = 'harassment' | 'fake_profile' | 'inappropriate_content' | 'underage' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type WaitlistStatus = 'waiting' | 'admitted' | 'expired';
export type WaitlistLane = 'women_and_others' | 'men';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          status: UserStatus;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          status?: UserStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          status?: UserStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          name: string;
          birth_date: string;
          gender: 'woman' | 'man' | 'non_binary' | 'other';
          intent: RelationshipIntent;
          city: string;
          bio: string;
          bio_ta: string | null;
          interests: string[];
          prompts: Json;
          is_paused: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          birth_date: string;
          gender: 'woman' | 'man' | 'non_binary' | 'other';
          intent: RelationshipIntent;
          city: string;
          bio: string;
          bio_ta?: string | null;
          interests?: string[];
          prompts?: Json;
          is_paused?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          name?: string;
          birth_date?: string;
          gender?: 'woman' | 'man' | 'non_binary' | 'other';
          intent?: RelationshipIntent;
          city?: string;
          bio?: string;
          bio_ta?: string | null;
          interests?: string[];
          prompts?: Json;
          is_paused?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      preferences: {
        Row: {
          user_id: string;
          interested_in: string[];
          min_age: number;
          max_age: number;
          max_distance_km: number;
          intent_filter: RelationshipIntent[] | null;
        };
        Insert: {
          user_id: string;
          interested_in?: string[];
          min_age?: number;
          max_age?: number;
          max_distance_km?: number;
          intent_filter?: RelationshipIntent[] | null;
        };
        Update: {
          user_id?: string;
          interested_in?: string[];
          min_age?: number;
          max_age?: number;
          max_distance_km?: number;
          intent_filter?: RelationshipIntent[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      profile_photos: {
        Row: {
          id: string;
          owner: string;
          storage_path: string;
          position: number;
          status: PhotoStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner: string;
          storage_path: string;
          position?: number;
          status?: PhotoStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner?: string;
          storage_path?: string;
          position?: number;
          status?: PhotoStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_photos_owner_fkey";
            columns: ["owner"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      verifications: {
        Row: {
          id: string;
          user_id: string;
          selfie_path: string;
          result: VerificationResult;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          selfie_path: string;
          result?: VerificationResult;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          selfie_path?: string;
          result?: VerificationResult;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      waitlist_entries: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          city: string;
          gender: string;
          intent: RelationshipIntent;
          lane: WaitlistLane;
          score: number;
          status: WaitlistStatus;
          referred_by: string | null;
          referral_count: number;
          has_selfie_approved: boolean;
          has_profile_complete: boolean;
          days_on_list: number;
          created_at: string;
          admitted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          city: string;
          gender: string;
          intent: RelationshipIntent;
          lane?: WaitlistLane;
          score?: number;
          status?: WaitlistStatus;
          referred_by?: string | null;
          referral_count?: number;
          has_selfie_approved?: boolean;
          has_profile_complete?: boolean;
          days_on_list?: number;
          created_at?: string;
          admitted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          city?: string;
          gender?: string;
          intent?: RelationshipIntent;
          lane?: WaitlistLane;
          score?: number;
          status?: WaitlistStatus;
          referred_by?: string | null;
          referral_count?: number;
          has_selfie_approved?: boolean;
          has_profile_complete?: boolean;
          days_on_list?: number;
          created_at?: string;
          admitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      matches: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_a: string;
          user_b: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_a?: string;
          user_b?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          match_id: string;
          sender_id: string;
          body: string;
          sent_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          match_id: string;
          sender_id: string;
          body: string;
          sent_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          match_id?: string;
          sender_id?: string;
          body?: string;
          sent_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          from_user: string;
          to_user: string;
          created_at: string;
        };
        Insert: {
          from_user: string;
          to_user: string;
          created_at?: string;
        };
        Update: {
          from_user?: string;
          to_user?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      passes: {
        Row: {
          user_id: string;
          target_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          target_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          target_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          blocker: string;
          blocked: string;
          created_at: string;
        };
        Insert: {
          blocker: string;
          blocked: string;
          created_at?: string;
        };
        Update: {
          blocker?: string;
          blocked?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          reason: ReportReason;
          details: string | null;
          status: ReportStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          action_taken: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_id: string;
          reason: ReportReason;
          details?: string | null;
          status?: ReportStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          action_taken?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_id?: string;
          reason?: ReportReason;
          details?: string | null;
          status?: ReportStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          action_taken?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admins: {
        Row: {
          user_id: string;
          granted_at: string;
          granted_by: string | null;
          notes: string | null;
        };
        Insert: {
          user_id: string;
          granted_at?: string;
          granted_by?: string | null;
          notes?: string | null;
        };
        Update: {
          user_id?: string;
          granted_at?: string;
          granted_by?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: string;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      can_view_member: {
        Args: { p_viewer_id: string; p_target_id: string };
        Returns: boolean;
      };
      get_discovery_feed: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          user_id: string;
          name: string;
          age: number;
          city: string;
          intent: RelationshipIntent;
          bio: string;
          bio_ta: string | null;
          interests: string[];
          prompts: Json;
          photos: string[];
        }[];
      };
      get_member_profile: {
        Args: { p_target_id: string };
        Returns: {
          user_id: string;
          name: string;
          age: number;
          city: string;
          intent: RelationshipIntent;
          bio: string;
          bio_ta: string | null;
          interests: string[];
          prompts: Json;
          photos: string[];
        }[];
      };
      get_matches_list: {
        Args: Record<PropertyKey, never>;
        Returns: {
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
        }[];
      };
      mark_messages_read: {
        Args: { p_match_id: string };
        Returns: void;
      };
      is_admin: {
        Args: { user_uuid?: string };
        Returns: boolean;
      };
      is_email_confirmed: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_waitlist_position: {
        Args: { p_city: string; p_user_id: string };
        Returns: { position: number; total: number }[];
      };
      admit_batch: {
        Args: { p_city: string; p_women_limit?: number; p_men_limit?: number };
        Returns: { admitted_women: number; admitted_men: number }[];
      };
    };
  };
}
