-- =========================================================
-- NIRIKSHA — Full Database Setup
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/ptbecipcpzbdsjoljqgt/sql/new)
-- =========================================================

-- =========================================================
-- 1. ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'inspector', 'supervisor');
CREATE TYPE public.inspection_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.establishment_status AS ENUM ('active', 'suspended', 'archived');

-- =========================================================
-- 2. DEPARTMENTS
-- =========================================================
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  department_id UUID,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  employee_id TEXT,
  jurisdiction JSONB NOT NULL DEFAULT '{}'::jsonb,
  login_password TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 4. USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 5. ESTABLISHMENTS
-- =========================================================
CREATE TABLE public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  registration_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner_name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  pincode TEXT,
  business_type TEXT,
  category TEXT,
  contact_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  registration_date DATE,
  expiry_date DATE,
  status public.establishment_status NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.establishments TO authenticated;
GRANT ALL ON public.establishments TO service_role;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 6. CHECKLIST TEMPLATES
-- =========================================================
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  checklist_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_templates TO authenticated;
GRANT ALL ON public.checklist_templates TO service_role;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 7. INSPECTIONS
-- =========================================================
CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  inspector_id UUID NOT NULL,
  supervisor_id UUID NOT NULL,
  template_id UUID REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  actual_date DATE,
  status public.inspection_status NOT NULL DEFAULT 'pending',
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  findings JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_score_at_inspection NUMERIC,
  evidence_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 8. COMPLAINTS
-- =========================================================
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

-- =========================================================
-- 9. RISK PROFILES
-- =========================================================
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

-- =========================================================
-- 10. AUDIT LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 11. SYSTEM SETTINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 12. FOREIGN KEYS (profiles → departments, profiles → auth.users relaxed)
-- =========================================================
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

-- =========================================================
-- 13. HELPER FUNCTIONS
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.admin_count()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COUNT(*)::INT FROM public.user_roles WHERE role = 'admin'; $$;
GRANT EXECUTE ON FUNCTION public.admin_count() TO anon, authenticated;

-- =========================================================
-- 14. RLS POLICIES
-- =========================================================

-- Departments
CREATE POLICY "departments_read" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_admin_write" ON public.departments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "departments_admin_update" ON public.departments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "departments_admin_delete" ON public.departments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User Roles
CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Establishments
CREATE POLICY "establishments_read" ON public.establishments FOR SELECT TO authenticated USING (true);
CREATE POLICY "establishments_admin_write" ON public.establishments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "establishments_admin_update" ON public.establishments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "establishments_admin_delete" ON public.establishments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Checklist Templates
CREATE POLICY "templates_read" ON public.checklist_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_admin_write" ON public.checklist_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "templates_admin_update" ON public.checklist_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "templates_admin_delete" ON public.checklist_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Inspections
CREATE POLICY "inspections_read" ON public.inspections FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR inspector_id = auth.uid()
    OR supervisor_id = auth.uid()
  );
CREATE POLICY "inspections_admin_insert" ON public.inspections FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "inspections_admin_update" ON public.inspections FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Complaints
CREATE POLICY "complaints_read" ON public.complaints FOR SELECT TO authenticated USING (true);
CREATE POLICY "complaints_admin_insert" ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "complaints_admin_update" ON public.complaints FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "complaints_admin_delete" ON public.complaints FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Risk Profiles
CREATE POLICY "risk_profiles_read" ON public.risk_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "risk_profiles_admin_insert" ON public.risk_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "risk_profiles_admin_update" ON public.risk_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "risk_profiles_admin_delete" ON public.risk_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Audit Logs
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- System Settings
CREATE POLICY "system_settings_admin_all" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 15. INDEXES
-- =========================================================
CREATE INDEX complaints_establishment_idx ON public.complaints(establishment_id);
CREATE INDEX complaints_department_idx ON public.complaints(department_id);
CREATE INDEX complaints_status_idx ON public.complaints(status);
CREATE INDEX risk_profiles_establishment_idx ON public.risk_profiles(establishment_id);
CREATE INDEX risk_profiles_department_idx ON public.risk_profiles(department_id);
CREATE INDEX risk_profiles_level_idx ON public.risk_profiles(risk_level);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs (actor_id);

-- =========================================================
-- 16. AUDIT TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_email TEXT;
  v_entity_id TEXT;
  v_summary TEXT;
