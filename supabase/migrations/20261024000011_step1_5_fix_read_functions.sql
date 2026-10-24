-- Migration: 20261024000011_step1_5_fix_read_functions.sql
-- Description: Implement shared can_view_member(), get_member_profile(), get_matches_list(), and refactor get_discovery_feed()

-- 1. Shared can_view_member function
-- Checks: target active, not paused, admitted, selfie approved, at least one approved photo, not blocked either way.
-- Note: Does NOT filter liked or passed members, so viewer can open liked/passed members by ID.
CREATE OR REPLACE FUNCTION public.can_view_member(p_viewer_id UUID, p_target_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.profiles p ON p.user_id = u.id
        JOIN public.waitlist_entries w ON w.user_id = u.id
        WHERE u.id = p_target_id
          AND u.status = 'active'
          AND p.is_paused = FALSE
          AND w.status = 'admitted'
          -- Approved selfie in verifications
          AND EXISTS (
              SELECT 1 FROM public.verifications v
              WHERE v.user_id = u.id AND v.result = 'approved'
          )
          -- At least one approved photo in profile_photos
          AND EXISTS (
              SELECT 1 FROM public.profile_photos ph
              WHERE ph.owner = u.id AND ph.status = 'approved'
          )
          -- Not blocked in either direction
          AND NOT EXISTS (
              SELECT 1 FROM public.blocks b
              WHERE (b.blocker = p_viewer_id AND b.blocked = p_target_id)
                 OR (b.blocker = p_target_id AND b.blocked = p_viewer_id)
          )
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_member(UUID, UUID) TO authenticated;


-- 2. get_member_profile: single profile detail function
-- Parenthesizes match condition with block check; uses can_view_member; avoids get_discovery_feed call.
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

    -- Parenthesize the match condition so the block check applies to the whole expression;
    -- Caller can view if admin, own profile, active unblocked match, or eligible via can_view_member
    IF NOT (
        public.is_admin()
        OR p_target_id = v_caller_id
        OR (
            EXISTS (
                SELECT 1 FROM public.matches m
                WHERE (m.user_a = v_caller_id AND m.user_b = p_target_id)
                   OR (m.user_b = v_caller_id AND m.user_a = p_target_id)
            )
            AND NOT EXISTS (
                SELECT 1 FROM public.blocks b
                WHERE (b.blocker = v_caller_id AND b.blocked = p_target_id)
                   OR (b.blocker = p_target_id AND b.blocked = v_caller_id)
            )
        )
        OR public.can_view_member(v_caller_id, p_target_id)
    ) THEN
        RAISE EXCEPTION 'Profile not available' USING ERRCODE = '42501';
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
    WHERE p.user_id = p_target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_profile(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_profile(UUID) TO authenticated;


-- 3. get_matches_list: active matches with partner summary
-- Uses messages.sent_at; excludes blocked, banned, and suspended partners; returns last message, unread count, and approved photo.
CREATE OR REPLACE FUNCTION public.get_matches_list()
RETURNS TABLE (
    match_id UUID,
    matched_user_id UUID,
    name TEXT,
    age INT,
    city TEXT,
    intent relationship_intent,
    avatar_url TEXT,
    last_message_body TEXT,
    last_message_sent_at TIMESTAMPTZ,
    last_message_sender_id UUID,
    unread_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    WITH my_matches AS (
        SELECT 
            m.id AS match_id,
            m.created_at AS match_created_at,
            CASE WHEN m.user_a = auth.uid() THEN m.user_b ELSE m.user_a END AS other_user_id
        FROM public.matches m
        JOIN public.users u ON u.id = (CASE WHEN m.user_a = auth.uid() THEN m.user_b ELSE m.user_a END)
        WHERE (m.user_a = auth.uid() OR m.user_b = auth.uid())
          -- Exclude banned and suspended partners
          AND u.status = 'active'
          -- Exclude blocked partners in either direction
          AND NOT EXISTS (
              SELECT 1 FROM public.blocks b
              WHERE (b.blocker = m.user_a AND b.blocked = m.user_b)
                 OR (b.blocker = m.user_b AND b.blocked = m.user_a)
          )
    ),
    last_msgs AS (
        SELECT DISTINCT ON (msg.match_id)
            msg.match_id,
            msg.body,
            msg.sent_at,
            msg.sender_id
        FROM public.messages msg
        INNER JOIN my_matches mm ON mm.match_id = msg.match_id
        ORDER BY msg.match_id, msg.sent_at DESC
    ),
    unreads AS (
        SELECT 
            msg.match_id,
            COUNT(*)::bigint AS unread_count
        FROM public.messages msg
        INNER JOIN my_matches mm ON mm.match_id = msg.match_id
        WHERE msg.sender_id <> auth.uid() AND msg.read_at IS NULL
        GROUP BY msg.match_id
    )
    SELECT 
        mm.match_id,
        mm.other_user_id AS matched_user_id,
        p.name,
        date_part('year', age(p.birth_date))::int AS age,
        p.city,
        p.intent,
        (
            SELECT ph.storage_path 
            FROM public.profile_photos ph
            WHERE ph.owner = mm.other_user_id AND ph.status = 'approved'
            ORDER BY ph.position ASC LIMIT 1
        ) AS avatar_url,
        lm.body AS last_message_body,
        lm.sent_at AS last_message_sent_at,
        lm.sender_id AS last_message_sender_id,
        COALESCE(u.unread_count, 0) AS unread_count
    FROM my_matches mm
    JOIN public.profiles p ON p.user_id = mm.other_user_id
    LEFT JOIN last_msgs lm ON lm.match_id = mm.match_id
    LEFT JOIN unreads u ON u.match_id = mm.match_id
    ORDER BY COALESCE(lm.sent_at, mm.match_created_at) DESC;
$$;

REVOKE ALL ON FUNCTION public.get_matches_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_matches_list() TO authenticated;


-- 4. Refactor get_discovery_feed to use can_view_member
CREATE OR REPLACE FUNCTION public.get_discovery_feed(
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
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
    v_caller_gender TEXT;
    v_pref_gender TEXT[];
    v_pref_intent relationship_intent[];
    v_min_age INT;
    v_max_age INT;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;

    -- Fetch caller city and profile metadata
    SELECT p.city, p.intent, p.gender
    INTO v_caller_city, v_caller_intent, v_caller_gender
    FROM public.profiles p
    WHERE p.user_id = v_caller_id;

    IF v_caller_city IS NULL THEN
        RETURN;
    END IF;

    -- Fetch caller preferences if set
    SELECT pref.preferred_genders, pref.preferred_intents, pref.min_age, pref.max_age
    INTO v_pref_gender, v_pref_intent, v_min_age, v_max_age
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
    WHERE p.user_id <> v_caller_id
      AND p.city = v_caller_city
      -- Reuse shared viewability rules (active, not paused, admitted, approved selfie, approved photo, unblocked)
      AND public.can_view_member(v_caller_id, p.user_id)
      -- Discovery-specific filters: not already liked or passed
      AND NOT EXISTS (
          SELECT 1 FROM public.likes l
          WHERE l.from_user = v_caller_id AND l.to_user = p.user_id
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.passes ps
          WHERE ps.user_id = v_caller_id AND ps.target_id = p.user_id
      )
      -- Intent compatibility
      AND (v_pref_intent IS NULL OR p.intent = ANY(v_pref_intent))
      -- Gender preference
      AND (v_pref_gender IS NULL OR p.gender = ANY(v_pref_gender))
      -- Age range preference
      AND (v_min_age IS NULL OR date_part('year', age(p.birth_date)) >= v_min_age)
      AND (v_max_age IS NULL OR date_part('year', age(p.birth_date)) <= v_max_age)
    ORDER BY p.updated_at DESC, p.user_id ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_discovery_feed(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_discovery_feed(INT, INT) TO authenticated;
