-- ==============================================================================
-- Database Test Suite: Phase 3 Security, Discovery, Likes, Matches & Messages
-- Comprehensive Hardened Suite: 65 Assertions
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgtap";

SELECT plan(65);

-- ==============================================================================
-- 1. Setup Test Fixtures & Seed Data
-- ==============================================================================

-- Compatibility shim for pre-Phase 3 schema during RED run seed
CREATE OR REPLACE FUNCTION public.calculate_waitlist_score(
    p_city TEXT,
    p_selfie_verified BOOLEAN,
    p_profile_complete BOOLEAN,
    p_referrals BIGINT,
    p_created_at TIMESTAMPTZ
) RETURNS INT AS $$
    SELECT public.calculate_waitlist_score(p_city, p_selfie_verified, p_profile_complete, p_referrals::int, p_created_at);
$$ LANGUAGE sql IMMUTABLE;

-- Seed Admin
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admins (user_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id) DO NOTHING;

-- Seed Member A (Chennai, Active, Admitted, Verified Selfie)
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'member_a@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'member_a@example.com', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

INSERT INTO public.profiles (user_id, name, birth_date, gender, intent, city)
VALUES ('11111111-1111-1111-1111-111111111111', 'Member A', '2000-01-01', 'man', 'long_term', 'Chennai')
ON CONFLICT (user_id) DO UPDATE SET city = 'Chennai', is_paused = FALSE;

INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'member_a@example.com', 'Chennai', 'man', 'long_term', 'admitted')
ON CONFLICT (email) DO UPDATE SET status = 'admitted';

INSERT INTO public.verifications (user_id, selfie_path, result)
VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/selfie.jpg', 'approved')
ON CONFLICT DO NOTHING;

-- Seed Member B (Chennai, Active, Admitted, Verified Selfie)
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('22222222-2222-2222-2222-222222222222', 'member_b@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES ('22222222-2222-2222-2222-222222222222', 'member_b@example.com', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

INSERT INTO public.profiles (user_id, name, birth_date, gender, intent, bio, interests, city)
VALUES ('22222222-2222-2222-2222-222222222222', 'Member B', '2001-05-15', 'woman', 'long_term', 'Art lover in Chennai', '{"Art", "Coffee"}', 'Chennai')
ON CONFLICT (user_id) DO UPDATE SET city = 'Chennai', is_paused = FALSE;

INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent, status)
VALUES ('22222222-2222-2222-2222-222222222222', 'member_b@example.com', 'Chennai', 'woman', 'long_term', 'admitted')
ON CONFLICT (email) DO UPDATE SET status = 'admitted';

INSERT INTO public.verifications (user_id, selfie_path, result)
VALUES ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/selfie.jpg', 'approved')
ON CONFLICT DO NOTHING;

-- Seed Member C (Third Party Member)
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('33333333-3333-3333-3333-333333333333', 'member_c_phase3@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES ('33333333-3333-3333-3333-333333333333', 'member_c_phase3@example.com', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

INSERT INTO public.profiles (user_id, name, birth_date, gender, intent, city)
VALUES ('33333333-3333-3333-3333-333333333333', 'Member C', '1998-08-20', 'woman', 'casual', 'Chennai')
ON CONFLICT (user_id) DO UPDATE SET city = 'Chennai', is_paused = FALSE;

INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent, status)
VALUES ('33333333-3333-3333-3333-333333333333', 'member_c_phase3@example.com', 'Chennai', 'woman', 'casual', 'admitted')
ON CONFLICT (email) DO UPDATE SET status = 'admitted';

INSERT INTO public.verifications (user_id, selfie_path, result)
VALUES ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333/selfie.jpg', 'approved')
ON CONFLICT DO NOTHING;

