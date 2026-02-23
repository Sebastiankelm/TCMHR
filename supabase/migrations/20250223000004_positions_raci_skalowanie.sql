-- Rozszerzenie tabeli positions o pola z pełnego modelu (raci per stanowisko, skalowanie)
alter table public.positions
  add column if not exists raci jsonb default '{}'::jsonb,
  add column if not exists skalowanie text default '';

comment on column public.positions.raci is 'Odpowiedzialność RACI per rola (CEO, DS, DP, DF, HR)';
comment on column public.positions.skalowanie is 'Wytyczne skalowania stanowiska (np. 1 na X pracowników)';
