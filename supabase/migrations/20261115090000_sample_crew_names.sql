-- The sample crew: the database functions that tell sample accounts and real accounts apart,
-- written with the final names (profiles.sample, records.sample, family_messages.auto_reply,
-- private.my_sample(), private.family_auto_reply()). Running it again changes nothing.

create or replace function private.my_sample() returns boolean
language sql stable security definer set search_path = '' as $$
  select sample from public.profiles where id = (select auth.uid())
$$;

create or replace function private.astronaut_in_my_world(target text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.crew_id = target and p.role = 'astronaut'
      and p.sample = (select sample from public.profiles where id = (select auth.uid()))
  )
$$;

create or replace function private.make_profile() returns trigger
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
  select count(*) into n from public.profiles where sample = false and role = 'astronaut';
  insert into public.profiles (id, name, role, crew_id, title, flower, bloom, sample)
  values (
    new.id, display, wanted,
    'u' || left(replace(new.id::text, '-', ''), 12),
    case when wanted = 'doctor' then 'Flight surgeon' else 'Crew member' end,
    colours[1 + n % 8], blooms[1 + n % 8], false
  );
  return new;
end;
$$;

create or replace function private.clean_record() returns trigger
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
    new.sample := coalesce(me.sample, false);
  else
    if new.kind <> old.kind or new.crew_id <> old.crew_id then
      raise exception 'Orbloom: a record cannot change owner or kind' using errcode = 'P0001';
    end if;
    new.author := old.author;
    new.sample := old.sample;
  end if;

  if me.role = 'doctor' and new.kind in ('careMessages', 'doctorNotes') then
    new.data := new.data || jsonb_build_object('author', me.name);
  end if;
  if new.kind = 'auditLog' then
    new.data := new.data || jsonb_build_object('doctor', (select email from auth.users where id = (select auth.uid())));
  end if;

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

create or replace function public.review_alert(alert_uid text, is_reviewed boolean default true, note text default '')
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
  select * into found from public.records r where r.uid = alert_uid and r.kind = 'alerts' and r.sample = me.sample;
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

create or replace function private.family_auto_reply() returns trigger
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
    insert into public.family_messages (uid, owner, direction, contact, contact_name, body, auto_reply, reply_to, created_at, deliver_at)
    values (gen_random_uuid()::text, new.owner, 'in', new.contact, new.contact_name,
            replies[1 + floor(random() * array_length(replies, 1))::int], true, new.uid, due, due);
  end if;
  return null;
end;
$$;

create or replace function private.family_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.direction = 'out' then
    new.owner := (select auth.uid());
    new.auto_reply := false;
    new.deliver_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.family_auto_reply(), private.family_before_insert(), private.make_profile(), private.clean_record() from public, anon, authenticated;
grant execute on function private.my_sample(), private.astronaut_in_my_world(text) to authenticated;
