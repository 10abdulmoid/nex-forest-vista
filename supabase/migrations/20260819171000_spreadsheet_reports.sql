alter table public.spreadsheets drop constraint if exists spreadsheets_user_id_key;

alter table public.spreadsheets
  add column if not exists title text not null default 'Plantation report',
  add column if not exists status text not null default 'submitted',
  add column if not exists created_at timestamptz not null default now();

alter table public.spreadsheets
  drop constraint if exists spreadsheets_status_check;
alter table public.spreadsheets
  add constraint spreadsheets_status_check check (status in ('draft', 'submitted'));

create index if not exists spreadsheets_user_id_idx on public.spreadsheets (user_id);
create index if not exists spreadsheets_status_idx on public.spreadsheets (status);

drop policy if exists "spreadsheets_delete_own" on public.spreadsheets;
create policy "spreadsheets_delete_own"
on public.spreadsheets for delete
to authenticated
using (user_id = auth.uid() and not public.is_gm());

grant delete on public.spreadsheets to authenticated;

notify pgrst, 'reload schema';
