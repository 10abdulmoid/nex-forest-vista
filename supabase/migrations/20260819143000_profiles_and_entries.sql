-- Profiles for TGFDC portal roles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  role text not null check (role in ('dm', 'gm')),
  district text,
  name text
);

-- Plantation register
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  district text,
  rotation integer not null default 1,
  area numeric not null default 0,
  maintenance_year text not null default '2025-26',
  range_name text not null default '—',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Align an older Express-era entries table if present
alter table public.entries add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.entries add column if not exists district text;
alter table public.entries add column if not exists rotation integer;
alter table public.entries add column if not exists area numeric;
alter table public.entries add column if not exists maintenance_year text;
alter table public.entries add column if not exists range_name text;
alter table public.entries add column if not exists created_at timestamptz default now();
alter table public.entries add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'entries' and column_name = 'range'
  ) then
    update public.entries
    set range_name = coalesce(nullif(range_name, '—'), range, '—')
    where range_name is null or range_name = '—';
  end if;
end $$;

create or replace function public.is_gm()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'gm'
  );
$$;

create or replace function public.set_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
before update on public.entries
for each row execute function public.set_entries_updated_at();

alter table public.profiles enable row level security;
alter table public.entries enable row level security;

drop policy if exists "profiles_select_own_or_gm" on public.profiles;
create policy "profiles_select_own_or_gm"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_gm());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "entries_select_own_or_gm" on public.entries;
create policy "entries_select_own_or_gm"
on public.entries for select
to authenticated
using (user_id = auth.uid() or public.is_gm());

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own"
on public.entries for insert
to authenticated
with check (user_id = auth.uid() and not public.is_gm());

drop policy if exists "entries_update_own" on public.entries;
create policy "entries_update_own"
on public.entries for update
to authenticated
using (user_id = auth.uid() and not public.is_gm())
with check (user_id = auth.uid() and not public.is_gm());

drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own"
on public.entries for delete
to authenticated
using (user_id = auth.uid() and not public.is_gm());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.entries to authenticated;
grant select, update on public.profiles to authenticated;
