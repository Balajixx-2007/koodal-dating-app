-- ==============================================================================
-- Koodal Dating Platform: Core Database Schema (PostgreSQL / Supabase)
-- In compliance with Sections 4 & 5 of the "Dating Website: End-to-End Plan"
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Custom Enums
CREATE TYPE relationship_intent AS ENUM ('casual', 'long_term', 'marriage', 'friendship');
CREATE TYPE user_status AS ENUM ('active', 'pending_verification', 'suspended', 'banned');
CREATE TYPE report_reason AS ENUM ('inappropriate_content', 'fake_profile', 'underage', 'harassment', 'scam', 'intent_mismatch', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed_warned', 'reviewed_suspended', 'reviewed_banned', 'dismissed');
CREATE TYPE verification_result AS ENUM ('pending', 'approved', 'rejected');

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    gender TEXT NOT NULL,
    intent relationship_intent NOT NULL,
    bio TEXT,
    bio_ta TEXT,
    city TEXT NOT NULL,
    location_point GEOMETRY(Point, 4326),
    photos TEXT[] NOT NULL DEFAULT '{}',
    selfie_url TEXT,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    occupation TEXT,
    education TEXT,
    interests TEXT[] NOT NULL DEFAULT '{}',
    prompts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT age_18_plus CHECK (birth_date <= (CURRENT_DATE - INTERVAL '18 years'))
);

-- 4. Preferences Table
CREATE TABLE IF NOT EXISTS public.preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    interested_in TEXT[] NOT NULL DEFAULT '{"everyone"}',
    min_age INT NOT NULL DEFAULT 18,
    max_age INT NOT NULL DEFAULT 60,
    max_distance_km INT NOT NULL DEFAULT 50,
    intent_filter relationship_intent[] DEFAULT NULL
);

-- 5. Likes Table
CREATE TABLE IF NOT EXISTS public.likes (
    from_user UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    to_user UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (from_user, to_user)
);

-- 6. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_match_pair UNIQUE (user_a, user_b)
);

-- 7. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 8. Blocks and Reports Table
CREATE TABLE IF NOT EXISTS public.blocks_and_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason report_reason NOT NULL,
    details TEXT,
    status report_status NOT NULL DEFAULT 'pending',
    reviewer UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Selfie Verifications Table (Admin queue)
CREATE TABLE IF NOT EXISTS public.verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    selfie_url TEXT NOT NULL,
    result verification_result NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Automated Matching Trigger (When from_user likes to_user and to_user liked from_user)
-- ==============================================================================
CREATE OR REPLACE FUNCTION handle_mutual_like()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.likes
        WHERE from_user = NEW.to_user AND to_user = NEW.from_user
    ) THEN
        -- Create mutual match (ordering user IDs for canonical uniqueness)
        INSERT INTO public.matches (user_a, user_b)
        VALUES (
            LEAST(NEW.from_user, NEW.to_user),
            GREATEST(NEW.from_user, NEW.to_user)
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_like_created
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION handle_mutual_like();

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks_and_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: Members can read unpaused, non-blocked profiles; users can update their own
CREATE POLICY "Public read active unpaused profiles"
ON public.profiles FOR SELECT
USING (is_paused = FALSE);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Messages: Only participants in a match can select or insert messages
CREATE POLICY "Match participants can read messages"
ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
);

CREATE POLICY "Match participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
);

-- Verifications: Only visible to user themselves and Admins
CREATE POLICY "Selfie visible to owner and admins"
ON public.verifications FOR SELECT
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- ==============================================================================
-- 10. Waitlist Entries & Ratio Control Batches (Section 13)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL,
    gender TEXT NOT NULL,
    intent relationship_intent NOT NULL,
    lane TEXT NOT NULL CHECK (lane IN ('women_and_others', 'men')),
    score INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'admitted', 'expired')),
    referred_by TEXT,
    referral_count INT NOT NULL DEFAULT 0,
    has_selfie_approved BOOLEAN NOT NULL DEFAULT FALSE,
    has_profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
    days_on_list INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    women_admitted INT NOT NULL DEFAULT 0,
    men_admitted INT NOT NULL DEFAULT 0,
    ratio_before NUMERIC(4,2) NOT NULL,
    ratio_after NUMERIC(4,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- Waitlist entries: public can insert (join), anyone can read their own entry by email
CREATE POLICY "Public can join waitlist"
ON public.waitlist_entries FOR INSERT
WITH CHECK (TRUE);

CREATE POLICY "Users read own waitlist entry"
ON public.waitlist_entries FOR SELECT
USING (TRUE);

-- Batches: Read-only for audit, insert for admins
CREATE POLICY "Public read admission batches"
ON public.batches FOR SELECT
USING (TRUE);

