-- Keep only the last 3 days of sign-in history.
delete from public.login_activity
where logged_in_at < (now() - interval '3 days');

create or replace function public.prune_login_activity_older_than_3_days()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.login_activity
  where logged_in_at < (now() - interval '3 days');
end;
$$;

revoke all on function public.prune_login_activity_older_than_3_days() from public;
grant execute on function public.prune_login_activity_older_than_3_days() to authenticated;

create or replace function public.prune_old_login_activity_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.login_activity
  where logged_in_at < (now() - interval '3 days');
  return null;
end;
$$;

drop trigger if exists login_activity_prune_after_insert on public.login_activity;
create trigger login_activity_prune_after_insert
after insert on public.login_activity
for each statement
execute function public.prune_old_login_activity_trigger();

notify pgrst, 'reload schema';
