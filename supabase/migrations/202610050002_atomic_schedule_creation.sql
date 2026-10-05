-- Create a schedule and its dependent rows atomically for the authenticated owner.
-- This avoids partial schedules and keeps ownership checks inside the database.
begin;

create or replace function public.create_schedule_with_tasks(
  p_title text,
  p_day date,
  p_start_time time,
  p_pomodoro jsonb,
  p_project_id uuid,
  p_tasks jsonb,
  p_prayers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_schedule_id uuid;
  v_row jsonb;
  v_duration integer;
  v_name text;
  v_category text;
  v_type text;
  v_priority text;
  v_time time;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_title is null or length(btrim(p_title)) not between 1 and 150 then
    raise exception 'Invalid schedule title';
  end if;
  if p_day is null or p_start_time is null then
    raise exception 'Schedule date and start time are required';
  end if;
  if jsonb_typeof(p_tasks) is distinct from 'array'
     or jsonb_array_length(p_tasks) not between 1 and 60 then
    raise exception 'Invalid schedule tasks';
  end if;
  if jsonb_typeof(p_prayers) is distinct from 'array'
     or jsonb_array_length(p_prayers) > 20 then
    raise exception 'Invalid prayer times';
  end if;

  if p_project_id is not null and not exists (
    select 1 from public.projects
    where id = p_project_id and user_id = v_user_id
  ) then
    raise exception 'Selected project does not belong to the current user'
      using errcode = '42501';
  end if;

  insert into public.schedules (user_id, title, day, start_time, pomodoro, project_id)
  values (v_user_id, btrim(p_title), p_day, p_start_time, coalesce(p_pomodoro, '{}'::jsonb), p_project_id)
  returning id into v_schedule_id;

  for v_row in select value from jsonb_array_elements(p_tasks)
  loop
    if jsonb_typeof(v_row) is distinct from 'object'
       or jsonb_typeof(v_row->'name') is distinct from 'string'
       or jsonb_typeof(v_row->'category') is distinct from 'string'
       or jsonb_typeof(v_row->'duration') is distinct from 'number'
       or jsonb_typeof(v_row->'type') is distinct from 'string'
       or jsonb_typeof(v_row->'priority') is distinct from 'string' then
      raise exception 'Invalid task data';
    end if;

    v_name := btrim(v_row->>'name');
    v_category := btrim(v_row->>'category');
    v_duration := (v_row->>'duration')::integer;
    v_type := v_row->>'type';
    v_priority := v_row->>'priority';

    if length(v_name) not between 1 and 200
       or length(v_category) not between 1 and 100
       or v_type not in ('task', 'side')
       or v_priority not in ('high', 'medium', 'low')
       or (v_type = 'task' and v_duration not between 1 and 1440)
       or (v_type = 'side' and v_duration <> 0) then
      raise exception 'Invalid task data';
    end if;

    insert into public.tasks (
      user_id, schedule_id, name, category, duration, type, priority, done, completed_sessions
    ) values (
      v_user_id, v_schedule_id, v_name, v_category, v_duration, v_type, v_priority, false, 0
    );
  end loop;

  for v_row in select value from jsonb_array_elements(p_prayers)
  loop
    if jsonb_typeof(v_row) is distinct from 'object'
       or jsonb_typeof(v_row->'name') is distinct from 'string'
       or jsonb_typeof(v_row->'time') is distinct from 'string' then
      raise exception 'Invalid prayer time';
    end if;
    if length(btrim(v_row->>'name')) not between 1 and 100
       or (v_row->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Invalid prayer time';
    end if;

    v_time := (v_row->>'time')::time;
    insert into public.prayers (user_id, schedule_id, day, name, time, done)
    values (v_user_id, v_schedule_id, p_day, btrim(v_row->>'name'), v_time, false);
  end loop;

  return v_schedule_id;
end;
$$;

revoke all on function public.create_schedule_with_tasks(text, date, time, jsonb, uuid, jsonb, jsonb)
  from public, anon;
grant execute on function public.create_schedule_with_tasks(text, date, time, jsonb, uuid, jsonb, jsonb)
  to authenticated;

commit;
