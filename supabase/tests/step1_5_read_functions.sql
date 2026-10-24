BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(33);

-- ==============================================================================
-- Fixtures & Seed Data for Step 1.5 Read Functions
-- ==============================================================================
-- Seed Admin
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admins (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'superadmin')
ON CONFLICT (user_id) DO NOTHING;

-- Seed Users
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES 
    ('11111111-2222-3333-4444-000000000001', 'viewer_1@example.com', NOW()),
    ('11111111-2222-3333-4444-000000000002', 'target_eligible@example.com', NOW()),
    ('11111111-2222-3333-4444-000000000003', 'target_blocked@example.com', NOW()),
    ('11111111-2222-3333-4444-000000000004', 'target_matched@example.com', NOW()),
    ('11111111-2222-3333-4444-000000000005', 'target_banned@example.com', NOW()),
    ('11111111-2222-3333-4444-000000000006', 'target_suspended@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, status)
VALUES 
    ('11111111-2222-3333-4444-000000000001', 'viewer_1@example.com', 'active'),
    ('11111111-2222-3333-4444-000000000002', 'target_eligible@example.com', 'active'),
    ('11111111-2222-3333-4444-000000000003', 'target_blocked@example.com', 'active'),
    ('11111111-2222-3333-4444-000000000004', 'target_matched@example.com', 'active'),
    ('11111111-2222-3333-4444-000000000005', 'target_banned@example.com', 'banned'),
    ('11111111-2222-3333-4444-000000000006', 'target_suspended@example.com', 'suspended')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- Profiles
INSERT INTO public.profiles (user_id, name, birth_date, gender, intent, city, bio, is_paused)
VALUES 
    ('11111111-2222-3333-4444-000000000001', 'Viewer One', '1995-05-15', 'man', 'long_term', 'Chennai', 'Viewer bio', FALSE),
    ('11111111-2222-3333-4444-000000000002', 'Eligible Target', '1996-06-20', 'woman', 'long_term', 'Chennai', 'Eligible bio', FALSE),
    ('11111111-2222-3333-4444-000000000003', 'Blocked Target', '1997-07-25', 'woman', 'long_term', 'Chennai', 'Blocked bio', FALSE),
    ('11111111-2222-3333-4444-000000000004', 'Matched Target', '1998-08-30', 'woman', 'long_term', 'Chennai', 'Matched bio', FALSE),
    ('11111111-2222-3333-4444-000000000005', 'Banned Target', '1994-04-10', 'woman', 'long_term', 'Chennai', 'Banned bio', FALSE),
    ('11111111-2222-3333-4444-000000000006', 'Suspended Target', '1993-03-05', 'woman', 'long_term', 'Chennai', 'Suspended bio', FALSE)
ON CONFLICT (user_id) DO UPDATE SET 
    name = EXCLUDED.name,
    city = EXCLUDED.city,
    is_paused = EXCLUDED.is_paused;

-- Waitlist
INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent, lane, status)
VALUES 
    ('11111111-2222-3333-4444-000000000001', 'viewer_1@example.com', 'Chennai', 'man', 'long_term', 'men', 'waiting'),
    ('11111111-2222-3333-4444-000000000002', 'target_eligible@example.com', 'Chennai', 'woman', 'long_term', 'women_and_others', 'waiting'),
    ('11111111-2222-3333-4444-000000000003', 'target_blocked@example.com', 'Chennai', 'woman', 'long_term', 'women_and_others', 'waiting'),
    ('11111111-2222-3333-4444-000000000004', 'target_matched@example.com', 'Chennai', 'woman', 'long_term', 'women_and_others', 'waiting'),
    ('11111111-2222-3333-4444-000000000005', 'target_banned@example.com', 'Chennai', 'woman', 'long_term', 'women_and_others', 'waiting'),
    ('11111111-2222-3333-4444-000000000006', 'target_suspended@example.com', 'Chennai', 'woman', 'long_term', 'women_and_others', 'waiting')
ON CONFLICT (email) DO NOTHING;

-- Mark waitlist as admitted under admin authority
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'admin@example.com';
UPDATE public.waitlist_entries SET status = 'admitted';
RESET ROLE;

