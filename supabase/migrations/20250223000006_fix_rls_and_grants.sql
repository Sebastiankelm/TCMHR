-- Naprawa RLS i uprawnień dla anon (aplikacja Next.js z ANON KEY)
-- Uruchom w Supabase: SQL Editor → wklej i Run.

-- 1) Granty na schemat i tabele (anon musi mieć prawo do SELECT/INSERT/UPDATE/DELETE)
grant usage on schema public to anon;
grant select, insert, update, delete on public.positions to anon;
grant select, insert, update, delete on public.raci_matrix to anon;

-- 2) RLS włączone (jeśli wyłączone – włącz)
alter table public.positions enable row level security;
alter table public.raci_matrix enable row level security;

-- 3) Usuń stare polityki (żeby uniknąć konfliktów nazw)
drop policy if exists "Allow all for anon" on public.positions;
drop policy if exists "Allow all for anon" on public.raci_matrix;

-- 4) Polityki zezwalające anon na wszystko (odczyt i zapis)
create policy "Allow all for anon"
  on public.positions
  for all
  to anon
  using (true)
  with check (true);

create policy "Allow all for anon"
  on public.raci_matrix
  for all
  to anon
  using (true)
  with check (true);

-- 5) Opcjonalnie: weryfikacja (odkomentuj i uruchom osobno, żeby zobaczyć stan)
/*
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policies p where p.tablename = c.relname and p.schemaname = 'public') as policies_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('positions', 'raci_matrix');
*/
