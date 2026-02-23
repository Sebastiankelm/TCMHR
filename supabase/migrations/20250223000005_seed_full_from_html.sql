-- Uzupełnienie bazy: 28 stanowisk + 20 wierszy RACI (z pełnego HTML)
-- Działa samodzielnie: dodaje kolumny raci/skalowanie, jeśli nie istnieją.

-- 0) Kolumny raci i skalowanie w positions (jeśli brak)
alter table public.positions
  add column if not exists raci jsonb default '{}'::jsonb,
  add column if not exists skalowanie text default '';

-- 1) Czyścimy matrycę RACI i wstawiamy 20 wierszy
delete from public.raci_matrix;

insert into public.raci_matrix (sort_order, area, ceo, ds, dp, df, hr, kp, km, kam) values
(0, 'Strategia i budżet roczny', 'A', 'C', 'C', 'C', 'C', 'I', 'I', 'I'),
(1, 'Zatrudnienie / zwolnienie dyrektorów', 'A', 'I', 'I', 'C', 'C', 'I', 'I', 'I'),
(2, 'Zatrudnienie pracowników produkcji', 'C', 'I', 'A', 'I', 'R', 'R', 'I', 'I'),
(3, 'Zatrudnienie magazyn / biuro', 'C', 'I', 'I', 'A', 'R', 'I', 'C', 'I'),
(4, 'Polityka cenowa (cenniki)', 'A', 'R', 'I', 'C', 'I', 'I', 'I', 'C'),
(5, 'Rabaty >15% (indywidualne)', 'A', 'R', 'I', 'C', 'I', 'I', 'I', 'C'),
(6, 'Akceptacja warunków kontraktu', 'A', 'R', 'C', 'C', 'I', 'I', 'I', 'R'),
(7, 'Planowanie produkcji (harmonogram)', 'I', 'C', 'A', 'I', 'I', 'R', 'I', 'I'),
(8, 'Decyzja o zatrzymaniu linii', 'I', 'I', 'A', 'I', 'I', 'R', 'I', 'I'),
(9, 'Zamówienia materiałów do produkcji', 'I', 'I', 'A', 'C', 'I', 'R', 'C', 'I'),
(10, 'Zakupy inwestycyjne <20k zł', 'C', 'I', 'R', 'A', 'I', 'C', 'I', 'I'),
(11, 'Zakupy inwestycyjne >20k zł', 'A', 'I', 'C', 'R', 'I', 'I', 'I', 'I'),
(12, 'Zatwierdzenie wypłat', 'A', 'I', 'I', 'R', 'R', 'I', 'I', 'I'),
(13, 'Kontrola kosztów stałych', 'I', 'I', 'I', 'A', 'I', 'I', 'I', 'I'),
(14, 'Windykacja — decyzja o blokadzie', 'C', 'C', 'I', 'A', 'I', 'I', 'I', 'C'),
(15, 'Reklamacja klienta (produkcyjna)', 'I', 'C', 'A', 'I', 'I', 'R', 'I', 'C'),
(16, 'Reklamacja klienta (handlowa)', 'I', 'A', 'C', 'I', 'I', 'I', 'I', 'R'),
(17, 'Zmiana procesu produkcji', 'I', 'I', 'A', 'I', 'I', 'R', 'I', 'I'),
(18, 'Onboarding pracownika', 'I', 'I', 'C', 'R', 'R', 'C', 'C', 'I'),
(19, 'Oceny pracownicze', 'C', 'A', 'A', 'A', 'R', 'C', 'C', 'I');

-- 2) Stanowiska: upsert 28 pozycji (parent_id z drzewa z HTML)
insert into public.positions (id, parent_id, title, dept, level, type, min_salary, max_salary, headcount, duties, rules, raci, skalowanie) values
('ceo', null, 'Prezes / Właściciel', 'Zarząd', 0, 'monthly', 15000, 30000, '1',
 '["Strategia i wizja firmy","Zatwierdzanie budżetów i kluczowych inwestycji","Nadzór nad dyrektorami","Reprezentacja spółki","Decyzje o zatrudnieniu kadry zarządzającej","Ostateczna decyzja ws. polityki cenowej","Negocjacje strategiczne"]'::jsonb,
 'Wynagrodzenie właścicielskie — brak standardowego rozliczenia. Opcjonalnie: dywidenda + kontrakt managerski. Brak składnika zmiennego powiązanego z KPI.',
 '{"CEO":"A","DS":"C","DP":"C","DF":"C","HR":"I"}'::jsonb,
 'Na każde ~25 pracowników produkcyjnych rekomenduję +1 kierownik zmiany.'),

