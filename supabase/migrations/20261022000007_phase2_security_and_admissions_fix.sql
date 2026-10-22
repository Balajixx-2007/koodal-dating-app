-- ==============================================================================
-- Migration: 20261022000007_phase2_security_and_admissions_fix.sql
-- Description: Phase 2 Fix Pass:
--   1. admit_batch uses floor() instead of round().
--   2. Referral points capped at +10 max, score capped at 100 max.
--   3. Count admitted-but-unclaimed members as active until claim window expires.
--   4. Per-city advisory lock in admit_batch, search_path isolation, moderation cap.
--   5. Score inputs verified directly from profiles and verifications tables.
--   6. Require authenticated/verified email for waitlist join with rate limiting.
--   7. Append-only enforcement on audit_log (strict trigger blocking UPDATE/DELETE/TRUNCATE).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1 & 2. Score Calculation: Capped at 100 max, +10 max referral points
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_waitlist_score(
    p_city TEXT,
    p_has_selfie_approved BOOLEAN,
    p_has_profile_complete BOOLEAN,
    p_referral_count INT,
    p_created_at TIMESTAMPTZ
)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_score INT := 0;
    v_days INT;
    v_referral_pts INT;
BEGIN
    -- Launch city density (+20 pts for Chennai & Bangalore clusters)
    IF p_city ILIKE '%chennai%' OR p_city ILIKE '%bangalore%' OR p_city ILIKE '%bengaluru%' THEN
        v_score := v_score + 20;
    END IF;

    -- Hand-reviewed photo selfie verified (+30 pts)
    IF p_has_selfie_approved = TRUE THEN
        v_score := v_score + 30;
    END IF;

    -- Complete profile with 3+ photos and bio prompts (+20 pts)
    IF p_has_profile_complete = TRUE THEN
        v_score := v_score + 20;
    END IF;

    -- Item 2: Verified referrals capped at max +10 points total
    v_referral_pts := LEAST(10, COALESCE(p_referral_count, 0) * 10);
    v_score := v_score + v_referral_pts;

    -- Time on waitlist (+1 pt per day, capped at 20)
    v_days := GREATEST(1, EXTRACT(DAY FROM (NOW() - p_created_at))::int);
    v_score := v_score + LEAST(20, v_days);

    -- Item 2: Score strictly capped at 100 maximum
    RETURN LEAST(100, v_score);
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Trigger: Derive Verification Facts from Database, NOT Client Columns
-- ------------------------------------------------------------------------------
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
    -- Item 6: Enforce authenticated verified email on insert
    IF TG_OP = 'INSERT' THEN
        IF auth.uid() IS NOT NULL THEN
            IF NEW.email <> auth.email() THEN
                RAISE EXCEPTION 'Security Policy Violation: You can only register your own authenticated email.';
            END IF;
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
        NEW.lane := OLD.lane;
        NEW.status := OLD.status;
        NEW.admitted_at := OLD.admitted_at;
        NEW.email := OLD.email;
    END IF;

    -- Item 5: Check verified facts directly from database tables
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

DROP TRIGGER IF EXISTS tr_derive_waitlist_entry_insert ON public.waitlist_entries;
CREATE TRIGGER tr_derive_waitlist_entry_insert
BEFORE INSERT ON public.waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.derive_and_secure_waitlist_entry();

DROP TRIGGER IF EXISTS tr_derive_waitlist_entry_update ON public.waitlist_entries;
CREATE TRIGGER tr_derive_waitlist_entry_update
BEFORE UPDATE ON public.waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.derive_and_secure_waitlist_entry();

-- ------------------------------------------------------------------------------
-- 6. Rate Limiting on Waitlist Insert
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_waitlist_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_recent_count INT;
BEGIN
    -- Disallow more than 3 waitlist join attempts per hour from the same user ID
    IF auth.uid() IS NOT NULL THEN
        SELECT COUNT(*) INTO v_recent_count
        FROM public.audit_log
        WHERE admin_id = auth.uid()
          AND action = 'waitlist_join_attempt'
          AND created_at >= NOW() - INTERVAL '1 hour';

        IF v_recent_count >= 3 THEN
            RAISE EXCEPTION 'Rate Limit Exceeded: Please wait before submitting another waitlist request.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_waitlist_rate_limit ON public.waitlist_entries;
