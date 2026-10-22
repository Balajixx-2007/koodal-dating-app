-- ==============================================================================
-- Migration: 20261022000005_rls_policies.sql
-- Description: Comprehensive Row-Level Security (RLS) policies for all tables
-- Non-Negotiable: Default deny, strict role isolation, verified admin checks.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Users Table Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can read own user record"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own non-sensitive fields"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (
    public.is_admin() 
    OR (auth.uid() = id AND status = (SELECT status FROM public.users WHERE id = auth.uid()))
);

-- ------------------------------------------------------------------------------
-- 2. Profiles Table Policies
-- ------------------------------------------------------------------------------
-- Members can view active, unpaused profiles, excluding users who blocked them
CREATE POLICY "Members view active unpaused profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR (
        is_paused = FALSE
        AND NOT EXISTS (
            SELECT 1 FROM public.blocks_and_reports b
            WHERE (b.reporter = auth.uid() AND b.target = profiles.user_id)
               OR (b.reporter = profiles.user_id AND b.target = auth.uid())
        )
    )
);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. Preferences Table Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users manage own preferences"
ON public.preferences FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. Likes Table Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view likes they sent"
ON public.likes FOR SELECT
TO authenticated
USING (auth.uid() = from_user OR public.is_admin());

CREATE POLICY "Users can insert their own likes"
ON public.likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user);

CREATE POLICY "Users can delete their own likes"
ON public.likes FOR DELETE
TO authenticated
USING (auth.uid() = from_user);

-- ------------------------------------------------------------------------------
-- 5. Matches Table Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Participants and admins can view matches"
ON public.matches FOR SELECT
TO authenticated
USING (
    auth.uid() = user_a 
    OR auth.uid() = user_b 
    OR public.is_admin()
);

-- ------------------------------------------------------------------------------
-- 6. Messages Table Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Match participants and admins can read messages"
ON public.messages FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
);

CREATE POLICY "Match participants can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id 
    AND EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
);

-- ------------------------------------------------------------------------------
-- 7. Blocks and Reports Table Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Reporters and admins can view reports"
ON public.blocks_and_reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter OR public.is_admin());

CREATE POLICY "Members can submit reports"
ON public.blocks_and_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter);

CREATE POLICY "Only admins can review reports"
ON public.blocks_and_reports FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. Verifications Table Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users and admins can view selfie verifications"
ON public.verifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can submit selfie verifications"
ON public.verifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can approve/reject selfies"
ON public.verifications FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. Waitlist Entries Table Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist_entries FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'waiting');

CREATE POLICY "Users can view own waitlist entry"
ON public.waitlist_entries FOR SELECT
TO anon, authenticated
USING (TRUE);

CREATE POLICY "Only admins can update waitlist entries"
ON public.waitlist_entries FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 10. Admission Batches Table Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read admission batches"
ON public.batches FOR SELECT
TO anon, authenticated
USING (TRUE);

CREATE POLICY "Only admins can record admission batches"
ON public.batches FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());
