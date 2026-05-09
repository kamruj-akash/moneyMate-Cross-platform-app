-- Per-profile mode: 'salary' for the full income+expense+budget view, or
-- 'expense_only' for users who just want to track what they spend each
-- month (no income tracking, no net balance).
--
-- Existing profiles default to 'salary' so behaviour is unchanged for
-- everyone until they explicitly opt into the new mode.
--
-- Re-running is safe — guarded with `if not exists` and an idempotent
-- check constraint.

alter table public.profiles
  add column if not exists mode text not null default 'salary';

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'profiles_mode_check'
       and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_mode_check
      check (mode in ('salary', 'expense_only'));
  end if;
end
$$;
