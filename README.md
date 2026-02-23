# HR – Vercel + Supabase

Baza projektu: **Next.js 14** (App Router), **Tailwind CSS**, **DaisyUI**, **Supabase**.

## Wymagania

- Node.js 18+
- Konto [Vercel](https://vercel.com) i [Supabase](https://supabase.com)

## Uruchomienie lokalne

1. Zainstaluj zależności:

```bash
npm install
```

2. Skopiuj zmienne środowiskowe i uzupełnij danymi z Supabase:

```bash
cp .env.local.example .env.local
```

W pliku `.env.local` ustaw:

- `NEXT_PUBLIC_SUPABASE_URL` – URL projektu (Supabase → Project Settings → API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – klucz anon/public

3. Uruchom dev server:

```bash
npm run dev
```

Aplikacja: [http://localhost:3000](http://localhost:3000).

## Połączenie z GitHub i pierwszy push

**Opcja A – GitHub CLI (zalecane)**  
Jeśli masz zainstalowane [GitHub CLI](https://cli.github.com/) (`gh`):

1. Zaloguj się (jednorazowo): `gh auth login`
2. Utwórz repozytorium i wypchnij kod:

```bash
gh repo create hr --public --source=. --remote=origin --push
```

(Remote `origin` → [Sebastiankelm/TCMHR](https://github.com/Sebastiankelm/TCMHR).)

**Opcja B – ręcznie w przeglądarce**  
1. Utwórz **nowe puste repozytorium** na [github.com/new](https://github.com/new) (np. nazwa: `hr`). Nie dodawaj README, .gitignore ani licencji.  
2. W katalogu projektu wypchnij kod:

```bash
git push -u origin main
```

## Połączenie z Supabase i Vercel

### Supabase (ten projekt)

- **Dashboard:** [Supabase – projekt obxoowqvqqhojdhqyoac](https://supabase.com/dashboard/project/obxoowqvqqhojdhqyoac)
- **Lokalnie:** skopiuj `.env.local.example` → `.env.local` i wklej **anon key** z Supabase:  
  **Project Settings** → **API** → **Project API keys** → **anon public**.

### Vercel (ten projekt)

- **Projekt:** [tcmhr na Vercel](https://vercel.com/sebastians-projects-8fc17035/tcmhr)
1. **Connect Git** (jeśli jeszcze nie): **Settings** → **Git** → podłącz repozytorium [TCMHR](https://github.com/Sebastiankelm/TCMHR).
2. **Zmienne środowiskowe:** **Settings** → **Environment Variables** → dodaj:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://obxoowqvqqhojdhqyoac.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(anon key z Supabase → Project Settings → API)*
3. **Redeploy:** **Deployments** → ostatni deployment → **⋯** → **Redeploy**, żeby build miał dostęp do zmiennych.

## Deploy na Vercel (ogólnie)

1. Repozytorium na GitHub: [Sebastiankelm/TCMHR](https://github.com/Sebastiankelm/TCMHR).
2. W [Vercel](https://vercel.com) → **Add New Project** (lub istniejący **tcmhr**) → wybierz to repozytorium.
3. W **Environment Variables** ustaw `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY` jak wyżej.
4. **Deploy**. Vercel wykryje Next.js i zbuduje projekt.

## Migracje bazy (Supabase)

Aplikacja używa tabel: **positions** (stanowiska) i **raci_matrix** (matryca RACI).

1. W **Supabase** → [SQL Editor](https://supabase.com/dashboard/project/obxoowqvqqhojdhqyoac/sql/new).
2. Uruchom migracje w kolejności:
   - `supabase/migrations/20250223000001_initial.sql` – tworzy tabele i RLS
   - `supabase/migrations/20250223000002_seed.sql` – wstawia dane startowe (stanowiska + RACI)

Albo skopiuj zawartość obu plików do jednego zapytania i wykonaj. Po migracji strona będzie korzystać z danych z Supabase.

## Struktura

- `app/` – App Router (layout, strony, akcje)
- `components/` – komponenty React (PascalCase)
- `lib/supabase/` – klient Supabase (przeglądarka, serwer, middleware)
- `supabase/migrations/` – migracje SQL (positions, raci_matrix)

### Supabase

- **Komponenty klienckie:** `import { createClient } from '@/lib/supabase/client'`
- **Server Components / Route Handlers:** `import { createClient } from '@/lib/supabase/server'`

Sesja auth jest odświeżana w middleware; nie usuwać wywołania `getClaims()` w `lib/supabase/middleware.js`.
