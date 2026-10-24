-- ==============================================================================
-- Migration: 20261024000010_phase3_core_security_and_discovery.sql
-- Description: Phase 3 Core Security, Privacy Isolation, Discovery Engine,
--              Profile Photos, Blocks/Reports Split, Passes, Like Limits,
--              and Realtime Chat Safeguards
-- ==============================================================================

-- 1. Helper overload: BigInt support for calculate_waitlist_score
CREATE OR REPLACE FUNCTION public.calculate_waitlist_score(
    p_city TEXT,
    p_selfie_verified BOOLEAN,
    p_profile_complete BOOLEAN,
    p_referrals BIGINT,
    p_created_at TIMESTAMPTZ
)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT public.calculate_waitlist_score(
        p_city,
        p_selfie_verified,
        p_profile_complete,
        LEAST(p_referrals, 2147483647)::int,
        p_created_at
    );
$$;

-- 2. Create profile_photos table
CREATE TABLE IF NOT EXISTS public.profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

-- 3. Split blocks and reports: Create blocks and reports tables
CREATE TABLE IF NOT EXISTS public.blocks (
    blocker UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker, blocked),
    CONSTRAINT blocker_not_blocked CHECK (blocker <> blocked)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reports (
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

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 4. Create passes table
CREATE TABLE IF NOT EXISTS public.passes (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, target_id),
    CONSTRAINT user_not_target CHECK (user_id <> target_id)
);

ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

-- 5. Migrate existing data from blocks_and_reports if present
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blocks_and_reports') THEN
        INSERT INTO public.reports (id, reporter, target, reason, details, status, reviewer, created_at, resolved_at)
        SELECT id, reporter, target, reason, details, status, reviewer, created_at, resolved_at
        FROM public.blocks_and_reports
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.blocks (blocker, blocked, created_at)
        SELECT reporter, target, created_at
        FROM public.blocks_and_reports
        ON CONFLICT (blocker, blocked) DO NOTHING;
    END IF;
END $$;

-- 6. Lock down direct SELECT on profiles and users (Members can only select own row)
DROP POLICY IF EXISTS "Members view active unpaused profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self select only" ON public.profiles;
CREATE POLICY "Profiles self select only" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_admin());

-- Revoke direct SELECT/INSERT from authenticated/anon on admins and audit_log
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.admins FROM authenticated, anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM authenticated, anon, public;

-- Fix bug exposed by hardening test: prevent members from inserting approved selfies
DROP POLICY IF EXISTS "Users can submit selfie verifications" ON public.verifications;
CREATE POLICY "Users can submit selfie verifications"
ON public.verifications FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND (result IS NULL OR result = 'pending'::verification_result)
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
);