-- Seed Profile Photos (conditional so pre-Phase 3 schema does not fail during RED run seed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_photos') THEN
        EXECUTE $seed$
            INSERT INTO public.profile_photos (id, owner, storage_path, position, status)
            VALUES 
                ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/photo1.jpg', 0, 'pending'),
                ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/photo1.jpg', 0, 'approved'),
                ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/photo2_pending.jpg', 1, 'pending'),
                ('bbbbbbbb-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/photo3_rejected.jpg', 2, 'rejected'),
                ('cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333/photo1.jpg', 0, 'approved')
            ON CONFLICT (id) DO NOTHING;
        $seed$;
    END IF;
END $$;

-- Ensure waitlist admissions are marked admitted under admin authority
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'admin@example.com';
UPDATE public.waitlist_entries 
SET status = 'admitted' 
WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
);
RESET ROLE;

-- Seed Member D (for pagination caller)
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('44444444-4444-4444-4444-444444444444', 'member_d@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES ('44444444-4444-4444-4444-444444444444', 'member_d@example.com', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

INSERT INTO public.profiles (user_id, name, birth_date, gender, intent, city)
VALUES ('44444444-4444-4444-4444-444444444444', 'Member D', '1999-12-12', 'man', 'casual', 'Chennai')
ON CONFLICT (user_id) DO UPDATE SET city = 'Chennai', is_paused = FALSE;

-- Seed Member E & F (for isolated mutual likes concurrency test)
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES 
    ('55555555-5555-5555-5555-555555555555', 'member_e@example.com', NOW()),
    ('66666666-6666-6666-6666-666666666666', 'member_f@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES 
    ('55555555-5555-5555-5555-555555555555', 'member_e@example.com', 'active'),
    ('66666666-6666-6666-6666-666666666666', 'member_f@example.com', 'active')
ON CONFLICT (id) DO NOTHING;

-- Seed Banned User
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('88888888-8888-8888-8888-888888888888', 'banned@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES ('88888888-8888-8888-8888-888888888888', 'banned@example.com', 'banned')
ON CONFLICT (id) DO UPDATE SET status = 'banned';

-- Seed Storage Objects for testing storage RLS
INSERT INTO storage.objects (id, bucket_id, name, owner)
VALUES 
    ('10000000-0000-0000-0000-000000000001', 'photos', '22222222-2222-2222-2222-222222222222/photo1.jpg', '22222222-2222-2222-2222-222222222222'),
    ('10000000-0000-0000-0000-000000000002', 'photos', '22222222-2222-2222-2222-222222222222/photo2_pending.jpg', '22222222-2222-2222-2222-222222222222'),
    ('10000000-0000-0000-0000-000000000003', 'selfies', '11111111-1111-1111-1111-111111111111/selfie.jpg', '11111111-1111-1111-1111-111111111111'),
    ('10000000-0000-0000-0000-000000000004', 'selfies', '22222222-2222-2222-2222-222222222222/selfie.jpg', '22222222-2222-2222-2222-222222222222'),
    ('10000000-0000-0000-0000-000000000005', 'photos', '33333333-3333-3333-3333-333333333333/photo1.jpg', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- Test 1 - 3: Direct SELECT Isolation on profiles and users (Rule 2)
-- ==============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.users WHERE id = '22222222-2222-2222-2222-222222222222'),
    0,
    '1. Member A cannot direct SELECT Member B row from public.users'
);

SELECT is(
    (SELECT COUNT(*)::int FROM public.profiles WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    0,
    '2. Member A cannot direct SELECT Member B row from public.profiles'
);

SELECT is(
    (SELECT COUNT(*)::int FROM public.profiles WHERE user_id = '11111111-1111-1111-1111-111111111111'),
    1,
    '3. Member A can direct SELECT their own row from public.profiles'
);


-- ==============================================================================
-- Test 4 - 8: Schema Evolution & Table Structure (Rules 1, 3, 4, 7)
-- ==============================================================================
RESET ROLE;

SELECT has_function('public', 'get_discovery_feed', '4. get_discovery_feed() function exists');
SELECT has_table('public', 'profile_photos', '5. profile_photos table exists');
SELECT has_table('public', 'blocks', '6. blocks table exists');
SELECT has_table('public', 'passes', '7. passes table exists');
SELECT has_table('public', 'reports', '8. reports table exists');


-- ==============================================================================
-- Test 9 - 11: Likes Enforcements & Mutual Matches (Rule 6)
-- ==============================================================================
-- 9: Member cannot delete like
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

PREPARE test_delete_like AS
    DELETE FROM public.likes WHERE from_user = '11111111-1111-1111-1111-111111111111';

SELECT throws_ok(
    'test_delete_like',
    '42501',
    NULL,
    '9. Members cannot delete likes'
);

-- Seed Member A -> Member B valid like (#1)
RESET ROLE;
INSERT INTO public.likes (from_user, to_user, created_at)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

-- Seed Member A 19 more likes (#2 through #20)
DO $$
DECLARE i INT; target_uuid UUID;
BEGIN
    FOR i IN 1..19 LOOP
        target_uuid := ('aaaaaaaa-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID;
        INSERT INTO auth.users (id, email) VALUES (target_uuid, 'target_' || i || '@example.com') ON CONFLICT DO NOTHING;
        INSERT INTO public.users (id, email) VALUES (target_uuid, 'target_' || i || '@example.com') ON CONFLICT DO NOTHING;
        INSERT INTO public.likes (from_user, to_user, created_at)
        VALUES ('11111111-1111-1111-1111-111111111111', target_uuid, NOW() - (i || ' minutes')::interval)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- 10: 21st like in rolling 24 hours throws daily limit exception
PREPARE test_21st_like AS
    INSERT INTO public.likes (from_user, to_user)
    VALUES ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000020');

SELECT throws_ok(
    'test_21st_like',
    'P0001',
    NULL,
    '10. 21st like in rolling 24h throws daily limit exception'
);

-- 11: Mutual like creates exactly one match (Member B likes Member A)
INSERT INTO public.likes (from_user, to_user)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

SELECT is(
    (SELECT COUNT(*)::int FROM public.matches 
     WHERE (user_a = '11111111-1111-1111-1111-111111111111' AND user_b = '22222222-2222-2222-2222-222222222222')
        OR (user_a = '22222222-2222-2222-2222-222222222222' AND user_b = '11111111-1111-1111-1111-111111111111')),
    1,
    '11. Mutual like creates exactly one match'
);


-- ==============================================================================
-- Test 12 - 13: Selfie Verification Visibility (Rule 3)
-- ==============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.verifications WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    0,
    '12. Member A cannot view Member B selfie verification'
);

SELECT is(
    (SELECT COUNT(*)::int FROM public.verifications WHERE user_id = '11111111-1111-1111-1111-111111111111'),
    1,
    '13. Member A can view own selfie verification'
);


-- ==============================================================================
-- Test 14 - 17: Message Restrictions & Read Receipts (Rule 8)
-- ==============================================================================
-- 14: Oversized message body rejected
PREPARE test_oversized_msg AS
    INSERT INTO public.messages (match_id, sender_id, body)
    VALUES (
        (SELECT id FROM public.matches LIMIT 1),
        '11111111-1111-1111-1111-111111111111',
        REPEAT('A', 2001)
    );

SELECT throws_ok(
    'test_oversized_msg',
    'P0001',
    NULL,
    '14. Message body exceeding 2000 characters is rejected'
);

-- 15: Empty message body rejected
PREPARE test_empty_msg AS
    INSERT INTO public.messages (match_id, sender_id, body)
    VALUES (
        (SELECT id FROM public.matches LIMIT 1),
        '11111111-1111-1111-1111-111111111111',
        '   '
    );

SELECT throws_ok(
    'test_empty_msg',
    'P0001',
    NULL,
    '15. Empty message body is rejected'
);

-- Insert valid message
RESET ROLE;
DO $$
DECLARE v_mid UUID;
BEGIN
    SELECT id INTO v_mid FROM public.matches LIMIT 1;
    INSERT INTO public.messages (id, match_id, sender_id, body)
    VALUES ('99999999-0000-0000-0000-000000000001', v_mid, '11111111-1111-1111-1111-111111111111', 'Hello')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- 16: Direct update on message is prohibited
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

PREPARE test_tamper_msg_read AS
    UPDATE public.messages SET read_at = NOW() WHERE id = '99999999-0000-0000-0000-000000000001';

SELECT throws_ok(
    'test_tamper_msg_read',
    '42501',
    NULL,
    '16. Direct UPDATE on messages (read_at tampering) is prohibited'
);

-- 17: Function mark_messages_read exists
RESET ROLE;
SELECT has_function('public', 'mark_messages_read', ARRAY['uuid'], '17. mark_messages_read(uuid) function exists');


-- ==============================================================================
-- Test 18 - 21: Admin Table & Function Isolation (Rule 9)
-- ==============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT throws_ok(
    'SELECT * FROM public.admins',
    '42501',
    NULL,
    '18. Non-admin cannot SELECT from public.admins'
);

PREPARE test_non_admin_audit AS
    INSERT INTO public.audit_log (admin_id, action, target_type)
    VALUES ('11111111-1111-1111-1111-111111111111', 'tamper', 'system');

SELECT throws_ok(
    'test_non_admin_audit',
    '42501',
    NULL,
    '19. Non-admin cannot INSERT into public.audit_log'
);

RESET ROLE;
SELECT has_function('public', 'review_photo', ARRAY['uuid', 'text'], '20. review_photo admin function exists');

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT throws_ok(
    'SELECT public.review_photo(''bbbbbbbb-0000-0000-0000-000000000002''::uuid, ''approved'')',
    '42501',
    NULL,
    '21. Non-admin cannot call review_photo admin function'
);


-- ==============================================================================
-- Test 22 - 23: Discovery Privacy & Function Execution (Rules 1, 2)
-- ==============================================================================
SELECT lives_ok(
    'SELECT * FROM public.get_discovery_feed() LIMIT 1',
    '22. Discovery feed returns without error'
);

-- Test 23 (Item 2): Exact set of columns, fails if function does not exist
RESET ROLE;
SELECT set_eq(
    $$
    SELECT col_name
    FROM (
        SELECT unnest(proargnames) AS col_name, unnest(proargmodes) AS col_mode
        FROM pg_proc
        WHERE proname = 'get_discovery_feed' AND pronamespace = 'public'::regnamespace
    ) s
    WHERE col_mode = 't'
    $$,
    ARRAY['user_id', 'name', 'age', 'city', 'intent', 'bio', 'bio_ta', 'interests', 'prompts', 'photos']::text[],
    '23. get_discovery_feed() returns exact allowed columns (no email, birth_date, admin fields)'
);


-- ==============================================================================
-- Test 24 - 25: Blocked & Banned Message Restrictions (Rule 8)
-- ==============================================================================
RESET ROLE;
INSERT INTO public.blocks (blocker, blocked) 
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111') 
ON CONFLICT (blocker, blocked) DO NOTHING;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT throws_ok(
    'INSERT INTO public.messages (match_id, sender_id, body) VALUES ((SELECT id FROM public.matches LIMIT 1), ''11111111-1111-1111-1111-111111111111'', ''Blocked test message'')',
    'P0001',
    NULL,
    '24. Blocked members cannot send messages to each other'
);

SET LOCAL "request.jwt.claim.sub" TO '88888888-8888-8888-8888-888888888888';
SET LOCAL "request.jwt.claim.email" TO 'banned@example.com';

SELECT throws_ok(
    'INSERT INTO public.messages (match_id, sender_id, body) VALUES ((SELECT id FROM public.matches LIMIT 1), ''88888888-8888-8888-8888-888888888888'', ''Banned test message'')',
    '42501',
    NULL,
    '25. Banned user cannot send messages'
);


-- ==============================================================================
-- Test 26 - 38: Discoverability Filter Hardening (Item 3)
-- Candidate tested is Member C (from Member A caller perspective)
-- ==============================================================================
RESET ROLE;
DELETE FROM public.blocks WHERE (blocker = '11111111-1111-1111-1111-111111111111' AND blocked = '33333333-3333-3333-3333-333333333333')
                             OR (blocker = '33333333-3333-3333-3333-333333333333' AND blocked = '11111111-1111-1111-1111-111111111111');
DELETE FROM public.passes WHERE user_id = '11111111-1111-1111-1111-111111111111' AND target_id = '33333333-3333-3333-3333-333333333333';
DELETE FROM public.preferences WHERE user_id = '11111111-1111-1111-1111-111111111111';

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

-- 26: Normal profile appears
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    1,
    '26. Normal eligible profile appears in discovery feed'
);

-- 27: Paused profile disappears
SAVEPOINT sp_filter;
RESET ROLE;
UPDATE public.profiles SET is_paused = TRUE WHERE user_id = '33333333-3333-3333-3333-333333333333';
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '27. Paused profile disappears from discovery feed'
);
ROLLBACK TO sp_filter;

-- 28: Banned user profile disappears
SAVEPOINT sp_filter;
RESET ROLE;
UPDATE public.users SET status = 'banned' WHERE id = '33333333-3333-3333-3333-333333333333';
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '28. Banned user profile disappears from discovery feed'
);
ROLLBACK TO sp_filter;

-- 29: Suspended user profile disappears
SAVEPOINT sp_filter;
RESET ROLE;
UPDATE public.users SET status = 'suspended' WHERE id = '33333333-3333-3333-3333-333333333333';
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '29. Suspended user profile disappears from discovery feed'
);
ROLLBACK TO sp_filter;

-- 30: Unadmitted waitlist profile disappears
SAVEPOINT sp_filter;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
UPDATE public.waitlist_entries SET status = 'waiting' WHERE user_id = '33333333-3333-3333-3333-333333333333';
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '30. Unadmitted waitlist profile disappears from discovery feed'
);
ROLLBACK TO sp_filter;

