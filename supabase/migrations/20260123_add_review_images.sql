-- Enable image uploads for product reviews
alter table public.product_reviews
add column if not exists image_url text;

-- Create storage bucket for review images (public read)
insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

-- Public read access for review images
drop policy if exists "Public read review images" on storage.objects;
create policy "Public read review images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'review-images');

-- Authenticated users can upload review images
drop policy if exists "Authenticated upload review images" on storage.objects;
create policy "Authenticated upload review images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'review-images');
