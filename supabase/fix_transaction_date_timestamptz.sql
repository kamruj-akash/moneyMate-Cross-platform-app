-- Transaction `date` was a Postgres `date` column, which strips the
-- time-of-day on round-trip. The mobile app sends full ISO timestamps and
-- displays the clock time in TransactionRow, so refreshing made every row
-- show 12:00 AM. Promote the column to `timestamptz` so the time survives.
--
-- Apply once in the Supabase SQL editor. Re-running is safe: the IS NOT NULL
-- check prevents converting an already-timestamptz column.

do $$
declare
  col_type text;
begin
  select data_type
    into col_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'transactions'
     and column_name  = 'date';

  if col_type is not null and col_type <> 'timestamp with time zone' then
    execute 'alter table public.transactions
               alter column date type timestamptz
               using date::timestamptz';
  end if;
end
$$;

-- Same treatment for recurring start/next dates so recurring rows don't
-- regress to midnight after a sync.
do $$
declare
  c1 text; c2 text;
begin
  select data_type into c1
    from information_schema.columns
   where table_schema = 'public' and table_name = 'recurring_transactions' and column_name = 'start_date';
  select data_type into c2
    from information_schema.columns
   where table_schema = 'public' and table_name = 'recurring_transactions' and column_name = 'next_due_date';

  if c1 is not null and c1 <> 'timestamp with time zone' then
    execute 'alter table public.recurring_transactions
               alter column start_date type timestamptz
               using start_date::timestamptz';
  end if;

  if c2 is not null and c2 <> 'timestamp with time zone' then
    execute 'alter table public.recurring_transactions
               alter column next_due_date type timestamptz
               using next_due_date::timestamptz';
  end if;
end
$$;