-- 31: Profile with no approved selfie disappears
SAVEPOINT sp_filter;
RESET ROLE;
UPDATE public.verifications SET result = 'pending' WHERE user_id = '33333333-3333-3333-3333-333333333333';
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '31. Profile with unapproved selfie disappears from discovery feed'
);
ROLLBACK TO sp_filter;

-- 32: Profile with no approved photo disappears
SAVEPOINT sp_filter;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
UPDATE public.profile_photos SET status = 'pending' WHERE owner = '33333333-3333-3333-3333-333333333333';
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '32. Profile with no approved photo disappears from discovery feed'
);
ROLLBACK TO sp_filter;

-- 33: Profile blocked by caller disappears
SAVEPOINT sp_filter;
RESET ROLE;
INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '33. Profile blocked by caller disappears from discovery feed'
);
ROLLBACK TO sp_filter;

-- 34: Profile blocking caller disappears
SAVEPOINT sp_filter;
RESET ROLE;
INSERT INTO public.blocks (blocker, blocked) VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '34. Profile blocking caller disappears from discovery feed'
);
ROLLBACK TO sp_filter;

-- 35: Already liked profile disappears (Member B was liked by Member A)
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    0,
    '35. Already liked profile disappears from discovery feed'
);

-- 36: Already passed profile disappears
SAVEPOINT sp_filter;
RESET ROLE;
INSERT INTO public.passes (user_id, target_id) VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '36. Already passed profile disappears from discovery feed'
);
ROLLBACK TO sp_filter;

