-- Tabela stanowisk (struktura organizacyjna)
create table if not exists public.positions (
  id text primary key,
  parent_id text references public.positions(id) on delete set null,
  title text not null,
  dept text not null default '',
  level smallint not null default 0,
  type text not null default 'monthly' check (type in ('monthly','hourly','commission','mixed')),
  min_salary numeric,
  max_salary numeric,
  headcount text not null default '1',
  duties jsonb not null default '[]'::jsonb,
  rules text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_positions_parent on public.positions(parent_id);
create index if not exists idx_positions_dept on public.positions(dept);
create index if not exists idx_positions_level on public.positions(level);

-- Trigger aktualizacji updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists positions_updated_at on public.positions;
create trigger positions_updated_at
  before update on public.positions
  for each row execute function public.set_updated_at();

-- Matryca RACI
create table if not exists public.raci_matrix (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null default 0,
  area text not null default '',
  ceo text default '',
  ds text default '',
  dp text default '',
  df text default '',
  hr text default '',
  kp text default '',
  km text default '',
  kam text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_raci_sort on public.raci_matrix(sort_order);

drop trigger if exists raci_matrix_updated_at on public.raci_matrix;
create trigger raci_matrix_updated_at
  before update on public.raci_matrix
  for each row execute function public.set_updated_at();

-- RLS (Row Level Security) – włączamy, domyślnie zezwalamy na odczyt/zapis dla anon (możesz później ograniczyć do auth)
alter table public.positions enable row level security;
alter table public.raci_matrix enable row level security;

create policy "Allow all for anon" on public.positions for all using (true) with check (true);
create policy "Allow all for anon" on public.raci_matrix for all using (true) with check (true);
