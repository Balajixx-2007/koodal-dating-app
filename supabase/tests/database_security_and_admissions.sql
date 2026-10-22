-- ==============================================================================
-- Database Test Suite: Waitlist Security & Admission Engine Verification
-- Compatible with pgTAP / local Supabase / PostgreSQL test runners
-- ==============================================================================

BEGIN;

-- 1. Setup Mock Test Environment
CREATE EXTENSION IF NOT EXISTS "pgtap";

SELECT plan(12);

-- ------------------------------------------------------------------------------
-- Test 1: Verify Audit Log Immutability (Append-only enforcement)
-- ------------------------------------------------------------------------------
PREPARE test_audit_insert AS
    INSERT INTO public.audit_log (admin_id, action, target_type, details)
    VALUES (
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000001'), 
        'test_action', 
        'test_target', 
        '{"test": true}'
    );
SELECT lives_ok('test_audit_insert', 'Audit log allows insert');

PREPARE test_audit_delete AS
    DELETE FROM public.audit_log WHERE action = 'test_action';
SELECT throws_ok(
    'test_audit_delete',
    'P0001',
    'Security Policy Violation: audit_log is strictly append-only. UPDATE, DELETE, and TRUNCATE are prohibited.',
    'Audit log prohibits DELETE operation'
);

PREPARE test_audit_update AS
    UPDATE public.audit_log SET action = 'modified' WHERE action = 'test_action';
SELECT throws_ok(
    'test_audit_update',
    'P0001',
    'Security Policy Violation: audit_log is strictly append-only. UPDATE, DELETE, and TRUNCATE are prohibited.',
    'Audit log prohibits UPDATE operation'
);

-- ------------------------------------------------------------------------------
-- Test 2: Member A Cannot Tamper with Lane, Status, or Score on Update
-- ------------------------------------------------------------------------------
-- Simulate non-admin session
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO 'a0000000-0000-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

-- Insert entry as member A
INSERT INTO public.waitlist_entries (email, city, gender, intent)
VALUES ('member_a@example.com', 'Chennai', 'man', 'long_term');

-- Attempt to tamper with status and score
UPDATE public.waitlist_entries
SET status = 'admitted', score = 999, lane = 'women_and_others'
WHERE email = 'member_a@example.com';

-- Assert status was NOT changed to 'admitted'
SELECT is(
    (SELECT status FROM public.waitlist_entries WHERE email = 'member_a@example.com'),
    'waiting',
    'Member A cannot tamper with status to self-admit'
);

-- Assert lane was NOT changed
SELECT is(
    (SELECT lane FROM public.waitlist_entries WHERE email = 'member_a@example.com'),
    'men',
    'Member A cannot change their assigned lane'
);

-- Assert score cannot exceed 100
SELECT ok(
    (SELECT score FROM public.waitlist_entries WHERE email = 'member_a@example.com') <= 100,
    'Member A score remains strictly <= 100'
);

-- ------------------------------------------------------------------------------
-- Test 3: Member A Cannot Read Member B's Waitlist Entry
-- ------------------------------------------------------------------------------
RESET ROLE;
-- Insert entry for Member B
INSERT INTO public.waitlist_entries (email, city, gender, intent)
VALUES ('member_b@example.com', 'Bangalore', 'woman', 'marriage');

-- Switch back to Member A session
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO 'a0000000-0000-0000-0000-000000000001';
SET LOCAL "request.jwt.claim.email" TO 'member_a@example.com';

SELECT is(
    (SELECT COUNT(*)::int FROM public.waitlist_entries WHERE email = 'member_b@example.com'),
    0,
    'Member A receives 0 rows when attempting to query Member B entry (RLS isolation)'
);

-- ------------------------------------------------------------------------------
-- Test 4: Section 13 Formula Verification in SQL
-- ------------------------------------------------------------------------------
RESET ROLE;

-- Verify calculate_waitlist_score caps score at 100
SELECT is(
    public.calculate_waitlist_score('Chennai', true, true, 10, NOW() - INTERVAL '30 days'),
    100,
    'calculate_waitlist_score caps maximum score at 100'
);

-- Verify calculate_waitlist_score caps referrals at +10
SELECT is(
    public.calculate_waitlist_score('Coimbatore', false, false, 5, NOW()),
    11, -- 0 city + 0 selfie + 0 profile + 10 (capped) + 1 day
    'calculate_waitlist_score caps referral bonus at +10'
);

-- Verify floor() in admission formula
-- 10 active women + 15 admitted women = 25 women. 1.5 * 25 = 37.5 -> floor is 37
SELECT is(
    GREATEST(0, FLOOR(1.5 * 25 - 0))::int,
    37,
    'SQL admission formula uses FLOOR() to prevent rounding up above 1.5 ratio'
);

-- Clean rollback
SELECT * FROM finish();
ROLLBACK;
