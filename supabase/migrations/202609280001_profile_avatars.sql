-- Profile photos are private and visible to their owner and members of shared schedules.
-- Each signed-in user can write only inside their own UUID folder.
begin;

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Owners and schedule members view avatars') then
    create policy "Owners and schedule members view avatars" on storage.objects for select to authenticated
      using (bucket_id='avatars' and (
        (storage.foldername(name))[1]=auth.uid()::text or exists (
          select 1 from public.schedule_members avatar_member
          join public.schedule_members viewer_member on viewer_member.schedule_id=avatar_member.schedule_id
          where avatar_member.user_id::text=(storage.foldername(name))[1]
            and viewer_member.user_id=auth.uid()
        ) or public.jadwali_admin()
      ));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users upload their own avatar') then
    create policy "Users upload their own avatar" on storage.objects for insert to authenticated
      with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users update their own avatar') then
    create policy "Users update their own avatar" on storage.objects for update to authenticated
      using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text)
      with check (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users delete their own avatar') then
    create policy "Users delete their own avatar" on storage.objects for delete to authenticated
      using (bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text);
  end if;
end $$;

commit;
