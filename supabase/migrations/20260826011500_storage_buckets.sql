-- Storage buckets: product-images, review-images, site-media (all public-read, admin/owner write)
insert into storage.buckets (id, name, public) values
  ('product-images','product-images', true),
  ('review-images','review-images', true),
  ('site-media','site-media', true)
on conflict (id) do nothing;

create policy "Public read product-images" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "Admin write product-images" on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admin update product-images" on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());
create policy "Admin delete product-images" on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

create policy "Public read review-images" on storage.objects for select
  using (bucket_id = 'review-images');
create policy "Users upload review-images" on storage.objects for insert
  with check (bucket_id = 'review-images' and auth.role() = 'authenticated');
create policy "Admin update review-images" on storage.objects for update
  using (bucket_id = 'review-images' and public.is_admin());
create policy "Admin delete review-images" on storage.objects for delete
  using (bucket_id = 'review-images' and public.is_admin());

create policy "Public read site-media" on storage.objects for select
  using (bucket_id = 'site-media');
create policy "Admin write site-media" on storage.objects for insert
  with check (bucket_id = 'site-media' and public.is_admin());
create policy "Admin update site-media" on storage.objects for update
  using (bucket_id = 'site-media' and public.is_admin());
create policy "Admin delete site-media" on storage.objects for delete
  using (bucket_id = 'site-media' and public.is_admin());