BEGIN
  IF v_actor_id IS NOT NULL THEN
    SELECT email INTO v_actor_email FROM public.profiles WHERE id = v_actor_id;
  END IF;
  IF TG_OP = 'DELETE' THEN
    v_entity_id := COALESCE((to_jsonb(OLD)->>'id'), (to_jsonb(OLD)->>'user_id'));
    v_summary := TG_TABLE_NAME || ' deleted';
    INSERT INTO public.audit_logs(actor_id, actor_email, action, entity_type, entity_id, summary, old_data, new_data)
    VALUES (v_actor_id, v_actor_email, 'DELETE', TG_TABLE_NAME, v_entity_id, v_summary, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_id := COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(NEW)->>'user_id'));
    v_summary := TG_TABLE_NAME || ' updated';
    INSERT INTO public.audit_logs(actor_id, actor_email, action, entity_type, entity_id, summary, old_data, new_data)
    VALUES (v_actor_id, v_actor_email, 'UPDATE', TG_TABLE_NAME, v_entity_id, v_summary, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    v_entity_id := COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(NEW)->>'user_id'));
    v_summary := TG_TABLE_NAME || ' created';
    INSERT INTO public.audit_logs(actor_id, actor_email, action, entity_type, entity_id, summary, old_data, new_data)
    VALUES (v_actor_id, v_actor_email, 'INSERT', TG_TABLE_NAME, v_entity_id, v_summary, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['departments','user_roles','profiles','checklist_templates','establishments','inspections'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', 'audit_' || t, t);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();',
      'audit_' || t, t
    );
  END LOOP;
END $$;

-- =========================================================
-- 17. SYSTEM SETTINGS TOUCH TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_system_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER system_settings_touch
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_system_settings();

-- =========================================================
-- 18. AUTO-CREATE PROFILE ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 19. SEED DEPARTMENTS
-- =========================================================
INSERT INTO public.departments (id, name, code) VALUES
  ('a338e2f8-957f-46aa-8d6e-5d00ffabcfda', 'Food Safety', 'FSSAI'),
  ('17c8b7df-21cc-4394-b4da-f0a1a25a0349', 'Fire Safety', 'DFS'),
  ('d8ef4900-75f2-4b9f-9815-b7dc608e0862', 'Pollution Control', 'SPCB'),
  ('718472ee-2192-4e7b-9d38-124525a57358', 'Factory Safety', 'IF'),
  ('24353874-868b-46b4-8ac7-58527ba25067', 'Healthcare', 'HEALTH')
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 20. SEED SYSTEM SETTINGS
-- =========================================================
INSERT INTO public.system_settings (key, value, description) VALUES
  ('ai',            '{"provider":"lovable-ai","model":"google/gemini-2.5-flash","enabled":true}'::jsonb, 'AI integration endpoints and model defaults'),
  ('storage',       '{"provider":"supabase","bucket":"niriksha-evidence","max_upload_mb":25}'::jsonb, 'Evidence upload storage configuration'),
  ('auth',          '{"password_min_length":8,"require_hibp":true,"session_hours":24,"allow_signup":false}'::jsonb, 'Authentication and password policy'),
  ('notifications', '{"email_enabled":true,"sms_enabled":false,"digest":"daily"}'::jsonb, 'Notification preferences')
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- 21. CREATE ADMIN USER
-- =========================================================
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  admin_email text := 'admin@niriksha.gov.in';
  admin_password text := 'Admin@Niriksha2026';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      admin_email, crypt(admin_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"NIRIKSHA Admin"}'::jsonb,
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), admin_id, jsonb_build_object('sub', admin_id::text, 'email', admin_email), 'email', admin_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.profiles (id, name, email)
  VALUES (admin_id, 'NIRIKSHA Admin', admin_email)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;

  DELETE FROM public.user_roles WHERE role = 'admin' AND user_id <> admin_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- =========================================================
-- 22. REVOKE AUDIT FUNCTIONS FROM PUBLIC
-- =========================================================
REVOKE ALL ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_system_settings() FROM PUBLIC, anon, authenticated;

-- =========================================================
-- DONE! Now run the seed script to insert CSV data:
--   SUPABASE_SERVICE_KEY="<key>" bun run seed
-- =========================================================