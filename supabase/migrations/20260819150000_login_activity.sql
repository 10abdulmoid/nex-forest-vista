create table if not exists public.login_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  username text not null,
  role text not null,
  district text,
  logged_in_at timestamptz not null default now()
);

create index if not exists login_activity_user_id_idx on public.login_activity (user_id);
create index if not exists login_activity_logged_in_at_idx on public.login_activity (logged_in_at desc);

alter table public.login_activity enable row level security;

drop policy if exists "login_activity_insert_own" on public.login_activity;
create policy "login_activity_insert_own"
on public.login_activity for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "login_activity_select_own_or_gm" on public.login_activity;
create policy "login_activity_select_own_or_gm"
on public.login_activity for select
to authenticated
using (user_id = auth.uid() or public.is_gm());

grant select, insert on public.login_activity to authenticated;

notify pgrst, 'reload schema';
