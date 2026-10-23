-- ==============================================================================
-- Migration: 20261022000009_secure_waitlist_insert_and_email_definer.sql
-- Description:
--   1. Add user_id column to waitlist_entries if not exists.
--   2. Implement is_caller_email_confirmed() SECURITY DEFINER function with
--      SET search_path = public, pg_temp to safely inspect auth.users.
--   3. Require user_id = auth.uid(), email = auth.email(), and confirmed email
--      in the waitlist_entries insert policy.
--   4. Update derive_and_secure_waitlist_entry() trigger to enforce both user_id
--      and email on insert and update.
-- ==============================================================================

-- 1. Ensure user_id column exists on waitlist_entries
ALTER TABLE public.waitlist_entries 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. SECURITY DEFINER function to check caller's confirmed email
CREATE OR REPLACE FUNCTION public.is_caller_email_confirmed()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_confirmed_at TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT email_confirmed_at INTO v_confirmed_at
    FROM auth.users
    WHERE id = auth.uid();

    RETURN (v_confirmed_at IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.is_caller_email_confirmed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_caller_email_confirmed() TO authenticated;

-- 3. Update derive_and_secure_waitlist_entry trigger function
CREATE OR REPLACE FUNCTION public.derive_and_secure_waitlist_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_has_selfie BOOLEAN := FALSE;
    v_has_profile BOOLEAN := FALSE;
    v_verified_referrals INT := 0;
BEGIN
    -- Enforce authenticated verified email and user_id on insert
    IF TG_OP = 'INSERT' THEN
        IF auth.uid() IS NOT NULL THEN
            IF NEW.email IS NOT NULL AND NEW.email <> auth.email() THEN
                RAISE EXCEPTION 'Security Policy Violation: You can only register your own authenticated email.';
            END IF;
            IF NEW.user_id IS NOT NULL AND NEW.user_id <> auth.uid() THEN
                RAISE EXCEPTION 'Security Policy Violation: You can only register your own authenticated user id.';
            END IF;
            NEW.user_id := auth.uid();
            NEW.email := auth.email();
        END IF;

        -- Enforce initial server defaults
        NEW.status := 'waiting';
        NEW.admitted_at := NULL;
        NEW.created_at := COALESCE(NEW.created_at, NOW());
        NEW.days_on_list := 1;

        -- Lane assignment
        IF LOWER(NEW.gender) IN ('woman', 'female', 'non_binary', 'other') THEN
            NEW.lane := 'women_and_others';
        ELSE
            NEW.lane := 'men';
        END IF;
    END IF;

    -- On UPDATE: non-admins cannot change system fields
    IF TG_OP = 'UPDATE' AND NOT public.is_admin() THEN
        NEW.user_id := OLD.user_id;
        NEW.lane := OLD.lane;
        NEW.status := OLD.status;
        NEW.admitted_at := OLD.admitted_at;
        NEW.email := OLD.email;
    END IF;

    -- Check verified facts directly from database tables
    -- 1. Check if selfie was approved in verifications table
    SELECT EXISTS (
        SELECT 1 FROM public.verifications v
        JOIN public.users u ON u.id = v.user_id
        WHERE u.email = NEW.email AND v.result = 'approved'
    ) INTO v_has_selfie;

    -- 2. Check if profile is complete (3+ photos and non-empty bio)
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.users u ON u.id = p.user_id
        WHERE u.email = NEW.email 
          AND array_length(p.photos, 1) >= 3 
          AND p.bio IS NOT NULL AND p.bio <> ''
    ) INTO v_has_profile;

    -- 3. Check referrals where the invited user's selfie was verified
    SELECT COUNT(*) INTO v_verified_referrals
    FROM public.waitlist_entries ref_w
    JOIN public.users ref_u ON ref_u.email = ref_w.email
    JOIN public.verifications ref_v ON ref_v.user_id = ref_u.id
    WHERE ref_w.referred_by = NEW.email 
      AND ref_v.result = 'approved';

    NEW.has_selfie_approved := v_has_selfie;
    NEW.has_profile_complete := v_has_profile;
    NEW.referral_count := v_verified_referrals;

    -- Compute score strictly on server
    NEW.score := public.calculate_waitlist_score(
        NEW.city,
        NEW.has_selfie_approved,
        NEW.has_profile_complete,
        NEW.referral_count,
        COALESCE(NEW.created_at, NOW())
    );

    RETURN NEW;
END;
$$;

-- 4. Recreate RLS insert policy on waitlist_entries
DROP POLICY IF EXISTS "Authenticated users can join waitlist with confirmed email" ON public.waitlist_entries;
DROP POLICY IF EXISTS "Authenticated users can join waitlist with own email" ON public.waitlist_entries;
DROP POLICY IF EXISTS "waitlist_insert_authenticated" ON public.waitlist_entries;
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist_entries;

CREATE POLICY "waitlist_insert_authenticated"
ON public.waitlist_entries FOR INSERT
TO authenticated
WITH CHECK (
    status = 'waiting'
    AND user_id = auth.uid()
    AND email = auth.email()
    AND public.is_caller_email_confirmed()
);
