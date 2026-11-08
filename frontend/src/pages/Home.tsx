import { Link } from 'react-router-dom'
import { Compass, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAsync } from '../hooks/useAsync'
import { loadDiary, computeStats } from '../lib/data'
import { supabase, unwrap } from '../lib/supabase'
import { img, tmdb } from '../lib/tmdb'
import { Empty, ErrorBox, Grid, MovieCard, Spinner, Stars } from '../components/ui'
import MoviePosterMosaic from '../components/MoviePosterMosaic'
import TrendingMovies from '../components/TrendingMovies'

function getWatchlistMovieIds(value: unknown): number[] {
  if (!Array.isArray(value)) throw new Error('Could not read your watchlist movie data.')
  return value.flatMap((row: unknown) => {
    if (typeof row !== 'object' || row === null || !('movies' in row)) {
      throw new Error('Could not read a watchlist movie relation.')
    }
    const relation: unknown = row.movies
    if (relation === null) return []
    const movies = Array.isArray(relation) ? relation : [relation]
    return movies.map((movie: unknown) => {
      if (typeof movie !== 'object' || movie === null || !('tmdb_id' in movie) || typeof movie.tmdb_id !== 'number') {
        throw new Error('Could not read a TMDB movie ID from your watchlist.')
      }
      return movie.tmdb_id
    })
  })
}

export default function Home() {
  const trending = useAsync(() => tmdb.trending(), [])
  const [addedWatchlistCount, setAddedWatchlistCount] = useState(0)
  const { data, loading, error } = useAsync(async () => {
    const [entries, wl, watchlistMovies, prof] = await Promise.all([
      loadDiary(),
      supabase.from('watchlist').select('id', { count: 'exact', head: true }),
      supabase.from('watchlist').select('movies(tmdb_id)'),
      supabase.from('profiles').select('username').maybeSingle(),
    ])
    if (wl.error) throw new Error(wl.error.message)
    if (watchlistMovies.error) throw new Error(watchlistMovies.error.message)
    // The FK normally returns one movie object or null; normalize array-shaped
    // results too, since the untyped Supabase client may infer that shape.
    const watchlistMovieIds = getWatchlistMovieIds(unwrap(watchlistMovies))
    return { entries, watchlist: wl.count ?? 0, watchlistMovieIds, name: unwrap(prof)?.username as string | null }
  })
  const posterUrls = useMemo(() => [...new Set([
    ...(data?.entries ?? []).map(entry => img(entry.movies.poster_path, 'w185')),
    ...(trending.data ?? []).map(movie => img(movie.poster_path, 'w185')),
  ].filter((url): url is string => !!url))], [data?.entries, trending.data])
  const watchlistMovieIds = useMemo(() => new Set(data?.watchlistMovieIds ?? []), [data?.watchlistMovieIds])
  if (loading) return <Spinner />
  if (error || !data) return <ErrorBox msg={error ?? 'Could not load your dashboard.'} />
  const s = computeStats(data.entries)
  const recent = data.entries.slice(0, 6)
  const seen = new Set<string>()
  const favourites = data.entries.filter(e => (e.rating ?? 0) >= 4.5 && !seen.has(e.movie_id) && !!seen.add(e.movie_id)).slice(0, 6)
  const tiles = [['Films watched', s.total], ['On your watchlist', data.watchlist + addedWatchlistCount], ['Average rating', s.avg ? s.avg.toFixed(2) : '–'], ['Hours watched', s.hours]]
  return (
    <div className="home-dashboard space-y-12">
      <section className="home-hero relative isolate overflow-hidden rounded-2xl border border-edge">
        <MoviePosterMosaic posterUrls={posterUrls} />
        <div className="home-hero__content relative z-10 flex min-h-[500px] flex-col justify-center px-6 py-16 sm:px-10 md:min-h-[560px] md:px-14">
          <p className="home-hero__eyebrow mb-4 text-[0.65rem] font-semibold tracking-[0.28em] text-lime sm:text-xs sm:tracking-[0.34em]">A PERSONAL FILM JOURNAL</p>
          <h1 className="home-hero__title max-w-full text-[clamp(2.5rem,7vw,5.25rem)] leading-[0.98] tracking-[0.015em]">A life in film.</h1>
          <p className="mt-5 max-w-xl font-display text-2xl italic text-sand sm:text-3xl">Every film leaves a trace.</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-sand sm:text-base">Your films. Your memories. Your perspective.</p>
          <div className="mt-7 flex flex-wrap gap-3 sm:mt-9">
            <Link to="/discover" className="btn-primary"><Compass size={16} /> Explore Movies</Link>
            <Link to="/diary" className="btn-ghost border-sand/30 bg-ink/35 backdrop-blur-sm"><Plus size={16} /> Open My Diary</Link>
          </div>
        </div>
      </section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-mute">Your collection</p><h2 className="text-2xl sm:text-3xl">Welcome back{data.name ? `, ${data.name}` : ''}.</h2></div>
        <Link to="/discover" className="btn-primary"><Plus size={16} /> Log a movie</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map(([l, v], index) => <div key={l} className="metric-card group card relative overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-lime/25">
          <span className="metric-card__index">0{index + 1}</span>
          <p className="font-display text-3xl font-semibold text-sand sm:text-4xl">{v}</p><p className="mt-1 text-xs uppercase tracking-[0.1em] text-mute sm:text-xs">{l}</p>
        </div>)}
      </div>
      <TrendingMovies
        movies={trending.data}
        loading={trending.loading}
        error={trending.error}
        watchlistMovieIds={watchlistMovieIds}
        onMovieAdded={() => setAddedWatchlistCount(count => count + 1)}
        onRetry={trending.reload}
      />
      <section className="home-section">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-2xl sm:text-3xl">Recently watched</h2><p className="mt-1 text-sm text-mute">The latest chapters in your film diary</p></div>
          {!!recent.length && <Link to="/diary" className="text-sm text-lime transition-colors hover:text-lime-hover">Open diary <span aria-hidden="true">→</span></Link>}
        </div>
        {recent.length ? <Grid>{recent.map(e => <MovieCard key={e.id} tmdbId={e.movies.tmdb_id} title={e.movies.title} path={e.movies.poster_path} date={e.movies.release_date} sub={<span className="mt-1 flex flex-col gap-1"><Stars value={e.rating} size={12} /><span>Watched {new Date(e.watched_on + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></span>} />)}</Grid>
          : <Empty title="Your diary is empty" hint="Find a film you have seen and log it to start your journal." action={<Link to="/discover" className="btn-primary mt-2">Find a movie</Link>} />}
      </section>
      <section className="home-section"><h2 className="mb-4 text-2xl sm:text-3xl">Favourites</h2>
        {favourites.length ? <Grid>{favourites.map(e => <MovieCard key={e.id} tmdbId={e.movies.tmdb_id} title={e.movies.title} path={e.movies.poster_path} date={e.movies.release_date} />)}</Grid>
          : <p className="text-sm text-mute">Films you rate 4.5 stars or higher appear here.</p>}
      </section>
    </div>
  )
}
