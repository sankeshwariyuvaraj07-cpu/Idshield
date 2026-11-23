alter table public.profiles
  add column if not exists transit_conductor boolean not null default false;