('dir_sales', 'ceo', 'Dyrektor Sprzedaży', 'Sprzedaż', 1, 'mixed', 8000, 16000, '1',
 '["Odpowiedzialność za przychód i marżę brutto","Budowa i realizacja strategii sprzedaży","Polityka cenowa i rabatowa","Zarządzanie KAM/Handlowcami","Prognozy sprzedaży (M/Q/Y)","Udział w kluczowych negocjacjach","Koordynacja z produkcją (moce, lead time)","Budowa standardów CRM"]'::jsonb,
 'Podstawa stała (8 000–12 000 zł) + premia kwartalna do 30% podstawy za realizację planu (>100% planu = 100% premii, 90–99% = 60%, <90% = 0%). Opcja: udział w zysku działu.',
 '{"CEO":"A","DS":"R","DP":"C","DF":"C","HR":"I"}'::jsonb,
 '1 DS na cały dział. Po przekroczeniu 10 handlowców: rozdzielenie na Segment TCM / e-Sklep z odrębnymi liderami.'),

('dir_prod', 'ceo', 'Kierownik Produkcji', 'Produkcja', 1, 'mixed', 6000, 10000, '1',
 '["Planowanie i nadzór nad produkcją","Zarządzanie harmonogramami i priorytetami","Nadzór nad jakością i technologią druku","Zarządzanie zespołem (drukarze, przygotowalnia, farby, mechanik)","Kontrola kosztów produkcji","Raportowanie do zarządu","Zamawianie surowców (taśmy, materiały)","Decyzje o kolejności zleceń"]'::jsonb,
 'Podstawa stała (6 000–10 000 zł) + premia miesięczna za OEE/terminowość (do 25% podstawy). Realizacja planu >95% = 100% premii. Minimalne premie za wyniki poniżej 85%.',
 '{"CEO":"C","DS":"C","DP":"R/A","DF":"I","HR":"I"}'::jsonb,
 'Przy 2-zmianowej pracy wymagany Mistrz/Osoba odpowiedzialna na każdą zmianę.'),

('dir_office', 'ceo', 'Dyrektor Biura', 'Biuro', 1, 'monthly', 6000, 10000, '1',
 '["Nadzór nad back-office (finanse operacyjne, admin, HR-kadry)","Planowanie i kontrola kosztów stałych","Nadzór nad płynnością cashflow","Kontrola obiegu dokumentów","Zarządzanie: fakturowanie, windykacja, administracja","Kontrola cen na fakturach zakupowych","Nadzór windykacji miękkiej","HR operacyjny: onboarding, BHP, badania","Raporty dla zarządu"]'::jsonb,
 'Wynagrodzenie miesięczne stałe. Premia roczna do 2 miesięcy wynagrodzenia zależna od oceny zarządu (realizacja KPI: DSO, koszty stałe, terminowość raportów).',
 '{"CEO":"C","DS":"I","DP":"I","DF":"R","HR":"R"}'::jsonb,
 '1 Dyrektor Biura. Przy >80 pracownikach lub multi-lokalizacji: rozdzielenie roli na CFO + HR Manager.'),

('mgr_warehouse', 'ceo', 'Kierownik Magazynu', 'Magazyn', 2, 'monthly', 5500, 7500, '1',
 '["Nadzór nad stanami magazynowymi","Organizacja pracy magazynierów","Kontrola przyjęć i wydań towaru","Optymalizacja przestrzeni magazynowej","Raportowanie stanów do D.Biura i produkcji","Zarządzanie dokumentacją WZ/PZ","Bezpieczeństwo i porządek"]'::jsonb,
 'Wynagrodzenie stałe miesięczne 5 500–7 500 zł. Premia kwartalna do 15% za realizację wskaźników dokładności inwentaryzacji (≥98%) i terminowości wydań.',
 '{"CEO":"I","DS":"C","DP":"C","DF":"R","HR":"I"}'::jsonb,
 '1 Kierownik na 3–6 magazynierów.'),

