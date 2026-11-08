-- Cinescope schema. Run in Supabase SQL Editor (or `supabase db push`).
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username is null or char_length(username) between 2 and 30),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 280),
  favourite_genres text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null unique,
  title text not null,
  poster_path text,
  backdrop_path text,
  release_date date,
  runtime integer check (runtime is null or runtime >= 0),
  genres text[] not null default '{}',
  director text,
  original_language text,
  overview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete restrict,
  watched_on date not null default current_date,
  rating numeric(2,1) check (rating is null or (rating between 0.5 and 5 and (rating * 2) = floor(rating * 2))),
  review text,
  notes text,
  is_rewatch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
); -- no unique(user_id, movie_id): rewatches are allowed

create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, movie_id)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_movies (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (collection_id, movie_id)
);

create index diary_user_date_idx on public.diary_entries (user_id, watched_on desc);
create index diary_movie_idx on public.diary_entries (movie_id);
create index watchlist_user_idx on public.watchlist (user_id, created_at desc);
create index collections_user_idx on public.collections (user_id);
create index collection_movies_col_idx on public.collection_movies (collection_id);

create trigger t_profiles_upd before update on public.profiles for each row execute function public.set_updated_at();
create trigger t_movies_upd before update on public.movies for each row execute function public.set_updated_at();
create trigger t_diary_upd before update on public.diary_entries for each row execute function public.set_updated_at();
create trigger t_collections_upd before update on public.collections for each row execute function public.set_updated_at();

-- Auto-create a profile for each new auth user
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id) values (new.id) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.diary_entries enable row level security;
alter table public.watchlist enable row level security;
alter table public.collections enable row level security;
alter table public.collection_movies enable row level security;

create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- movies is a shared metadata cache (TMDB data only, no personal data)
create policy "movies read" on public.movies for select to authenticated using (true);
create policy "movies insert" on public.movies for insert to authenticated with check (true);
create policy "movies update" on public.movies for update to authenticated using (true);

create policy "own diary" on public.diary_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own watchlist" on public.watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own collections" on public.collections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own collection movies" on public.collection_movies for all
  using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()));
