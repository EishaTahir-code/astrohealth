-- Orbloom on Supabase: accounts, privacy rules (RLS), shared health records and the family relay.
--
-- Plain-words summary
-- - Everyone signs up with Supabase Auth. A "profile" row is made for each new account.
-- - Astronauts can sign up freely. Flight surgeon (doctor) sign-up needs the secret invite code.
-- - Demo accounts (the made-up crew) and real accounts live in two separate "worlds":
--   a demo account never sees real people's data, and real people never see demo data.
-- - Check-ins, moods, private notes and greenhouse notes are never stored here (they stay on the device).

create extension if not exists pgcrypto with schema extensions;

-- "private" is not reachable through the website's data API. Only the database itself uses it.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table private.settings (
  key text primary key,
  value text not null
);
revoke all on private.settings from public, anon, authenticated;

create sequence private.change_seq;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text not null check (role in ('astronaut', 'doctor')),
  crew_id text not null unique check (char_length(crew_id) between 1 and 40),
  title text not null default 'Crew member' check (char_length(title) <= 60),
  flower text not null default 'var(--bone)',
  bloom text not null default 'blue',
  demo boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Small helpers used by the privacy rules. "security definer" lets them read profiles
-- without running into the profiles rules themselves.
create function private.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create function private.my_crew_id() returns text
language sql stable security definer set search_path = '' as $$
  select crew_id from public.profiles where id = (select auth.uid())
$$;

create function private.my_demo() returns boolean
language sql stable security definer set search_path = '' as $$
  select demo from public.profiles where id = (select auth.uid())
$$;

-- Is this crew id an astronaut in my world (demo or real)?
create function private.astronaut_in_my_world(target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.crew_id = target and p.role = 'astronaut'
      and p.demo = (select demo from public.profiles where id = (select auth.uid()))
  )
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.my_role(), private.my_crew_id(), private.my_demo(), private.astronaut_in_my_world(text) to authenticated;

-- Everyone signed in sees the names in their own world (for the crew garden and the doctor's list).
create policy "profiles: see people in my world" on public.profiles
  for select to authenticated
  using (demo = (select private.my_demo()) or id = (select auth.uid()));

-- People may change only their own display name and title.
create policy "profiles: edit my own name" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, title) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up rules
-- ---------------------------------------------------------------------------
-- Before the account is saved: check the role and the doctor invite code, then remove the code
-- so it is never stored with the account.
create function private.check_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted text := coalesce(meta ->> 'role', 'astronaut');
  code text := coalesce(meta ->> 'invite_code', '');
  ok boolean;
begin
  if wanted not in ('astronaut', 'doctor') then
    raise exception 'Orbloom: unknown role' using errcode = 'P0001';
  end if;
  if wanted = 'doctor' and coalesce(current_setting('orbloom.seeding', true), '') <> 'on' then
    select exists (
      select 1 from private.settings s
      where s.key = 'doctor_invite_hash' and s.value = extensions.crypt(code, s.value)
    ) into ok;
    if not ok then
      raise exception 'Orbloom: flight surgeon invite code not accepted' using errcode = 'P0001';
    end if;
  end if;
  new.raw_user_meta_data := meta - 'invite_code';
  return new;
end;
$$;

-- After the account is saved: make the profile. New astronauts get the next flower in the garden.
create function private.make_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted text := coalesce(meta ->> 'role', 'astronaut');
  display text := left(btrim(coalesce(meta ->> 'name', '')), 80);
  blooms text[] := array['violet', 'blue', 'lily', 'sun', 'pink', 'star', 'coral', 'bell'];
  colours text[] := array['var(--lime)', 'var(--bone)', '#9fe3dc', '#f0c95a', '#f2a7c3', '#bfe9ff', '#ffb48a', '#b9a6ff'];
  n int;
begin
  if display = '' then
    display := left(split_part(new.email, '@', 1), 80);
  end if;
  select count(*) into n from public.profiles where demo = false and role = 'astronaut';
  insert into public.profiles (id, name, role, crew_id, title, flower, bloom, demo)
  values (
    new.id, display, wanted,
    'u' || left(replace(new.id::text, '-', ''), 12),
    case when wanted = 'doctor' then 'Flight surgeon' else 'Crew member' end,
    colours[1 + n % 8], blooms[1 + n % 8], false
  );
  return new;
end;
$$;

revoke all on function private.check_new_user(), private.make_profile() from public, anon, authenticated;

create trigger orbloom_check_new_user before insert on auth.users
  for each row execute function private.check_new_user();
create trigger orbloom_make_profile after insert on auth.users
  for each row execute function private.make_profile();

