-- =========================================================
-- Create auth.users entries for profiles that exist in
-- public.profiles / public.user_roles but have no
-- corresponding auth.users entry (i.e. seeded users who
-- were never registered in Supabase Auth).
-- Also sets login_password so admins can see credentials.
-- =========================================================

DO $$
DECLARE
  rec RECORD;
  v_id uuid;
  v_password text;
  v_email text;
  v_name text;
  v_role text;
BEGIN
  FOR rec IN
    SELECT p.id, p.email, p.name, r.role
    FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
  LOOP
    v_id := rec.id;
    v_email := rec.email;
    v_name := rec.name;
    v_role := rec.role;
    
    -- Generate a random password (12 chars, satisfies policy)
    v_password := 'Temp@' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8) || '!';

    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_id, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('name', v_name),
      '', '', '', ''
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email),
      'email', v_id::text, now(), now(), now()
    );

    -- Store the password in the profile
    UPDATE public.profiles SET login_password = v_password WHERE id = v_id;

    RAISE NOTICE 'Created auth user: % (%) with password: %', v_email, v_role, v_password;
  END LOOP;
END $$;

-- Also set login_password for any existing auth users (like admin) that don't have it
-- but skip admins (they already have known passwords)
UPDATE public.profiles
SET login_password = 'Temp@' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8) || '!'
WHERE login_password IS NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = profiles.id)
  AND id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');