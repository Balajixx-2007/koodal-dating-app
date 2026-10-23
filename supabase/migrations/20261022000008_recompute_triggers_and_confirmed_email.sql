-- ==============================================================================
-- Migration: 20261022000008_recompute_triggers_and_confirmed_email.sql
-- Description:
--   1. Triggers on verifications and profiles to automatically recompute waitlist
--      scores whenever a selfie is approved or a profile is completed.
--   2. Strict confirmed email requirement in RLS insert policy (email_confirmed_at IS NOT NULL).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Trigger on verifications: Recompute waitlist score on selfie approval
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_verification_change_for_waitlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_email TEXT;
    v_is_approved BOOLEAN;
BEGIN
    SELECT email INTO v_user_email FROM public.users WHERE id = NEW.user_id;
    v_is_approved := (NEW.result = 'approved');

    IF v_user_email IS NOT NULL THEN
        -- Update the member's waitlist row without touching it directly from client
        UPDATE public.waitlist_entries
        SET has_selfie_approved = v_is_approved,
            score = public.calculate_waitlist_score(
                city,
                v_is_approved,
                has_profile_complete,
                referral_count,
                created_at
            )
        WHERE email = v_user_email;

        -- If approved, and member was referred by someone, update referrer's score
        IF v_is_approved THEN
            UPDATE public.waitlist_entries referrer
            SET referral_count = (
                SELECT COUNT(*) FROM public.waitlist_entries ref_w
                JOIN public.users ref_u ON ref_u.email = ref_w.email
                JOIN public.verifications ref_v ON ref_v.user_id = ref_u.id
                WHERE ref_w.referred_by = referrer.email AND ref_v.result = 'approved'
            ),
            score = public.calculate_waitlist_score(
                referrer.city,
                referrer.has_selfie_approved,
                referrer.has_profile_complete,
                (
                    SELECT COUNT(*) FROM public.waitlist_entries ref_w
                    JOIN public.users ref_u ON ref_u.email = ref_w.email
                    JOIN public.verifications ref_v ON ref_v.user_id = ref_u.id
                    WHERE ref_w.referred_by = referrer.email AND ref_v.result = 'approved'
                ),
                referrer.created_at
            )
            WHERE email = (SELECT referred_by FROM public.waitlist_entries WHERE email = v_user_email);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_verification_update_waitlist ON public.verifications;
CREATE TRIGGER tr_verification_update_waitlist
AFTER INSERT OR UPDATE OF result ON public.verifications
FOR EACH ROW EXECUTE FUNCTION public.handle_verification_change_for_waitlist();

-- ------------------------------------------------------------------------------
-- 2. Trigger on profiles: Recompute waitlist score on profile completion
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_profile_change_for_waitlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_email TEXT;
    v_is_complete BOOLEAN;
BEGIN
    SELECT email INTO v_user_email FROM public.users WHERE id = NEW.user_id;
    v_is_complete := (COALESCE(array_length(NEW.photos, 1), 0) >= 3 AND NEW.bio IS NOT NULL AND NEW.bio <> '');

    IF v_user_email IS NOT NULL THEN
        UPDATE public.waitlist_entries
        SET has_profile_complete = v_is_complete,
            score = public.calculate_waitlist_score(
                city,
                has_selfie_approved,
                v_is_complete,
                referral_count,
                created_at
            )
        WHERE email = v_user_email;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profile_update_waitlist ON public.profiles;
CREATE TRIGGER tr_profile_update_waitlist
AFTER INSERT OR UPDATE OF photos, bio ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_change_for_waitlist();

-- ------------------------------------------------------------------------------
-- 3. Item 4: Confirmed Email Requirement on waitlist_entries insert policy
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can join waitlist with own email" ON public.waitlist_entries;
DROP POLICY IF EXISTS "Authenticated users can join waitlist with confirmed email" ON public.waitlist_entries;

CREATE POLICY "Authenticated users can join waitlist with confirmed email"
ON public.waitlist_entries FOR INSERT
TO authenticated
WITH CHECK (
    status = 'waiting'
    AND email = auth.email()
    AND (
        (auth.jwt()->>'email_confirmed_at') IS NOT NULL
        OR EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
              AND email_confirmed_at IS NOT NULL
        )
    )
);
