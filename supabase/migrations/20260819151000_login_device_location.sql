alter table public.login_activity add column if not exists latitude double precision;
alter table public.login_activity add column if not exists longitude double precision;
alter table public.login_activity add column if not exists device_location text;
alter table public.login_activity add column if not exists user_agent text;

notify pgrst, 'reload schema';
