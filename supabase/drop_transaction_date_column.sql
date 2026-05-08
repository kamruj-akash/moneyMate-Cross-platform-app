-- Retire the redundant `date` column from public.transactions.
--
-- The app used to keep both `date` (user-pickable, when the spend happened)
-- and `created_at` (audit, when the row was inserted). Going forward we
-- collapse those into `created_at` alone — the date picker writes through
-- to created_at, so back-dating still works without the duplicate column.
--
-- Order of operations matters: we backfill first so any user-picked dates
-- that ended up in `date` (and which may differ from the auto-set
-- created_at) survive the column drop. Then we relax the NOT NULL on
-- `date` (in case it was constrained) and finally drop it. Each step is
-- guarded with `if exists` so re-running is safe.
--
-- IMPORTANT: deploy the new app build (which stops sending `date`) BEFORE
-- running this migration. Old app versions in users' hands will start
-- failing inserts/upserts once the column is gone.

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'transactions'
       and column_name  = 'date'
  ) then
    -- Preserve any user-picked timestamps that were stored in `date` but
    -- never propagated to `created_at`.
    update public.transactions
       set created_at = date
     where date is not null
       and (created_at is null or created_at <> date);

    -- If a NOT NULL constraint exists on date, lift it before dropping
    -- (drop column ignores nullability, but being explicit avoids surprises
    -- if a check constraint references it).
    execute 'alter table public.transactions alter column date drop not null';

    execute 'alter table public.transactions drop column date';
  end if;
end
$$;
