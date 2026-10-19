-- Additive V2 foundation. Existing schedules, tasks, prayers and profiles are preserved.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function public.server_now() returns timestamptz language sql stable set search_path='' as $$ select now() $$;
revoke all on function public.server_now() from public,anon;grant execute on function public.server_now() to authenticated;

create table if not exists public.notes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 content text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.notes add column if not exists title text not null default '';
alter table public.notes add column if not exists created_at timestamptz not null default now();
update public.notes set content='' where content is null;
alter table public.notes alter column content set default '';
alter table public.notes alter column content set not null;
alter table public.notes add column if not exists color text not null default 'gold';
alter table public.notes add column if not exists pinned boolean not null default false;
alter table public.notes add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.notes add column if not exists schedule_id uuid references public.schedules(id) on delete set null;
alter table public.notes add column if not exists version integer not null default 1;
create index if not exists notes_owner_updated on public.notes(user_id,pinned desc,updated_at desc);
create or replace function private.validate_note() returns trigger language plpgsql set search_path='' as $$
begin
 if length(new.title)>150 or length(new.content)>20000 or new.color not in ('gold','blue','green','purple','pink','orange','cyan','red','slate') then raise exception 'Invalid note'; end if;
 if new.project_id is not null and not exists(select 1 from public.projects where id=new.project_id and user_id=new.user_id) then raise exception 'Project is not yours' using errcode='42501'; end if;
 if new.schedule_id is not null and not exists(select 1 from public.schedules where id=new.schedule_id and user_id=new.user_id) then raise exception 'Schedule is not yours' using errcode='42501'; end if;
 new.updated_at:=now(); if tg_op='UPDATE' then new.version:=old.version+1; end if; return new;
end $$;
drop trigger if exists validate_note_v2 on public.notes;
create trigger validate_note_v2 before insert or update on public.notes for each row execute function private.validate_note();
alter table public.notes enable row level security;
do $$ declare p record; begin for p in select policyname from pg_policies where schemaname='public' and tablename='notes' loop execute format('drop policy %I on public.notes',p.policyname); end loop; end $$;
create policy notes_owner on public.notes to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.notes to authenticated;

create table public.productivity_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 timezone text not null default 'Africa/Cairo', reminder_time time not null default '21:00',
 daily_reminder boolean not null default false, session_reminders boolean not null default false,
 prayer_reminders boolean not null default false, weekly_email boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.productivity_preferences enable row level security;
create policy preferences_owner on public.productivity_preferences to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update on public.productivity_preferences to authenticated;
create function private.validate_timezone() returns trigger language plpgsql set search_path='' as $$
begin if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'Invalid timezone'; end if; new.updated_at:=now(); return new; end $$;
create trigger validate_productivity_timezone before insert or update on public.productivity_preferences for each row execute function private.validate_timezone();

create table public.achievements (
 id text primary key, title_ar text not null, title_en text not null, metric text not null check(metric in ('sessions','minutes','streak','tasks')),
 threshold integer not null check(threshold>0), icon text not null, position integer not null
);
insert into public.achievements values
 ('sessions-1','البداية','First step','sessions',1,'target',1),('sessions-10','خطوات ثابتة','Steady progress','sessions',10,'target',2),
 ('sessions-50','صانع التركيز','Focus builder','sessions',50,'target',3),('sessions-100','مئة جلسة','One hundred sessions','sessions',100,'target',4),('sessions-500','خبير التركيز','Focus expert','sessions',500,'target',5),
 ('hours-10','عشر ساعات','Ten hours','minutes',600,'clock',6),('hours-50','خمسون ساعة','Fifty hours','minutes',3000,'clock',7),('hours-100','مئة ساعة','One hundred hours','minutes',6000,'clock',8),
 ('streak-3','ثلاثة أيام متواصلة','Three-day streak','streak',3,'flame',9),('streak-7','أسبوع من الالتزام','One-week streak','streak',7,'flame',10),('streak-30','شهر من الالتزام','One-month streak','streak',30,'flame',11),('streak-100','مئة يوم','One hundred days','streak',100,'flame',12),
 ('tasks-50','خمسون مهمة','Fifty tasks','tasks',50,'check',13),('tasks-100','مئة مهمة','One hundred tasks','tasks',100,'check',14);
