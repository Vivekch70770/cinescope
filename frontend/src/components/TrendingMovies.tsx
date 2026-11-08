import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus, Star } from 'lucide-react'
import { ensureMovie, yearOf } from '../lib/tmdb'
import { supabase, unwrap } from '../lib/supabase'
import type { TmdbMovie } from '../types'
import { useAuth } from '../hooks/useAuth'
import { ErrorBox, Poster } from './ui'

interface Props {
  movies: TmdbMovie[] | null
  loading: boolean
  error: string | null
  watchlistMovieIds: ReadonlySet<number>
  onMovieAdded: () => void
  onRetry: () => void
}

export default function TrendingMovies({ movies, loading, error, watchlistMovieIds, onMovieAdded, onRetry }: Props) {
  const { session } = useAuth()
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<Set<number>>(() => new Set())
  const [actionError, setActionError] = useState<string | null>(null)

  async function addToWatchlist(movie: TmdbMovie) {
    if (addingId !== null || watchlistMovieIds.has(movie.id) || addedIds.has(movie.id)) return
    setAddingId(movie.id)
    setActionError(null)
    try {
      if (!session) throw new Error('Sign in to add movies to your watchlist.')
      const movieId = await ensureMovie(movie)
      unwrap(await supabase.from('watchlist').insert({ movie_id: movieId, user_id: session.user.id }).select('id').single())
      setAddedIds(current => new Set(current).add(movie.id))
      onMovieAdded()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : `Could not add ${movie.title} to your watchlist.`)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <section aria-labelledby="trending-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="trending-heading" className="text-2xl">Trending This Week</h2>
          <p className="mt-1 text-sm text-mute">What&apos;s popular right now</p>
        </div>
        <Link to="/discover" className="text-sm text-lime transition-colors hover:text-lime-hover">View all <span aria-hidden="true">→</span></Link>
      </div>
      {error && <div className="mb-4"><ErrorBox msg={error} /><button className="mt-2 text-sm text-lime hover:text-lime-hover" onClick={onRetry}>Try again</button></div>}
      {actionError && <div className="mb-4"><ErrorBox msg={actionError} /></div>}
      {loading ? (
        <div className="trending-carousel" aria-label="Loading trending movies" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="trending-skeleton-card">
            <div className="trending-skeleton" />
            <span className="trending-skeleton__line" />
            <span className="trending-skeleton__line trending-skeleton__line--short" />
          </div>)}
        </div>
      ) : !error && movies?.length ? (
        <div className="trending-carousel" aria-label="Trending movies this week" role="region" aria-roledescription="carousel" tabIndex={0}>
          {movies.slice(0, 20).map((movie, index) => {
            const inWatchlist = watchlistMovieIds.has(movie.id) || addedIds.has(movie.id)
            return (
              <article key={movie.id} className="trending-card">
                <Link to={`/movie/${movie.id}`} className="trending-poster-link" aria-label={`View ${movie.title}`}>
                  <span className="trending-rank">#{index + 1}</span>
                  <Poster path={movie.poster_path} title={movie.title} />
                </Link>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/movie/${movie.id}`} className="line-clamp-1 text-sm font-medium text-sand hover:text-lime">{movie.title}</Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-mute">
                      <span>{yearOf(movie.release_date) || 'Release date TBA'}</span>
                      {movie.vote_average != null && movie.vote_average > 0 && <span className="inline-flex items-center gap-1"><Star size={11} className="fill-lime text-lime" />{movie.vote_average.toFixed(1)}</span>}
                    </div>
                  </div>
                  <button
                    className={`trending-add ${inWatchlist ? 'trending-add--saved' : ''}`}
                    type="button"
                    aria-label={inWatchlist ? `${movie.title} is on your watchlist` : `Add ${movie.title} to watchlist`}
                    title={inWatchlist ? 'On your watchlist' : 'Add to watchlist'}
                    disabled={inWatchlist || addingId !== null}
                    onClick={() => addToWatchlist(movie)}
                  >
                    {inWatchlist ? <Check size={15} /> : addingId === movie.id ? <span className="trending-add__spinner" /> : <Plus size={15} />}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : !error ? <p className="text-sm text-mute">No trending movies are available right now.</p> : null}
    </section>
  )
}
