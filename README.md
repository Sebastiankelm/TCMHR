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

1. Utwórz **nowe puste repozytorium** na [github.com/new](https://github.com/new) (np. nazwa: `hr`). Nie dodawaj README, .gitignore ani licencji.
2. W katalogu projektu dodaj remote i wypchnij kod:

```bash
git remote add origin https://github.com/TWOJ_LOGIN/hr.git
git push -u origin main
```

(Zamień `TWOJ_LOGIN` na swoją nazwę użytkownika GitHub i `hr` na nazwę repozytorium, jeśli inna.)

## Deploy na Vercel

1. Wypchnij repozytorium na GitHub (jak wyżej).
2. W [Vercel](https://vercel.com) → **Add New Project** → wybierz repozytorium.
3. W **Environment Variables** dodaj:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Kliknij **Deploy**. Vercel wykryje Next.js i zbuduje projekt.

## Struktura

- `app/` – App Router (layout, strony, API routes)
- `components/` – komponenty React (PascalCase)
- `lib/supabase/` – klient Supabase (przeglądarka, serwer, middleware)

### Supabase

- **Komponenty klienckie:** `import { createClient } from '@/lib/supabase/client'`
- **Server Components / Route Handlers:** `import { createClient } from '@/lib/supabase/server'`

Sesja auth jest odświeżana w middleware; nie usuwać wywołania `getClaims()` w `lib/supabase/middleware.js`.
