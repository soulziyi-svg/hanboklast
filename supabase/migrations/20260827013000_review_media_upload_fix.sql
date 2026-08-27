-- 회원 후기 이미지·영상 저장소와 접근 권한을 안정적으로 구성합니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-images',
  'review-images',
  true,
  20971520,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read review-images" on storage.objects;
drop policy if exists "Users upload review-images" on storage.objects;
drop policy if exists "Users delete own review-images" on storage.objects;

create policy "Public read review-images" on storage.objects
for select using (bucket_id = 'review-images');

create policy "Users upload review-images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'review-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users delete own review-images" on storage.objects
for delete to authenticated
using (
  bucket_id = 'review-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
