-- Create product_reviews table
drop table if exists public.product_reviews cascade;

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int2 not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 10 and 1000),
  created_at timestamptz not null default now()
);

-- Index for efficient queries
create index idx_product_reviews_product_created on public.product_reviews (product_id, created_at desc);

-- Unique constraint: aynı kullanıcı aynı ürüne 1 yorum
create unique index idx_product_reviews_unique_user_product on public.product_reviews (product_id, user_id);

-- Enable RLS
alter table public.product_reviews enable row level security;

-- RLS Policies

-- SELECT: Herkes okuyabilsin (anon dahil)
drop policy if exists "Anyone can view reviews" on public.product_reviews;
create policy "Anyone can view reviews"
  on public.product_reviews
  for select
  to public
  using (true);

-- INSERT: Sadece auth olan kullanıcı kendi user_id'si ile ekleyebilsin
drop policy if exists "Authenticated users can insert own reviews" on public.product_reviews;
create policy "Authenticated users can insert own reviews"
  on public.product_reviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: Kullanıcı sadece kendi yorumunu güncelleyebilsin
drop policy if exists "Users can update own reviews" on public.product_reviews;
create policy "Users can update own reviews"
  on public.product_reviews
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: Kullanıcı sadece kendi yorumunu silebilsin
drop policy if exists "Users can delete own reviews" on public.product_reviews;
create policy "Users can delete own reviews"
  on public.product_reviews
  for delete
  to authenticated
  using (auth.uid() = user_id);
