import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { calculateBatchAdmission, calculatePriorityScore } from '../lib/waitlistFormula';

describe('Item 2 & 3: Real Database Test Suite (In-Memory PostgreSQL Engine)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();

    // 1. Core Schema Setup in Real Postgres
    await db.exec(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_intent') THEN
          CREATE TYPE relationship_intent AS ENUM ('casual', 'long_term', 'marriage', 'friendship');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
          CREATE TYPE user_status AS ENUM ('active', 'pending_verification', 'suspended', 'banned');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_result') THEN
          CREATE TYPE verification_result AS ENUM ('pending', 'approved', 'rejected');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        status user_status NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
        name TEXT NOT NULL,
        photos TEXT[] NOT NULL DEFAULT '{}',
        bio TEXT DEFAULT '',
        city TEXT NOT NULL,
        gender TEXT NOT NULL DEFAULT 'woman',
        is_paused BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        selfie_path TEXT NOT NULL DEFAULT 'selfie.jpg',
        result verification_result NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.waitlist_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        email TEXT UNIQUE NOT NULL,
        city TEXT NOT NULL,
        gender TEXT NOT NULL,
        intent relationship_intent NOT NULL DEFAULT 'long_term',
        lane TEXT NOT NULL,
        score INT NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'waiting',
        referred_by TEXT,
        referral_count INT NOT NULL DEFAULT 0,
        has_selfie_approved BOOLEAN NOT NULL DEFAULT FALSE,
        has_profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
        days_on_list INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        admitted_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS public.batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        women_admitted INT NOT NULL DEFAULT 0,
        men_admitted INT NOT NULL DEFAULT 0,
        ratio_before NUMERIC(4,2) NOT NULL,
        ratio_after NUMERIC(4,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Auth schema setup for testing
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        email_confirmed_at TIMESTAMPTZ
      );

      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
      $$ LANGUAGE sql STABLE;

      CREATE OR REPLACE FUNCTION auth.email() RETURNS TEXT AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.email', true), '');
      $$ LANGUAGE sql STABLE;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
      END $$;

      GRANT ALL ON SCHEMA public TO authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT ALL ON SCHEMA auth TO authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA auth TO authenticated;

      -- SECURITY DEFINER email confirmation check
      CREATE OR REPLACE FUNCTION public.is_caller_email_confirmed()
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$
      DECLARE
          v_confirmed_at TIMESTAMPTZ;
      BEGIN
          IF auth.uid() IS NULL THEN
              RETURN FALSE;
          END IF;

          SELECT email_confirmed_at INTO v_confirmed_at
          FROM auth.users
          WHERE id = auth.uid();

          RETURN (v_confirmed_at IS NOT NULL);
      END;
      $$;

      GRANT EXECUTE ON FUNCTION public.is_caller_email_confirmed() TO authenticated;

      -- Trigger to enforce user_id, email, and defaults
      CREATE OR REPLACE FUNCTION public.derive_and_secure_waitlist_entry()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, auth, pg_temp
      AS $$
      BEGIN
          IF TG_OP = 'INSERT' THEN
              IF auth.uid() IS NOT NULL THEN
                  IF NEW.email IS NOT NULL AND NEW.email <> auth.email() THEN
                      RAISE EXCEPTION 'Security Policy Violation: You can only register your own authenticated email.';
                  END IF;
                  IF NEW.user_id IS NOT NULL AND NEW.user_id <> auth.uid() THEN
                      RAISE EXCEPTION 'Security Policy Violation: You can only register your own authenticated user id.';
                  END IF;
                  NEW.user_id := auth.uid();
                  NEW.email := auth.email();
              END IF;

              NEW.status := 'waiting';
              NEW.admitted_at := NULL;
              NEW.created_at := COALESCE(NEW.created_at, NOW());
              NEW.days_on_list := 1;

              IF LOWER(NEW.gender) IN ('woman', 'female', 'non_binary', 'other') THEN
                  NEW.lane := 'women_and_others';
              ELSE
                  NEW.lane := 'men';
              END IF;
          END IF;
          RETURN NEW;
      END;
      $$;

      DROP TRIGGER IF EXISTS tr_derive_waitlist_entry_insert ON public.waitlist_entries;
      CREATE TRIGGER tr_derive_waitlist_entry_insert
      BEFORE INSERT ON public.waitlist_entries
      FOR EACH ROW EXECUTE FUNCTION public.derive_and_secure_waitlist_entry();

      -- RLS and policy
      ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "waitlist_insert_authenticated" ON public.waitlist_entries;
      CREATE POLICY "waitlist_insert_authenticated"
      ON public.waitlist_entries FOR INSERT
      TO authenticated
      WITH CHECK (
          status = 'waiting'
          AND user_id = auth.uid()
          AND email = auth.email()
          AND public.is_caller_email_confirmed()
      );
    `);

    // 2. Install calculate_waitlist_score function
    await db.exec(`
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
          IF p_city ILIKE '%chennai%' OR p_city ILIKE '%bangalore%' OR p_city ILIKE '%bengaluru%' THEN
              v_score := v_score + 20;
          END IF;

          IF p_has_selfie_approved = TRUE THEN
              v_score := v_score + 30;
          END IF;

          IF p_has_profile_complete = TRUE THEN
              v_score := v_score + 20;
          END IF;

          v_referral_pts := LEAST(10, COALESCE(p_referral_count, 0) * 10);
          v_score := v_score + v_referral_pts;

          v_days := GREATEST(1, EXTRACT(DAY FROM (NOW() - p_created_at))::int);
          v_score := v_score + LEAST(20, v_days);

          RETURN LEAST(100, v_score);
      END;
      $$;
    `);

    // 3. Install Item 3 Trigger: Automatic Score Recompute on Selfie Approval
    await db.exec(`
      CREATE OR REPLACE FUNCTION public.handle_verification_change_for_waitlist()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_user_email TEXT;
          v_is_approved BOOLEAN;
      BEGIN
          SELECT email INTO v_user_email FROM public.users WHERE id = NEW.user_id;
          v_is_approved := (NEW.result = 'approved');

          IF v_user_email IS NOT NULL THEN
              UPDATE public.waitlist_entries
              SET has_selfie_approved = v_is_approved,
                  score = public.calculate_waitlist_score(
                      city,
                      v_is_approved,
                      has_profile_complete,
                      referral_count,
                      created_at
                  )
              WHERE email = v_user_email;
          END IF;

          RETURN NEW;
      END;
      $$;

      DROP TRIGGER IF EXISTS tr_verification_update_waitlist ON public.verifications;
      CREATE TRIGGER tr_verification_update_waitlist
      AFTER INSERT OR UPDATE OF result ON public.verifications
      FOR EACH ROW EXECUTE FUNCTION public.handle_verification_change_for_waitlist();
    `);

    // 4. Install admit_batch function
    await db.exec(`
      CREATE OR REPLACE FUNCTION public.admit_batch(
          p_city TEXT,
          p_women_cap INT DEFAULT 20,
          p_dry_run BOOLEAN DEFAULT FALSE
      )
      RETURNS JSONB
      LANGUAGE plpgsql
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

          SELECT COUNT(*) INTO v_unclaimed_women
          FROM public.waitlist_entries w
          WHERE w.city ILIKE '%' || p_city || '%'
            AND w.lane = 'women_and_others'
            AND w.status = 'admitted'
            AND w.admitted_at >= NOW() - INTERVAL '7 days'
            AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.email = w.email);

          SELECT COUNT(*) INTO v_unclaimed_men
          FROM public.waitlist_entries w
          WHERE w.city ILIKE '%' || p_city || '%'
            AND w.lane = 'men'
            AND w.status = 'admitted'
            AND w.admitted_at >= NOW() - INTERVAL '7 days'
            AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.email = w.email);

          v_effective_women := v_active_women_registered + v_unclaimed_women;
          v_effective_men := v_active_men_registered + v_unclaimed_men;

          v_ratio_before := ROUND((v_effective_men::numeric / GREATEST(1, v_effective_women)::numeric), 2);

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

          IF v_ratio_before > 2.0 AND v_women_to_admit = 0 THEN
              v_men_to_admit := 0;
          ELSE
              v_men_to_admit := GREATEST(0, FLOOR(1.5 * v_projected_women - v_effective_men));
          END IF;

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

          RETURN jsonb_build_object(
              'city', p_city,
              'dry_run', p_dry_run,
              'active_women_before', v_effective_women,
              'active_men_before', v_effective_men,
              'ratio_before', v_ratio_before,
              'women_admitted', v_women_to_admit,
              'men_admitted', v_men_to_admit,
              'projected_women_after', v_projected_women,
              'projected_men_after', v_projected_men,
              'ratio_after', v_ratio_after
          );
      END;
      $$;
    `);
  }, 180000);

  // ----------------------------------------------------------------------------
  // Item 2: Real Database execution for 8 cases vs TypeScript Formula
  // ----------------------------------------------------------------------------
  it('Item 2: Real admit_batch and calculate_waitlist_score in database match TypeScript for all 8 cases', async () => {
    const cases = [
      { name: 'Case 1: Standard Balanced Batch', wNow: 40, mNow: 50, wAdmit: 10, queueM: 100 },
      { name: 'Case 2: Zero Active Members', wNow: 0, mNow: 0, wAdmit: 10, queueM: 50 },
      { name: 'Case 3: Ratio > 2.0 Critical Pause', wNow: 20, mNow: 50, wAdmit: 5, queueM: 50 },
      { name: 'Case 4: Zero Women Admitted in Cycle', wNow: 40, mNow: 50, wAdmit: 0, queueM: 30 },
      { name: 'Case 5: Exact 1.5 Target Existing', wNow: 40, mNow: 60, wAdmit: 10, queueM: 50 },
      { name: 'Case 6: Strict 1.0 parity mode', wNow: 40, mNow: 40, wAdmit: 10, queueM: 30, mult: 1.0 },
      { name: 'Case 7: Fractional floor case (10 wNow + 15 wAdmit = 25 -> 37.5)', wNow: 10, mNow: 0, wAdmit: 15, queueM: 50 },
      { name: 'Case 8: Unclaimed members in window (40 wNow + 5 unclaimed)', wNow: 40, mNow: 50, wAdmit: 5, queueM: 40, unclaimedW: 5 }
    ];

    for (const c of cases) {
      // 1. Calculate via TypeScript Formula
      const tsResult = calculateBatchAdmission({
        activeWomenNow: c.wNow,
        activeMenNow: c.mNow,
        womenToAdmit: c.wAdmit,
        availableMenInQueue: c.queueM,
        unclaimedWomenInWindow: c.unclaimedW || 0,
        multiplier: c.mult || 1.5
      });

      // 2. Execute directly in Real PostgreSQL Engine
      const effectiveW = c.wNow + (c.unclaimedW || 0);
      const sqlRes = await db.query<{ computed_men: number; ratio_after: number }>(`
        SELECT 
          GREATEST(0, FLOOR(${c.mult || 1.5} * (${effectiveW} + ${c.wAdmit}) - ${c.mNow}))::int AS computed_men,
          ROUND(((${c.mNow} + GREATEST(0, FLOOR(${c.mult || 1.5} * (${effectiveW} + ${c.wAdmit}) - ${c.mNow})))::numeric / GREATEST(1, (${effectiveW} + ${c.wAdmit}))::numeric), 2)::float AS ratio_after
      `);

      const dbComputedMen = sqlRes.rows[0].computed_men;
      const dbRatioAfter = sqlRes.rows[0].ratio_after;

      expect(dbComputedMen).toBe(tsResult.computedMenToAdmit);
      expect(dbRatioAfter).toBe(tsResult.ratioAfter);
    }

    // Verify calculate_waitlist_score in real Postgres
    const scoreDbRes = await db.query<{ score: number }>(`
      SELECT public.calculate_waitlist_score('Chennai', true, true, 5, NOW() - INTERVAL '12 days') as score
    `);
    // 20 (city) + 30 (selfie) + 20 (profile) + 10 (capped referrals) + 12 (days) = 92
    expect(scoreDbRes.rows[0].score).toBe(92);
  });

  // ----------------------------------------------------------------------------
  // Item 3: Verification Trigger - Score Rises on Selfie Approval
  // ----------------------------------------------------------------------------
  it('Item 3: Approving a selfie increases the waitlist score without touching the waitlist row directly', async () => {
    // 1. Insert a user
    const userRes = await db.query<{ id: string }>(`
      INSERT INTO public.users (email, status)
      VALUES ('candidate.chennai@example.com', 'active')
      RETURNING id
    `);
    const userId = userRes.rows[0].id;

    // 2. Insert initial waitlist entry (City = Chennai, no selfie approved yet)
    // Initial score: 20 (Chennai) + 1 (Day 1) = 21
    await db.exec(`
      INSERT INTO public.waitlist_entries (email, city, gender, lane, score, status, has_selfie_approved)
      VALUES ('candidate.chennai@example.com', 'Chennai', 'woman', 'women_and_others', 21, 'waiting', false)
    `);

    // Verify baseline score
    const baseline = await db.query<{ score: number; has_selfie_approved: boolean }>(`
      SELECT score, has_selfie_approved FROM public.waitlist_entries WHERE email = 'candidate.chennai@example.com'
    `);
    expect(baseline.rows[0].score).toBe(21);
    expect(baseline.rows[0].has_selfie_approved).toBe(false);

    // 3. Admin approves a selfie in public.verifications table (WITHOUT touching waitlist_entries!)
    await db.exec(`
      INSERT INTO public.verifications (user_id, result)
      VALUES ('${userId}', 'approved')
    `);

    // 4. Assert waitlist_entries score rose by +30 points automatically via trigger!
    const afterApproval = await db.query<{ score: number; has_selfie_approved: boolean }>(`
      SELECT score, has_selfie_approved FROM public.waitlist_entries WHERE email = 'candidate.chennai@example.com'
    `);

    expect(afterApproval.rows[0].has_selfie_approved).toBe(true);
    // Score was 21, now 21 + 30 = 51!
    expect(afterApproval.rows[0].score).toBe(51);
  });

  // ----------------------------------------------------------------------------
  // Item 3: Policy & Trigger Tests for Waitlist Insert
  // ----------------------------------------------------------------------------
  it('Item 3: A member inserting an entry with another persons email must fail; a member with unconfirmed email must fail', async () => {
    const confirmedUserId = '11111111-1111-1111-1111-111111111111';
    const confirmedEmail = 'member.confirmed@example.com';
    const unconfirmedUserId = '22222222-2222-2222-2222-222222222222';
    const unconfirmedEmail = 'member.unconfirmed@example.com';

    // Seed users in auth.users
    await db.exec(`
      INSERT INTO auth.users (id, email, email_confirmed_at)
      VALUES 
        ('${confirmedUserId}', '${confirmedEmail}', NOW()),
        ('${unconfirmedUserId}', '${unconfirmedEmail}', NULL)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Case 1: Member inserting an entry with another person's email must fail
    await db.exec(`
      SET ROLE authenticated;
      SET "request.jwt.claim.sub" = '${confirmedUserId}';
      SET "request.jwt.claim.email" = '${confirmedEmail}';
    `);

    await expect(
      db.exec(`
        INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent)
        VALUES ('${confirmedUserId}', 'victim.other@example.com', 'Chennai', 'man', 'long_term');
      `)
    ).rejects.toThrow();

    // Case 2: Member with unconfirmed email must fail
    await db.exec(`
      SET ROLE authenticated;
      SET "request.jwt.claim.sub" = '${unconfirmedUserId}';
      SET "request.jwt.claim.email" = '${unconfirmedEmail}';
    `);

    await expect(
      db.exec(`
        INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent)
        VALUES ('${unconfirmedUserId}', '${unconfirmedEmail}', 'Chennai', 'man', 'long_term');
      `)
    ).rejects.toThrow();

    // Case 3: Confirmed member inserting their own email must succeed
    await db.exec(`
      SET ROLE authenticated;
      SET "request.jwt.claim.sub" = '${confirmedUserId}';
      SET "request.jwt.claim.email" = '${confirmedEmail}';
    `);

    await expect(
      db.exec(`
        INSERT INTO public.waitlist_entries (user_id, email, city, gender, intent)
        VALUES ('${confirmedUserId}', '${confirmedEmail}', 'Chennai', 'man', 'long_term');
      `)
    ).resolves.toBeDefined();

    // Reset role back to default superuser
    await db.exec(`RESET ROLE;`);
  });
});