-- ---------------------------------------------------------------------------
-- Shared health records (what used to go through the local server's /api/sync)
-- ---------------------------------------------------------------------------
-- kind      = which list it belongs to (readings, alerts, ...), same names as the app's tables
-- crew_id   = the astronaut the record is about
-- data      = the record itself (only the allowed fields are kept)
-- seq       = a counter that goes up on every change, so devices can ask "what changed since N?"
create table public.records (
  uid text primary key check (char_length(uid) between 1 and 100),
  kind text not null check (kind in ('readings', 'reactionTests', 'alerts', 'sharedNotes', 'careMessages', 'doctorNotes', 'crewStatus', 'auditLog')),
  crew_id text not null check (char_length(crew_id) between 1 and 40),
  author uuid not null default auth.uid() references auth.users (id) on delete cascade,
  demo boolean not null default false,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 20000),
  seq bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index records_seq_idx on public.records (seq);
create index records_crew_idx on public.records (crew_id, kind);
create index records_author_idx on public.records (author);
alter table public.records enable row level security;

-- Cleans every record before it is saved: keeps only the allowed fields, fills in who wrote it,
-- and stops anyone except a flight surgeon (through review_alert) from changing an alert review.
create function private.clean_record() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  allowed text[];
  me public.profiles;
  review_keys text[] := array['reviewed', 'reviewedBy', 'reviewedAt', 'reviewNote'];
begin
  allowed := case new.kind
    when 'readings' then array['uid', 'userId', 'type', 'value', 'value2', 'unit', 'recordedAt']
    when 'reactionTests' then array['uid', 'userId', 'reactionTimeMs', 'accuracy', 'consistency', 'alertnessScore', 'createdAt']
    when 'alerts' then array['uid', 'userId', 'kind', 'severity', 'message', 'signals', 'createdAt', 'reviewed', 'reviewedBy', 'reviewedAt', 'reviewNote']
    when 'sharedNotes' then array['uid', 'userId', 'text', 'date', 'createdAt']
    when 'careMessages' then array['uid', 'userId', 'from', 'author', 'text', 'createdAt']
    when 'doctorNotes' then array['uid', 'userId', 'author', 'text', 'createdAt']
    when 'crewStatus' then array['uid', 'userId', 'stage', 'score', 'checkins7', 'supportAlerts', 'pausedUntil', 'greenhouseActive', 'updatedAt']
    when 'auditLog' then array['uid', 'doctor', 'astronautId', 'at']
  end;

  new.data := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(new.data) e where e.key = any (allowed)), '{}'::jsonb);
  new.data := new.data || jsonb_build_object('uid', new.uid);
  if new.kind = 'auditLog' then
    new.data := new.data || jsonb_build_object('astronautId', new.crew_id);
  else
    new.data := new.data || jsonb_build_object('userId', new.crew_id);
  end if;

  select * into me from public.profiles where id = (select auth.uid());

  if tg_op = 'INSERT' then
    new.author := (select auth.uid());
    new.demo := coalesce(me.demo, false);
  else
    if new.kind <> old.kind or new.crew_id <> old.crew_id then
      raise exception 'Orbloom: a record cannot change owner or kind' using errcode = 'P0001';
    end if;
    new.author := old.author;
    new.demo := old.demo;
  end if;

  -- Names come from the account, not from the device.
  if me.role = 'doctor' and new.kind in ('careMessages', 'doctorNotes') then
    new.data := new.data || jsonb_build_object('author', me.name);
  end if;
  if new.kind = 'auditLog' then
    new.data := new.data || jsonb_build_object('doctor', (select email from auth.users where id = (select auth.uid())));
  end if;

  -- Alert reviews: only kept when a flight surgeon saves them through review_alert().
  if new.kind = 'alerts' and coalesce(current_setting('orbloom.reviewing', true), '') <> 'on' then
    if tg_op = 'UPDATE' then
      new.data := (new.data - review_keys) || coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(old.data) e where e.key = any (review_keys)), '{}'::jsonb);
    else
      new.data := (new.data - review_keys) || jsonb_build_object('reviewed', false);
    end if;
  end if;

  new.seq := nextval('private.change_seq');
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.clean_record() from public, anon, authenticated;

create trigger orbloom_clean_record before insert or update on public.records
  for each row execute function private.clean_record();

-- Who may read what (the same rules the local server used, plus: astronauts can read their own
-- readings and alertness tests, so a second device such as a phone shows them too).
create policy "records: flight surgeons read their world" on public.records
  for select to authenticated
  using ((select private.my_role()) = 'doctor' and demo = (select private.my_demo()));

create policy "records: astronauts read their own" on public.records
  for select to authenticated
  using (
    (select private.my_role()) = 'astronaut'
    and crew_id = (select private.my_crew_id())
    and kind in ('readings', 'reactionTests', 'alerts', 'sharedNotes', 'careMessages', 'crewStatus')
  );

create policy "records: everyone sees the crew garden of their world" on public.records
  for select to authenticated
  using (kind = 'crewStatus' and demo = (select private.my_demo()));

-- Who may write what.
create policy "records: astronauts add their own" on public.records
  for insert to authenticated
  with check (
    (select private.my_role()) = 'astronaut'
    and crew_id = (select private.my_crew_id())
    and kind in ('readings', 'reactionTests', 'alerts', 'sharedNotes', 'careMessages', 'crewStatus')
    and (kind <> 'careMessages' or data ->> 'from' = 'astronaut')
    and (kind <> 'crewStatus' or uid = crew_id)
  );

