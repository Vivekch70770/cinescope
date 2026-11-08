# Cinescope

*Your films. Your memories. Your perspective.*

A personal movie journal inspired by Letterboxd: discover films, log them in a diary (rewatches allowed), keep a watchlist and collections, and see statistics from your own data. Single-user focus, no social features.

## Features
- Home dashboard with stats calculated from your diary
- Discover: TMDB search, genre/year/language filters, trending and popular
- Movie detail: poster, backdrop, runtime, genres, director, cast, TMDB rating, your rating
- Diary: log, edit, delete, half-star ratings (0.5 to 5), review, private notes, rewatch flag, repeat entries for the same film
- Watchlist with search, genre filter, remove and mark as watched (no duplicates)
- Collections: create, rename, describe, add and remove films, delete
- Statistics (Recharts): genres, directors, per month, per year, rewatches, highest rated
- Profile: username, avatar URL, bio, favourite genres
- Supabase Auth, Postgres with Row Level Security

## Tech
React + TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Supabase (Auth + Postgres), TMDB API.

## Structure
```
cinescope/
  frontend/            React app (src/components, pages, hooks, lib, types)
  supabase/migrations/ 001_schema.sql (tables, indexes, RLS, triggers)
  supabase/seed.sql    intentionally empty
  .env.example
```

## Prerequisites
- Node.js 18 or newer (https://nodejs.org)
- A free Supabase project (https://supabase.com)
- A free TMDB account and API key (https://www.themoviedb.org/settings/api), use the v3 "API Key"

## Setup (Windows PowerShell)
```powershell
Expand-Archive cinescope.zip -DestinationPath .
cd cinescope
Copy-Item .env.example .env
code .
```
Edit `.env` (it lives in the project root, next to `.env.example`):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your anon public key
VITE_TMDB_API_KEY=your TMDB v3 key
```
Use only the **anon** key. Never put a service-role key in this project.

### Supabase
1. Supabase dashboard, Project Settings, API: copy the Project URL and anon key.
2. SQL Editor, New query: paste the full contents of `supabase/migrations/001_schema.sql` and Run.
3. Authentication, Providers: Email is enabled by default. For quick local testing you can turn off "Confirm email" under Authentication settings; otherwise confirm through the email link.

### Run
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173, create an account, and start logging.

### Production build
```powershell
cd frontend
npm run build
npm run preview
```
Output goes to `frontend/dist`.

## Demo mode
Without a TMDB key the app shows a banner and only four sample titles (no posters). Add the key and restart `npm run dev` for the real catalogue.

## Troubleshooting
- **"Connect Supabase" screen**: `.env` is missing, in the wrong folder (must be the project root), or still has placeholders. Restart `npm run dev` after editing.
- **Environment changes ignored**: Vite reads `.env` only at start.
- **"relation does not exist" / permission errors**: the migration has not been run, or ran partially. Re-run it on a fresh project.
- **Sign-up works but login fails**: confirm your email, or disable email confirmation for local testing.
- **TMDB 401**: wrong key. Use the v3 API Key, not the Read Access Token.
- **PowerShell blocks npm scripts**: run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **Port in use**: `npm run dev -- --port 5174`.

## Notes
- "Favourites" on Home are films you rated 4.5 stars or higher.
- The `movies` table is a shared cache of TMDB metadata; all personal data is protected by RLS.
- Runtime and genre statistics need TMDB detail data, which is saved the first time you log or save a film.
