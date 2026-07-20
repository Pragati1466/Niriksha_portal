
-- Create single admin user and disable bootstrap
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  admin_email text := 'admin@niriksha.gov.in';
  admin_password text := 'Admin@Niriksha2026';
BEGIN
  -- Skip if already exists
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

  -- Remove any other admins so only this user has admin access
  DELETE FROM public.user_roles WHERE role = 'admin' AND user_id <> admin_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