('mistrz', 'dir_prod', 'Mistrz / Osoba odpowiedzialna', 'Produkcja', 2, 'mixed', 5500, 8000, '2',
 '["Kontakt z kierownictwem podczas ich nieobecności","Nadzór nad ilością osób na produkcji","Wyłączenie urządzeń, kontrola drzwi po zmianie","Podejmowanie decyzji dotyczących jakości nadruków","Zmiana kolejności zleceń w razie awarii","Szkolenie nowych pracowników","Udzielanie pierwszej pomocy","Ewakuacja podczas nieobecności kadry"]'::jsonb,
 'Podstawa 5 500–8 000 zł (etat lub stała kwota). Premia zmianowa: 100–200 zł/zmianę za terminowe wykonanie planu. Dodatek za odpowiedzialność: +300–500 zł/mies.',
 '{"CEO":"I","DS":"I","DP":"C","DF":"I","HR":"I"}'::jsonb,
 'Min. 1 osoba odpowiedzialna na zmianę. Przy 2-zmianowej pracy: min. 2 osoby.'),

('kam', 'dir_sales', 'KAM / Handlowiec B2B', 'Sprzedaż', 3, 'commission', 3000, 30000, '6',
 '["Aktywna sprzedaż produktów (TCM, Saba, inne)","Rozwój relacji z obecnymi klientami","Pozyskiwanie nowych klientów","Negocjowanie warunków w zatwierdzonych widełkach","Utrzymywanie pipeline CRM","Przygotowywanie ofert handlowych","Eskalacja problemów do produkcji/jakości","Monitoring rynku i konkurencji","Raportowanie wyników"]'::jsonb,
 'Podstawa stała 3 000–3 400 zł + 1% prowizji od zrealizowanej sprzedaży (wg faktycznie zapłaconych faktur). Kelm: podstawa 3 400 zł, bez prowizji (rozliczenie fakturowe). Staż wpływa na poziom podstawy. Brak premii za plan — wynagrodzenie = podstawa + prowizja.',
 '{"CEO":"I","DS":"A","DP":"I","DF":"I","HR":"I"}'::jsonb,
 '1 KAM obsługuje portfel 20–50 klientów aktywnych. Przy portfelu >80 klientów: podział na junior/senior lub asystent.'),

('esklep', 'dir_sales', 'Specjalista e-Sklep / KAM e-commerce', 'Sprzedaż', 3, 'commission', 3490, 7000, '4',
 '["Obsługa i rozwój kanału e-commerce","Zarządzanie zamówieniami online","Kontakt z klientami e-sklepu","Monitorowanie asortymentu i cen online","Współpraca z działem handlowym i logistycznym","Raportowanie wyników kanału online"]'::jsonb,
 'Podstawa 3 500–4 500 zł + 0,15% prowizji od sprzedaży e-sklep. Junior: 3 490 zł + 0,075%. Prowizja naliczana od sprzedaży zrealizowanej (po płatności). Premia za przekroczenie planu kanałowego.',
 '{"CEO":"I","DS":"A","DP":"I","DF":"I","HR":"I"}'::jsonb,
 '1 specjalista na do 500 aktywnych SKU. Przy >1 000 SKU lub >2 000 zamówień/mies.: +1 asystent.'),

('asystent_handl', 'dir_sales', 'Asystent Działu Handlowego', 'Sprzedaż', 4, 'monthly', 3500, 5000, '1–2',
 '["Wprowadzanie i obsługa zamówień w ERP/CRM","Koordynacja dokumentów handlowych","Wsparcie w raportach sprzedażowych","Kontrola danych (klienci, cenniki, warunki)","Przygotowanie ofert i prezentacji dla handlowców","Wsparcie przy reklamacjach (dokumentacja)","Archiwizacja dokumentów","Współpraca z produkcją i logistyką operacyjnie"]'::jsonb,
 'Wynagrodzenie stałe miesięczne 3 500–5 000 zł. Premia kwartalna do 10% za jakość danych w CRM, terminowość dokumentacji i ocenę od handlowców.',
 '{"CEO":"I","DS":"C","DP":"I","DF":"I","HR":"I"}'::jsonb,
 '1 asystent na 3–4 handlowców.'),

