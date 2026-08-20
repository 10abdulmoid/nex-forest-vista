alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists district text;
alter table public.profiles add column if not exists name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_key'
  ) then
    begin
      alter table public.profiles add constraint profiles_username_key unique (username);
    exception when others then
      null;
    end;
  end if;
end $$;

notify pgrst, 'reload schema';
