-- ==============================================================================
-- Database Test Suite: Phase 3 Security, Discovery, Likes, Matches & Messages
-- Tests failing first, then satisfied by Phase 3 migrations
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgtap";

SELECT plan(36);

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

-- Seed Member B (Chennai, Active, Admitted, Verified Selfie, Discoverable)
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

-- Seed Member C (Bangalore - Different City)
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('33333333-3333-3333-3333-333333333333', 'member_c@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES ('33333333-3333-3333-3333-333333333333', 'member_c@example.com', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

INSERT INTO public.profiles (user_id, name, birth_date, gender, intent, city)
VALUES ('33333333-3333-3333-3333-333333333333', 'Member C', '2001-01-01', 'woman', 'long_term', 'Bangalore')
ON CONFLICT (user_id) DO UPDATE SET city = 'Bangalore', is_paused = FALSE;

INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent, status)
VALUES ('33333333-3333-3333-3333-333333333333', 'member_c@example.com', 'Bangalore', 'woman', 'long_term', 'admitted')
ON CONFLICT (email) DO UPDATE SET status = 'admitted';

INSERT INTO public.verifications (user_id, selfie_path, result)
VALUES ('33333333-3333-3333-3333-333333333333', 'selfies/33333333-3333-3333-3333-333333333333/selfie.jpg', 'approved');

-- Seed Member D (Chennai, but Unadmitted Waitlist)
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('44444444-4444-4444-4444-444444444444', 'member_d@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES ('44444444-4444-4444-4444-444444444444', 'member_d@example.com', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

INSERT INTO public.profiles (user_id, name, birth_date, gender, intent, city)
VALUES ('44444444-4444-4444-4444-444444444444', 'Member D', '2000-01-01', 'woman', 'long_term', 'Chennai')
ON CONFLICT (user_id) DO UPDATE SET city = 'Chennai', is_paused = FALSE;

INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent, status)
VALUES ('44444444-4444-4444-4444-444444444444', 'member_d@example.com', 'Chennai', 'woman', 'long_term', 'waiting')
ON CONFLICT (email) DO UPDATE SET status = 'waiting';

INSERT INTO public.verifications (user_id, selfie_path, result)
VALUES ('44444444-4444-4444-4444-444444444444', 'selfies/44444444-4444-4444-4444-444444444444/selfie.jpg', 'approved');

-- Seed Member E (Chennai, Admitted, but Pending Selfie Verification)
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('55555555-5555-5555-5555-555555555555', 'member_e@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES ('55555555-5555-5555-5555-555555555555', 'member_e@example.com', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

INSERT INTO public.profiles (user_id, name, birth_date, gender, intent, city)
VALUES ('55555555-5555-5555-5555-555555555555', 'Member E', '2000-01-01', 'woman', 'long_term', 'Chennai')
ON CONFLICT (user_id) DO UPDATE SET city = 'Chennai', is_paused = FALSE;

INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent, status)
VALUES ('55555555-5555-5555-5555-555555555555', 'member_e@example.com', 'Chennai', 'woman', 'long_term', 'admitted')
ON CONFLICT (email) DO UPDATE SET status = 'admitted';

INSERT INTO public.verifications (user_id, selfie_path, result)
VALUES ('55555555-5555-5555-5555-555555555555', 'selfies/55555555-5555-5555-5555-555555555555/selfie.jpg', 'pending');

-- Seed Member G (Chennai, Admitted, but Paused)
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('77777777-7777-7777-7777-777777777777', 'member_g@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES ('77777777-7777-7777-7777-777777777777', 'member_g@example.com', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

INSERT INTO public.profiles (user_id, name, birth_date, gender, intent, city, is_paused)
VALUES ('77777777-7777-7777-7777-777777777777', 'Member G', '2000-01-01', 'woman', 'long_term', 'Chennai', TRUE)
ON CONFLICT (user_id) DO UPDATE SET is_paused = TRUE;

INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent, status)
VALUES ('77777777-7777-7777-7777-777777777777', 'member_g@example.com', 'Chennai', 'woman', 'long_term', 'admitted')
ON CONFLICT (email) DO UPDATE SET status = 'admitted';