alter table public.achievements enable row level security;
create policy achievements_catalog on public.achievements for select to authenticated using(true);
grant select on public.achievements to authenticated;
create table public.user_achievements (user_id uuid references auth.users(id) on delete cascade, achievement_id text references public.achievements(id), unlocked_at timestamptz not null default now(), celebrated_at timestamptz, primary key(user_id,achievement_id));
alter table public.user_achievements enable row level security;
create policy earned_read on public.user_achievements for select to authenticated using(user_id=(select auth.uid()));
create policy earned_ack on public.user_achievements for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select on public.user_achievements to authenticated;
grant update(celebrated_at) on public.user_achievements to authenticated;
create table public.user_streaks(user_id uuid primary key references auth.users(id) on delete cascade,current_streak integer not null default 0,longest_streak integer not null default 0,last_active_day date,updated_at timestamptz not null default now());
alter table public.user_streaks enable row level security;
create policy streak_read on public.user_streaks for select to authenticated using(user_id=(select auth.uid()));
grant select on public.user_streaks to authenticated;
create index if not exists progress_owner_date_v2 on public.task_progress(user_id,completed_at desc);

create table public.templates(id text primary key,title_ar text not null,title_en text not null,description_ar text not null,description_en text not null,days integer not null check(days between 1 and 7),tasks jsonb not null,pomodoro jsonb not null default '{"workDuration":25,"shortBreak":5,"longBreak":15,"cyclesBeforeLong":4}');
insert into public.templates(id,title_ar,title_en,description_ar,description_en,days,tasks) values
 ('student','يوم طالب ثانوية','Student day','مذاكرة ومراجعة مع وقت للقراءة','Study, review and reading',1,'[{"name":"مذاكرة رياضيات","name_en":"Math study","category":"دراسة","duration":60,"type":"task","priority":"high"},{"name":"مراجعة الدروس","name_en":"Lesson review","category":"دراسة","duration":45,"type":"task","priority":"medium"},{"name":"قراءة القرآن","name_en":"Quran reading","category":"عمل جانبي","duration":0,"type":"side","priority":"medium"}]'),
 ('work-study','موظف + مذاكرة','Work and study','مهام العمل مع جلسة تعلم مسائية','Work tasks and an evening learning session',1,'[{"name":"أولوية العمل","name_en":"Work priority","category":"عمل","duration":90,"type":"task","priority":"high"},{"name":"تعلم مهارة","name_en":"Learn a skill","category":"تعلم","duration":60,"type":"task","priority":"medium"},{"name":"المشي","name_en":"Walking","category":"عمل جانبي","duration":0,"type":"side","priority":"low"}]'),
 ('ramadan','يوم رمضان','Ramadan day','دراسة هادئة مع أعمال روحية مستقلة','Gentle study and spiritual activities',1,'[{"name":"مذاكرة مركزة","name_en":"Focused study","category":"دراسة","duration":50,"type":"task","priority":"high"},{"name":"مراجعة خفيفة","name_en":"Light review","category":"دراسة","duration":25,"type":"task","priority":"medium"},{"name":"ورد القرآن","name_en":"Quran reading","category":"عمل جانبي","duration":0,"type":"side","priority":"medium"}]'),
 ('exams','أسبوع امتحانات','Exam week','سبعة جداول للمراجعة وحل الأسئلة','Seven daily plans for review and practice',7,'[{"name":"مراجعة المادة","name_en":"Subject review","category":"دراسة","duration":90,"type":"task","priority":"high"},{"name":"حل أسئلة","name_en":"Practice questions","category":"دراسة","duration":60,"type":"task","priority":"high"},{"name":"مراجعة الأخطاء","name_en":"Review mistakes","category":"دراسة","duration":30,"type":"task","priority":"medium"}]');
alter table public.templates enable row level security;
create policy template_read on public.templates for select to authenticated using(true);
grant select on public.templates to authenticated;
create table private.template_requests(user_id uuid references auth.users(id) on delete cascade,request_id uuid, schedule_ids uuid[] not null, primary key(user_id,request_id));
create function public.create_template_plan(p_template_id text,p_day date,p_start_time time,p_project_id uuid default null,p_request_id uuid default gen_random_uuid(),p_language text default 'ar') returns uuid[] language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); t public.templates%rowtype; ids uuid[]; n integer; tasks jsonb; sid uuid;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_day is null or p_start_time is null or p_request_id is null then raise exception 'Missing plan parameters'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||p_request_id::text,0));
 select schedule_ids into ids from private.template_requests where user_id=u and request_id=p_request_id; if found then return ids; end if;
 select * into t from public.templates where id=p_template_id; if not found then raise exception 'Unknown template'; end if;
 select coalesce(jsonb_agg((v-'name_en')||jsonb_build_object('name',case when p_language='en' then v->>'name_en' else v->>'name' end)),'[]') into tasks from jsonb_array_elements(t.tasks) v;
 ids:='{}'; for n in 0..t.days-1 loop
  sid:=public.create_schedule_with_tasks((case when p_language='en' then t.title_en else t.title_ar end)||case when t.days>1 then ' '||(n+1) else '' end,p_day+n,p_start_time,t.pomodoro,p_project_id,tasks,'[]');
  ids:=array_append(ids,sid);
 end loop;
 insert into private.template_requests values(u,p_request_id,ids); return ids;