-- 37: Different city profile disappears
SAVEPOINT sp_filter;
RESET ROLE;
UPDATE public.profiles SET city = 'Bangalore' WHERE user_id = '33333333-3333-3333-3333-333333333333';
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '37. Different city profile disappears from discovery feed'
);
ROLLBACK TO sp_filter;

-- 38: Caller themselves never in feed
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '11111111-1111-1111-1111-111111111111'),
    0,
    '38. Caller does not appear in own discovery feed'
);


-- ==============================================================================
-- Test 39 - 46: Storage & Photo Rules (Item 4)
-- ==============================================================================
-- 39: Another member cannot fetch pending photo from profile_photos
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.profile_photos WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002'),
    0,
    '39. Another member cannot fetch a pending photo from public.profile_photos'
);

-- 40: Another member cannot fetch rejected photo from profile_photos
SELECT is(
    (SELECT COUNT(*)::int FROM public.profile_photos WHERE id = 'bbbbbbbb-0000-0000-0000-000000000003'),
    0,
    '40. Another member cannot fetch a rejected photo from public.profile_photos'
);

-- 41: Another member cannot fetch pending photo from storage.objects
SELECT is(
    (SELECT COUNT(*)::int FROM storage.objects WHERE bucket_id = 'photos' AND name = '22222222-2222-2222-2222-222222222222/photo2_pending.jpg'),
    0,
    '41. Another member cannot fetch pending photo from storage.objects'
);

