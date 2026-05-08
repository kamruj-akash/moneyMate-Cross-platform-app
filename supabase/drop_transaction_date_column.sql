
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'transactions'
       and column_name  = 'date'
  ) then
  
    update public.transactions
       set created_at = date
     where date is not null
       and (created_at is null or created_at <> date);

    execute 'alter table public.transactions alter column date drop not null';

    execute 'alter table public.transactions drop column date';
  end if;
end
$$;