end $$;
revoke all on function public.create_template_plan(text,date,time,uuid,uuid,text) from public,anon;
grant execute on function public.create_template_plan(text,date,time,uuid,uuid,text) to authenticated;

create table public.challenges(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,title text not null check(length(btrim(title)) between 1 and 120),join_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),starts_on date not null,ends_on date not null,goal_minutes integer not null check(goal_minutes between 1 and 100000),created_at timestamptz not null default now(),check(ends_on>=starts_on and ends_on<=starts_on+366));
create table public.challenge_members(challenge_id uuid references public.challenges(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,display_name text not null check(length(btrim(display_name)) between 1 and 60),joined_at timestamptz not null default now(),primary key(challenge_id,user_id));
create index challenge_member_user on public.challenge_members(user_id,challenge_id);
create function private.in_challenge(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.challenge_members where challenge_id=p_id and user_id=auth.uid()) $$;
revoke all on function private.in_challenge(uuid) from public;
grant execute on function private.in_challenge(uuid) to authenticated;
alter table public.challenges enable row level security; alter table public.challenge_members enable row level security;
create policy challenge_read on public.challenges for select to authenticated using(owner_id=(select auth.uid()) or private.in_challenge(id));
create policy challenge_create on public.challenges for insert to authenticated with check(owner_id=(select auth.uid()));
create policy challenge_delete on public.challenges for delete to authenticated using(owner_id=(select auth.uid()));
create policy challenge_members_read on public.challenge_members for select to authenticated using(private.in_challenge(challenge_id));
grant select,insert,delete on public.challenges to authenticated; grant select on public.challenge_members to authenticated;
create function public.join_challenge(p_code text,p_display_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; u uuid:=auth.uid(); begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id into cid from public.challenges where join_code=upper(btrim(p_code)) and ends_on >= (now() at time zone 'UTC')::date for update;
 if cid is null then raise exception 'Invalid or expired invitation'; end if;
 if (select count(*) from public.challenge_members where challenge_id=cid)>=100 and not exists(select 1 from public.challenge_members where challenge_id=cid and user_id=u) then raise exception 'Challenge is full'; end if;
 insert into public.challenge_members values(cid,u,btrim(p_display_name),now()) on conflict(challenge_id,user_id) do update set display_name=excluded.display_name; return cid;
end $$;
revoke all on function public.join_challenge(text,text) from public,anon; grant execute on function public.join_challenge(text,text) to authenticated;
create function public.leave_challenge(p_id uuid) returns void language sql security invoker set search_path='' as $$ delete from public.challenge_members where challenge_id=p_id and user_id=auth.uid() $$;
create policy challenge_leave on public.challenge_members for delete to authenticated using(user_id=(select auth.uid())); grant delete on public.challenge_members to authenticated;
revoke all on function public.leave_challenge(uuid) from public,anon; grant execute on function public.leave_challenge(uuid) to authenticated;

create table public.focus_rooms(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,title text not null check(length(btrim(title)) between 1 and 120),join_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),phase_id uuid,phase text not null default 'idle' check(phase in ('idle','work','break')),started_at timestamptz,ends_at timestamptz,duration_minutes integer not null default 25 check(duration_minutes between 1 and 90),created_at timestamptz not null default now());
create table public.focus_room_members(room_id uuid references public.focus_rooms(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,display_name text not null check(length(btrim(display_name)) between 1 and 60),joined_at timestamptz not null default now(),primary key(room_id,user_id));
create table public.focus_room_phases(id uuid primary key,room_id uuid not null references public.focus_rooms(id) on delete cascade,phase text not null check(phase in ('work','break')),started_at timestamptz not null,ends_at timestamptz not null,duration_minutes integer not null check(duration_minutes between 1 and 90));
create index room_member_user on public.focus_room_members(user_id,room_id);
create table public.room_focus_sessions(user_id uuid references auth.users(id) on delete cascade,room_id uuid references public.focus_rooms(id) on delete set null,phase_id uuid not null,duration_minutes integer not null check(duration_minutes between 1 and 90),completed_at timestamptz not null default now(),primary key(user_id,phase_id));
create index room_progress_user_date on public.room_focus_sessions(user_id,completed_at desc);
create table public.focus_messages(id uuid primary key default gen_random_uuid(),room_id uuid not null references public.focus_rooms(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,display_name text not null,content text not null check(length(btrim(content)) between 1 and 500),created_at timestamptz not null default now());
create index messages_room_date on public.focus_messages(room_id,created_at desc);
create function private.in_focus_room(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.focus_room_members where room_id=p_id and user_id=auth.uid()) $$;
revoke all on function private.in_focus_room(uuid) from public; grant execute on function private.in_focus_room(uuid) to authenticated;
alter table public.focus_rooms enable row level security; alter table public.focus_room_members enable row level security; alter table public.room_focus_sessions enable row level security; alter table public.focus_messages enable row level security;
alter table public.focus_room_phases enable row level security;
create policy room_phase_read on public.focus_room_phases for select to authenticated using(private.in_focus_room(room_id));
grant select on public.focus_room_phases to authenticated;
create policy rooms_read on public.focus_rooms for select to authenticated using(owner_id=(select auth.uid()) or private.in_focus_room(id));
create policy rooms_create on public.focus_rooms for insert to authenticated with check(owner_id=(select auth.uid()));
create policy rooms_delete on public.focus_rooms for delete to authenticated using(owner_id=(select auth.uid()));
create policy room_members_read on public.focus_room_members for select to authenticated using(private.in_focus_room(room_id));
create policy room_sessions_read on public.room_focus_sessions for select to authenticated using(user_id=(select auth.uid()));
create policy room_messages_read on public.focus_messages for select to authenticated using(private.in_focus_room(room_id));
grant select,insert,delete on public.focus_rooms to authenticated; grant select on public.focus_room_members,public.focus_messages,public.room_focus_sessions to authenticated;
create function public.join_focus_room(p_code text,p_display_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; u uuid:=auth.uid(); begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select id into rid from public.focus_rooms where join_code=upper(btrim(p_code)) for update;
 if rid is null then raise exception 'Invalid invitation'; end if;
 if (select count(*) from public.focus_room_members where room_id=rid)>=20 and not exists(select 1 from public.focus_room_members where room_id=rid and user_id=u) then raise exception 'Room is full'; end if;
 insert into public.focus_room_members values(rid,u,btrim(p_display_name),now()) on conflict do nothing; return rid;
end $$;
create function public.start_room_phase(p_room_id uuid,p_minutes integer,p_phase text default 'work') returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_minutes is null or p_phase is null or p_minutes not between 1 and 90 or p_phase not in ('work','break') then raise exception 'Invalid phase'; end if;
 update public.focus_rooms set phase_id=gen_random_uuid(),phase=p_phase,started_at=now(),ends_at=now()+make_interval(mins=>p_minutes),duration_minutes=p_minutes
 where id=p_room_id and owner_id=auth.uid() and (ends_at is null or ends_at<=now());
 if not found then raise exception 'Only the host can start an idle room'; end if;
 insert into public.focus_room_phases select phase_id,id,phase,started_at,ends_at,duration_minutes from public.focus_rooms where id=p_room_id;
end $$;
create function public.finish_room_focus(p_room_id uuid,p_phase_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.focus_room_phases%rowtype; begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into r from public.focus_room_phases where room_id=p_room_id and id=p_phase_id and phase='work' and ends_at<=now();
 if not found or not exists(select 1 from public.focus_room_members where room_id=p_room_id and user_id=auth.uid() and joined_at<=r.started_at) then raise exception 'Complete a full focus phase first'; end if;
 insert into public.room_focus_sessions values(auth.uid(),r.room_id,r.id,r.duration_minutes,r.ends_at) on conflict do nothing; return true;
end $$;
create function public.send_room_message(p_room_id uuid,p_content text) returns void language plpgsql security definer set search_path='' as $$
declare n text; begin
 select display_name into n from public.focus_room_members where room_id=p_room_id and user_id=auth.uid();
 if n is null then raise exception 'Join the room first' using errcode='42501'; end if;
 if exists(select 1 from public.focus_messages where user_id=auth.uid() and created_at>now()-interval '3 seconds') then raise exception 'Please wait before sending again'; end if;
 insert into public.focus_messages(room_id,user_id,display_name,content) values(p_room_id,auth.uid(),n,btrim(p_content));
end $$;
revoke all on function public.join_focus_room(text,text),public.start_room_phase(uuid,integer,text),public.finish_room_focus(uuid,uuid),public.send_room_message(uuid,text) from public,anon;
grant execute on function public.join_focus_room(text,text),public.start_room_phase(uuid,integer,text),public.finish_room_focus(uuid,uuid),public.send_room_message(uuid,text) to authenticated;
create function public.leave_focus_room(p_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if exists(select 1 from public.focus_rooms where id=p_id and owner_id=auth.uid()) then raise exception 'The host must delete the room instead';end if;
 delete from public.focus_room_members where room_id=p_id and user_id=auth.uid();
end $$;
revoke all on function public.leave_focus_room(uuid) from public,anon;grant execute on function public.leave_focus_room(uuid) to authenticated;

-- Credits can only be written by validated session RPCs, never by browser table writes.
create function private.focus_events(p_user uuid) returns table(completed_at timestamptz,duration_minutes numeric) language sql stable security definer set search_path='' as $$
 select completed_at,duration_minutes from public.task_progress where user_id=p_user
 union all select completed_at,duration_minutes::numeric from public.room_focus_sessions where user_id=p_user
$$;
revoke all on function private.focus_events(uuid) from public,anon,authenticated;
create function private.refresh_productivity(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare tz text; today date; last_day date; longest integer; current_run integer; total_sessions integer; minutes numeric; tasks_done integer; result jsonb;
begin
 select coalesce((select timezone from public.productivity_preferences where user_id=p_user),'Africa/Cairo') into tz;
 today:=(now() at time zone tz)::date;
 with days as(select distinct (completed_at at time zone tz)::date as d from private.focus_events(p_user) where completed_at<=now()),
 groups as(select d,d-(row_number() over(order by d))::integer as g from days),runs as(select max(d) as last,count(*)::integer as n from groups group by g)
 select coalesce(max(n),0),max(last),coalesce(max(n) filter(where last>=today-1),0) into longest,last_day,current_run from runs;
 select count(*)::integer,coalesce(sum(duration_minutes),0) into total_sessions,minutes from private.focus_events(p_user) where completed_at<=now();
 select count(*)::integer into tasks_done from public.tasks where user_id=p_user and type='task' and done;
 insert into public.user_streaks values(p_user,current_run,longest,last_day,now()) on conflict(user_id) do update set current_streak=excluded.current_streak,longest_streak=excluded.longest_streak,last_active_day=excluded.last_active_day,updated_at=excluded.updated_at;
 insert into public.user_achievements(user_id,achievement_id) select p_user,id from public.achievements where threshold<=case metric when 'sessions' then total_sessions when 'minutes' then minutes when 'streak' then longest when 'tasks' then tasks_done end on conflict do nothing;
 result:=jsonb_build_object('current_streak',current_run,'longest_streak',longest,'last_active_day',last_day,'sessions',total_sessions,'minutes',minutes,'tasks',tasks_done,'timezone',tz); return result;
end $$;
revoke all on function private.refresh_productivity(uuid) from public,anon,authenticated;
create function public.refresh_productivity() returns jsonb language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if; return private.refresh_productivity(auth.uid()); end $$;
revoke all on function public.refresh_productivity() from public,anon; grant execute on function public.refresh_productivity() to authenticated;
create function private.focus_credit_added() returns trigger language plpgsql security definer set search_path='' as $$ begin if new.user_id is not null then perform private.refresh_productivity(new.user_id); end if; return new; end $$;
create trigger focus_credit_achievements after insert on public.task_progress for each row execute function private.focus_credit_added();
create trigger room_credit_achievements after insert on public.room_focus_sessions for each row execute function private.focus_credit_added();
create function public.challenge_leaderboard(p_id uuid) returns table(user_id uuid,display_name text,minutes numeric,sessions bigint) language plpgsql stable security definer set search_path='' as $$
begin
 if not private.in_challenge(p_id) then raise exception 'Join the challenge first' using errcode='42501'; end if;
 return query select m.user_id,m.display_name,coalesce(sum(e.duration_minutes),0),count(e.completed_at) from public.challenge_members m join public.challenges c on c.id=m.challenge_id
 left join lateral(select * from private.focus_events(m.user_id) ev where ev.completed_at>=greatest(m.joined_at,c.starts_on::timestamp at time zone 'UTC') and ev.completed_at<((c.ends_on+1)::timestamp at time zone 'UTC') and ev.completed_at<=now()) e on true
 where m.challenge_id=p_id group by m.user_id,m.display_name,m.joined_at order by 3 desc,m.joined_at;
end $$;
revoke all on function public.challenge_leaderboard(uuid) from public,anon; grant execute on function public.challenge_leaderboard(uuid) to authenticated;

create table if not exists public.weekly_reports(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,week_start date not null,report jsonb not null,created_at timestamptz not null default now(),unique(user_id,week_start));
-- Legacy reports may already exist with a different payload column.
alter table public.weekly_reports add column if not exists week_start date;
alter table public.weekly_reports add column if not exists report jsonb not null default '{}';
create unique index if not exists report_user_week_v2 on public.weekly_reports(user_id,week_start);
alter table public.weekly_reports enable row level security;
create policy reports_read_v2 on public.weekly_reports for select to authenticated using(user_id=(select auth.uid()));
grant select on public.weekly_reports to authenticated;
create function private.generate_weekly_report(p_user uuid,p_week_start date default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=p_user; tz text; w date; today date; stats jsonb; best text; summary jsonb;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 summary:=private.refresh_productivity(u); tz:=summary->>'timezone'; today:=(now() at time zone tz)::date;
 w:=coalesce(p_week_start,date_trunc('week',today)::date); w:=date_trunc('week',w)::date;
 if w>today or w<today-730 then raise exception 'Invalid report week'; end if;
 select jsonb_build_object('sessions',count(*),'minutes',coalesce(sum(duration_minutes),0),'active_days',count(distinct(completed_at at time zone tz)::date)) into stats from private.focus_events(u) where completed_at>=w::timestamp at time zone tz and completed_at<(w+7)::timestamp at time zone tz and completed_at<=now();
 select ((completed_at at time zone tz)::date)::text into best from private.focus_events(u) where completed_at>=w::timestamp at time zone tz and completed_at<(w+7)::timestamp at time zone tz and completed_at<=now() group by 1 order by sum(duration_minutes) desc,1 limit 1;
 stats:=stats||jsonb_build_object('week_start',w,'best_day',best,'streak',summary->'current_streak','timezone',tz,'tasks_done',(select count(*) from public.tasks t join public.schedules s on t.schedule_id=s.id where t.user_id=u and t.type='task' and t.done and s.day>=w and s.day<w+7),'tasks_total',(select count(*) from public.tasks t join public.schedules s on t.schedule_id=s.id where t.user_id=u and t.type='task' and s.day>=w and s.day<w+7));
 insert into public.weekly_reports(user_id,week_start,report) values(u,w,stats) on conflict(user_id,week_start) do update set report=excluded.report;
 return stats;
end $$;
revoke all on function private.generate_weekly_report(uuid,date) from public,anon,authenticated;
create function public.generate_weekly_report(p_week_start date default null) returns jsonb language plpgsql security definer set search_path='' as $$ begin if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;return private.generate_weekly_report(auth.uid(),p_week_start);end $$;
revoke all on function public.generate_weekly_report(date) from public,anon; grant execute on function public.generate_weekly_report(date) to authenticated;

create table public.push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,endpoint text not null unique,keys jsonb not null,created_at timestamptz not null default now());
alter table public.push_subscriptions enable row level security;
create policy push_owner on public.push_subscriptions to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.push_subscriptions to authenticated;
create table public.productivity_notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,dedupe_key text not null,title text not null,body text not null,url text not null default '/dashboard',read_at timestamptz,push_sent_at timestamptz,email_sent_at timestamptz,created_at timestamptz not null default now(),unique(user_id,dedupe_key));
alter table public.productivity_notifications add column metadata jsonb not null default '{}';
alter table public.productivity_notifications add column push_status text not null default 'pending';
alter table public.productivity_notifications add column email_status text not null default 'not_requested';
alter table public.productivity_notifications add column attempts integer not null default 0;
alter table public.productivity_notifications add column lease_until timestamptz;
alter table public.productivity_notifications add column last_error text;
create index productivity_notifications_owner on public.productivity_notifications(user_id,created_at desc);
alter table public.productivity_notifications enable row level security;
create policy productivity_notifications_read on public.productivity_notifications for select to authenticated using(user_id=(select auth.uid()));
create policy productivity_notifications_ack on public.productivity_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select on public.productivity_notifications to authenticated;
grant update(read_at) on public.productivity_notifications to authenticated;
create table public.productivity_job_runs(id uuid primary key default gen_random_uuid(),started_at timestamptz not null default now(),finished_at timestamptz,enqueued integer not null default 0,delivered integer not null default 0,failed integer not null default 0);
create table public.productivity_runtime(id boolean primary key default true check(id),vapid_public_key text,push_enabled boolean not null default false,worker_url text,last_dispatch timestamptz);
insert into public.productivity_runtime(id)values(true);
alter table public.productivity_runtime enable row level security;
create policy runtime_read on public.productivity_runtime for select to authenticated using(true);
grant select on public.productivity_runtime to authenticated;
grant all on public.productivity_runtime to service_role;
alter table public.productivity_job_runs enable row level security;
grant all on public.productivity_notifications,public.productivity_job_runs,public.push_subscriptions,public.productivity_preferences,public.weekly_reports to service_role;
create function public.enqueue_productivity_jobs() returns integer language plpgsql security definer set search_path='' as $$
declare p public.productivity_preferences%rowtype; local_now timestamp; today date; n integer; item record; stats jsonb; w date; changes integer:=0; count_insert integer;
begin
 for p in select * from public.productivity_preferences where daily_reminder or session_reminders or prayer_reminders or weekly_email loop
  local_now:=now() at time zone p.timezone;today:=local_now::date;
  if p.daily_reminder and local_now::time>=p.reminder_time then
   select count(*)::integer into n from public.tasks t join public.schedules s on t.schedule_id=s.id where t.user_id=p.user_id and not t.done and s.day<=today;
   if n>0 then insert into public.productivity_notifications(user_id,dedupe_key,title,body,url)values(p.user_id,'daily:'||today,'مراجعة نهاية اليوم','لديك '||n||' مهمة لم تكتمل بعد. راجع خطتك بهدوء.','/dashboard/workspace') on conflict do nothing;get diagnostics count_insert=row_count;changes:=changes+count_insert;end if;
  end if;
  if p.session_reminders then
   for item in select s.id,s.title from public.schedules s where s.user_id=p.user_id and s.day=today and (s.day+s.start_time) between local_now-interval '10 minutes' and local_now+interval '5 minutes' and exists(select 1 from public.tasks t where t.schedule_id=s.id and t.type='task' and not t.done) loop
    insert into public.productivity_notifications(user_id,dedupe_key,title,body,url)values(p.user_id,'schedule:'||item.id,'اقترب موعد جدولك',item.title,'/dashboard/schedule/'||item.id) on conflict do nothing;get diagnostics count_insert=row_count;changes:=changes+count_insert;
   end loop;
  end if;
  if p.prayer_reminders then
   for item in select pr.id,pr.name,pr.schedule_id from public.prayers pr where pr.user_id=p.user_id and pr.day=today and not pr.done and (pr.day+pr.time)>local_now and (pr.day+pr.time)<=local_now+interval '30 minutes' loop
    insert into public.productivity_notifications(user_id,dedupe_key,title,body,url)values(p.user_id,'prayer:'||item.id,'تذكير بالصلاة','اقترب موعد صلاة '||item.name||'. راجع الوقت في جدولك.','/dashboard/schedule/'||item.schedule_id) on conflict do nothing;get diagnostics count_insert=row_count;changes:=changes+count_insert;
   end loop;
  end if;
  if p.weekly_email and extract(isodow from local_now)=1 and local_now::time>='09:00'::time then
   w:=date_trunc('week',today)::date-7;
   if not exists(select 1 from public.productivity_notifications where user_id=p.user_id and dedupe_key='weekly:'||w) then
    stats:=private.generate_weekly_report(p.user_id,w);
    insert into public.productivity_notifications(user_id,dedupe_key,title,body,url,metadata,email_status)values(p.user_id,'weekly:'||w,'تقرير أسبوعك في جَدْوَلِي','اكتملت مراجعة الأسبوع الذي بدأ في '||w||'.','/dashboard/reports',stats,'pending') on conflict do nothing;get diagnostics count_insert=row_count;changes:=changes+count_insert;
   end if;
  end if;
 end loop;return changes;
end $$;
create function public.claim_productivity_deliveries(p_limit integer default 20) returns setof public.productivity_notifications language sql security definer set search_path='' as $$
 with jobs as(select id from public.productivity_notifications where (push_status in ('pending','failed') or email_status in ('pending','failed')) and attempts<5 and (lease_until is null or lease_until<now()) and created_at>now()-interval '7 days' order by created_at limit least(greatest(p_limit,1),20) for update skip locked)
 update public.productivity_notifications n set lease_until=now()+interval '2 minutes',attempts=n.attempts+1 from jobs where n.id=jobs.id returning n.*
$$;
revoke all on function public.enqueue_productivity_jobs(),public.claim_productivity_deliveries(integer) from public,anon,authenticated;
grant execute on function public.enqueue_productivity_jobs(),public.claim_productivity_deliveries(integer) to service_role;

-- Add realtime only if this installation has Supabase's publication.
create function public.create_challenge(p_title text,p_starts_on date,p_ends_on date,p_goal_minutes integer,p_display_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.challenges%rowtype; begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if (select count(*) from public.challenges where owner_id=auth.uid() and ends_on>=current_date)>=20 then raise exception 'Active challenge limit reached'; end if;
 insert into public.challenges(owner_id,title,starts_on,ends_on,goal_minutes) values(auth.uid(),btrim(p_title),p_starts_on,p_ends_on,p_goal_minutes) returning * into c;
 perform public.join_challenge(c.join_code,p_display_name); return c.id;
end $$;
create function public.create_focus_room(p_title text,p_display_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.focus_rooms%rowtype; begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if (select count(*) from public.focus_rooms where owner_id=auth.uid())>=20 then raise exception 'Room limit reached'; end if;
 insert into public.focus_rooms(owner_id,title) values(auth.uid(),btrim(p_title)) returning * into r;
 perform public.join_focus_room(r.join_code,p_display_name); return r.id;
end $$;
revoke all on function public.create_challenge(text,date,date,integer,text),public.create_focus_room(text,text) from public,anon;
grant execute on function public.create_challenge(text,date,date,integer,text),public.create_focus_room(text,text) to authenticated;
create table private.note_requests(user_id uuid references auth.users(id) on delete cascade,request_id uuid,result jsonb not null,primary key(user_id,request_id));
create function public.save_note(p_note jsonb,p_expected_version integer,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); n public.notes%rowtype; cached jsonb; begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_request_id is null or jsonb_typeof(p_note) is distinct from 'object' then raise exception 'Invalid note request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||p_request_id::text,0));
 select result into cached from private.note_requests where user_id=u and request_id=p_request_id; if found then return cached; end if;
 if p_expected_version=0 then
  insert into public.notes(id,user_id,title,content,color,pinned,project_id,schedule_id) values((p_note->>'id')::uuid,u,coalesce(p_note->>'title',''),coalesce(p_note->>'content',''),coalesce(p_note->>'color','gold'),coalesce((p_note->>'pinned')::boolean,false),nullif(p_note->>'project_id','')::uuid,nullif(p_note->>'schedule_id','')::uuid) returning * into n;
 else
  update public.notes set title=coalesce(p_note->>'title',''),content=coalesce(p_note->>'content',''),color=coalesce(p_note->>'color','gold'),pinned=coalesce((p_note->>'pinned')::boolean,false),project_id=nullif(p_note->>'project_id','')::uuid,schedule_id=nullif(p_note->>'schedule_id','')::uuid
  where id=(p_note->>'id')::uuid and user_id=u and version=p_expected_version returning * into n;
  if not found then raise exception 'Note changed on another device' using errcode='40001'; end if;
 end if;
 cached:=jsonb_build_object('id',n.id,'version',n.version);insert into private.note_requests values(u,p_request_id,cached);return cached;
end $$;
revoke all on function public.save_note(jsonb,integer,uuid) from public,anon;grant execute on function public.save_note(jsonb,integer,uuid) to authenticated;
create function public.delete_note(p_id uuid,p_expected_version integer,p_request_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb; removed uuid; begin
 if u is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Missing request id';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||p_request_id::text,0));
 select r.result into result from private.note_requests r where user_id=u and request_id=p_request_id;if found then return true;end if;
 delete from public.notes where id=p_id and user_id=u and version=p_expected_version returning id into removed;
 if not found then raise exception 'Note changed on another device' using errcode='40001';end if;
 insert into private.note_requests values(u,p_request_id,jsonb_build_object('id',removed,'deleted',true));return true;
end $$;
revoke all on function public.delete_note(uuid,integer,uuid) from public,anon;grant execute on function public.delete_note(uuid,integer,uuid) to authenticated;
create function public.scheduler_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare internal_active boolean:=false;external_active boolean:=false;begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if to_regclass('cron.job') is not null then execute 'select coalesce(bool_or(active) filter(where jobname=''jadwali-v2-inapp''),false),coalesce(bool_or(active) filter(where jobname=''jadwali-v2-dispatch''),false) from cron.job' into internal_active,external_active;end if;
 return jsonb_build_object('inapp',internal_active,'dispatch',external_active);
end $$;
revoke all on function public.scheduler_status() from public,anon;grant execute on function public.scheduler_status() to authenticated;

-- Supabase projects may grant ALL through default privileges. Replace those grants
-- explicitly so acknowledgement policies cannot update award IDs or delivery state.
revoke all on public.productivity_preferences,public.achievements,public.user_achievements,public.user_streaks,public.templates,public.challenges,public.challenge_members,public.focus_rooms,public.focus_room_members,public.focus_room_phases,public.room_focus_sessions,public.focus_messages,public.weekly_reports,public.push_subscriptions,public.productivity_notifications,public.productivity_job_runs,public.productivity_runtime from anon,authenticated;
grant select on public.achievements,public.user_achievements,public.user_streaks,public.templates,public.challenge_members,public.focus_room_members,public.focus_room_phases,public.room_focus_sessions,public.focus_messages,public.weekly_reports,public.productivity_notifications,public.productivity_runtime to authenticated;
grant update(celebrated_at) on public.user_achievements to authenticated;
grant update(read_at) on public.productivity_notifications to authenticated;
grant select,insert,update on public.productivity_preferences to authenticated;
grant select,insert,delete on public.challenges,public.focus_rooms to authenticated;
grant delete on public.challenge_members to authenticated;
grant select,insert,update,delete on public.push_subscriptions to authenticated;
revoke all on public.notes from anon;
do $$ declare t text; begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then foreach t in array array['challenge_members','task_progress','focus_rooms','focus_room_members','focus_messages','room_focus_sessions','productivity_notifications'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
 end loop; end if; end $$;
commit;
