-- Diagnostyka RLS i uprawnień (uruchom w Supabase → SQL Editor)
-- Sprawdza: czy RLS jest włączone, jakie są polityki, czy anon ma granty.

-- 1) RLS i liczba polityk na tabelach
select
  c.relname as tabela,
  c.relrowsecurity as rls_wlaczone,
  (select count(*) from pg_policies p where p.tablename = c.relname and p.schemaname = 'public') as liczba_polityk
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('positions', 'raci_matrix');

-- 2) Lista polityk dla positions i raci_matrix
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('positions', 'raci_matrix');

-- 3) Granty dla roli anon na te tabele
select
  grantee,
  table_schema,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as uprawnienia
from information_schema.table_privileges
where grantee = 'anon'
  and table_schema = 'public'
  and table_name in ('positions', 'raci_matrix')
group by grantee, table_schema, table_name;

-- 4) Liczba wierszy (czy w ogóle są dane)
select 'positions' as tabela, count(*) as wiersze from public.positions
union all
select 'raci_matrix', count(*) from public.raci_matrix;
