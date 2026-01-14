-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS Policies
-- Herkes kendi profilini görebilir
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Herkes sadece kendi profilini insert edebilir
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Herkes sadece kendi profilini update edebilir
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Public read for full_name (for reviews display)
drop policy if exists "Public can view full_name for reviews" on public.profiles;
create policy "Public can view full_name for reviews"
  on public.profiles
  for select
  to public
  using (true);