('drukarz', 'dir_prod', 'Drukarz / Operator maszyny', 'Produkcja', 4, 'mixed', 4000, 12000, '20',
 '["Obsługa maszyny drukarskiej fleksograficznej","Przygotowanie maszyny do druku (setup)","Kontrola jakości nadruku na bieżąco","Zgłaszanie odstępstw od specyfikacji","Dbanie o stan wałków rastrowych","Przestrzeganie zasad BHP","Prowadzenie dokumentacji produkcyjnej","Współpraca z mechanikiem i przygotowalnią"]'::jsonb,
 'Rozliczenie akordowe: liczba_rolek × stawka_za_rolkę (indywidualna, ~0,21–0,34 zł/rolkę wg maszyny). Stawka uzależniona od typu maszyny i materiału. Nadgodziny: 23–24 zł/h. Urlop: dni × (stawka/h × 8). L4: wg zasiłkowych reguł ZUS. Premia uznaniowa do 1 500 zł/mies.',
 '{"CEO":"I","DS":"I","DP":"C","DF":"I","HR":"I"}'::jsonb,
 '1 drukarz / 1 maszyna / zmiana. Przy 24h produkcji: 2 drukarzy/maszynę (2 zmiany) + rezerwa 10%.'),

('uczen_druk', 'drukarz', 'Uczeń / Pomocnik drukarza', 'Produkcja', 5, 'hourly', 2900, 4800, '2–4',
 '["Pomoc drukarzowi w obsłudze maszyny","Nauka obsługi maszyny pod nadzorem","Przygotowanie stanowiska przed drukiem","Zabezpieczanie produkcji w kartony i rdzenie","Utrzymywanie czystości na stanowisku"]'::jsonb,
 'Stawka godzinowa 24 zł/h (uczeń) do 28 zł/h po wdrożeniu. Urlop: dni × (stawka/h × 8). Ścieżka awansu: po 6–12 miesiącach pracy → drukarz samodzielny z pełną stawką akordową.',
 '{"CEO":"I","DS":"I","DP":"I","DF":"I","HR":"I"}'::jsonb,
 'Max. 1 uczeń na 2 drukarzy.'),

('koord_flex', 'dir_prod', 'Koordynator Przygotowalni Fleksograficznej', 'Produkcja', 3, 'mixed', 4500, 7000, '1',
 '["Pilnowanie realizacji dziennego planu produkcji","Organizacja pracy i podział zadań w przygotowalni","Kontrola jakości materiałów do produkcji","Zgłaszanie odstępstw od specyfikacji druku","Kontrola poprawności dostarczanych materiałów na drukarnie","Kontrola narzędzi i surowców","Kompletacja i archiwizacja zleceń","Dbanie o efektywność czasu pracy zespołu"]'::jsonb,
 'Podstawa 4 500–7 000 zł (stała). Premia miesięczna do 15% za realizację planu i brak reklamacji jakościowych po przygotowalni.',
 '{"CEO":"I","DS":"I","DP":"C","DF":"I","HR":"I"}'::jsonb,
 '1 koordynator na przygotownię. Przy 2 zmianach: 2 koordynatorów lub 1 + starszy operator.'),

('grafik', 'koord_flex', 'Projektant Grafik / DTP', 'Produkcja', 4, 'mixed', 4300, 9500, '2',
 '["Projektowanie grafik do druku fleksograficznego","Przygotowanie plików do produkcji (DTP)","Korekta i adaptacja projektów klientów","Generowanie form drukowych","Kontrola zgodności ze specyfikacją","Współpraca z handlowcami i produkcją","Archiwizacja projektów"]'::jsonb,
 'Podstawa stała 4 300–6 000 zł + premia za ekwiwalent (projekt × stawka: 15 zł/godz. projektowania lub 40–50 zł za zlecenie). Premia akordowa naliczana wg liczby i złożoności zleceń.',
 '{"CEO":"I","DS":"I","DP":"C","DF":"I","HR":"I"}'::jsonb,
 '1 grafik na 150–200 zleceń produkcyjnych/mies. Przy >300 zleceniach: +1 DTP junior.'),

