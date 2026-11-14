-- How the demo accounts were made (already done in the Orbloom project; kept here so it can be repeated).
-- Run in Supabase → SQL Editor. Safe to run again: accounts that exist are skipped.
-- All demo passwords are "demo1234". Demo accounts only ever see the made-up demo crew.
--
-- The flight surgeon invite code is NOT in this file (this repository is public).
-- Set or change it in the SQL Editor:
--   insert into private.settings (key, value)
--   values ('doctor_invite_hash', extensions.crypt('YOUR-CODE', extensions.gen_salt('bf')))
--   on conflict (key) do update set value = excluded.value;
do $$
declare
  acc record;
  new_id uuid;
begin
  -- Lets the sign-up rule make demo flight surgeons without the invite code (only inside this script).
  perform set_config('orbloom.seeding', 'on', true);
  for acc in select * from (values
    ('maya.chen@orbloom.demo', 'Maya Chen', 'astronaut', 'a1', 'Commander', 'var(--lime)', 'violet'),
    ('leo.okafor@orbloom.demo', 'Leo Okafor', 'astronaut', 'a2', 'Flight engineer', 'var(--bone)', 'blue'),
    ('sara.lindqvist@orbloom.demo', 'Sara Lindqvist', 'astronaut', 'a3', 'Mission specialist', '#9fe3dc', 'lily'),
    ('arjun.mehta@orbloom.demo', 'Arjun Mehta', 'astronaut', 'a4', 'Payload specialist', '#f0c95a', 'sun'),
    ('hana.sato@orbloom.demo', 'Hana Sato', 'astronaut', 'a5', 'Flight engineer', '#f2a7c3', 'pink'),
    ('tomas.alvarez@orbloom.demo', 'Tomás Alvarez', 'astronaut', 'a6', 'Science officer', '#bfe9ff', 'star'),
    ('amara.nwosu@orbloom.demo', 'Amara Nwosu', 'astronaut', 'a7', 'Crew medical officer', '#ffb48a', 'coral'),
    ('elena.petrova@orbloom.demo', 'Elena Petrova', 'astronaut', 'a8', 'Mission specialist', '#b9a6ff', 'bell'),
    ('dr.rivera@orbloom.demo', 'Dr. Ana Rivera', 'doctor', 'd1', 'Flight surgeon', 'var(--bone)', 'blue'),
    ('dr.patel@orbloom.demo', 'Dr. Dev Patel', 'doctor', 'd2', 'Flight surgeon', 'var(--bone)', 'blue')
  ) as t(email, name, role, crew_id, title, flower, bloom)
  loop
    if exists (select 1 from auth.users u where u.email = acc.email) then continue; end if;
    new_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous)
    values ('00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', acc.email,
      extensions.crypt('demo1234', extensions.gen_salt('bf', 10)), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', acc.name, 'role', acc.role, 'email_verified', true), now(), now(),
      '', '', '', '', '', '', '', '', false, false);
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (new_id::text, new_id, jsonb_build_object('sub', new_id::text, 'email', acc.email, 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now());
    -- The demo crew keeps its fixed ids (a1 … a8) and flowers, and is marked as demo.
    update public.profiles set crew_id = acc.crew_id, title = acc.title, flower = acc.flower, bloom = acc.bloom, demo = true, name = acc.name
      where id = new_id;
  end loop;
end $$;
