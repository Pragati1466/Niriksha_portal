
-- Relax FKs so demo/seed data can use UUIDs not present in auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_inspector_id_fkey;
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_supervisor_id_fkey;

-- complaints
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  description text NOT NULL,
  category text,
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "complaints_read" ON public.complaints FOR SELECT TO authenticated USING (true);
CREATE POLICY "complaints_admin_insert" ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "complaints_admin_update" ON public.complaints FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "complaints_admin_delete" ON public.complaints FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX complaints_establishment_idx ON public.complaints(establishment_id);
CREATE INDEX complaints_department_idx ON public.complaints(department_id);
CREATE INDEX complaints_status_idx ON public.complaints(status);

-- risk_profiles
CREATE TABLE public.risk_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  risk_score integer NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'Low',
  calculated_at timestamptz NOT NULL DEFAULT now(),
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_inspection_date date,
  next_due_date date
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_profiles TO authenticated;
GRANT ALL ON public.risk_profiles TO service_role;

ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_profiles_read" ON public.risk_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_profiles_admin_insert" ON public.risk_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "risk_profiles_admin_update" ON public.risk_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "risk_profiles_admin_delete" ON public.risk_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX risk_profiles_establishment_idx ON public.risk_profiles(establishment_id);
CREATE INDEX risk_profiles_department_idx ON public.risk_profiles(department_id);
CREATE INDEX risk_profiles_level_idx ON public.risk_profiles(risk_level);