-- Revoke execute on admit_batch from anon and public
REVOKE EXECUTE ON FUNCTION public.admit_batch(TEXT, INT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admit_batch(TEXT, INT, BOOLEAN) TO authenticated;

-- 7. RLS for profile_photos
DROP POLICY IF EXISTS "Profile photos select" ON public.profile_photos;
CREATE POLICY "Profile photos select" ON public.profile_photos
    FOR SELECT TO authenticated
    USING (
        owner = auth.uid()
        OR public.is_admin()
        OR (
            status = 'approved'
            AND NOT EXISTS (
                SELECT 1 FROM public.blocks b
                WHERE (b.blocker = auth.uid() AND b.blocked = profile_photos.owner)
                   OR (b.blocker = profile_photos.owner AND b.blocked = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Owner can insert photos" ON public.profile_photos;
CREATE POLICY "Owner can insert photos" ON public.profile_photos
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = owner
        AND (status IS NULL OR status = 'pending')
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
    );

CREATE OR REPLACE FUNCTION public.prevent_photo_status_tamper()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Cannot modify photo review status' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_photo_status_tamper ON public.profile_photos;
CREATE TRIGGER trg_prevent_photo_status_tamper
BEFORE UPDATE ON public.profile_photos
FOR EACH ROW EXECUTE FUNCTION public.prevent_photo_status_tamper();

DROP POLICY IF EXISTS "Owner can update own photos" ON public.profile_photos;
CREATE POLICY "Owner can update own photos" ON public.profile_photos
    FOR UPDATE TO authenticated
    USING (auth.uid() = owner OR public.is_admin())
    WITH CHECK (auth.uid() = owner OR public.is_admin());

DROP POLICY IF EXISTS "Owner can delete own photos" ON public.profile_photos;
CREATE POLICY "Owner can delete own photos" ON public.profile_photos
    FOR DELETE TO authenticated
    USING (auth.uid() = owner OR public.is_admin());

-- Storage RLS: Approved photos only for other members, pending strictly owner/admin
DROP POLICY IF EXISTS "Authenticated members can view photos" ON storage.objects;
DROP POLICY IF EXISTS "View approved photos only" ON storage.objects;
CREATE POLICY "View approved photos only"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'photos'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.profile_photos pp
            WHERE pp.storage_path = storage.objects.name
              AND pp.status = 'approved'
              AND NOT EXISTS (
                  SELECT 1 FROM public.blocks b
                  WHERE (b.blocker = auth.uid() AND b.blocked = pp.owner)
                     OR (b.blocker = pp.owner AND b.blocked = auth.uid())
              )
        )
    )
);

-- 8. RLS for blocks, reports, and passes
DROP POLICY IF EXISTS "Users can view own blocks" ON public.blocks;
CREATE POLICY "Users can view own blocks" ON public.blocks
    FOR SELECT TO authenticated
    USING (auth.uid() = blocker OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert blocks" ON public.blocks;
CREATE POLICY "Users can insert blocks" ON public.blocks
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = blocker);

DROP POLICY IF EXISTS "Users can delete blocks" ON public.blocks;
CREATE POLICY "Users can delete blocks" ON public.blocks
    FOR DELETE TO authenticated
    USING (auth.uid() = blocker OR public.is_admin());

DROP POLICY IF EXISTS "Reporters and admins view reports" ON public.reports;
CREATE POLICY "Reporters and admins view reports" ON public.reports
    FOR SELECT TO authenticated
    USING (auth.uid() = reporter OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
CREATE POLICY "Users can insert reports" ON public.reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reporter);

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports" ON public.reports
    FOR UPDATE TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Users view own passes" ON public.passes;
CREATE POLICY "Users view own passes" ON public.passes
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert passes" ON public.passes;
CREATE POLICY "Users insert passes" ON public.passes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 9. Likes constraints: No deletion, rolling 24h limit of 20 with advisory lock
REVOKE DELETE ON public.likes FROM authenticated, anon, public;

CREATE OR REPLACE FUNCTION public.prevent_like_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Likes cannot be deleted' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_like_delete ON public.likes;
CREATE TRIGGER trg_prevent_like_delete
BEFORE DELETE ON public.likes
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_like_deletion();

CREATE OR REPLACE FUNCTION public.enforce_daily_like_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_recent_likes INT;
BEGIN
    -- Per-user advisory transaction lock
    PERFORM pg_advisory_xact_lock(hashtext('like_limit_' || NEW.from_user::text));

    -- Check if either user blocked the other
    IF EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (blocker = NEW.from_user AND blocked = NEW.to_user)
           OR (blocker = NEW.to_user AND blocked = NEW.from_user)
    ) THEN
        RAISE EXCEPTION 'Cannot like a blocked member' USING ERRCODE = 'P0001';
    END IF;

    -- Count likes sent in rolling 24 hours
    SELECT COUNT(*) INTO v_recent_likes
    FROM public.likes
    WHERE from_user = NEW.from_user
      AND created_at >= NOW() - INTERVAL '24 hours';

    IF v_recent_likes >= 20 THEN
        RAISE EXCEPTION 'Daily like limit reached. Members are limited to 20 likes per rolling 24 hours.' USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_daily_like_limit ON public.likes;
CREATE TRIGGER trg_enforce_daily_like_limit
BEFORE INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_like_limit();

-- 10. Update Matches RLS: Enforce bidirectional blocks
DROP POLICY IF EXISTS "Users can view own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can view own unblocked matches" ON public.matches;
CREATE POLICY "Users can view own unblocked matches"
ON public.matches FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR (
        (auth.uid() = user_a OR auth.uid() = user_b)
        AND NOT EXISTS (
            SELECT 1 FROM public.blocks b
            WHERE (b.blocker = matches.user_a AND b.blocked = matches.user_b)
               OR (b.blocker = matches.user_b AND b.blocked = matches.user_a)
        )
    )
);

