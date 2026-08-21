-- CineWrapped feature storage.
-- Objects are always stored under <auth.uid()>/... .

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'journal-attachments',
    'journal-attachments',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
  ),
  (
    'scene-identification',
    'scene-identification',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'data-exports',
    'data-exports',
    false,
    104857600,
    array['application/json', 'application/zip']
  ),
  (
    'data-imports',
    'data-imports',
    false,
    104857600,
    array['text/csv', 'application/json', 'application/zip']
  ),
  (
    'club-covers',
    'club-covers',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cinewrapped avatars select own" on storage.objects;
drop policy if exists "cinewrapped avatars insert own" on storage.objects;
drop policy if exists "cinewrapped avatars update own" on storage.objects;
drop policy if exists "cinewrapped avatars delete own" on storage.objects;

create policy "cinewrapped avatars select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "cinewrapped avatars insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "cinewrapped avatars update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "cinewrapped avatars delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "cinewrapped private objects select own" on storage.objects;
drop policy if exists "cinewrapped private objects insert own" on storage.objects;
drop policy if exists "cinewrapped private objects update own" on storage.objects;
drop policy if exists "cinewrapped private objects delete own" on storage.objects;

create policy "cinewrapped private objects select own"
on storage.objects for select to authenticated
using (
  bucket_id in (
    'journal-attachments',
    'scene-identification',
    'data-exports',
    'data-imports',
    'club-covers'
  )
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "cinewrapped private objects insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id in (
    'journal-attachments',
    'scene-identification',
    'data-exports',
    'data-imports',
    'club-covers'
  )
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "cinewrapped private objects update own"
on storage.objects for update to authenticated
using (
  bucket_id in (
    'journal-attachments',
    'scene-identification',
    'data-exports',
    'data-imports',
    'club-covers'
  )
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id in (
    'journal-attachments',
    'scene-identification',
    'data-exports',
    'data-imports',
    'club-covers'
  )
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "cinewrapped private objects delete own"
on storage.objects for delete to authenticated
using (
  bucket_id in (
    'journal-attachments',
    'scene-identification',
    'data-exports',
    'data-imports',
    'club-covers'
  )
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
