create table if not exists public.spreadsheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  username text,
  district text,
  columns jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists spreadsheets_district_idx on public.spreadsheets (district);

alter table public.spreadsheets enable row level security;

drop policy if exists "spreadsheets_select_own_or_gm" on public.spreadsheets;
create policy "spreadsheets_select_own_or_gm"
on public.spreadsheets for select
to authenticated
using (user_id = auth.uid() or public.is_gm());

drop policy if exists "spreadsheets_insert_own" on public.spreadsheets;
create policy "spreadsheets_insert_own"
on public.spreadsheets for insert
to authenticated
with check (user_id = auth.uid() and not public.is_gm());

drop policy if exists "spreadsheets_update_own" on public.spreadsheets;
create policy "spreadsheets_update_own"
on public.spreadsheets for update
to authenticated
using (user_id = auth.uid() and not public.is_gm())
with check (user_id = auth.uid() and not public.is_gm());

grant select, insert, update on public.spreadsheets to authenticated;

notify pgrst, 'reload schema';
