-- Run on the existing Jadwali database before deploying the matching client.
begin;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name, role)
select id, email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''), 'user'
from auth.users on conflict (id) do nothing;

-- An immutable ledger prevents retry / two-device double increments and dates analytics.
create table if not exists public.task_progress (
  task_id uuid not null references public.tasks(id) on delete cascade,
  session_number integer not null check (session_number > 0),
  user_id uuid references auth.users(id) on delete set null,
  duration_minutes numeric not null check (duration_minutes > 0),
  completed_at timestamptz not null default now(),
  primary key (task_id, session_number)
);
alter table public.task_progress enable row level security;
create policy progress_read on public.task_progress for select to authenticated
using (exists (select 1 from public.tasks t where t.id = task_id));

create or replace function public.record_work_session(p_task_id uuid, p_session_number integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  task_row public.tasks%rowtype;
  work_minutes integer;
  total_sessions integer;
begin
  select * into task_row from public.tasks where id = p_task_id for update;
  if not found or task_row.user_id <> auth.uid() or auth.uid() is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select coalesce((pomodoro->>'workDuration')::integer, 50) into work_minutes
  from public.schedules where id = task_row.schedule_id;
  if task_row.type <> 'task' or task_row.duration <= 0 or work_minutes is null or work_minutes <= 0 then
    raise exception 'Invalid work task';
  end if;
  total_sessions := ceil(task_row.duration::numeric / work_minutes);
  if p_session_number is null or p_session_number < 1 or p_session_number > total_sessions then raise exception 'Invalid session'; end if;
  if p_session_number <= coalesce(task_row.completed_sessions, 0) then
    return task_row.completed_sessions;
  end if;
  if p_session_number <> coalesce(task_row.completed_sessions, 0) + 1 then raise exception 'Complete earlier sessions first'; end if;
  insert into public.task_progress (task_id, session_number, user_id, duration_minutes)
  values (p_task_id, p_session_number, auth.uid(), least(work_minutes, task_row.duration - (p_session_number - 1) * work_minutes))
  on conflict do nothing;
  update public.tasks set completed_sessions = p_session_number, done = (p_session_number = total_sessions)
  where id = p_task_id;
  return p_session_number;
end;
$$;
revoke all on function public.record_work_session(uuid, integer) from public, anon;
grant execute on function public.record_work_session(uuid, integer) to authenticated;
commit;
