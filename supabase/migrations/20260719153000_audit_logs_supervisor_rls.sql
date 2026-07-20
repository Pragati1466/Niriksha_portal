-- =========================================================
-- Migration: audit_logs_supervisor_rls
-- Adds a targeted RLS policy on audit_logs so supervisors
-- can view their own activity timeline.
--
-- Current state:
--   The only policy is "audit_logs_admin_read" which uses
--   has_role(auth.uid(), 'admin') — supervisors get zero rows.
--
-- Fix:
--   Add "audit_logs_supervisor_self_read" policy.
--   Conditions:
--     1. actor_id = auth.uid()        — only own rows
--     2. has_role(auth.uid(), 'supervisor')  — only for supervisors
--
--   This means:
--     ✓ Supervisors see only their own audit entries.
--     ✗ Supervisors cannot see other supervisors' entries.
--     ✗ Supervisors cannot see admin or inspector entries.
--     ✓ Admins are unaffected (existing admin policy unchanged).
--
-- Why actor_id alone is not enough:
--   If we only checked actor_id = auth.uid(), then any user
--   (inspector, admin) who happens to be a supervisor could
--   read all audit rows they created as other roles.
--   The has_role check ensures this policy is only evaluated
--   for authenticated users who hold the 'supervisor' role.
--
-- Postgres OR semantics: RLS evaluates all matching policies
-- with OR — adding this policy does not remove access granted
-- by the existing "audit_logs_admin_read" policy.
-- =========================================================

DROP POLICY IF EXISTS "audit_logs_supervisor_self_read" ON public.audit_logs;

CREATE POLICY "audit_logs_supervisor_self_read"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    AND public.has_role(auth.uid(), 'supervisor')
  );