-- Verifications (Selfies approved)
INSERT INTO public.verifications (user_id, selfie_path, result)
VALUES 
    ('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000001/selfie.jpg', 'approved'),
    ('11111111-2222-3333-4444-000000000002', '11111111-2222-3333-4444-000000000002/selfie.jpg', 'approved'),
    ('11111111-2222-3333-4444-000000000003', '11111111-2222-3333-4444-000000000003/selfie.jpg', 'approved'),
    ('11111111-2222-3333-4444-000000000004', '11111111-2222-3333-4444-000000000004/selfie.jpg', 'approved'),
    ('11111111-2222-3333-4444-000000000005', '11111111-2222-3333-4444-000000000005/selfie.jpg', 'approved'),
    ('11111111-2222-3333-4444-000000000006', '11111111-2222-3333-4444-000000000006/selfie.jpg', 'approved')
ON CONFLICT DO NOTHING;

-- Profile Photos (Approved photo for eligible, blocked, and matched targets)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_photos') THEN
        INSERT INTO public.profile_photos (id, owner, storage_path, position, status)
        VALUES 
            ('dddddddd-0000-0000-0000-000000000001', '11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000001/photo1.jpg', 0, 'approved'),
            ('dddddddd-0000-0000-0000-000000000002', '11111111-2222-3333-4444-000000000002', '11111111-2222-3333-4444-000000000002/photo1.jpg', 0, 'approved'),
            ('dddddddd-0000-0000-0000-000000000003', '11111111-2222-3333-4444-000000000003', '11111111-2222-3333-4444-000000000003/photo1.jpg', 0, 'approved'),
            ('dddddddd-0000-0000-0000-000000000004', '11111111-2222-3333-4444-000000000004', '11111111-2222-3333-4444-000000000004/photo1.jpg', 0, 'approved'),
            ('dddddddd-0000-0000-0000-000000000005', '11111111-2222-3333-4444-000000000005', '11111111-2222-3333-4444-000000000005/photo1.jpg', 0, 'approved'),
            ('dddddddd-0000-0000-0000-000000000006', '11111111-2222-3333-4444-000000000006', '11111111-2222-3333-4444-000000000006/photo1.jpg', 0, 'approved')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Matches and Messages
-- Match between Viewer 1 and Matched Target
INSERT INTO public.matches (id, user_a, user_b)
VALUES ('ffffffff-0000-0000-0000-000000000001', 
        LEAST('11111111-2222-3333-4444-000000000001'::uuid, '11111111-2222-3333-4444-000000000004'::uuid),
        GREATEST('11111111-2222-3333-4444-000000000001'::uuid, '11111111-2222-3333-4444-000000000004'::uuid))
ON CONFLICT (user_a, user_b) DO NOTHING;

-- Messages for Match 1
INSERT INTO public.messages (id, match_id, sender_id, body, sent_at, read_at)
VALUES 
    ('eeeeeeee-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', '11111111-2222-3333-4444-000000000004', 'First message', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '9 minutes'),
    ('eeeeeeee-0000-0000-0000-000000000002', 'ffffffff-0000-0000-0000-000000000001', '11111111-2222-3333-4444-000000000004', 'Latest unread message', NOW() - INTERVAL '2 minutes', NULL)
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 1. can_view_member Tests (1 - 12)
-- ==============================================================================
-- 1: Function exists
SELECT has_function('public', 'can_view_member', ARRAY['uuid', 'uuid'], '1. can_view_member(uuid, uuid) exists');

-- 2: Eligible member is viewable
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002'),
    TRUE,
    '2. Eligible active admitted member with approved photo and selfie is viewable'
);

-- 3: Paused profile is not viewable
SAVEPOINT sp_read;
UPDATE public.profiles SET is_paused = TRUE WHERE user_id = '11111111-2222-3333-4444-000000000002';
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002'),
    FALSE,
    '3. Paused member is not viewable'
);
ROLLBACK TO sp_read;

-- 4: Banned user is not viewable
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000005'),
    FALSE,
    '4. Banned user is not viewable'
);

-- 5: Suspended user is not viewable
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000006'),
    FALSE,
    '5. Suspended user is not viewable'
);

-- 6: Unadmitted waitlist is not viewable
SAVEPOINT sp_read;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'admin@example.com';
UPDATE public.waitlist_entries SET status = 'waiting' WHERE user_id = '11111111-2222-3333-4444-000000000002';
RESET ROLE;
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002'),
    FALSE,
    '6. Unadmitted waitlist member is not viewable'
);
ROLLBACK TO sp_read;

-- 7: Unapproved selfie is not viewable
SAVEPOINT sp_read;
UPDATE public.verifications SET result = 'pending' WHERE user_id = '11111111-2222-3333-4444-000000000002';
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002'),
    FALSE,
    '7. Member without approved selfie is not viewable'
);
ROLLBACK TO sp_read;