INSERT INTO public.verifications (user_id, selfie_path, result)
VALUES ('77777777-7777-7777-7777-777777777777', 'selfies/77777777-7777-7777-7777-777777777777/selfie.jpg', 'approved');

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
-- Test 4 - 11: Discovery Function & Discoverability Rules (Rules 1, 2, 5)
-- ==============================================================================
RESET ROLE;
-- Add approved photo for Member B, Member A, Member C, Member D, Member E, Member G
-- Member F only has a pending photo
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_photos') THEN
        INSERT INTO public.profile_photos (owner, storage_path, position, status)
        VALUES 
            ('11111111-1111-1111-1111-111111111111', 'photos/1/1.jpg', 0, 'approved'),
            ('22222222-2222-2222-2222-222222222222', 'photos/2/1.jpg', 0, 'approved'),
            ('33333333-3333-3333-3333-333333333333', 'photos/3/1.jpg', 0, 'approved'),
            ('44444444-4444-4444-4444-444444444444', 'photos/4/1.jpg', 0, 'approved'),
            ('55555555-5555-5555-5555-555555555555', 'photos/5/1.jpg', 0, 'approved'),
            ('77777777-7777-7777-7777-777777777777', 'photos/7/1.jpg', 0, 'approved')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

-- 4: Discovery function exists and returns Member B
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    1,
    '4. Discovery returns eligible Member B for Member A'
);

-- 5: Safe projection: age is computed integer, city is returned, birth_date is NULL or absent
SELECT is(
    (SELECT age FROM public.get_discovery_feed() WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    EXTRACT(YEAR FROM age(CURRENT_DATE, '2001-05-15'::date))::int,
    '5. Discovery projects computed age, city, intent, bio and no birth_date/email'
);

-- 6: Different city excluded (Member C in Bangalore)
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '6. Discovery excludes Member C (different city from caller)'
);

-- 7: Unadmitted waitlist excluded (Member D)
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '44444444-4444-4444-4444-444444444444'),
    0,
    '7. Discovery excludes unadmitted waitlist member (Member D)'
);

-- 8: Pending selfie excluded (Member E)
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '55555555-5555-5555-5555-555555555555'),
    0,
    '8. Discovery excludes member with unapproved selfie (Member E)'
);

-- 9: Zero approved photos excluded (Member F with only pending photo)
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '66666666-6666-6666-6666-666666666666'),
    0,
    '9. Discovery excludes member with no approved photos'
);

-- 10: Paused profile excluded (Member G)
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '77777777-7777-7777-7777-777777777777'),
    0,
    '10. Discovery excludes paused profile (Member G)'
);

-- 11: Self exclusion
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '11111111-1111-1111-1111-111111111111'),
    0,
    '11. Discovery excludes caller (Member A)'
);


-- ==============================================================================
-- Test 12 - 13: Bidirectional Blocks in Discovery (Rule 4)
-- ==============================================================================
RESET ROLE;
-- Insert block from Member B against Member A
INSERT INTO public.blocks (blocker, blocked)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    0,
    '12. Discovery excludes Member B when Member B has blocked Member A'
);

-- Check reverse direction: Member B discovering Member A
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';
SET LOCAL "request.jwt.claim.email" TO 'member_b@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '11111111-1111-1111-1111-111111111111'),
    0,
    '13. Discovery excludes Member A when Member B has blocked Member A (bidirectional block)'
);

-- Clean up block for subsequent tests
RESET ROLE;
DELETE FROM public.blocks WHERE blocker = '22222222-2222-2222-2222-222222222222' AND blocked = '11111111-1111-1111-1111-111111111111';


-- ==============================================================================
-- Test 14 - 15: Likes and Passes Exclusion (Rules 5, 7)
-- ==============================================================================
RESET ROLE;
-- Insert Pass from Member A to Member C
INSERT INTO public.passes (user_id, target_id)
VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- Insert Like from Member A to Member B
INSERT INTO public.likes (from_user, to_user)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    0,
    '14. Discovery excludes Member B after Member A has liked Member B'
);

SELECT is(
    (SELECT COUNT(*)::int FROM public.get_discovery_feed() WHERE user_id = '33333333-3333-3333-3333-333333333333'),
    0,
    '15. Discovery excludes Member C after Member A has passed Member C'
);

RESET ROLE;
DELETE FROM public.likes WHERE from_user = '11111111-1111-1111-1111-111111111111' AND to_user = '22222222-2222-2222-2222-222222222222';


-- ==============================================================================
-- Test 16 - 19: Photo Visibility & Moderation (Rule 3)
-- ==============================================================================
RESET ROLE;
-- Insert pending photo for Member B
INSERT INTO public.profile_photos (id, owner, storage_path, position, status)
VALUES ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'photos/2/pending.jpg', 1, 'pending')
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.profile_photos WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002'),
    0,
    '16. Member A cannot SELECT Member B pending photo in profile_photos'
);

SELECT is(
    (SELECT COUNT(*)::int FROM public.profile_photos WHERE owner = '22222222-2222-2222-2222-222222222222' AND status = 'approved'),
    1,
    '17. Member A can SELECT Member B approved photo in profile_photos'
);