('laser', 'koord_flex', 'Operator Laser / Polimery Laser', 'Produkcja', 4, 'mixed', 4000, 7500, '1',
 '["Obsługa plotera laserowego do klisz","Grawer laserowy form fleksograficznych","Przygotowanie i cięcie polimerów","Kontrola jakości form","Utrzymanie maszyny laserowej","Zgłaszanie potrzeb serwisowych"]'::jsonb,
 'Podstawa stała 4 000 zł + ekwiwalent 50 zł/zlecenie lub wg normy produktywności. Możliwa stawka godzinowa 25–30 zł/h przy szczytowych obciążeniach.',
 '{"CEO":"I","DS":"I","DP":"C","DF":"I","HR":"I"}'::jsonb,
 '1 operator / urządzenie.'),

('koord_farby', 'dir_prod', 'Koordynator Mieszalni Farb', 'Produkcja', 3, 'mixed', 4500, 6500, '1',
 '["Ważenie farb przed wydaniem i po powrocie z produkcji","Wpisywanie zużycia farby do systemu","Indeksowanie danych przy przyjęciu dostawy","Podział pracy pomiędzy pracowników mieszalni","Nadzór nad porządkiem w magazynie farb i lakierów","Kontrola ilości farb i tworzenie zamówień","Zarządzanie stanami magazynowymi lakierów i rozpuszczalników"]'::jsonb,
 'Podstawa stała 4 500–6 500 zł. Premia miesięczna do 10% za dokładność ewidencji (odchylenia stanu farb < 1%) i terminowość zamówień.',
 '{"CEO":"I","DS":"I","DP":"C","DF":"I","HR":"I"}'::jsonb,
 '1 koordynator na mieszalnię do 20 drukarzy. Przy większym wolumenie: 2 zmiany z osobnym koordynatorem.'),

('prac_farby', 'koord_farby', 'Pracownik Mieszalni Farb', 'Produkcja', 5, 'hourly', 3300, 5000, '2–4',
 '["Przygotowanie farb według receptur","Dokładne odważenie i mieszanie składników","Opracowywanie receptur farb","Ewidencja zużycia farb w systemie","Etykietowanie gotowych farb","Przygotowanie lakierów i rozpuszczalników","Transport farb na stanowiska produkcyjne","Zbieranie pojemników po farbach"]'::jsonb,
 'Stawka godzinowa 23–26 zł/h. Urlop: dni × (stawka/h × 8). Premia za brak pomyłek recepturowych (do 200 zł/mies.).',
 '{"CEO":"I","DS":"I","DP":"I","DF":"I","HR":"I"}'::jsonb,
 '1 pracownik mieszalni / zmiana / 10 drukarzy.'),

('mechanik', 'dir_prod', 'Mechanik Utrzymania Ruchu', 'Produkcja', 3, 'mixed', 5500, 8500, '1',
 '["Utrzymanie parku maszynowego w należytym stanie","Usuwanie niespodziewanych awarii","Kontrola techniczna maszyn (przeglądy OT1/OT2)","Przeglądy kompresora","Zapewnienie kompletu części zamiennych","Kontrola wałków rastrowych i cylindrów ceramicznych","Zamawianie surowców dla produkcji (taśmy)","Szkolenie drukarzy z zasad użytkowania maszyn"]'::jsonb,
 'Podstawa 5 500–8 500 zł (stała). Premia za MTTR (mean time to repair): premia 300–500 zł/mies. gdy brak przerw produkcyjnych >1h. Dodatek za dyżury awaryjne: +50–100 zł/wyjazd.',
 '{"CEO":"I","DS":"I","DP":"C","DF":"I","HR":"I"}'::jsonb,
 '1 mechanik / park maszynowy do 20 maszyn. Przy >20 maszynach lub 3 zmianach: +1 mechanik.'),