-- 11. Messages security: Length check, active sender, bidirectional blocks, read receipts
CREATE OR REPLACE FUNCTION public.validate_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_match RECORD;
    v_recipient_id UUID;
    v_sender_status TEXT;
BEGIN
    -- Validate body length: 1 to 2000 chars
    IF NEW.body IS NULL OR length(trim(NEW.body)) < 1 OR length(NEW.body) > 2000 THEN
        RAISE EXCEPTION 'Message body must be between 1 and 2000 characters' USING ERRCODE = 'P0001';
    END IF;

    -- Verify sender is active
    SELECT status INTO v_sender_status FROM public.users WHERE id = NEW.sender_id;
    IF v_sender_status IS NULL OR v_sender_status <> 'active' THEN
        RAISE EXCEPTION 'Sender account is not active' USING ERRCODE = '42501';
    END IF;

    -- Verify match and determine recipient
    SELECT user_a, user_b INTO v_match FROM public.matches WHERE id = NEW.match_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found' USING ERRCODE = 'P0002';
    END IF;

    IF NEW.sender_id = v_match.user_a THEN
        v_recipient_id := v_match.user_b;
    ELSIF NEW.sender_id = v_match.user_b THEN
        v_recipient_id := v_match.user_a;
    ELSE
        RAISE EXCEPTION 'Sender is not a participant in this match' USING ERRCODE = '42501';
    END IF;

    -- Check bidirectional blocks
    IF EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (blocker = NEW.sender_id AND blocked = v_recipient_id)
           OR (blocker = v_recipient_id AND blocked = NEW.sender_id)
    ) THEN
        RAISE EXCEPTION 'Cannot send message: blocked by or blocking recipient' USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_message_insert ON public.messages;
CREATE TRIGGER trg_validate_message_insert
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.validate_message_insert();

-- Messages update prevention: Read receipts must use mark_messages_read()
CREATE OR REPLACE FUNCTION public.prevent_direct_message_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF current_setting('koodal.internal_read_update', true) = 'on' OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Direct update of messages is prohibited. Use mark_messages_read().' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_direct_message_update ON public.messages;
CREATE TRIGGER trg_prevent_direct_message_update
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_message_update();

REVOKE UPDATE ON public.messages FROM authenticated, anon;

-- Function: mark_messages_read
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.matches
        WHERE id = p_match_id
          AND (user_a = v_caller_id OR user_b = v_caller_id)
    ) AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not a participant in this match' USING ERRCODE = '42501';
    END IF;

    PERFORM set_config('koodal.internal_read_update', 'on', true);

    UPDATE public.messages
    SET read_at = NOW()
    WHERE match_id = p_match_id
      AND sender_id <> v_caller_id
      AND read_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_messages_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID) TO authenticated;