-- 42: Member cannot set own photo status to approved
SELECT throws_ok(
    'UPDATE public.profile_photos SET status = ''approved'' WHERE id = ''aaaaaaaa-0000-0000-0000-000000000001''',
    '42501',
    NULL,
    '42. Member cannot set their own photo status to approved'
);

-- 43: Member cannot upload under another member folder
SELECT throws_ok(
    'INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES (''55555555-0000-0000-0000-000000000001'', ''photos'', ''22222222-2222-2222-2222-222222222222/hack.jpg'', ''11111111-1111-1111-1111-111111111111'')',
    '42501',
    NULL,
    '43. Member cannot upload under another member folder'
);

-- 44: Member A cannot read Member B selfie from storage.objects
SELECT is(
    (SELECT COUNT(*)::int FROM storage.objects WHERE bucket_id = 'selfies' AND name = '22222222-2222-2222-2222-222222222222/selfie.jpg'),
    0,
    '44. Member cannot read another member selfie from storage.objects'
);

-- 45: Member A can read own selfie from storage.objects
SELECT is(
    (SELECT COUNT(*)::int FROM storage.objects WHERE bucket_id = 'selfies' AND name = '11111111-1111-1111-1111-111111111111/selfie.jpg'),
    1,
    '45. Member can read own selfie from storage.objects'
);