('pomocnik', 'mechanik', 'Pomocnik Zmiany / Serwis Myjek', 'Produkcja', 5, 'hourly', 3000, 4500, '2–3',
 '["Zabezpieczenie produkcji w kartony i rdzenie","Obsługa myjki natryskowej do podzespołów","Obsługa myjki ultradźwiękowej do wałków","Wymiana chemii czyszczącej","Utrzymanie stanu magazynowego chemii","Mycie podzespołów drukarskich","Kontrola wałków rastrowych","Gospodarka odpadami poprodukcyjnymi","Inne prace zlecone"]'::jsonb,
 'Stawka godzinowa 26–28 zł/h. Urlop: dni × (stawka × 8). Brak stałej premii — możliwe premie uznaniowe (do 300 zł) za szczególną dyspozycyjność lub inicjatywę.',
 '{"CEO":"I","DS":"I","DP":"I","DF":"I","HR":"I"}'::jsonb,
 '1 pomocnik / zmiana. Przy >15 maszynach aktywnych/zmianę: 2 pomocnicy.'),

('polimery', 'drukarz', 'Operator Polimery / Oklejanie', 'Produkcja', 5, 'hourly', 3200, 5200, '4',
 '["Oklejanie produktów wg specyfikacji","Obsługa maszyn do laminacji i oklejania","Kontrola jakości na stanowisku","Realizacja norm produkcyjnych","Raportowanie wyników do koordynatora","Utrzymanie czystości stanowiska"]'::jsonb,
 'Stawka godzinowa 24–27 zł/h. Premia za normy: przekroczenie normy (np. 93+ szt/8h) = premia 100–200 zł. Możliwy ekwiwalent za ponadnormową produktywność.',
 '{"CEO":"I","DS":"I","DP":"I","DF":"I","HR":"I"}'::jsonb,
 'Norma: 1 operator / maszyna lub 1 operator / 80–120 szt./8h.'),

('jakość', 'dir_prod', 'Pracownik Kontroli Jakości', 'Produkcja', 4, 'hourly', 3000, 5700, '2',
 '["Kontrola jakości wyrobów gotowych","Pomiar zgodności z parametrami druku","Dokumentowanie niezgodności","Raportowanie do kierownika produkcji","Blokowanie wyrobów niezgodnych","Współpraca z działem handlowym przy reklamacjach"]'::jsonb,
 'Stawka godzinowa 26–31 zł/h. Premia za brak reklamacji z tytułu jakości: do 200 zł/mies. Pracownicy wliczani do etatów stałych.',
 '{"CEO":"I","DS":"I","DP":"C","DF":"I","HR":"I"}'::jsonb,
 '1 kontroler / zmiana / linia produkcyjna.'),

('magazynier', 'mgr_warehouse', 'Magazynier', 'Magazyn', 5, 'hourly', 3500, 5200, '3',
 '["Przyjmowanie i wydawanie towaru","Kompletacja zamówień","Obsługa wózka widłowego (jeśli uprawnienia)","Kontrola stanów magazynowych","Wystawianie dokumentów WZ/PZ","Utrzymanie porządku w magazynie","Inwentaryzacja","Współpraca z produkcją przy wydaniu surowców"]'::jsonb,
 'Stawka godzinowa 26 zł/h. Premia za bezbłędną inwentaryzację do 500 zł/kwartał. Dodatek za uprawnienia na wózek widłowy: +200 zł/mies.',
 '{"CEO":"I","DS":"I","DP":"I","DF":"C","HR":"I"}'::jsonb,
 '1 magazynier / 50 wydań dziennie. Przy >150 wydań: +1 magazynier.'),

('kj_mag', 'mgr_warehouse', 'Kontrola Jakości (Magazyn)', 'Magazyn', 4, 'hourly', 3000, 5700, '1',
 '["Kontrola jakości przyjmowanych surowców","Sprawdzanie zgodności dostaw z zamówieniami","Dokumentowanie niezgodności i reklamacje do dostawców","Współpraca z produkcją i zakupami"]'::jsonb,
 'Stawka 26 zł/h. Premia za skuteczność reklamacji dostawcy: do 300 zł/mies.',
 '{"CEO":"I","DS":"I","DP":"I","DF":"C","HR":"I"}'::jsonb,
 '1 osoba / punkt przyjęcia.'),

