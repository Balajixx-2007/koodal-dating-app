-- ==============================================================================
-- Migration: 20261024000012_step7_safety_privacy_compliance.sql
-- Description: Step 7 Safety, Privacy & Compliance (DPDP Act 2023 / GDPR)
-- 1. Explicit consent tracking table (user_consents) with RLS
-- 2. Allow like deletion during authorized account purge via app.allow_like_delete
-- 3. Atomic cascading delete_user_account() stored procedure
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. User Consents Table (DPDP Act 2023 granular tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('terms', 'privacy', 'guidelines', 'selfie_verification', 'geolocation')),
    version TEXT NOT NULL DEFAULT '1.0',
    granted BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON public.user_consents(user_id, consent_type);

-- RLS Policies on user_consents
DROP POLICY IF EXISTS "Users view own consents" ON public.user_consents;
CREATE POLICY "Users view own consents"
ON public.user_consents FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own consents" ON public.user_consents;
CREATE POLICY "Users insert own consents"
ON public.user_consents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own consents" ON public.user_consents;
CREATE POLICY "Users update own consents"
ON public.user_consents FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 2. Update Likes Deletion Guard to Support Authorized Account Purge
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_like_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Permit deletion during controlled account erasure or admin purge
    IF current_setting('app.allow_like_delete', true) = 'on' THEN
        RETURN OLD;
    END IF;

    RAISE EXCEPTION 'Likes cannot be deleted directly' USING ERRCODE = '42501';
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Cascading Account Deletion Procedure (delete_user_account)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_calling_user UUID;
    v_email TEXT;
BEGIN
    v_calling_user := auth.uid();
    
    -- Verify authorization: only the account owner or an active admin can trigger deletion
    IF v_calling_user IS NULL OR (v_calling_user <> p_user_id AND NOT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized: cannot delete account of another user' USING ERRCODE = '42501';
    END IF;

    SELECT email INTO v_email FROM public.users WHERE id = p_user_id;

    -- Enable like delete bypass for this session transaction
    PERFORM set_config('app.allow_like_delete', 'on', true);

    -- Cascade database deletions
    DELETE FROM public.profile_photos WHERE owner = p_user_id;
    DELETE FROM public.verifications WHERE user_id = p_user_id;
    DELETE FROM public.messages WHERE sender_id = p_user_id;
    DELETE FROM public.matches WHERE user_a = p_user_id OR user_b = p_user_id;
    DELETE FROM public.blocks WHERE blocker = p_user_id OR blocked = p_user_id;
    DELETE FROM public.reports WHERE reporter = p_user_id OR target = p_user_id;
    DELETE FROM public.likes WHERE from_user = p_user_id OR to_user = p_user_id;
    DELETE FROM public.user_consents WHERE user_id = p_user_id;
    DELETE FROM public.settings WHERE user_id = p_user_id;
    DELETE FROM public.profiles WHERE user_id = p_user_id;
    
    IF v_email IS NOT NULL THEN
        DELETE FROM public.waitlist WHERE user_id = p_user_id OR email = v_email;
    ELSE
        DELETE FROM public.waitlist WHERE user_id = p_user_id;
    END IF;

    DELETE FROM public.users WHERE id = p_user_id;

    -- Audit log deletion
    INSERT INTO public.audit_log (admin_id, action, target_type, target_id, details)
    VALUES (
        COALESCE(v_calling_user, p_user_id),
        'delete_account',
        'user',
        p_user_id::text,
        jsonb_build_object('deleted_by', v_calling_user, 'timestamp', NOW())
    );

    RETURN jsonb_build_object(
        'success', true,
        'purged_user_id', p_user_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