-- 46: Admin can read any selfie from storage.objects
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SELECT is(
    (SELECT COUNT(*)::int FROM storage.objects WHERE bucket_id = 'selfies' AND name = '22222222-2222-2222-2222-222222222222/selfie.jpg'),
    1,
    '46. Admin can read any selfie from storage.objects'
);


-- ==============================================================================
-- Test 47 - 52: Integrity Rules (Item 5)
-- ==============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

-- 47: Member cannot insert verification row with result approved
SELECT throws_ok(
    'INSERT INTO public.verifications (user_id, selfie_path, result) VALUES (''11111111-1111-1111-1111-111111111111'', ''selfies/hack.jpg'', ''approved'')',
    '42501',
    NULL,
    '47. Member cannot insert a verification row with result approved'
);

-- 48: Member cannot change their own users.status
SELECT throws_ok(
    'UPDATE public.users SET status = ''banned'' WHERE id = ''11111111-1111-1111-1111-111111111111''',
    '42501',
    NULL,
    '48. Member cannot change their own users.status'
);

-- 49: Member cannot insert reports as another reporter
SELECT throws_ok(
    'INSERT INTO public.reports (reporter, target, reason) VALUES (''22222222-2222-2222-2222-222222222222'', ''33333333-3333-3333-3333-333333333333'', ''harassment'')',
    '42501',
    NULL,
    '49. Member cannot insert reports as another reporter'
);

-- 50: Member cannot report themselves
SELECT throws_ok(
    'INSERT INTO public.reports (reporter, target, reason) VALUES (''11111111-1111-1111-1111-111111111111'', ''11111111-1111-1111-1111-111111111111'', ''harassment'')',
    '23514',
    NULL,
    '50. Member cannot report themselves'
);