('referent', 'dir_office', 'Referent / Planowanie Produkcji', 'Biuro', 4, 'monthly', 4500, 7000, '1',
 '["Wprowadzanie i zarządzanie zleceniami produkcyjnymi","Planowanie kolejności produkcji","Komunikacja między handlowcami a produkcją","Monitorowanie terminów realizacji","Raportowanie statusów zleceń","Obsługa systemu ERP w zakresie produkcji"]'::jsonb,
 'Wynagrodzenie stałe 5 270 zł (wg danych) / widełki 4 500–7 000 zł. Premia za terminowość planu (OTD): do 500 zł/mies.',
 '{"CEO":"I","DS":"C","DP":"C","DF":"I","HR":"I"}'::jsonb,
 '1 referent na do 200 aktywnych zleceń/mies.'),

('fakturzysta', 'dir_office', 'Fakturzystka / Asystent Fakturowania', 'Biuro', 5, 'monthly', 3200, 5000, '1–2',
 '["Wystawianie faktur sprzedażowych","Kontrola cen, rabatów, warunków płatności","Weryfikacja danych klientów","Współpraca z handlowcami przy korektach","Archiwizacja dokumentów sprzedażowych","Zestawienia sprzedaży dla księgowości"]'::jsonb,
 'Wynagrodzenie stałe miesięczne 3 200–5 000 zł. Premia za terminowość (100% faktur wystawionych max. 24h od zamówienia): do 300 zł/mies.',
 '{"CEO":"I","DS":"C","DP":"I","DF":"R","HR":"I"}'::jsonb,
 '1 fakturzystka na do 300 faktur/mies.'),

('windykacja', 'dir_office', 'Specjalista ds. Windykacji', 'Biuro', 4, 'monthly', 3500, 5500, '1',
 '["Monitoring przeterminowanych należności (DSO)","Kontakt z klientami ws. zaległych płatności","Wysyłka wezwań do zapłaty","Ustalanie harmonogramów spłat","Raportowanie stanu należności do D.Biura i CEO","Blokady zamówień we współpracy ze sprzedażą"]'::jsonb,
 'Wynagrodzenie stałe 3 500–5 500 zł + premia za odzysk należności: 1% od kwot odzyskanych powyżej 30-dniowego DSO celu. Maks. premia: 1 500 zł/mies.',
 '{"CEO":"I","DS":"C","DP":"I","DF":"R","HR":"I"}'::jsonb,
 '1 specjalista na portfel do 200 dłużników aktywnych.'),

('admin', 'dir_office', 'Pracownik Biurowy / Admin', 'Biuro', 5, 'monthly', 3200, 5700, '2',
 '["Obsługa korespondencji i dokumentów","Zaopatrzenie biura (materiały, BHP, środki czystości)","Obsługa umów z dostawcami usług biurowych","Koordynacja spraw administracyjnych","Wsparcie organizacyjne dla działów","Archiwum i obieg dokumentów"]'::jsonb,
 'Wynagrodzenie stałe 3 200–5 700 zł (wg stanowiska i stażu). Krzyżańska Danuta: 5 500 zł. Kwaśniewska Iwona (kier.biura): 4 500 zł + prowizja 0,1% od nadwyżki sprzedaży >1,2M. Premia roczna do 1 miesiąca wynagrodzenia.',
 '{"CEO":"I","DS":"I","DP":"I","DF":"R","HR":"R"}'::jsonb,
 '1–2 osoby na firmę do 60 pracowników.'),

('sprzataczka', 'dir_office', 'Sprzątaczka / Obsługa Obiektu', 'Biuro', 5, 'monthly', 2300, 3000, '1',
 '["Sprzątanie biura i hali produkcyjnej","Utrzymanie czystości ogólnej obiektu","Segregacja odpadów","Zaopatrzenie w środki czystości"]'::jsonb,
 'Wynagrodzenie stałe 2 400 zł/mies. + premia 300 zł. Możliwa umowa zlecenie lub niepełny etat.',
 '{"CEO":"I","DS":"I","DP":"I","DF":"I","HR":"I"}'::jsonb,
 '1 osoba na obiekt do 2 000 m².')
on conflict (id) do update set
  parent_id = excluded.parent_id,
  title = excluded.title,
  dept = excluded.dept,
  level = excluded.level,
  type = excluded.type,
  min_salary = excluded.min_salary,
  max_salary = excluded.max_salary,
  headcount = excluded.headcount,
  duties = excluded.duties,
  rules = excluded.rules,
  raci = excluded.raci,
  skalowanie = excluded.skalowanie,
  updated_at = now();
