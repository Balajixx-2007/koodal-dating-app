-- ==============================================================================
-- Database Test Suite: Phase 3 Security, Discovery, Likes, Matches & Messages
-- Tests failing first, then satisfied by Phase 3 migrations
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgtap";

SELECT plan(25);

-- ==============================================================================
-- 1. Setup Test Fixtures & Seed Data
-- ==============================================================================

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
VALUES ('11111111-1111-1111-1111-111111111111', 'selfies/11111111-1111-1111-1111-111111111111/selfie.jpg', 'approved');

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
VALUES ('22222222-2222-2222-2222-222222222222', 'selfies/22222222-2222-2222-2222-222222222222/selfie.jpg', 'approved');

-- Seed Member B Profile Photos (Approved and Pending)
INSERT INTO public.profile_photos (id, owner, storage_path, position, status)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'photos/22222222-2222-2222-2222-222222222222/photo1.jpg', 0, 'approved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profile_photos (id, owner, storage_path, position, status)
VALUES ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'photos/22222222-2222-2222-2222-222222222222/photo2_pending.jpg', 1, 'pending')
ON CONFLICT (id) DO NOTHING;

-- Seed Banned User
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('88888888-8888-8888-8888-888888888888', 'banned@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES ('88888888-8888-8888-8888-888888888888', 'banned@example.com', 'banned')
ON CONFLICT (id) DO UPDATE SET status = 'banned';


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

SELECT ok(
    (SELECT NOT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        CROSS JOIN unnest(p.proargnames) AS col(name)
        WHERE n.nspname = 'public' 
          AND p.proname = 'get_discovery_feed'
          AND col.name IN ('email', 'birth_date')
    )),
    '23. Discovery feed never returns email or birth_date'
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

SELECT * FROM finish();
ROLLBACK;
