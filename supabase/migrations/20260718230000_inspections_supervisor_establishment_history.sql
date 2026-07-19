-- Migration: inspections_supervisor_establishment_history
--
-- PROBLEM
-- -------
-- The existing "inspections_read" policy allows a supervisor to read only
-- inspections where they are the recorded supervisor_id (or inspector_id).
-- A supervisor reviewing a current inspection cannot read that establishment's
-- prior inspection history, because those rows were assigned to different
-- supervisors.  This leaves the AI Risk Agent with inspection_history: [].
--
-- FIX — why a plain EXISTS subquery is NOT safe here
-- ---------------------------------------------------
-- An EXISTS subquery that queries the same "inspections" table inside an
-- inspections RLS policy causes infinite recursion:
--
--   outer query → RLS fires → USING runs EXISTS(SELECT FROM inspections)
--   → that inner SELECT also triggers RLS → USING runs EXISTS(...) → loop
--
-- PostgreSQL raises:
--   ERROR: infinite recursion detected in policy for relation "inspections"
--
-- SAFE APPROACH — SECURITY DEFINER helper function
-- -------------------------------------------------
-- A SECURITY DEFINER function runs as its definer (postgres / superuser),
-- which bypasses RLS on its own internal queries.  The outer RLS policy
-- calls the function; the function's internal SELECT on inspections is NOT
-- subject to RLS.  The caller still has RLS enforced via the outer policy.
--
-- SECURITY SCOPE
-- --------------
-- supervisor_manages_establishment(uid, est_id) returns TRUE only when the
-- user has at least one inspection row for that specific establishment as
-- supervisor_id.  This is narrower than "any supervisor can read anything":
--   * Access is scoped per-establishment, not globally.
--   * Write policies (admin_insert, admin_update) are untouched.
--   * The existing "inspections_read" policy is untouched.
--   * Postgres evaluates multiple FOR SELECT policies with OR semantics —
--     this policy adds to, not replaces, the existing one.
--
-- PERFORMANCE
-- -----------
-- The function does a single index lookup on (establishment_id, supervisor_id).
-- The composite index below makes that lookup O(log n).

-- Step 1: composite index so the function's lookup is fast
CREATE INDEX IF NOT EXISTS idx_inspections_establishment_supervisor
  ON public.inspections (establishment_id, supervisor_id);

-- Step 2: SECURITY DEFINER helper — bypasses RLS on its internal SELECT
--   Returns TRUE  if `_user_id` is the supervisor_id on at least one
--                 inspection for `_establishment_id`.
--   Returns FALSE otherwise.
--
-- SECURITY DEFINER + SET search_path = public prevents search-path injection.
-- STABLE tells the planner the result is constant within a single query,
-- allowing it to be evaluated once per (uid, establishment_id) pair rather
-- than once per candidate row.
CREATE OR REPLACE FUNCTION public.supervisor_manages_establishment(
  _user_id        UUID,
  _establishment_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.inspections
    WHERE  establishment_id = _establishment_id
      AND  supervisor_id    = _user_id
  );
$$;

-- Grant EXECUTE to authenticated users so the RLS policy can call it.
GRANT EXECUTE ON FUNCTION public.supervisor_manages_establishment(UUID, UUID)
  TO authenticated;

-- Step 3: narrowly scoped read policy using the safe helper function
CREATE POLICY "inspections_supervisor_establishment_history"
  ON public.inspections
  FOR SELECT
  TO authenticated
  USING (
    public.supervisor_manages_establishment(auth.uid(), establishment_id)
  );
