create extension if not exists "pgcrypto";

create table if not exists public.email_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  new_products boolean not null default true,
  new_campaigns boolean not null default true,
  enabled boolean not null default true,
  unsubscribe_token text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.email_subscriptions enable row level security;

drop policy if exists "Users can view own email subscription" on public.email_subscriptions;
create policy "Users can view own email subscription"
  on public.email_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own email subscription" on public.email_subscriptions;
create policy "Users can insert own email subscription"
  on public.email_subscriptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own email subscription" on public.email_subscriptions;
create policy "Users can update own email subscription"
  on public.email_subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
