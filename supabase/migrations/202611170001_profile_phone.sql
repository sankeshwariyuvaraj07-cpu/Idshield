alter table public.profiles
  add column if not exists phone text,
  add constraint profiles_phone_e164_check
    check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');

create or replace function public.create_member_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_app_meta_data ->> 'provider' = 'email'
        then nullif(new.raw_user_meta_data ->> 'phone', '')
      else null
    end
  );
  return new;
end;
$$;