-- 8: No approved photo is not viewable
SAVEPOINT sp_read;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'admin@example.com';
UPDATE public.profile_photos SET status = 'pending' WHERE owner = '11111111-2222-3333-4444-000000000002';
RESET ROLE;
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002'),
    FALSE,
    '8. Member without approved photo is not viewable'
);
ROLLBACK TO sp_read;

-- 9: Blocked by viewer is not viewable
SAVEPOINT sp_read;
INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002');
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002'),
    FALSE,
    '9. Member blocked by viewer is not viewable'
);
ROLLBACK TO sp_read;

-- 10: Target blocking viewer is not viewable
SAVEPOINT sp_read;
INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-2222-3333-4444-000000000002', '11111111-2222-3333-4444-000000000001');
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002'),
    FALSE,
    '10. Member blocking viewer is not viewable'
);
ROLLBACK TO sp_read;

-- 11: Member liked by viewer can still be opened (can_view_member returns TRUE)
SAVEPOINT sp_read;
INSERT INTO public.likes (from_user, to_user) VALUES ('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002');
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002'),
    TRUE,
    '11. Liked member can still be viewed by id'
);
ROLLBACK TO sp_read;

-- 12: Member passed by viewer can still be opened (can_view_member returns TRUE)
SAVEPOINT sp_read;
INSERT INTO public.passes (user_id, target_id) VALUES ('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002');
SELECT is(
    public.can_view_member('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002'),
    TRUE,
    '12. Passed member can still be viewed by id'
);
ROLLBACK TO sp_read;


-- ==============================================================================
-- 2. get_member_profile Tests (13 - 20)
-- ==============================================================================
-- 13: Function exists
SELECT has_function('public', 'get_member_profile', ARRAY['uuid'], '13. get_member_profile(uuid) exists');

-- Set authenticated session as Viewer 1
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'viewer_1@example.com';

-- 14: Viewer can open an eligible member by id
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_member_profile('11111111-2222-3333-4444-000000000002')),
    1,
    '14. Viewer can open eligible member profile by id'
);

-- 15: Viewer can open liked member by id
SAVEPOINT sp_read;
RESET ROLE;
INSERT INTO public.likes (from_user, to_user) VALUES ('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_member_profile('11111111-2222-3333-4444-000000000002')),
    1,
    '15. Viewer can open liked member profile by id'
);
ROLLBACK TO sp_read;

-- 16: Viewer can open passed member by id
SAVEPOINT sp_read;
RESET ROLE;
INSERT INTO public.passes (user_id, target_id) VALUES ('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_member_profile('11111111-2222-3333-4444-000000000002')),
    1,
    '16. Viewer can open passed member profile by id'
);
ROLLBACK TO sp_read;

-- 17: Blocked member cannot be opened by id (caller blocked target)
SAVEPOINT sp_read;
RESET ROLE;
INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000002');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SELECT throws_ok(
    'SELECT * FROM public.get_member_profile(''11111111-2222-3333-4444-000000000002'')',
    '42501',
    NULL,
    '17. Blocked target cannot be opened by caller'
);
ROLLBACK TO sp_read;

-- 18: Blocked member cannot be opened by id (target blocked caller)
SAVEPOINT sp_read;
RESET ROLE;
INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-2222-3333-4444-000000000002', '11111111-2222-3333-4444-000000000001');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SELECT throws_ok(
    'SELECT * FROM public.get_member_profile(''11111111-2222-3333-4444-000000000002'')',
    '42501',
    NULL,
    '18. Target blocking caller cannot be opened by caller'
);
ROLLBACK TO sp_read;

-- 19: Match plus block hides profile in both directions
SAVEPOINT sp_read;
RESET ROLE;
INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000004');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SELECT throws_ok(
    'SELECT * FROM public.get_member_profile(''11111111-2222-3333-4444-000000000004'')',
    '42501',
    NULL,
    '19. Match plus block hides profile in both directions'
);
ROLLBACK TO sp_read;

-- 20: No sensitive columns returned from get_member_profile
RESET ROLE;
SELECT set_eq(
    $$
    SELECT col_name
    FROM (
        SELECT unnest(proargnames) AS col_name, unnest(proargmodes) AS col_mode
        FROM pg_proc
        WHERE proname = 'get_member_profile' AND pronamespace = 'public'::regnamespace
    ) s
    WHERE col_mode = 't'
    $$,
    ARRAY['user_id', 'name', 'age', 'city', 'intent', 'bio', 'bio_ta', 'interests', 'prompts', 'photos']::text[],
    '20. get_member_profile() returns exact allowed columns (no email, birth_date, admin fields)'
);


