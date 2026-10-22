-- ==============================================================================
-- Migration: 20261022000003_core_tables_and_signup_trigger.sql
-- Description: Core tables, 18+ age enforcement constraint, and auth signup trigger
-- ==============================================================================

-- 1. Users Table (Mirroring auth.users with app status & consent records)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    terms_version TEXT NOT NULL DEFAULT '1.0'
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Table (Contains member identity, bio, intent, city, media)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    gender TEXT NOT NULL,
    intent relationship_intent NOT NULL DEFAULT 'long_term',
    bio TEXT DEFAULT '',
    bio_ta TEXT DEFAULT '',
    city TEXT NOT NULL,
    photos TEXT[] NOT NULL DEFAULT '{}',
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    occupation TEXT,
    education TEXT,
    interests TEXT[] NOT NULL DEFAULT '{}',
    prompts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Strict 18+ Age Constraint: Under-18 accounts are rejected at database level
    CONSTRAINT age_18_plus CHECK (birth_date <= (CURRENT_DATE - INTERVAL '18 years'))
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Preferences Table
CREATE TABLE IF NOT EXISTS public.preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    interested_in TEXT[] NOT NULL DEFAULT '{"everyone"}',
    min_age INT NOT NULL DEFAULT 18,
    max_age INT NOT NULL DEFAULT 60,
    max_distance_km INT NOT NULL DEFAULT 50,
    intent_filter relationship_intent[] DEFAULT NULL
);

ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- 4. Likes Table (Daily likes enforced on server)
CREATE TABLE IF NOT EXISTS public.likes (
    from_user UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    to_user UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (from_user, to_user)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- 5. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_match_pair UNIQUE (user_a, user_b),
    CONSTRAINT different_users CHECK (user_a <> user_b)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- 6. Messages Table (Realtime chat with participation verification)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. Blocks and Reports Table
CREATE TABLE IF NOT EXISTS public.blocks_and_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason report_reason NOT NULL,
    details TEXT,
    status report_status NOT NULL DEFAULT 'pending',
    reviewer UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT reporter_not_target CHECK (reporter <> target)
);

ALTER TABLE public.blocks_and_reports ENABLE ROW LEVEL SECURITY;

-- 8. Verifications Table (Gesture Selfie verification queue)
CREATE TABLE IF NOT EXISTS public.verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    selfie_path TEXT NOT NULL,
    result verification_result NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- 9. Waitlist Entries Table (Section 13)
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- 10. Admission Batches Table (Section 13)
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    women_admitted INT NOT NULL DEFAULT 0,
    men_admitted INT NOT NULL DEFAULT 0,
    ratio_before NUMERIC(4,2) NOT NULL,
    ratio_after NUMERIC(4,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Triggers: Automatic User & Profile Creation on Auth Signup
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_birth_date DATE;
    v_name TEXT;
    v_gender TEXT;
    v_intent relationship_intent;
    v_city TEXT;
BEGIN
    -- Extract birth date from raw_user_meta_data if passed during onboarding signup
    v_birth_date := (NEW.raw_user_meta_data->>'birth_date')::date;
    v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    v_gender := COALESCE(NEW.raw_user_meta_data->>'gender', 'other');
    v_intent := COALESCE((NEW.raw_user_meta_data->>'intent')::relationship_intent, 'long_term'::relationship_intent);
    v_city := COALESCE(NEW.raw_user_meta_data->>'city', 'Chennai');

    -- Insert into public.users
    INSERT INTO public.users (id, email, status, created_at, terms_accepted_at)
    VALUES (NEW.id, NEW.email, 'active', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- If birth date was provided at signup, enforce 18+ check and create profile
    IF v_birth_date IS NOT NULL THEN
        IF v_birth_date > (CURRENT_DATE - INTERVAL '18 years') THEN
            RAISE EXCEPTION 'Registration rejected: Member must be at least 18 years of age.';
        END IF;

        INSERT INTO public.profiles (
            user_id, name, birth_date, gender, intent, city, created_at
        )
        VALUES (
            NEW.id, v_name, v_birth_date, v_gender, v_intent, v_city, NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger fired after an auth.users record is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- Trigger: Mutual Match Creation on Reciprocal Like
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_mutual_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.likes
        WHERE from_user = NEW.to_user AND to_user = NEW.from_user
    ) THEN
        INSERT INTO public.matches (user_a, user_b, created_at)
        VALUES (
            LEAST(NEW.from_user, NEW.to_user),
            GREATEST(NEW.from_user, NEW.to_user),
            NOW()
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_like_created ON public.likes;
CREATE TRIGGER on_like_created
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.handle_mutual_like();