create policy "records: flight surgeons add notes, messages and access log" on public.records
  for insert to authenticated
  with check (
    (select private.my_role()) = 'doctor'
    and kind in ('careMessages', 'doctorNotes', 'auditLog')
    and (kind <> 'careMessages' or data ->> 'from' = 'doctor')
    and (select private.astronaut_in_my_world(crew_id))
  );

create policy "records: update only what I wrote" on public.records
  for update to authenticated
  using (author = (select auth.uid()))
  with check (
    author = (select auth.uid())
    and (
      ((select private.my_role()) = 'astronaut' and crew_id = (select private.my_crew_id())
        and (kind <> 'careMessages' or data ->> 'from' = 'astronaut'))
      or ((select private.my_role()) = 'doctor' and kind in ('careMessages', 'doctorNotes', 'auditLog')
        and (kind <> 'careMessages' or data ->> 'from' = 'doctor'))
    )
  );

revoke all on public.records from anon, authenticated;
grant select, insert, update on public.records to authenticated;

-- A flight surgeon marks an alert as reviewed (or not). Returns the updated alert, or null if
-- the alert is not in the database (for example demo data that only exists on one device).
create function public.review_alert(alert_uid text, is_reviewed boolean default true, note text default '')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles;
  found public.records;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if me.id is null or me.role <> 'doctor' then
    raise exception 'Orbloom: only flight surgeons can review alerts' using errcode = '42501';
  end if;
  select * into found from public.records r where r.uid = alert_uid and r.kind = 'alerts' and r.demo = me.demo;
  if found.uid is null then
    return null;
  end if;
  perform set_config('orbloom.reviewing', 'on', true);
  update public.records
    set data = found.data || jsonb_build_object(
      'reviewed', coalesce(is_reviewed, true),
      'reviewedBy', me.name,
      'reviewedAt', floor(extract(epoch from now()) * 1000)::bigint,
      'reviewNote', left(coalesce(note, ''), 2000))
    where uid = alert_uid
    returning data into found.data;
  perform set_config('orbloom.reviewing', 'off', true);
  return found.data;
end;
$$;
revoke all on function public.review_alert(text, boolean, text) from public, anon;
grant execute on function public.review_alert(text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Family relay (what used to be /api/family/send and /api/family/inbox)
-- ---------------------------------------------------------------------------
-- Astronauts add "out" messages. A pre-written demo reply ("in") is added at once but only becomes
-- visible about 20 seconds later (deliver_at), like a message coming back from Earth.
create table public.family_messages (
  uid text primary key check (char_length(uid) between 1 and 100),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  direction text not null check (direction in ('out', 'in')),
  contact text not null check (char_length(contact) between 1 and 60),
  contact_name text not null check (char_length(contact_name) between 1 and 80),
  body text not null check (char_length(body) <= 2000),
  photo text check (photo is null or (photo like 'data:image/%' and char_length(photo) <= 600000)),
  demo_reply boolean not null default false,
  reply_to text,
  created_at timestamptz not null default now(),
  deliver_at timestamptz not null default now()
);
create index family_owner_idx on public.family_messages (owner, deliver_at);
alter table public.family_messages enable row level security;

create function private.family_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.direction = 'out' then
    new.owner := (select auth.uid());
    new.demo_reply := false;
    new.deliver_at := now();
  end if;
  return new;
end;
$$;

create function private.family_demo_reply() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  replies text[] := array[
    'Got your message, it made my whole day. We are all thinking of you up there.',
    'Thank you for writing! Everything is fine at home. Sleep well and look out of the window for us.',
    'So lovely to hear from you. Take care of yourself, and tell us when you see the sunrise again.',
    'We read your message together at dinner. Proud of you, always.'
  ];
  due timestamptz := now() + interval '20 seconds';
begin
  if new.direction = 'out' then
    insert into public.family_messages (uid, owner, direction, contact, contact_name, body, demo_reply, reply_to, created_at, deliver_at)
    values (gen_random_uuid()::text, new.owner, 'in', new.contact, new.contact_name,
            replies[1 + floor(random() * array_length(replies, 1))::int], true, new.uid, due, due);
  end if;
  return null;
end;
$$;
revoke all on function private.family_before_insert(), private.family_demo_reply() from public, anon, authenticated;

create trigger orbloom_family_before_insert before insert on public.family_messages
  for each row execute function private.family_before_insert();
create trigger orbloom_family_demo_reply after insert on public.family_messages
  for each row execute function private.family_demo_reply();

create policy "family: astronauts send their own messages" on public.family_messages
  for insert to authenticated
  with check (owner = (select auth.uid()) and direction = 'out' and (select private.my_role()) = 'astronaut');

create policy "family: read replies once they have arrived" on public.family_messages
  for select to authenticated
  using (owner = (select auth.uid()) and deliver_at <= now());

revoke all on public.family_messages from anon, authenticated;
grant select, insert on public.family_messages to authenticated;