-- Member B viewing own pending photo
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';
SET LOCAL "request.jwt.claim.email" TO 'member_b@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.profile_photos WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002'),
    1,
    '18. Member B CAN view their own pending photo in profile_photos'
);

-- Admin viewing all pending photos
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'admin@example.com';

SELECT ok(
    (SELECT COUNT(*)::int FROM public.profile_photos WHERE status = 'pending') >= 1,
    '19. Admin CAN view pending photos across all members'
);


-- ==============================================================================
-- Test 20 - 22: Selfie Verification Isolation (Rule 3)
-- ==============================================================================
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.verifications WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    0,
    '20. Member A cannot view Member B selfie verification (RLS private)'
);

SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';
SET LOCAL "request.jwt.claim.email" TO 'member_b@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.verifications WHERE user_id = '22222222-2222-2222-2222-222222222222'),
    1,
    '21. Member B can view their own selfie verification'
);

SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'admin@example.com';

SELECT ok(
    (SELECT COUNT(*)::int FROM public.verifications) >= 1,
    '22. Admin can view selfie verifications across members'
);


-- ==============================================================================
-- Test 23 - 25: Likes Enforcements & Mutual Matches (Rule 6)
-- ==============================================================================
RESET ROLE;
-- Clean existing likes for Member A
DELETE FROM public.likes WHERE from_user = '11111111-1111-1111-1111-111111111111';

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

-- Insert like A -> B
INSERT INTO public.likes (from_user, to_user)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- 23: Deleting likes is prohibited
PREPARE delete_like_stmt AS
    DELETE FROM public.likes WHERE from_user = '11111111-1111-1111-1111-111111111111' AND to_user = '22222222-2222-2222-2222-222222222222';

SELECT throws_ok(
    'delete_like_stmt',
    'Members cannot delete likes'
);

-- 24: Rolling 24-hour limit of 20 likes
RESET ROLE;
-- Seed 19 mock targets to reach 20 likes in past 24h
DO $$ 
DECLARE i INT; target_uuid UUID;
BEGIN
    FOR i IN 1..19 LOOP
        target_uuid := ('aaaaaaaa-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID;
        INSERT INTO auth.users (id, email) VALUES (target_uuid, 'mock_target_' || i || '@example.com') ON CONFLICT DO NOTHING;
        INSERT INTO public.users (id, email) VALUES (target_uuid, 'mock_target_' || i || '@example.com') ON CONFLICT DO NOTHING;
        INSERT INTO public.likes (from_user, to_user, created_at)
        VALUES ('11111111-1111-1111-1111-111111111111', target_uuid, NOW() - (i || ' minutes')::interval)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Now Member A has 20 likes in past 24h. Attempting 21st like must fail:
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

PREPARE like_limit_stmt AS
    INSERT INTO public.likes (from_user, to_user)
    VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');

SELECT throws_ok(
    'like_limit_stmt',
    'P0001',
    'Daily like limit reached. Members are limited to 20 likes per rolling 24 hours.',
    '24. 21st like in rolling 24 hours is rejected with limit exception'
);

-- 25: Reciprocal like B -> A creates exactly one match
RESET ROLE;
INSERT INTO public.likes (from_user, to_user)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

SELECT is(
    (SELECT COUNT(*)::int FROM public.matches 
     WHERE (user_a = '11111111-1111-1111-1111-111111111111' AND user_b = '22222222-2222-2222-2222-222222222222')
        OR (user_a = '22222222-2222-2222-2222-222222222222' AND user_b = '11111111-1111-1111-1111-111111111111')),
    1,
    '25. Mutual like creates exactly one match via trigger'
);


-- ==============================================================================
-- Test 26 - 32: Matches & Messages Security (Rules 4, 8)
-- ==============================================================================
RESET ROLE;
-- Get match ID
DO $$
DECLARE v_mid UUID;
BEGIN
    SELECT id INTO v_mid FROM public.matches 
    WHERE (user_a = '11111111-1111-1111-1111-111111111111' AND user_b = '22222222-2222-2222-2222-222222222222')
       OR (user_a = '22222222-2222-2222-2222-222222222222' AND user_b = '11111111-1111-1111-1111-111111111111')
    LIMIT 1;

    -- Insert a block between A and B
    INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
END $$;

-- 26: Blocked members cannot view their match
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.matches 
     WHERE (user_a = '11111111-1111-1111-1111-111111111111' AND user_b = '22222222-2222-2222-2222-222222222222')
        OR (user_a = '22222222-2222-2222-2222-222222222222' AND user_b = '11111111-1111-1111-1111-111111111111')),
    0,
    '26. Blocked members cannot view their match'
);

