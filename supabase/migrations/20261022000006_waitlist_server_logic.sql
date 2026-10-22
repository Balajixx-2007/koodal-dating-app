-- ==============================================================================
-- Migration: 20261022000006_waitlist_server_logic.sql
-- Description: Server-side waitlist score calculation, column protection triggers,
--              and admin batch admission engine with dry-run support.
-- Non-Negotiable Rule 3: Client is untrusted; score, lane, and admission computed on server.
-- ==============================================================================

-- 1. Helper Function: Compute Waitlist Priority Score from Verified Facts
-- Score formula per Section 13:
--   - Email verified (Required)
--   - Selfie approved (+30 pts)
--   - Profile complete (+20 pts)
--   - Launch city (+20 pts)
--   - Verified referral (+10 pts per verified referral)
--   - Days on list (+1 pt/day, up to 20 pts)
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

    -- Referrals from verified members (+10 pts each)
    v_score := v_score + (COALESCE(p_referral_count, 0) * 10);

    -- Time on waitlist (+1 pt per day, capped at 20)
    v_days := GREATEST(1, EXTRACT(DAY FROM (NOW() - p_created_at))::int);
    v_score := v_score + LEAST(20, v_days);

    RETURN v_score;
END;
$$;

-- 2. Trigger: Before Insert on waitlist_entries
-- Enforces: Server-calculated lane, server-calculated score, forced 'waiting' status
CREATE OR REPLACE FUNCTION public.before_waitlist_entry_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Forced status and timestamp on creation
    NEW.status := 'waiting';
    NEW.admitted_at := NULL;
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    NEW.referral_count := 0;
    NEW.has_selfie_approved := FALSE;
    NEW.has_profile_complete := FALSE;
    NEW.days_on_list := 1;

    -- Automatically assign lane by gender:
    -- Women & Other Genders in Lane 1; Men in Lane 2
    IF LOWER(NEW.gender) IN ('woman', 'female', 'non_binary', 'other') THEN
        NEW.lane := 'women_and_others';
    ELSE
        NEW.lane := 'men';
    END IF;

    -- Compute initial priority score on server
    NEW.score := public.calculate_waitlist_score(
        NEW.city,
        NEW.has_selfie_approved,
        NEW.has_profile_complete,
        NEW.referral_count,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_before_waitlist_insert ON public.waitlist_entries;
CREATE TRIGGER tr_before_waitlist_insert
BEFORE INSERT ON public.waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.before_waitlist_entry_insert();

-- 3. Trigger: Before Update on waitlist_entries
-- Non-admin members CANNOT tamper with status, lane, score, or admission timestamp
CREATE OR REPLACE FUNCTION public.before_waitlist_entry_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- If caller is not admin, prevent tampering with system-controlled columns
    IF NOT public.is_admin() THEN
        NEW.lane := OLD.lane;
        NEW.status := OLD.status;
        NEW.admitted_at := OLD.admitted_at;
        NEW.referral_count := OLD.referral_count;
        NEW.has_selfie_approved := OLD.has_selfie_approved;
        NEW.has_profile_complete := OLD.has_profile_complete;
    END IF;

    -- Always recompute score on server
    NEW.score := public.calculate_waitlist_score(
        NEW.city,
        NEW.has_selfie_approved,
        NEW.has_profile_complete,
        NEW.referral_count,
        OLD.created_at
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_before_waitlist_update ON public.waitlist_entries;
CREATE TRIGGER tr_before_waitlist_update
BEFORE UPDATE ON public.waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.before_waitlist_entry_update();

-- 4. Server-Side Function: Get Real Position in Lane
CREATE OR REPLACE FUNCTION public.get_waitlist_position(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_entry public.waitlist_entries%ROWTYPE;
    v_rank INT;
    v_lane_total INT;
    v_estimated_days INT;
BEGIN
    SELECT * INTO v_entry
    FROM public.waitlist_entries
    WHERE email = p_email;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false);
    END IF;

    -- Count higher priority entries in the same lane
    SELECT COUNT(*) + 1 INTO v_rank
    FROM public.waitlist_entries
    WHERE lane = v_entry.lane
      AND status = 'waiting'
      AND (score > v_entry.score OR (score = v_entry.score AND created_at < v_entry.created_at));

    SELECT COUNT(*) INTO v_lane_total
    FROM public.waitlist_entries
    WHERE lane = v_entry.lane AND status = 'waiting';

    -- Estimated days based on average weekly intake of ~15 per batch
    v_estimated_days := GREATEST(3, CEIL(v_rank::float / 15.0) * 7);

    RETURN jsonb_build_object(
        'found', true,
        'id', v_entry.id,
        'email', v_entry.email,
        'city', v_entry.city,
        'gender', v_entry.gender,
        'lane', v_entry.lane,
        'score', v_entry.score,
        'status', v_entry.status,
        'rank', v_rank,
        'lane_total', v_lane_total,
        'estimated_days', v_estimated_days,
        'has_selfie_approved', v_entry.has_selfie_approved,
        'has_profile_complete', v_entry.has_profile_complete,
        'referral_count', v_entry.referral_count
    );
END;
$$;

-- 5. Admin-Only Batch Admission Engine
-- Implements Section 13 admission formula:
--   men to admit = max(0, 1.5 * active_women_after - active_men_now)
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
    v_active_women_now INT := 0;
    v_active_men_now INT := 0;
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
    -- Strict security authorization
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Only authorized administrators can execute batch admissions.';
    END IF;

    -- Count active verified members in launch city in last 14 days
    SELECT COUNT(*) INTO v_active_women_now
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.city ILIKE '%' || p_city || '%'
      AND LOWER(p.gender) IN ('woman', 'female', 'non_binary', 'other')
      AND p.is_paused = FALSE
      AND u.status = 'active';

    SELECT COUNT(*) INTO v_active_men_now
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.city ILIKE '%' || p_city || '%'
      AND LOWER(p.gender) = 'man'
      AND p.is_paused = FALSE
      AND u.status = 'active';

    -- Ratio before admission
    v_ratio_before := ROUND((v_active_men_now::numeric / GREATEST(1, v_active_women_now)::numeric), 2);

    -- 1. Select top eligible Women & Others from Lane 1 ordered by priority score
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

    -- 2. Compute Men admissions using the Section 13 ratio formula
    -- men to admit = max(0, 1.5 * active_women_after - active_men_now)
    v_projected_women := v_active_women_now + v_women_to_admit;
    v_men_to_admit := GREATEST(0, ROUND(1.5 * v_projected_women - v_active_men_now));

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
    v_projected_men := v_active_men_now + v_men_to_admit;
    v_ratio_after := ROUND((v_projected_men::numeric / GREATEST(1, v_projected_women)::numeric), 2);

    -- Build return JSON
    v_result := jsonb_build_object(
        'city', p_city,
        'dry_run', p_dry_run,
        'active_women_before', v_active_women_now,
        'active_men_before', v_active_men_now,
        'ratio_before', v_ratio_before,
        'women_admitted', v_women_to_admit,
        'men_admitted', v_men_to_admit,
        'projected_women_after', v_projected_women,
        'projected_men_after', v_projected_men,
        'ratio_after', v_ratio_after,
        'admitted_women_ids', COALESCE(v_women_ids, ARRAY[]::UUID[]),
        'admitted_men_ids', COALESCE(v_men_ids, ARRAY[]::UUID[])
    );

    -- If NOT dry run, commit status updates, log batch, and write audit record
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

        -- Record batch history
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
