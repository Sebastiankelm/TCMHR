-- Seed: stanowiska — kwoty w NETTO (brutto liczone w aplikacji ze stawek kosztów pracodawcy)
-- Konwersja z oryginalnych brutto: netto ≈ brutto / 1.43
insert into public.positions (id, parent_id, title, dept, level, type, min_salary, max_salary, headcount, duties, rules) values
('ceo', null, 'Prezes / Właściciel', 'Zarząd', 0, 'monthly', 10490, 20979, '1',
 '["Strategia i wizja firmy","Zatwierdzanie budżetów i kluczowych inwestycji","Nadzór nad dyrektorami","Reprezentacja spółki","Decyzje o zatrudnieniu kadry zarządzającej","Ostateczna decyzja ws. polityki cenowej","Negocjacje strategiczne"]'::jsonb,
 'Wynagrodzenie właścicielskie — opcjonalnie dywidenda + kontrakt managerski.'),

('dir_sales', 'ceo', 'Dyrektor Sprzedaży', 'Sprzedaż', 1, 'mixed', 5594, 11189, '1',
 '["Odpowiedzialność za przychód i marżę brutto","Budowa i realizacja strategii sprzedaży","Polityka cenowa i rabatowa","Zarządzanie KAM/Handlowcami","Prognozy sprzedaży","Udział w kluczowych negocjacjach","Koordynacja z produkcją","Budowa standardów CRM"]'::jsonb,
 'Podstawa + premia kwartalna za realizację planu.'),

('dir_prod', 'ceo', 'Kierownik Produkcji', 'Produkcja', 1, 'mixed', 4196, 6993, '1',
 '["Planowanie i nadzór nad produkcją","Zarządzanie harmonogramami i priorytetami","Nadzór nad jakością i technologią druku","Zarządzanie zespołem","Kontrola kosztów produkcji","Raportowanie do zarządu"]'::jsonb,
 'Podstawa + premia miesięczna za OEE/terminowość.'),

('dir_office', 'ceo', 'Dyrektor Biura', 'Biuro', 1, 'monthly', 4196, 6993, '1',
 '["Nadzór nad back-office (admin/HR/kadry)","Planowanie i kontrola kosztów stałych","Kontrola obiegu dokumentów","Zarządzanie fakturowaniem i windykacją","Raporty dla zarządu"]'::jsonb,
 'Stałe wynagrodzenie + premia roczna (KPI: DSO, koszty stałe, terminowość).'),

('mgr_warehouse', 'ceo', 'Kierownik Magazynu', 'Magazyn', 2, 'monthly', 3846, 5245, '1',
 '["Nadzór nad stanami magazynowymi","Organizacja pracy magazynierów","Kontrola przyjęć i wydań","Optymalizacja przestrzeni","Raportowanie stanów"]'::jsonb,
 'Stałe + premia kwartalna za dokładność i terminowość.'),

('mistrz', 'dir_prod', 'Mistrz / Osoba odpowiedzialna', 'Produkcja', 2, 'mixed', 3846, 5594, '2',
 '["Nadzór na zmianie","Decyzje jakościowe","Szkolenie nowych","Bezpieczeństwo / pierwsza pomoc","Eskalacje awarii"]'::jsonb,
 'Podstawa + dodatki zmianowe / odpowiedzialności.'),

('kam', 'dir_sales', 'KAM / Handlowiec B2B', 'Sprzedaż', 3, 'commission', 2098, 20979, '6',
 '["Aktywna sprzedaż","Rozwój relacji","Pozyskiwanie klientów","Negocjacje w widełkach","Pipeline CRM","Przygotowanie ofert"]'::jsonb,
 'Podstawa + prowizja od zrealizowanej sprzedaży.'),

('esklep', 'dir_sales', 'Specjalista e-Sklep / KAM e-commerce', 'Sprzedaż', 3, 'commission', 2441, 4895, '4',
 '["Obsługa kanału e-commerce","Zamówienia online","Kontakt z klientami","Monitorowanie cen/asortymentu","Raportowanie"]'::jsonb,
 'Podstawa + prowizja od sprzedaży e-sklep.'),

('asystent_handl', 'dir_sales', 'Asystent Działu Handlowego', 'Sprzedaż', 4, 'monthly', 2448, 3497, '1–2',
 '["Wprowadzanie zamówień","Wsparcie dokumentów","Wsparcie raportów","Kontrola danych","Wsparcie reklamacji"]'::jsonb,
 'Stałe + premia kwartalna za jakość danych i terminowość.'),

('drukarz', 'dir_prod', 'Drukarz / Operator maszyny', 'Produkcja', 4, 'mixed', 2797, 8392, '20',
 '["Obsługa maszyny","Setup","Kontrola jakości nadruku","Dokumentacja produkcyjna","BHP"]'::jsonb,
 'Akord / stawki + premie uznaniowe.'),

('uczen_druk', 'drukarz', 'Uczeń / Pomocnik drukarza', 'Produkcja', 5, 'hourly', 2028, 3357, '2–4',
 '["Pomoc drukarzowi","Przygotowanie stanowiska","Utrzymanie czystości","Nauka obsługi"]'::jsonb,
 'Stawka godzinowa + ścieżka awansu.'),

('mechanik', 'dir_prod', 'Mechanik Utrzymania Ruchu', 'Produkcja', 3, 'mixed', 3846, 5944, '1',
 '["Awarie","Przeglądy","Części zamienne","Wsparcie techniczne","Szkolenie operatorów"]'::jsonb,
 'Stałe + premie za MTTR / dyżury.'),

('fakturzysta', 'dir_office', 'Fakturzystka / Asystent Fakturowania', 'Biuro', 5, 'monthly', 2238, 3497, '1–2',
 '["Wystawianie faktur","Kontrola cen/warunków","Weryfikacja danych","Korekty","Archiwizacja"]'::jsonb,
 'Stałe + premia za terminowość.'),

('windykacja', 'dir_office', 'Specjalista ds. Windykacji', 'Biuro', 4, 'monthly', 2448, 3846, '1',
 '["Monitoring DSO","Kontakt z klientami","Wezwania do zapłaty","Harmonogramy spłat","Blokady zamówień"]'::jsonb,
 'Stałe + premia od odzysków.')
on conflict (id) do nothing;

-- Seed: matryca RACI
insert into public.raci_matrix (sort_order, area, ceo, ds, dp, df, hr, kp, km, kam) values
(0, 'Strategia i budżet roczny', 'A', 'C', 'C', 'C', 'C', 'I', 'I', 'I'),
(1, 'Polityka cenowa (cenniki)', 'A', 'R', 'I', 'C', 'I', 'I', 'I', 'C'),
(2, 'Planowanie produkcji (harmonogram)', 'I', 'C', 'A', 'I', 'I', 'R', 'I', 'I'),
(3, 'Windykacja — decyzja o blokadzie', 'C', 'C', 'I', 'A/R', 'I', 'I', 'I', 'C');