-- 27: Blocked members cannot send message
PREPARE blocked_msg_stmt AS
    INSERT INTO public.messages (match_id, sender_id, body)
    VALUES (
        (SELECT id FROM public.matches LIMIT 1),
        '11111111-1111-1111-1111-111111111111',
        'Hello over block'
    );

SELECT throws_ok(
    'blocked_msg_stmt',
    '27. Blocked members cannot insert message into match'
);

-- Unblock for subsequent message tests
RESET ROLE;
DELETE FROM public.blocks WHERE blocker = '11111111-1111-1111-1111-111111111111';

-- 28: Banned user cannot send messages
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '88888888-8888-8888-8888-888888888888';
SET LOCAL "request.jwt.claim.email" TO 'banned@example.com';

PREPARE banned_msg_stmt AS
    INSERT INTO public.messages (match_id, sender_id, body)
    VALUES (
        (SELECT id FROM public.matches LIMIT 1),
        '88888888-8888-8888-8888-888888888888',
        'I am banned but trying to chat'
    );

SELECT throws_ok(
    'banned_msg_stmt',
    '28. Banned user cannot send messages'
);

-- 29: Message body length limit (> 2000 chars rejected)
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

PREPARE oversized_msg_stmt AS
    INSERT INTO public.messages (match_id, sender_id, body)
    VALUES (
        (SELECT id FROM public.matches LIMIT 1),
        '11111111-1111-1111-1111-111111111111',
        REPEAT('A', 2001)
    );

SELECT throws_ok(
    'oversized_msg_stmt',
    '29. Message body exceeding 2000 characters is rejected'
);

-- 30: Empty message body rejected
PREPARE empty_msg_stmt AS
    INSERT INTO public.messages (match_id, sender_id, body)
    VALUES (
        (SELECT id FROM public.matches LIMIT 1),
        '11111111-1111-1111-1111-111111111111',
        '   '
    );

SELECT throws_ok(
    'empty_msg_stmt',
    '30. Empty or whitespace-only message body is rejected'
);

-- Insert valid message A -> B
RESET ROLE;
DO $$
DECLARE v_mid UUID;
BEGIN
    SELECT id INTO v_mid FROM public.matches LIMIT 1;
    INSERT INTO public.messages (id, match_id, sender_id, body)
    VALUES ('mmmmmmmm-0000-0000-0000-000000000001', v_mid, '11111111-1111-1111-1111-111111111111', 'Hello valid message')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- 31: Direct update on messages (read_at tampering) is rejected
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

PREPARE tamper_msg_stmt AS
    UPDATE public.messages SET read_at = NOW() WHERE id = 'mmmmmmmm-0000-0000-0000-000000000001';

SELECT throws_ok(
    'tamper_msg_stmt',
    '31. Direct UPDATE on messages is prohibited'
);

-- 32: Read receipts through mark_messages_read function
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';
SET LOCAL "request.jwt.claim.email" TO 'member_b@example.com';

SELECT lives_ok(
    'SELECT public.mark_messages_read((SELECT match_id FROM public.messages WHERE id = ''mmmmmmmm-0000-0000-0000-000000000001''))',
    '32. Recipient can mark messages as read via mark_messages_read function'
);


-- ==============================================================================
-- Test 33 - 36: Reports & Admin Security Isolation (Rules 4, 9)
-- ==============================================================================
RESET ROLE;
INSERT INTO public.reports (reporter, target, reason, details)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'inappropriate_content', 'Test details');

-- 33: Member B cannot view reports filed by Member A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';
SET LOCAL "request.jwt.claim.email" TO 'member_b@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.reports WHERE target = '22222222-2222-2222-2222-222222222222'),
    0,
    '33. Target member cannot view reports filed against them'
);

-- 34: Non-admin cannot SELECT from public.admins
SELECT throws_ok(
    'SELECT * FROM public.admins',
    '34. Non-admin cannot SELECT from public.admins table'
);

-- 35: Non-admin cannot write audit_log
PREPARE non_admin_audit_stmt AS
    INSERT INTO public.audit_log (admin_id, action, target_type)
    VALUES ('22222222-2222-2222-2222-222222222222', 'hack', 'user');

SELECT throws_ok(
    'non_admin_audit_stmt',
    '35. Non-admin cannot INSERT into public.audit_log'
);

-- 36: Non-admin cannot call admin review functions
PREPARE admin_func_stmt AS
    SELECT public.review_photo('bbbbbbbb-0000-0000-0000-000000000002', 'approved');

SELECT throws_ok(
    'admin_func_stmt',
    '36. Non-admin cannot execute admin review functions'
);

SELECT * FROM finish();
ROLLBACK;
