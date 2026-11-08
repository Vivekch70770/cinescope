import type { TmdbMovie, Movie, TmdbMovieCredits, TmdbPerson, TmdbPersonCombinedCredits } from '../types'
import { supabase, unwrap } from './supabase'

const KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined
export const tmdbEnabled = !!KEY && !KEY.startsWith('your_')
const BASE = 'https://api.themoviedb.org/3'

async function get<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const u = new URL(BASE + path)
  u.searchParams.set('api_key', KEY!)
  Object.entries(params).forEach(([k, v]) => v && u.searchParams.set(k, v))
  const r = await fetch(u)
  if (!r.ok) throw new Error(r.status === 401 ? 'TMDB rejected the API key (401).' : `TMDB request failed (${r.status}).`)
  return r.json() as Promise<T>
}
const DETAIL_CACHE_MS = 30 * 60 * 1000
const detailCache = new Map<string, { value: unknown; expiresAt: number }>()
const detailRequests = new Map<string, Promise<unknown>>()

function cachedGet<T>(path: string): Promise<T> {
  const cached = detailCache.get(path)
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value as T)
  const pending = detailRequests.get(path)
  if (pending) return pending as Promise<T>
  const request = get<T>(path).then(value => {
    detailCache.set(path, { value, expiresAt: Date.now() + DETAIL_CACHE_MS })
    return value
  }).finally(() => { detailRequests.delete(path) })
  detailRequests.set(path, request)
  return request
}
async function getMovieCredits(id: number): Promise<TmdbMovieCredits> {
  if (!tmdbEnabled) return { id, cast: [], crew: [] }
  return cachedGet<TmdbMovieCredits>(`/movie/${id}/credits`)
}
interface Page { results: TmdbMovie[] }
const TRENDING_CACHE_MS = 15 * 60 * 1000
let trendingCache: { movies: TmdbMovie[]; expiresAt: number } | null = null
let trendingRequest: Promise<TmdbMovie[]> | null = null

// Clearly labelled demo mode: a few real film IDs with no posters, shown only when no TMDB key exists.
const DEMO: TmdbMovie[] = [
  { id: 78, title: 'Blade Runner', poster_path: null, release_date: '1982-06-25', original_language: 'en', genre_ids: [878] },
  { id: 603, title: 'The Matrix', poster_path: null, release_date: '1999-03-30', original_language: 'en', genre_ids: [28, 878] },
  { id: 496243, title: 'Parasite', poster_path: null, release_date: '2019-05-30', original_language: 'ko', genre_ids: [35, 53] },
  { id: 129, title: 'Spirited Away', poster_path: null, release_date: '2001-07-20', original_language: 'ja', genre_ids: [16] },
]

export const img = (p: string | null | undefined, size = 'w342') => (p ? `https://image.tmdb.org/t/p/${size}${p}` : null)
export const yearOf = (d?: string | null) => (d ? d.slice(0, 4) : '')

export const tmdb = {
  async genres(): Promise<{ id: number; name: string }[]> {
    if (!tmdbEnabled) return []
    return (await get<{ genres: { id: number; name: string }[] }>('/genre/movie/list')).genres
  },
  async trending() {
    if (!tmdbEnabled) return DEMO
    if (trendingCache && trendingCache.expiresAt > Date.now()) return trendingCache.movies
    if (!trendingRequest) {
      trendingRequest = get<Page>('/trending/movie/week').then(({ results }) => {
        trendingCache = { movies: results, expiresAt: Date.now() + TRENDING_CACHE_MS }
        return results
      }).finally(() => { trendingRequest = null })
    }
    return trendingRequest
  },
  async popular() { return tmdbEnabled ? (await get<Page>('/movie/popular')).results : DEMO },
  async search(q: string, year?: string) {
    if (!tmdbEnabled) return DEMO.filter(m => m.title.toLowerCase().includes(q.toLowerCase()))
    return (await get<Page>('/search/movie', { query: q, year })).results
  },
  async discover(f: { genre?: string; year?: string; lang?: string }) {
    if (!tmdbEnabled) return DEMO
    return (await get<Page>('/discover/movie', {
      with_genres: f.genre, primary_release_year: f.year, with_original_language: f.lang, sort_by: 'popularity.desc',
    })).results
  },
  async detail(id: number): Promise<TmdbMovie> {
    if (!tmdbEnabled) {
      const m = DEMO.find(d => d.id === id)
      if (!m) throw new Error('Movie not found in demo mode. Add a TMDB API key for full data.')
      return { ...m, runtime: null, genres: [], director: null, cast: [], overview: 'Demo mode: add a TMDB API key to load full details.' }
    }
    const [d, credits] = await Promise.all([
      get<TmdbMovie>(`/movie/${id}`),
      getMovieCredits(id),
    ])
    return {
      ...d,
      director: credits.crew.find(c => c.job === 'Director')?.name ?? null,
      cast: credits.cast.slice(0, 8).map(c => c.name),
    }
  },
  movieCredits: getMovieCredits,
  async personDetails(id: number): Promise<TmdbPerson> {
    if (!tmdbEnabled) throw new Error('Person details are unavailable in demo mode. Add a TMDB API key for full data.')
    return cachedGet<TmdbPerson>(`/person/${id}`)
  },
  async personCombinedCredits(id: number): Promise<TmdbPersonCombinedCredits> {
    if (!tmdbEnabled) throw new Error('Person credits are unavailable in demo mode. Add a TMDB API key for full data.')
    return cachedGet<TmdbPersonCombinedCredits>(`/person/${id}/combined_credits`)
  },
}

/** Cache a TMDB movie in our `movies` table and return its UUID. */
export async function ensureMovie(m: TmdbMovie): Promise<string> {
  const full = m.genres && m.runtime !== undefined ? m : await tmdb.detail(m.id)
  const row = {
    tmdb_id: full.id, title: full.title, poster_path: full.poster_path, backdrop_path: full.backdrop_path ?? null,
    release_date: full.release_date || null, runtime: full.runtime ?? null, genres: (full.genres ?? []).map(g => g.name),
    director: full.director ?? null, original_language: full.original_language ?? null, overview: full.overview ?? null,
  }
  const saved = unwrap(await supabase.from('movies').upsert(row, { onConflict: 'tmdb_id' }).select('id').single())
  if (!saved) throw new Error('Could not save movie details.')
  return saved.id as string
}

export const toTmdb = (m: Movie): TmdbMovie => ({
  id: m.tmdb_id, title: m.title, poster_path: m.poster_path, backdrop_path: m.backdrop_path, release_date: m.release_date ?? undefined,
  runtime: m.runtime, genres: m.genres.map((name, i) => ({ id: i, name })), director: m.director, original_language: m.original_language ?? undefined,
  overview: m.overview ?? undefined,
})
