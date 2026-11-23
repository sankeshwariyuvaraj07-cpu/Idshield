create extension if not exists pgcrypto;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'member' check (role in ('member', 'institution_admin')),
  institution_id uuid references public.institutions (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  institution_id uuid references public.institutions (id) on delete set null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes between 1 and 8388608),
  sha256 text not null check (sha256 ~ '^[a-fA-F0-9]{64}$'),
  analysis_status text not null default 'uploaded'
    check (analysis_status in ('uploaded', 'complete')),
  analysis_summary jsonb,
  created_at timestamptz not null default now()
);

alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.documents enable row level security;

revoke all on public.institutions, public.profiles, public.documents from anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.documents to authenticated;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users and institution admins can view allowed document records"
  on public.documents for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (
      institution_id is not null
      and exists (
        select 1
        from public.profiles as current_profile
        where current_profile.id = (select auth.uid())
          and current_profile.role = 'institution_admin'
          and current_profile.institution_id = documents.institution_id
      )
    )
  );

create or replace function public.create_member_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_member_profile();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identity-documents',
  'identity-documents',
  false,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read only their own private uploads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
