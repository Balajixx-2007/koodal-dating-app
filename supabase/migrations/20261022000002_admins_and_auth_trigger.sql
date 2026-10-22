-- ==============================================================================
-- Migration: 20261022000002_admins_and_auth_trigger.sql
-- Description: Isolated admins table, is_admin() security definer, and signup triggers
-- Non-Negotiable Rule 4: Admin rights come from a database table, never client UI.
-- ==============================================================================

-- 1. Admins Table (Strictly isolated from member-writable user records)
CREATE TABLE IF NOT EXISTS public.admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    notes TEXT
);

-- Enable RLS immediately (Default Deny)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 2. Security Definer Helper Function: is_admin()
-- Runs with search_path = public to prevent search-path hijacking attacks.
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins 
        WHERE user_id = COALESCE(user_uuid, auth.uid())
    );
$$;

-- RLS on Admins table: Only authenticated admins can read or query the admin list
CREATE POLICY "Admins can view admin table"
ON public.admins FOR SELECT
TO authenticated
USING (public.is_admin());

-- Revoke all direct writes from public/authenticated on admins table
REVOKE INSERT, UPDATE, DELETE ON public.admins FROM authenticated, anon, public;

-- 3. Audit Log Table (Immutable; tracks every administrative action)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.audit_log FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert audit logs"
ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND auth.uid() = admin_id);

-- Explicitly disallow updating or deleting audit logs (Immutable audit trail)
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated, anon, public;
