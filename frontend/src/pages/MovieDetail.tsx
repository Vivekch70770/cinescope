import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Check, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { ensureMovie, img, tmdb, yearOf } from '../lib/tmdb'
import { supabase, unwrap } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ErrorBox, Poster, Spinner, Stars } from '../components/ui'
import LogModal from '../components/LogModal'
import type { TmdbCrewMember } from '../types'

const CREW_GROUPS = [
  { title: 'Director', jobs: ['Director'] },
  { title: 'Writers', jobs: ['Writer', 'Screenplay', 'Story', 'Screenstory', 'Teleplay'] },
  { title: 'Producers', jobs: ['Producer', 'Executive Producer', 'Co-Producer'] },
  { title: 'Key crew', jobs: ['Director of Photography', 'Cinematography', 'Editor', 'Original Music Composer', 'Music', 'Production Design', 'Costume Design'] },
]

export default function MovieDetail() {
  const { id } = useParams()
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [castExpanded, setCastExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actErr, setActErr] = useState<string | null>(null)
  const { data, loading, error, reload } = useAsync(async () => {
    const movie = await tmdb.detail(Number(id))
    const row = unwrap(await supabase.from('movies').select('id').eq('tmdb_id', movie.id).maybeSingle())
    let onList = false, myRating: number | null = null
    if (row) {
      onList = !!unwrap(await supabase.from('watchlist').select('id').eq('movie_id', row.id).maybeSingle())
      const last = unwrap(await supabase.from('diary_entries').select('rating').eq('movie_id', row.id).order('watched_on', { ascending: false }).limit(1)) as { rating: number | null }[]
      myRating = last[0]?.rating ?? null
    }
    return { movie, rowId: row?.id as string | undefined, onList, myRating }
  }, [id])
  const credits = useAsync(() => tmdb.movieCredits(Number(id)), [id])
  if (loading) return <Spinner />
  if (error || !data) return <ErrorBox msg={error ?? 'Movie not found.'} />
  const { movie: m } = data
  const bd = img(m.backdrop_path, 'w1280')

  async function toggleWatchlist() {
    setBusy(true); setActErr(null)
    try {
      const movieId = await ensureMovie(m)
      if (data!.onList) unwrap(await supabase.from('watchlist').delete().eq('movie_id', movieId).select('id'))
      else unwrap(await supabase.from('watchlist').insert({ movie_id: movieId, user_id: session!.user.id }).select('id').single())
      reload()
    } catch (e) { setActErr(e instanceof Error ? e.message : 'Watchlist update failed.') }
    setBusy(false)
  }

  return (
    <div>
      {bd && <div className="-mx-4 -mt-8 mb-6 h-64 bg-cover bg-center sm:h-80 lg:h-[28rem]" style={{ backgroundImage: `linear-gradient(to top, #0D0D0F 2%, rgba(13,13,15,.55) 54%, rgba(13,13,15,.18)), url(${bd})` }} />}
      <div className="relative grid gap-6 md:-mt-32 md:grid-cols-[240px_minmax(0,1fr)] md:items-end md:gap-9">
        <div className="mx-auto w-full max-w-[240px] md:mx-0"><Poster path={m.poster_path} title={m.title} className="rounded-xl shadow-2xl" /></div>
        <div className="space-y-4 pb-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">Now showing in your journal</p>
          <h1 className="text-4xl font-semibold leading-[0.96] text-sand sm:text-5xl lg:text-6xl">{m.title} <span className="whitespace-nowrap text-2xl font-normal text-mute sm:text-3xl">{yearOf(m.release_date)}</span></h1>
          <p className="text-sm tracking-wide text-mute">{[m.release_date, m.runtime ? `${m.runtime} min` : null, m.genres?.map(g => g.name).join(' · ')].filter(Boolean).join('  /  ')}</p>
          <p className="max-w-3xl leading-relaxed text-sand/90">{m.overview || 'No overview available.'}</p>
          <dl className="grid max-w-2xl gap-3 border-y border-edge/80 py-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs uppercase tracking-wider text-mute">Director</dt><dd className="mt-1">{m.director ?? 'Unknown'}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-mute">TMDB rating</dt><dd className="mt-1">{m.vote_average ? `${m.vote_average.toFixed(1)} / 10` : 'Not available'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-mute">Cast</dt><dd className="mt-1">{m.cast?.length ? m.cast.join(', ') : 'Not available'}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-mute">Your rating</dt><dd className="mt-1">{data.myRating ? <Stars value={data.myRating} /> : 'Not rated yet'}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="btn-primary" onClick={() => setOpen(true)}><Check size={16} /> Log as watched</button>
            <button className="btn-ghost" disabled={busy} onClick={toggleWatchlist}>{data.onList ? <><BookmarkCheck size={16} /> On watchlist (remove)</> : <><Bookmark size={16} /> Add to watchlist</>}</button>
          </div>
          {actErr && <ErrorBox msg={actErr} />}
        </div>
      </div>
      <section className="mt-12 border-t border-edge pt-8" aria-labelledby="cast-crew-heading">
        <div className="mb-6 flex items-center gap-3">
          <Users className="text-lime" size={21} />
          <div>
            <h2 id="cast-crew-heading" className="text-2xl">Cast &amp; Crew</h2>
            <p className="mt-1 text-sm text-mute">The people who brought {m.title} to life.</p>
          </div>
        </div>
        {credits.loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" aria-label="Loading cast and crew">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="animate-pulse rounded-xl border border-edge bg-char p-3">
              <div className="aspect-[3/4] rounded-lg bg-night" /><div className="mt-3 h-3 w-3/4 rounded bg-night" /><div className="mt-2 h-3 w-1/2 rounded bg-night" />
            </div>)}
          </div>
        ) : credits.error ? <ErrorBox msg={credits.error} /> : (
          <div className="space-y-8">
            {credits.data?.cast.length ? (
              <div>
                <h3 className="mb-3 text-lg text-sand">Cast</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {credits.data.cast.slice(0, castExpanded ? undefined : 12).map((person, index) => (
                    <Link key={`${person.id}-${person.credit_id}-${index}`} to={`/person/${person.id}`} className="group rounded-xl border border-edge bg-char p-3 transition-colors hover:border-lime/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime">
                      <div className="aspect-[3/4] overflow-hidden rounded-lg bg-night">
                        {img(person.profile_path, 'w342') ? <img src={img(person.profile_path, 'w342')!} alt={person.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-mute">No photo</div>}
                      </div>
                      <p className="mt-3 line-clamp-1 text-sm font-medium text-sand group-hover:text-lime">{person.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-mute">{person.character || 'Cast'}</p>
                    </Link>
                  ))}
                </div>
                {credits.data.cast.length > 12 && <button className="btn-ghost mt-4" onClick={() => setCastExpanded(value => !value)} aria-expanded={castExpanded}>
                  {castExpanded ? <><ChevronUp size={16} /> Show Less</> : <><ChevronDown size={16} /> View All Cast ({credits.data.cast.length})</>}
                </button>}
              </div>
            ) : <p className="text-sm text-mute">Cast information is not available.</p>}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {CREW_GROUPS.map(group => {
                const members = credits.data?.crew.filter(member =>
                  group.jobs.includes(member.job) ||
                  (group.title === 'Writers' && member.department === 'Writing') ||
                  (group.title === 'Producers' && /producer/i.test(member.job)),
                ) ?? []
                if (!members.length) return null
                return <div key={group.title}>
                  <h3 className="mb-2 text-base text-sand">{group.title}</h3>
                  <ul className="space-y-2">
                    {members.map((member, index) => <CrewLink key={`${member.id}-${member.credit_id}-${index}`} member={member} />)}
                  </ul>
                </div>
              })}
            </div>
            {!credits.data?.cast.length && !credits.data?.crew.length && <p className="text-sm text-mute">Cast and crew details are not available for this title.</p>}
          </div>
        )}
      </section>
      {open && <LogModal movie={m} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload() }} />}
    </div>
  )
}

function CrewLink({ member }: { member: TmdbCrewMember }) {
  return <li><Link to={`/person/${member.id}`} className="text-sm text-sand transition-colors hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime">
    {member.name}<span className="ml-1 text-xs text-mute">· {member.job}</span>
  </Link></li>
}
