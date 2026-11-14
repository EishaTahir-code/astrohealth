-- Lets the sign-up form say "that invite code is not right" before trying to create the account.
-- It only answers yes or no; the code itself is stored scrambled (bcrypt) and never returned.
create function public.doctor_invite_ok(code text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.settings s
    where s.key = 'doctor_invite_hash' and s.value = extensions.crypt(coalesce(code, ''), s.value)
  )
$$;
revoke all on function public.doctor_invite_ok(text) from public;
grant execute on function public.doctor_invite_ok(text) to anon, authenticated;
