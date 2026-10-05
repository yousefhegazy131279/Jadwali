-- Repair legacy profiles and align admin/onboarding access with app behavior.
begin;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles as current_profile (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    'user'
  )
  on conflict (id) do update set
    email = coalesce(current_profile.email, excluded.email),
    full_name = case
      when coalesce(current_profile.full_name, '') = '' then excluded.full_name
      else current_profile.full_name
    end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill accounts created before the profile trigger was installed.
insert into public.profiles as current_profile (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  'user'
from auth.users u
on conflict (id) do update set
  email = coalesce(current_profile.email, excluded.email),
  full_name = case
    when coalesce(current_profile.full_name, '') = '' then excluded.full_name
    else current_profile.full_name
  end;

-- Self-heal a missing legacy profile at sign-in without exposing auth.users.
create or replace function public.ensure_my_profile()
returns void language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  insert into public.profiles as current_profile (id, email, full_name, role)
  select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
    'user'
  from auth.users u
  where u.id = current_user_id
  on conflict (id) do update set
    email = coalesce(current_profile.email, excluded.email),
    full_name = case
      when coalesce(current_profile.full_name, '') = '' then excluded.full_name
      else current_profile.full_name
    end;
end;
$$;
revoke all on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;

-- The admin console lists, edits, and removes profile rows.
alter table public.profiles enable row level security;
-- Keep each user's profile usable while the role guard blocks self-promotion.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles
  for select to authenticated using (public.jadwali_admin());
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated using (public.jadwali_admin()) with check (public.jadwali_admin());
drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete to authenticated using (public.jadwali_admin());

-- Preferences are private to the account that owns them.
alter table public.settings enable row level security;
do $$ declare p record; begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'settings'
  loop
    execute format('drop policy %I on public.settings', p.policyname);
  end loop;
end $$;
create policy settings_owner_all on public.settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;
