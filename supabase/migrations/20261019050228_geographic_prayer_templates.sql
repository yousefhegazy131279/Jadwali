-- Preserve account prayer preferences for plans created directly from templates.
begin;
-- Keep the existing manual RPC unchanged for older clients.
create function public.create_template_plan_geographic(p_template_id text,p_day date,p_start_time time,p_project_id uuid default null,p_request_id uuid default gen_random_uuid(),p_language text default 'ar',p_daily_prayers jsonb default null) returns uuid[] language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); t public.templates%rowtype; ids uuid[]; n integer; tasks jsonb; sid uuid; saved_times jsonb; daily_row jsonb; daily_time jsonb; prayers jsonb; prayer_index integer; prayer_time text; prayer_names text[]:=array['الفجر','الظهر','العصر','المغرب','العشاء']; fallback_times text[]:=array['04:25','13:02','16:38','19:57','21:26'];
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_day is null or p_start_time is null or p_request_id is null then raise exception 'Missing plan parameters'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||p_request_id::text,0));
 select schedule_ids into ids from private.template_requests where user_id=u and request_id=p_request_id; if found then return ids; end if;
 select * into t from public.templates where id=p_template_id; if not found then raise exception 'Unknown template'; end if;
 select coalesce(jsonb_agg((v-'name_en')||jsonb_build_object('name',case when p_language='en' then v->>'name_en' else v->>'name' end)),'[]') into tasks from jsonb_array_elements(t.tasks) v;
 if p_daily_prayers is not null then
  if jsonb_typeof(p_daily_prayers) is distinct from 'array' then raise exception 'Invalid daily prayer times';end if;
  if jsonb_array_length(p_daily_prayers)<>t.days then raise exception 'Invalid daily prayer count';end if;
  for daily_row in select value from jsonb_array_elements(p_daily_prayers) loop
   if jsonb_typeof(daily_row) is distinct from 'array' then raise exception 'Invalid prayer day';end if;
   if jsonb_array_length(daily_row)<>5 then raise exception 'Exactly five prayer times are required';end if;
   for daily_time in select value from jsonb_array_elements(daily_row) loop
    if jsonb_typeof(daily_time) is distinct from 'string' or (daily_time#>>'{}') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid prayer time';end if;
   end loop;
  end loop;
 end if;
 select prayer_times into saved_times from public.settings where user_id=u limit 1;
 if jsonb_typeof(saved_times) is distinct from 'array' then saved_times:='[]';end if;
 prayers:='[]';for prayer_index in 0..4 loop
  prayer_time:=saved_times->>prayer_index;
  if prayer_time is null or prayer_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then prayer_time:=fallback_times[prayer_index+1];end if;
  prayers:=prayers||jsonb_build_array(jsonb_build_object('name',prayer_names[prayer_index+1],'time',left(prayer_time,5)));
 end loop;
 ids:='{}'; for n in 0..t.days-1 loop
  if p_daily_prayers is not null then
   prayers:='[]';for prayer_index in 0..4 loop
    prayers:=prayers||jsonb_build_array(jsonb_build_object('name',prayer_names[prayer_index+1],'time',p_daily_prayers->n->>prayer_index));
   end loop;
  end if;
  sid:=public.create_schedule_with_tasks((case when p_language='en' then t.title_en else t.title_ar end)||case when t.days>1 then ' '||(n+1) else '' end,p_day+n,p_start_time,t.pomodoro,p_project_id,tasks,prayers);
  ids:=array_append(ids,sid);
 end loop;
 insert into private.template_requests values(u,p_request_id,ids); return ids;
end $$;
revoke all on function public.create_template_plan_geographic(text,date,time,uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.create_template_plan_geographic(text,date,time,uuid,uuid,text,jsonb) to authenticated;
commit;