-- 51: Member cannot read other members' reports
RESET ROLE;
INSERT INTO public.reports (id, reporter, target, reason)
VALUES ('77777777-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'harassment')
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.reports WHERE id = '77777777-0000-0000-0000-000000000001'),
    0,
    '51. Member cannot read other members reports'
);

-- 52: Passes visible only to their owner
RESET ROLE;
INSERT INTO public.passes (user_id, target_id)
VALUES ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (user_id, target_id) DO NOTHING;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.passes WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    0,
    '52. Passes are visible only to their owner'
);


-- ==============================================================================
-- Test 53 - 58: Chat Rules & Likes Limits (Item 6)
-- ==============================================================================
-- Match between A and B
RESET ROLE;
DELETE FROM public.blocks WHERE (blocker = '11111111-1111-1111-1111-111111111111' AND blocked = '22222222-2222-2222-2222-222222222222')
                             OR (blocker = '22222222-2222-2222-2222-222222222222' AND blocked = '11111111-1111-1111-1111-111111111111');
DO $$
DECLARE v_mid UUID;
BEGIN
    SELECT id INTO v_mid FROM public.matches 
    WHERE (user_a = '11111111-1111-1111-1111-111111111111' AND user_b = '22222222-2222-2222-2222-222222222222')
       OR (user_a = '22222222-2222-2222-2222-222222222222' AND user_b = '11111111-1111-1111-1111-111111111111');
    INSERT INTO public.messages (id, match_id, sender_id, body)
    VALUES ('99999999-0000-0000-0000-000000000005', v_mid, '22222222-2222-2222-2222-222222222222', 'Unread test')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- 53: Non-participant (Member C) cannot read messages in Match(A, B)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '33333333-3333-3333-3333-333333333333';
SET LOCAL "request.jwt.claim.email" TO 'member_c_phase3@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.messages WHERE id = '99999999-0000-0000-0000-000000000005'),
    0,
    '53. Non-participant cannot read messages in someone else match'
);

-- 54: Non-participant cannot insert into someone else match
SELECT throws_ok(
    'INSERT INTO public.messages (match_id, sender_id, body) VALUES ((SELECT id FROM public.matches WHERE (user_a = ''11111111-1111-1111-1111-111111111111'' AND user_b = ''22222222-2222-2222-2222-222222222222'') OR (user_a = ''22222222-2222-2222-2222-222222222222'' AND user_b = ''11111111-1111-1111-1111-111111111111'')), ''33333333-3333-3333-3333-333333333333'', ''Intruder msg'')',
    '42501',
    NULL,
    '54. Non-participant cannot insert messages into someone else match'
);

-- 55: Non-participant cannot call mark_messages_read for someone else match
SELECT throws_ok(
    'SELECT public.mark_messages_read((SELECT id FROM public.matches WHERE (user_a = ''11111111-1111-1111-1111-111111111111'' AND user_b = ''22222222-2222-2222-2222-222222222222'') OR (user_a = ''22222222-2222-2222-2222-222222222222'' AND user_b = ''11111111-1111-1111-1111-111111111111'')))',
    '42501',
    NULL,
    '55. Non-participant cannot call mark_messages_read on someone else match'
);

-- 56: After a block, neither person can read old chat history
RESET ROLE;
DELETE FROM public.blocks WHERE (blocker = '11111111-1111-1111-1111-111111111111' AND blocked = '22222222-2222-2222-2222-222222222222')
                             OR (blocker = '22222222-2222-2222-2222-222222222222' AND blocked = '11111111-1111-1111-1111-111111111111');
-- Insert block from A to B
INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT is(
    (SELECT COUNT(*)::int FROM public.messages WHERE id = '99999999-0000-0000-0000-000000000005'),
    0,
    '56. After a block, neither person can read old chat history (blocker view)'
);

