create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  avatar_url text,
  is_online boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Auto-provision a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
begin
  begin
    insert into public.profiles (id, username) values (new.id, base_username);
  exception when unique_violation then
    insert into public.profiles (id, username) values (new.id, base_username || '_' || substr(new.id::text, 1, 6));
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