CREATE TRIGGER tr_check_waitlist_rate_limit
BEFORE INSERT ON public.waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.check_waitlist_rate_limit();

-- Update RLS on waitlist_entries: authenticated email required
DROP POLICY IF EXISTS "Public can join waitlist" ON public.waitlist_entries;
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist_entries;

CREATE POLICY "Authenticated users can join waitlist with own email"
ON public.waitlist_entries FOR INSERT
TO authenticated
WITH CHECK (
    status = 'waiting' 
    AND email = auth.email()
);

-- Members can only read their own entry or admins can read all
DROP POLICY IF EXISTS "Users read own waitlist entry" ON public.waitlist_entries;
DROP POLICY IF EXISTS "Users can view own waitlist entry" ON public.waitlist_entries;

CREATE POLICY "Users read own waitlist entry"
ON public.waitlist_entries FOR SELECT
TO authenticated
USING (
    email = auth.email() 
    OR public.is_admin()
);

-- ------------------------------------------------------------------------------
-- 7. Make audit_log strictly append-only (no update or delete)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_audit_log_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: audit_log is strictly append-only. UPDATE, DELETE, and TRUNCATE are prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_log_append_only ON public.audit_log;
CREATE TRIGGER tr_audit_log_append_only
BEFORE UPDATE OR DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.enforce_audit_log_append_only();

REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM authenticated, anon, public;

