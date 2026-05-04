-- Allow a signed-in user to delete their own auth account.
--
-- The anon key used by the mobile client cannot touch auth.users, so we expose
-- a SECURITY DEFINER RPC that runs as the function owner (postgres) and only
-- targets the row matching auth.uid(). Apps call it via:
--   await supabase.rpc('delete_user')
--
-- Apply this once in the Supabase SQL editor. Re-running is safe.

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