-- Add messages to Realtime publication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- 12. Admin functions: review_photo and review_selfie
CREATE OR REPLACE FUNCTION public.review_photo(
    p_photo_id UUID,
    p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin role required' USING ERRCODE = '42501';
    END IF;

    IF p_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be approved or rejected.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.profile_photos
    SET status = p_status,
        reviewed_by = v_admin_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_photo_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Photo not found' USING ERRCODE = 'P0002';
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_photo(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_photo(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_selfie(
    p_verification_id UUID,
    p_result verification_result,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Admin role required' USING ERRCODE = '42501';
    END IF;

    UPDATE public.verifications
    SET result = p_result,
        rejection_reason = p_rejection_reason,
        reviewed_by = v_admin_id,
        reviewed_at = NOW()
    WHERE id = p_verification_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Verification record not found' USING ERRCODE = 'P0002';
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_selfie(UUID, verification_result, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_selfie(UUID, verification_result, TEXT) TO authenticated;

-- 13. Discovery Function: get_discovery_feed (Same-city, no distance, verified privacy, stable order)
CREATE OR REPLACE FUNCTION public.get_discovery_feed(p_limit INT DEFAULT 20, p_offset INT DEFAULT 0)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    age INT,
    city TEXT,
    intent relationship_intent,
    bio TEXT,
    bio_ta TEXT,
    interests TEXT[],
    prompts JSONB,
    photos TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_city TEXT;
    v_caller_intent relationship_intent;
    v_pref_intents relationship_intent[];
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    -- Get caller city & intent from profile
    SELECT p.city, p.intent INTO v_caller_city, v_caller_intent
    FROM public.profiles p
    WHERE p.user_id = v_caller_id;

    IF v_caller_city IS NULL THEN
        RETURN;
    END IF;

    -- Optional: get caller preference intent filter if present
    SELECT pref.intent_filter INTO v_pref_intents
    FROM public.preferences pref
    WHERE pref.user_id = v_caller_id;

    RETURN QUERY
    SELECT 
        p.user_id,
        p.name,
        date_part('year', age(p.birth_date))::int AS age,
        p.city,
        p.intent,
        p.bio,
        p.bio_ta,
        p.interests,
        p.prompts,
        ARRAY(
            SELECT ph.storage_path 
            FROM public.profile_photos ph
            WHERE ph.owner = p.user_id 
              AND ph.status = 'approved'
            ORDER BY ph.position ASC, ph.created_at ASC
        ) AS photos
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.user_id <> v_caller_id
      AND p.city = v_caller_city
      AND p.is_paused = FALSE
      AND u.status = 'active'
      -- Admitted from waitlist
      AND EXISTS (
          SELECT 1 FROM public.waitlist_entries w
          WHERE w.user_id = p.user_id AND w.status = 'admitted'
      )
      -- Approved selfie verification
      AND EXISTS (
          SELECT 1 FROM public.verifications v
          WHERE v.user_id = p.user_id AND v.result = 'approved'
      )
      -- At least one approved photo
      AND EXISTS (
          SELECT 1 FROM public.profile_photos ph
          WHERE ph.owner = p.user_id AND ph.status = 'approved'
      )
      -- Not blocked in either direction
      AND NOT EXISTS (
          SELECT 1 FROM public.blocks b
          WHERE (b.blocker = v_caller_id AND b.blocked = p.user_id)
             OR (b.blocker = p.user_id AND b.blocked = v_caller_id)
      )
      -- Not already liked
      AND NOT EXISTS (
          SELECT 1 FROM public.likes l
          WHERE l.from_user = v_caller_id AND l.to_user = p.user_id
      )
      -- Not already passed
      AND NOT EXISTS (
          SELECT 1 FROM public.passes ps
          WHERE ps.user_id = v_caller_id AND ps.target_id = p.user_id
      )
      -- Filter by intent if caller specified preference
      AND (
          v_pref_intents IS NULL 
          OR cardinality(v_pref_intents) = 0 
          OR p.intent = ANY(v_pref_intents)
      )
    ORDER BY p.updated_at DESC, p.user_id ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_discovery_feed(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_discovery_feed(INT, INT) TO authenticated;

-- 14. Single Profile Detail Function: get_member_profile (Privacy preserved)
CREATE OR REPLACE FUNCTION public.get_member_profile(p_target_id UUID)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    age INT,
    city TEXT,
    intent relationship_intent,
    bio TEXT,
    bio_ta TEXT,
    interests TEXT[],
    prompts JSONB,
    photos TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    -- Blocked in either direction check
    IF EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker = v_caller_id AND b.blocked = p_target_id)
           OR (b.blocker = p_target_id AND b.blocked = v_caller_id)
    ) THEN
        RAISE EXCEPTION 'Profile not available' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
    SELECT 
        p.user_id,
        p.name,
        date_part('year', age(p.birth_date))::int AS age,
        p.city,
        p.intent,
        p.bio,
        p.bio_ta,
        p.interests,
        p.prompts,
        ARRAY(
            SELECT ph.storage_path 
            FROM public.profile_photos ph
            WHERE ph.owner = p.user_id 
              AND ph.status = 'approved'
            ORDER BY ph.position ASC, ph.created_at ASC
        ) AS photos
    FROM public.profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.user_id = p_target_id
      AND u.status = 'active'
      AND (
          p.user_id = v_caller_id
          OR public.is_admin()
          OR (
              p.is_paused = FALSE
              AND (
                  EXISTS (
                      SELECT 1 FROM public.matches m
                      WHERE (m.user_a = v_caller_id AND m.user_b = p.user_id)
                         OR (m.user_a = p.user_id AND m.user_b = v_caller_id)
                  )
                  OR EXISTS (
                      SELECT 1 FROM public.waitlist_entries w
                      WHERE w.user_id = p.user_id AND w.status = 'admitted'
                  )
              )
          )
      );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_member_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_profile(UUID) TO authenticated;
