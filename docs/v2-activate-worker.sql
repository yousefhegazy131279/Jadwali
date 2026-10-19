-- Run after the approved worker is deployed, its secrets are configured, and
-- Vault contains the dedicated jadwali_cron_secret. No credential belongs here.
update public.productivity_runtime
set worker_url='https://aoaacxylmuzkdgwaufmc.supabase.co/functions/v1/dispatch-reminders'
where id=true;
select private.run_productivity_schedule();
select private.dispatch_productivity_worker();
select push_enabled,last_dispatch from public.productivity_runtime where id=true;