-- 57: Likes older than 24 hours do not count toward daily limit (tested on isolated Member E)
RESET ROLE;
-- Insert 20 likes for Member E that occurred 25 hours ago
DO $$
DECLARE i INT; target_uuid UUID;
BEGIN
    FOR i IN 1..20 LOOP
        target_uuid := ('eeeeeeee-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID;
        INSERT INTO auth.users (id, email) VALUES (target_uuid, 'old_target_e_' || i || '@example.com') ON CONFLICT DO NOTHING;
        INSERT INTO public.users (id, email) VALUES (target_uuid, 'old_target_e_' || i || '@example.com') ON CONFLICT DO NOTHING;
        INSERT INTO public.likes (from_user, to_user, created_at)
        VALUES ('55555555-5555-5555-5555-555555555555', target_uuid, NOW() - INTERVAL '25 hours')
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Member E can still like today despite 20 expired likes
SELECT lives_ok(
    'INSERT INTO public.likes (from_user, to_user) VALUES (''55555555-5555-5555-5555-555555555555'', ''66666666-6666-6666-6666-666666666666'')',
    '57. Likes older than 24 hours do not count toward daily limit'
);

-- 58: Two simultaneous mutual likes create one match (Member F likes Member E)
INSERT INTO public.likes (from_user, to_user)
VALUES ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555')
ON CONFLICT DO NOTHING;

SELECT is(
    (SELECT COUNT(*)::int FROM public.matches 
     WHERE (user_a = '55555555-5555-5555-5555-555555555555' AND user_b = '66666666-6666-6666-6666-666666666666')
        OR (user_a = '66666666-6666-6666-6666-666666666666' AND user_b = '55555555-5555-5555-5555-555555555555')),
    1,
    '58. Mutual likes create exactly one match'
);


-- ==============================================================================
-- Test 59 - 62: Anon Role Execution Blocks (Item 7)
-- ==============================================================================
SET LOCAL ROLE anon;

SELECT throws_ok(
    'SELECT * FROM public.get_discovery_feed()',
    '42501',
    NULL,
    '59. Anon cannot execute get_discovery_feed'
);

SELECT throws_ok(
    'SELECT public.mark_messages_read(''bbbbbbbb-0000-0000-0000-000000000001''::uuid)',
    '42501',
    NULL,
    '60. Anon cannot execute mark_messages_read'
);

SELECT throws_ok(
    'SELECT public.review_photo(''bbbbbbbb-0000-0000-0000-000000000001''::uuid, ''approved'')',
    '42501',
    NULL,
    '61. Anon cannot execute review_photo'
);

SELECT throws_ok(
    'SELECT public.admit_batch(''Chennai'')',
    '42501',
    NULL,
    '62. Anon cannot execute admit_batch'
);


-- ==============================================================================
-- Test 63 - 65: Pagination and Stable Order (Item 8)
-- Member D caller viewing Member B and Member C (both eligible in Chennai)
-- ==============================================================================
RESET ROLE;
DELETE FROM public.blocks WHERE blocker = '44444444-4444-4444-4444-444444444444' OR blocked = '44444444-4444-4444-4444-444444444444';
DELETE FROM public.passes WHERE user_id = '44444444-4444-4444-4444-444444444444';

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '44444444-4444-4444-4444-444444444444';
SET LOCAL "request.jwt.claim.email" TO 'member_d@example.com';

-- 63: Page 1 with limit 1
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed(1, 0)),
    1,
    '63. Pagination: get_discovery_feed limit 1 offset 0 returns page 1'
);

-- 64: Page 2 with limit 1 offset 1
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed(1, 1)),
    1,
    '64. Pagination: get_discovery_feed limit 1 offset 1 returns page 2'
);

-- 65: Stable order: page 1 user_id != page 2 user_id
SELECT ok(
    (SELECT user_id FROM public.get_discovery_feed(1, 0)) <> (SELECT user_id FROM public.get_discovery_feed(1, 1)),
    '65. Stable order: page 1 user_id is distinct from page 2 user_id'
);

SELECT * FROM finish();
ROLLBACK;
