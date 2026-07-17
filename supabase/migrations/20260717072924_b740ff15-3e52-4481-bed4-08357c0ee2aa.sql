
-- =========================================================
-- AUDIT LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,           -- INSERT | UPDATE | DELETE | LOGIN | CUSTOM
  entity_type TEXT NOT NULL,      -- table or logical entity name
  entity_id TEXT,
  summary TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs (actor_id);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies: writes only via SECURITY DEFINER trigger.

-- =========================================================
-- Trigger function: generic row-level audit
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
  ELSE -- INSERT
    v_entity_id := COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(NEW)->>'user_id'));
    v_summary := TG_TABLE_NAME || ' created';
    INSERT INTO public.audit_logs(actor_id, actor_email, action, entity_type, entity_id, summary, old_data, new_data)
    VALUES (v_actor_id, v_actor_email, 'INSERT', TG_TABLE_NAME, v_entity_id, v_summary, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

-- Attach triggers to the relevant tables
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
-- SYSTEM SETTINGS
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

DROP POLICY IF EXISTS "system_settings_admin_all" ON public.system_settings;
CREATE POLICY "system_settings_admin_all" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

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

DROP TRIGGER IF EXISTS system_settings_touch ON public.system_settings;
CREATE TRIGGER system_settings_touch
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_system_settings();

-- Seed default groups
INSERT INTO public.system_settings (key, value, description) VALUES
  ('ai',            '{"provider":"lovable-ai","model":"google/gemini-2.5-flash","enabled":true}'::jsonb, 'AI integration endpoints and model defaults'),
  ('storage',       '{"provider":"supabase","bucket":"niriksha-evidence","max_upload_mb":25}'::jsonb, 'Evidence upload storage configuration'),
  ('auth',          '{"password_min_length":8,"require_hibp":true,"session_hours":24,"allow_signup":false}'::jsonb, 'Authentication and password policy'),
  ('notifications', '{"email_enabled":true,"sms_enabled":false,"digest":"daily"}'::jsonb, 'Notification preferences')
ON CONFLICT (key) DO NOTHING;
