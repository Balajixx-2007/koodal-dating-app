-- ==============================================================================
-- Supabase Local Development Seed Data (For local testing only)
-- ==============================================================================

-- 1. Insert Initial Waitlist Batches
INSERT INTO public.batches (id, city, date, women_admitted, men_admitted, ratio_before, ratio_after)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Chennai', '2026-10-15', 15, 18, 1.45, 1.25),
    ('b0000000-0000-0000-0000-000000000002', 'Bangalore', '2026-10-18', 12, 14, 1.38, 1.18)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Initial Seed Waitlist Entries
INSERT INTO public.waitlist_entries (
    id, email, city, gender, intent, lane, score, status, referral_count, 
    has_selfie_approved, has_profile_complete, days_on_list, created_at
)
VALUES
    ('w0000000-0000-0000-0000-000000000001', 'kavitha.m@chennai.edu', 'Chennai', 'woman', 'long_term', 'women_and_others', 82, 'waiting', 1, true, true, 12, '2026-10-10T08:00:00Z'),
    ('w0000000-0000-0000-0000-000000000002', 'sneha.blore@biotech.org', 'Bangalore', 'woman', 'marriage', 'women_and_others', 75, 'waiting', 0, true, true, 5, '2026-10-17T09:30:00Z'),
    ('w0000000-0000-0000-0000-000000000003', 'dhivya.ux@chennai.design', 'Chennai', 'non_binary', 'friendship', 'women_and_others', 68, 'waiting', 0, true, false, 18, '2026-10-04T14:20:00Z'),
    ('w0000000-0000-0000-0000-000000000004', 'aravind.subramanian@gmail.com', 'Chennai', 'man', 'long_term', 'men', 86, 'waiting', 1, true, true, 6, '2026-10-16T11:00:00Z'),
    ('w0000000-0000-0000-0000-000000000005', 'karthik.b@techlabs.io', 'Bangalore', 'man', 'casual', 'men', 84, 'waiting', 0, true, true, 14, '2026-10-08T10:15:00Z'),
    ('w0000000-0000-0000-0000-000000000006', 'vignesh.r@iitm.ac.in', 'Chennai', 'man', 'marriage', 'men', 72, 'waiting', 0, true, false, 22, '2026-09-30T17:45:00Z')
ON CONFLICT (id) DO NOTHING;
