do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'entries' and column_name = 'dm_name'
  ) then
    execute 'alter table public.entries alter column dm_name drop not null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'entries' and column_name = 'range'
  ) then
    execute 'alter table public.entries alter column range drop not null';
  end if;
end $$;

grant execute on function public.is_gm() to authenticated;

notify pgrst, 'reload schema';
