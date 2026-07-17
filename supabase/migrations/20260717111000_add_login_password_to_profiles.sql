-- =========================================================
-- Add login_password column to profiles table
-- This allows admin to see the login credentials of created
-- inspector/supervisor users and share them with their teams
-- =========================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_password TEXT;

-- Grant select to authenticated users (they can see their own)
-- and all to service_role (for admin operations)
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;