-- ==============================================================================
-- 3. get_matches_list Tests (21 - 30)
-- ==============================================================================
-- 21: Function exists
SELECT has_function('public', 'get_matches_list', '21. get_matches_list() exists');

-- Set authenticated session as Viewer 1
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'viewer_1@example.com';

-- 22: Returns match with matched partner details
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_matches_list() WHERE matched_user_id = '11111111-2222-3333-4444-000000000004'),
    1,
    '22. get_matches_list returns active match for authenticated user'
);

-- 23: Uses sent_at and returns the latest message body
SELECT is(
    (SELECT last_message_body FROM public.get_matches_list() WHERE matched_user_id = '11111111-2222-3333-4444-000000000004'),
    'Latest unread message',
    '23. get_matches_list returns latest message ordered by sent_at'
);

-- 24: Returns unread count
SELECT is(
    (SELECT unread_count::int FROM public.get_matches_list() WHERE matched_user_id = '11111111-2222-3333-4444-000000000004'),
    1,
    '24. get_matches_list returns accurate unread count'
);

-- 25: Returns approved photo path
SELECT is(
    (SELECT avatar_url FROM public.get_matches_list() WHERE matched_user_id = '11111111-2222-3333-4444-000000000004'),
    '11111111-2222-3333-4444-000000000004/photo1.jpg',
    '25. get_matches_list returns one approved photo path'
);

-- 26: Excludes blocked partner (caller blocked partner)
SAVEPOINT sp_read;
RESET ROLE;
INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000004');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_matches_list() WHERE matched_user_id = '11111111-2222-3333-4444-000000000004'),
    0,
    '26. get_matches_list excludes partner blocked by caller'
);
ROLLBACK TO sp_read;

-- 27: Excludes blocked partner (partner blocked caller)
SAVEPOINT sp_read;
RESET ROLE;
INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-2222-3333-4444-000000000004', '11111111-2222-3333-4444-000000000001');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_matches_list() WHERE matched_user_id = '11111111-2222-3333-4444-000000000004'),
    0,
    '27. get_matches_list excludes partner blocking caller'
);
ROLLBACK TO sp_read;

-- 28: Excludes banned partner
SAVEPOINT sp_read;
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'admin@example.com';
UPDATE public.users SET status = 'banned' WHERE id = '11111111-2222-3333-4444-000000000004';
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_matches_list() WHERE matched_user_id = '11111111-2222-3333-4444-000000000004'),
    0,
    '28. get_matches_list excludes banned partner'
);
ROLLBACK TO sp_read;

-- 29: Excludes suspended partner
SAVEPOINT sp_read;
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '00000000-0000-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'admin@example.com';
UPDATE public.users SET status = 'suspended' WHERE id = '11111111-2222-3333-4444-000000000004';
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SELECT is(
    (SELECT COUNT(*)::int FROM public.get_matches_list() WHERE matched_user_id = '11111111-2222-3333-4444-000000000004'),
    0,
    '29. get_matches_list excludes suspended partner'
);
ROLLBACK TO sp_read;

-- 30: Blocked partner chat history is hidden from direct query as well
SAVEPOINT sp_read;
RESET ROLE;
INSERT INTO public.blocks (blocker, blocked) VALUES ('11111111-2222-3333-4444-000000000001', '11111111-2222-3333-4444-000000000004');
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-2222-3333-4444-000000000001';
SELECT is(
    (SELECT COUNT(*)::int FROM public.messages WHERE match_id = 'ffffffff-0000-0000-0000-000000000001'),
    0,
    '30. Messages table RLS hides chat history after block'
);
ROLLBACK TO sp_read;


-- ==============================================================================
-- 4. Anon Execution Blocks (31 - 33)
-- ==============================================================================
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claim.sub" TO '';
SET LOCAL "request.jwt.claim.email" TO '';

-- 31: Anon cannot execute can_view_member
SELECT throws_ok(
    'SELECT public.can_view_member(''11111111-2222-3333-4444-000000000001''::uuid, ''11111111-2222-3333-4444-000000000002''::uuid)',
    '42501',
    NULL,
    '31. Anon cannot execute can_view_member'
);

-- 32: Anon cannot execute get_matches_list
SELECT throws_ok(
    'SELECT * FROM public.get_matches_list()',
    '42501',
    NULL,
    '32. Anon cannot execute get_matches_list'
);

-- 33: Anon cannot execute get_member_profile
SELECT throws_ok(
    'SELECT * FROM public.get_member_profile(''11111111-2222-3333-4444-000000000002''::uuid)',
    '42501',
    NULL,
    '33. Anon cannot execute get_member_profile'
);

SELECT * FROM finish();
ROLLBACK;