-- ------------------------------------------------------------------------------
-- 1, 3, 4. Hardened admit_batch with Advisory Lock, floor(), and Unclaimed Accounting
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admit_batch(
    p_city TEXT,
    p_women_cap INT DEFAULT 20,
    p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_active_women_registered INT := 0;
    v_active_men_registered INT := 0;
    v_unclaimed_women INT := 0;
    v_unclaimed_men INT := 0;
    v_effective_women INT := 0;
    v_effective_men INT := 0;
    v_ratio_before NUMERIC(4,2);
    v_women_to_admit INT := 0;
    v_men_to_admit INT := 0;
    v_projected_women INT;
    v_projected_men INT;
    v_ratio_after NUMERIC(4,2);
    v_women_ids UUID[];
    v_men_ids UUID[];
    v_batch_id UUID;
    v_result JSONB;
BEGIN
    -- Item 4: Set search_path and check admin privileges
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only authorized administrators can execute batch admissions.';
    END IF;

    -- Item 4: Per-city advisory transaction lock to prevent concurrent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('admit_batch_' || LOWER(p_city)));

    -- Expire any admitted entries that exceeded the 7-day claim window
    UPDATE public.waitlist_entries
    SET status = 'expired'
    WHERE status = 'admitted'
      AND admitted_at < NOW() - INTERVAL '7 days'
      AND city ILIKE '%' || p_city || '%'
      AND NOT EXISTS (
          SELECT 1 FROM public.users u
          JOIN public.profiles p ON p.user_id = u.id
          WHERE u.email = waitlist_entries.email
      );

    -- 1. Count active verified registered members in launch cluster
    SELECT COUNT(*) INTO v_active_women_registered
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.city ILIKE '%' || p_city || '%'
      AND LOWER(p.gender) IN ('woman', 'female', 'non_binary', 'other')
      AND p.is_paused = FALSE
      AND u.status = 'active';

    SELECT COUNT(*) INTO v_active_men_registered
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.city ILIKE '%' || p_city || '%'
      AND LOWER(p.gender) = 'man'
      AND p.is_paused = FALSE
      AND u.status = 'active';

    -- Item 3: Count admitted-but-unclaimed members within the 7-day claim window as active
    SELECT COUNT(*) INTO v_unclaimed_women
    FROM public.waitlist_entries w
    WHERE w.city ILIKE '%' || p_city || '%'
      AND w.lane = 'women_and_others'
      AND w.status = 'admitted'
      AND w.admitted_at >= NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
          SELECT 1 FROM public.users u WHERE u.email = w.email
      );

    SELECT COUNT(*) INTO v_unclaimed_men
    FROM public.waitlist_entries w
    WHERE w.city ILIKE '%' || p_city || '%'
      AND w.lane = 'men'
      AND w.status = 'admitted'
      AND w.admitted_at >= NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
          SELECT 1 FROM public.users u WHERE u.email = w.email
      );

    v_effective_women := v_active_women_registered + v_unclaimed_women;
    v_effective_men := v_active_men_registered + v_unclaimed_men;

    -- Ratio before admission
    v_ratio_before := ROUND((v_effective_men::numeric / GREATEST(1, v_effective_women)::numeric), 2);

    -- 2. Select top eligible Women & Others from Lane 1 up to moderation cap (Item 4)
    SELECT ARRAY_AGG(id) INTO v_women_ids
    FROM (
        SELECT id FROM public.waitlist_entries
        WHERE city ILIKE '%' || p_city || '%'
          AND lane = 'women_and_others'
          AND status = 'waiting'
        ORDER BY score DESC, created_at ASC
        LIMIT p_women_cap
    ) sub_w;

    v_women_to_admit := COALESCE(array_length(v_women_ids, 1), 0);
    v_projected_women := v_effective_women + v_women_to_admit;

    -- Item 1: Formula uses FLOOR() to avoid rounding up above 1.5 ratio
    -- men to admit = max(0, floor(1.5 * effective_women_after - effective_men_now))
    IF v_ratio_before > 2.0 AND v_women_to_admit = 0 THEN
        v_men_to_admit := 0; -- Critical pause
    ELSE
        v_men_to_admit := GREATEST(0, FLOOR(1.5 * v_projected_women - v_effective_men));
    END IF;

    -- Select top eligible Men from Lane 2
    IF v_men_to_admit > 0 THEN
        SELECT ARRAY_AGG(id) INTO v_men_ids
        FROM (
            SELECT id FROM public.waitlist_entries
            WHERE city ILIKE '%' || p_city || '%'
              AND lane = 'men'
              AND status = 'waiting'
            ORDER BY score DESC, created_at ASC
            LIMIT v_men_to_admit
        ) sub_m;
    ELSE
        v_men_ids := ARRAY[]::UUID[];
    END IF;

    v_men_to_admit := COALESCE(array_length(v_men_ids, 1), 0);
    v_projected_men := v_effective_men + v_men_to_admit;
    v_ratio_after := ROUND((v_projected_men::numeric / GREATEST(1, v_projected_women)::numeric), 2);

    -- Build output JSON
    v_result := jsonb_build_object(
        'city', p_city,
        'dry_run', p_dry_run,
        'active_women_registered', v_active_women_registered,
        'active_men_registered', v_active_men_registered,
        'unclaimed_women_in_window', v_unclaimed_women,
        'unclaimed_men_in_window', v_unclaimed_men,
        'effective_women_before', v_effective_women,
        'effective_men_before', v_effective_men,
        'ratio_before', v_ratio_before,
        'women_admitted', v_women_to_admit,
        'men_admitted', v_men_to_admit,
        'projected_women_after', v_projected_women,
        'projected_men_after', v_projected_men,
        'ratio_after', v_ratio_after,
        'is_ratio_after_healthy', (v_ratio_after >= 1.0 AND v_ratio_after <= 1.5),
        'admitted_women_ids', COALESCE(v_women_ids, ARRAY[]::UUID[]),
        'admitted_men_ids', COALESCE(v_men_ids, ARRAY[]::UUID[])
    );

    -- Execute commit if not dry-run
    IF NOT p_dry_run THEN
        IF v_women_to_admit > 0 THEN
            UPDATE public.waitlist_entries
            SET status = 'admitted', admitted_at = NOW()
            WHERE id = ANY(v_women_ids);
        END IF;

        IF v_men_to_admit > 0 THEN
            UPDATE public.waitlist_entries
            SET status = 'admitted', admitted_at = NOW()
            WHERE id = ANY(v_men_ids);
        END IF;

        INSERT INTO public.batches (
            city, date, women_admitted, men_admitted, ratio_before, ratio_after
        )
        VALUES (
            p_city, CURRENT_DATE, v_women_to_admit, v_men_to_admit, v_ratio_before, v_ratio_after
        )
        RETURNING id INTO v_batch_id;

        -- Record immutable audit log
        INSERT INTO public.audit_log (
            admin_id, action, target_type, target_id, details
        )
        VALUES (
            auth.uid(), 'execute_batch_admission', 'batch', v_batch_id, v_result
        );
    END IF;

    RETURN v_result;
END;
$$;
