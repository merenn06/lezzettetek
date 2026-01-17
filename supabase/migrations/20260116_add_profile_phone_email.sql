alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text;

-- Backfill from auth.users when available
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null and u.email is not null;

update public.profiles p
set phone = u.phone
from auth.users u
where p.id = u.id and p.phone is null and u.phone is not null;

create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

create unique index if not exists profiles_phone_unique
  on public.profiles (phone)
  where phone is not null;

alter table public.profiles
  drop constraint if exists profiles_email_or_phone_check;

alter table public.profiles
  add constraint profiles_email_or_phone_check
  check (email is not null or phone is not null);
