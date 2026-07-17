-- Migration: get_inspector_profiles RPC
--
-- Purpose:
--   fetchProfileMap() in supervisor.functions.ts needs to resolve inspector
--   names from profiles.  The existing "profiles_self_select" RLS policy
--   only permits a user to read their own row (or admin to read all rows),
--   so supervisors always get an empty result and inspector names show "—".
--
-- Solution (least-privilege):
--   A SECURITY DEFINER function that runs with elevated privileges inside
--   Postgres, but enforces its own row-level constraint:
--     • Returns only id, name, email  (no phone / employee_id / jurisdiction)
--     • Returns only profiles where the inspector appears on an inspection
--       that belongs to the calling supervisor (i.e. supervisor_id = auth.uid())
--     • A supervisor cannot probe arbitrary UUIDs — the EXISTS subquery
--       gates every returned row
--
-- What is NOT changed:
--   • The "profiles_self_select" policy is untouched
--   • No existing policy is dropped or modified
--   • No table schema is altered
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_inspector_profiles(inspector_ids UUID[])
RETURNS TABLE (id UUID, name TEXT, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.email
  FROM   public.profiles p
  WHERE  p.id = ANY(inspector_ids)
    AND  EXISTS (
           SELECT 1
           FROM   public.inspections i
           WHERE  i.inspector_id  = p.id
             AND  i.supervisor_id = auth.uid()
         );
$$;

-- Grant execute to authenticated users only (supervisors, inspectors, admins).
-- anon users have no session and should never call this.
GRANT EXECUTE ON FUNCTION public.get_inspector_profiles(UUID[]) TO authenticated;
