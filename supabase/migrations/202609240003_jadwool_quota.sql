begin;
create table public.jadwool_usage(user_id uuid references auth.users(id) on delete cascade, day date not null default current_date, requests integer not null default 0, primary key(user_id,day));
alter table public.jadwool_usage enable row level security;
create function public.consume_jadwool_request() returns boolean language plpgsql security definer set search_path='' as $$
declare count integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.jadwool_usage as usage(user_id,day,requests) values(auth.uid(),current_date,1)
  on conflict(user_id,day) do update set requests=usage.requests+1 where usage.requests<30
  returning requests into count;
  return count is not null;
end;
$$;
revoke all on function public.consume_jadwool_request() from public,anon;
grant execute on function public.consume_jadwool_request() to authenticated;
commit;
