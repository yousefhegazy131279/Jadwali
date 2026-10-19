-- Hosted Supabase platform integration; no subscriber is opted in by this migration.
begin;
alter table private.template_requests enable row level security;
alter table private.note_requests enable row level security;
revoke all on private.template_requests,private.note_requests from public,anon,authenticated;
create function public.room_leaderboard(p_id uuid) returns table(user_id uuid,display_name text,minutes bigint) language plpgsql stable security definer set search_path='' as $$ begin
 if not private.in_focus_room(p_id) then raise exception 'Join the room first' using errcode='42501';end if;
 return query select m.user_id,m.display_name,coalesce(sum(s.duration_minutes),0)::bigint from public.focus_room_members m left join public.room_focus_sessions s on s.room_id=m.room_id and s.user_id=m.user_id where m.room_id=p_id group by m.user_id,m.display_name order by coalesce(sum(s.duration_minutes),0) desc,m.display_name;
end $$;
revoke all on function public.room_leaderboard(uuid) from public,anon;grant execute on function public.room_leaderboard(uuid) to authenticated;
-- Hosted extensions and scheduled transport are verified on Supabase, not PGlite.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create function private.run_productivity_schedule() returns void language plpgsql security definer set search_path='' as $$
declare run_id uuid; n integer; begin
 insert into public.productivity_job_runs default values returning id into run_id;
 n:=public.enqueue_productivity_jobs();
 update public.productivity_job_runs set finished_at=now(),enqueued=n where id=run_id;
end $$;
revoke all on function private.run_productivity_schedule() from public,anon,authenticated;
create function private.dispatch_productivity_worker() returns void language plpgsql security definer set search_path='' as $$
declare secret text; worker text; begin
 select decrypted_secret into secret from vault.decrypted_secrets where name='jadwali_cron_secret' limit 1;
 select worker_url into worker from public.productivity_runtime where id;
 if secret is null or length(secret)<32 or worker is distinct from 'https://aoaacxylmuzkdgwaufmc.supabase.co/functions/v1/dispatch-reminders' then return;end if;
 perform net.http_post(url=>worker,headers=>jsonb_build_object('Content-Type','application/json','x-jadwali-cron-secret',secret),body=>'{}'::jsonb,timeout_milliseconds=>60000);
end $$;
revoke all on function private.dispatch_productivity_worker() from public,anon,authenticated;
select cron.schedule('jadwali-v2-inapp','*/5 * * * *','select private.run_productivity_schedule();');
select cron.schedule('jadwali-v2-dispatch','*/5 * * * *','select private.dispatch_productivity_worker();');
commit;
