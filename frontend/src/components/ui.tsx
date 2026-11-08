import { Star, Loader2, Film } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { img, yearOf } from '../lib/tmdb'

export const Spinner = () => <div className="flex justify-center py-16 text-lime"><Loader2 className="animate-spin" /></div>
export const ErrorBox = ({ msg }: { msg: string }) => <div role="alert" className="rounded-xl border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-200">{msg}</div>
export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="card flex flex-col items-center gap-2 py-12 text-center"><Film className="text-lime" /><h3 className="text-lg text-sand">{title}</h3>
    {hint && <p className="max-w-sm text-sm text-mute">{hint}</p>}{action}</div>
)
export const Page = ({ title, sub, actions, children }: { title: string; sub?: string; actions?: ReactNode; children: ReactNode }) => (
  <section className="page-shell"><div className="page-heading mb-8 flex flex-wrap items-end justify-between gap-4">
    <div><p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-lime">Cinescope journal</p><h1 className="text-4xl font-semibold leading-none text-sand md:text-5xl">{title}</h1>{sub && <p className="mt-3 text-sm text-mute">{sub}</p>}</div>{actions}</div>{children}</section>
)

export function Poster({ path, title, className = '' }: { path: string | null; title: string; className?: string }) {
  const src = img(path)
  return (
    <div className={`poster-shell ${className}`}>
      {src ? <img src={src} alt={`${title} poster`} loading="lazy" />
        : <div className="flex h-full w-full items-center justify-center bg-night p-3 text-center font-display text-sm text-mute">{title}</div>}
    </div>
  )
}

export function MovieCard({ tmdbId, title, path, date, sub }: { tmdbId: number; title: string; path: string | null; date?: string | null; sub?: ReactNode }) {
  return (
    <Link to={`/movie/${tmdbId}`} className="movie-card group block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime">
      <Poster path={path} title={title} />
      <p className="mt-2 line-clamp-1 text-sm font-medium text-sand transition-colors group-hover:text-lime">{title}</p>
      <p className="mt-0.5 text-xs text-mute">{yearOf(date)} {sub}</p>
    </Link>
  )
}
export const Grid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{children}</div>

export function Stars({ value, onChange, size = 20 }: { value: number | null; onChange?: (v: number | null) => void; size?: number }) {
  const v = value ?? 0
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`Rating ${v} out of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star size={size} className="absolute text-edge" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, v - (i - 1))) * 100}%` }}>
            <Star size={size} className="fill-lime text-lime" />
          </span>
          {onChange && <>
            <button type="button" aria-label={`${i - 0.5} stars`} className="absolute inset-y-0 left-0 w-1/2" onClick={() => onChange(v === i - 0.5 ? null : i - 0.5)} />
            <button type="button" aria-label={`${i} stars`} className="absolute inset-y-0 right-0 w-1/2" onClick={() => onChange(v === i ? null : i)} />
          </>}
        </span>
      ))}
    </div>
  )
}
