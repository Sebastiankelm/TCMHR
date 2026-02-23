-- Tabela pracowników (osoby przypisane do stanowisk) – opisy, notatki, dane kontaktowe
-- Odpowiada rozszerzeniu modelu o "pracowników z opisami" ze struktury organizacyjnej
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  position_id text not null references public.positions(id) on delete restrict,
  first_name text not null default '',
  last_name text not null default '',
  email text default '',
  phone text default '',
  description text default '',
  notes text default '',
  employment_start date default current_date,
  employment_end date default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employees_position on public.employees(position_id);
create index if not exists idx_employees_name on public.employees(last_name, first_name);

drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

alter table public.employees enable row level security;
create policy "Allow all for anon" on public.employees for all using (true) with check (true);
