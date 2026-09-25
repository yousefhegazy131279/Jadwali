-- Collaboration is opt-in. Owners may invite one existing account as editor/viewer.
-- Replaces policies on schedule resources to avoid permissive legacy policies
-- silently bypassing the member role checks. No application rows are deleted.
begin;
alter table public.schedules add column if not exists is_shared boolean not null default false;
alter table public.schedules add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.tasks add column if not exists completed_by uuid references auth.users(id) on delete set null;
create table public.schedule_members (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key (schedule_id,user_id)
);
create index schedule_members_user_idx on public.schedule_members(user_id);
create index schedules_project_idx on public.schedules(project_id);
alter table public.schedule_members enable row level security;

create function public.jadwali_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
create function public.schedule_access(p_id uuid, p_write boolean default false) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    public.jadwali_admin() or exists(select 1 from public.schedules where id=p_id and user_id=auth.uid()) or
    exists(select 1 from public.schedule_members where schedule_id=p_id and user_id=auth.uid() and (not p_write or role='editor'))
  );
$$;
create function public.schedule_owner(p_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (public.jadwali_admin() or exists(select 1 from public.schedules where id=p_id and user_id=auth.uid()));
$$;
create function public.guard_profile_role() returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.jadwali_admin() and
    ((tg_op='INSERT' and new.role <> 'user') or (tg_op='UPDATE' and new.role is distinct from old.role)) then
    raise exception 'Only admins may change roles';
  end if;
  return new;
end;
$$;
create trigger guard_profile_role before insert or update on public.profiles for each row execute function public.guard_profile_role();

create function public.schedule_integrity() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' and new.user_id <> old.user_id then raise exception 'Cannot transfer schedule ownership'; end if;
  if new.project_id is not null and not exists(select 1 from public.projects where id=new.project_id and user_id=new.user_id) then
    raise exception 'Project must belong to the schedule owner';
  end if;
  return new;
end;
$$;
create trigger schedule_integrity before insert or update on public.schedules for each row execute function public.schedule_integrity();
create function public.add_schedule_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.schedule_members(schedule_id,user_id,role) values(new.id,new.user_id,'owner') on conflict do nothing;
  return new;
end;
$$;
create trigger add_schedule_owner after insert on public.schedules for each row execute function public.add_schedule_owner();
insert into public.schedule_members(schedule_id,user_id,role) select id,user_id,'owner' from public.schedules on conflict do nothing;

do $$ declare p record; begin
  for p in select tablename,policyname from pg_policies where schemaname='public' and tablename in ('schedules','tasks','prayers','custom_cards') loop
    execute format('drop policy %I on public.%I',p.policyname,p.tablename);
  end loop;
end $$;
alter table public.schedules enable row level security;
alter table public.tasks enable row level security;
alter table public.prayers enable row level security;
alter table public.custom_cards enable row level security;
create policy schedules_read on public.schedules for select to authenticated using (public.schedule_access(id));
create policy schedules_insert on public.schedules for insert to authenticated with check(user_id=auth.uid());
create policy schedules_update on public.schedules for update to authenticated using(public.schedule_owner(id)) with check(public.schedule_owner(id));
create policy schedules_delete on public.schedules for delete to authenticated using(public.schedule_owner(id));
create policy members_read on public.schedule_members for select to authenticated using(public.schedule_access(schedule_id));

do $$ declare tbl text; begin
  foreach tbl in array array['tasks','prayers','custom_cards'] loop
    execute format('create policy resource_read on public.%I for select to authenticated using ((schedule_id is not null and public.schedule_access(schedule_id)) or (schedule_id is null and user_id=auth.uid()) or public.jadwali_admin())',tbl);
    execute format('create policy resource_insert on public.%I for insert to authenticated with check ((schedule_id is not null and public.schedule_access(schedule_id,true) and user_id=(select user_id from public.schedules where id=schedule_id)) or (schedule_id is null and user_id=auth.uid()))',tbl);
    execute format('create policy resource_update on public.%I for update to authenticated using ((schedule_id is not null and public.schedule_access(schedule_id,true)) or (schedule_id is null and user_id=auth.uid()) or public.jadwali_admin()) with check ((schedule_id is not null and public.schedule_access(schedule_id,true) and user_id=(select user_id from public.schedules where id=schedule_id)) or (schedule_id is null and user_id=auth.uid()) or public.jadwali_admin())',tbl);
    execute format('create policy resource_delete on public.%I for delete to authenticated using ((schedule_id is not null and public.schedule_access(schedule_id,true)) or (schedule_id is null and user_id=auth.uid()) or public.jadwali_admin())',tbl);
  end loop;
end $$;

create function public.share_schedule(p_schedule_id uuid,p_email text,p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid; owner_id uuid;
begin
  select user_id into owner_id from public.schedules where id=p_schedule_id for update;
  if owner_id is distinct from auth.uid() or auth.uid() is null then raise exception 'Only the owner can share'; end if;
  if p_role not in ('editor','viewer') then raise exception 'Invalid role'; end if;
  select id into target from auth.users where lower(email)=lower(trim(p_email));
  if target is null then raise exception 'User must register first'; end if;
  if target=owner_id then raise exception 'Already the owner'; end if;
  if exists(select 1 from public.schedule_members where schedule_id=p_schedule_id and user_id not in(owner_id,target)) then
    raise exception 'This schedule already has two members';
  end if;
  insert into public.schedule_members(schedule_id,user_id,role) values(p_schedule_id,target,p_role)
  on conflict(schedule_id,user_id) do update set role=excluded.role;
  update public.schedules set is_shared=true where id=p_schedule_id;
end;
$$;
create function public.remove_schedule_member(p_schedule_id uuid,p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.schedules where id=p_schedule_id and user_id=auth.uid() and user_id<>p_user_id) then raise exception 'Only the owner can remove a guest'; end if;
  delete from public.schedule_members where schedule_id=p_schedule_id and user_id=p_user_id and role<>'owner';
  update public.schedules set is_shared=exists(select 1 from public.schedule_members where schedule_id=p_schedule_id and role<>'owner') where id=p_schedule_id;
end;
$$;
create function public.schedule_member_progress(p_schedule_id uuid)
returns table(user_id uuid,full_name text,role text,sessions bigint,minutes numeric)
language sql stable security definer set search_path = '' as $$
  select m.user_id,p.full_name,m.role,count(g.task_id),coalesce(sum(g.duration_minutes),0)
  from public.schedule_members m join public.profiles p on p.id=m.user_id
  left join public.tasks t on t.schedule_id=m.schedule_id
  left join public.task_progress g on g.task_id=t.id and g.user_id=m.user_id
  where m.schedule_id=p_schedule_id and public.schedule_access(p_schedule_id)
  group by m.user_id,p.full_name,m.role;
$$;

-- Upgrade the tested, idempotent completion function to honor editor membership.
do $$ declare body text; begin
  select pg_get_functiondef('public.record_work_session(uuid,integer)'::regprocedure) into body;
  body := replace(body,'task_row.user_id <> auth.uid()', 'not public.schedule_access(task_row.schedule_id, true)');
  body := replace(body,'set completed_sessions = p_session_number, done =', 'set completed_by = auth.uid(), completed_sessions = p_session_number, done =');
  execute body;
end $$;

revoke all on function public.share_schedule(uuid,text,text), public.remove_schedule_member(uuid,uuid), public.schedule_member_progress(uuid) from public,anon;
grant execute on function public.share_schedule(uuid,text,text), public.remove_schedule_member(uuid,uuid), public.schedule_member_progress(uuid) to authenticated;
revoke all on public.task_progress from anon;
grant select on public.task_progress, public.schedule_members to authenticated;
commit;
