import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserRound } from 'lucide-react'
import { Empty, ErrorBox, Grid, MovieCard, Spinner } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { img, tmdb } from '../lib/tmdb'
import type { TmdbPersonCredit } from '../types'

type CreditFilter = 'all' | 'acting' | 'crew'

function formatDate(date: string | null) {
  if (!date) return 'Not available'
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function creditTitle(credit: TmdbPersonCredit) {
  return credit.title ?? credit.name ?? 'Untitled'
}

function creditDate(credit: TmdbPersonCredit) {
  return credit.release_date ?? credit.first_air_date ?? null
}

export default function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<CreditFilter>('all')
  const { data, loading, error } = useAsync(async () => {
    const personId = Number(id)
    if (!Number.isInteger(personId) || personId <= 0) throw new Error('Invalid person ID.')
    const [person, credits] = await Promise.all([
      tmdb.personDetails(personId),
      tmdb.personCombinedCredits(personId),
    ])
    return { person, credits }
  }, [id])

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-5 w-28 rounded bg-char" />
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div className="aspect-[3/4] rounded-xl bg-char" />
        <div className="space-y-4 pt-3"><div className="h-10 w-2/3 rounded bg-char" /><div className="h-4 w-1/3 rounded bg-char" /><div className="h-24 rounded bg-char" /></div>
      </div>
      <div className="h-8 w-40 rounded bg-char" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[2/3] rounded-xl bg-char" />)}</div>
    </div>
  )
  if (error || !data) return <ErrorBox msg={error ?? 'Person not found.'} />

  const { person, credits } = data
  const castCredits = credits.cast.filter(credit => credit.media_type === 'movie' && creditTitle(credit) !== 'Untitled')
  const crewCredits = credits.crew.filter(credit => credit.media_type === 'movie' && creditTitle(credit) !== 'Untitled')
  const uniqueCredits = new Map<number, { credit: TmdbPersonCredit; roles: string[] }>()
  for (const credit of [...castCredits, ...crewCredits]) {
    const existing = uniqueCredits.get(credit.id)
    const role = credit.character || credit.job || credit.department
    if (existing) {
      if (role && !existing.roles.includes(role)) existing.roles.push(role)
    } else {
      uniqueCredits.set(credit.id, { credit, roles: role ? [role] : [] })
    }
  }
  const filmography = [...uniqueCredits.values()].sort((a, b) => (creditDate(b.credit) ?? '').localeCompare(creditDate(a.credit) ?? ''))
  const visibleCredits = filter === 'acting' ? castCredits : filter === 'crew' ? crewCredits : filmography.map(item => item.credit)
  const roleFor = (credit: TmdbPersonCredit) => {
    if (filter !== 'all') return credit.character || credit.job || credit.department
    return uniqueCredits.get(credit.id)?.roles.join(', ')
  }

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm text-mute transition-colors hover:text-lime">
        <ArrowLeft size={16} /> Back
      </button>
      <section className="grid gap-6 md:grid-cols-[240px_1fr] md:gap-8">
        <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-xl border border-edge bg-char">
          {img(person.profile_path, 'h632') ? <img src={img(person.profile_path, 'h632')!} alt={person.name} className="aspect-[3/4] w-full object-cover" /> : <div className="flex aspect-[3/4] items-center justify-center text-mute"><UserRound size={56} /></div>}
        </div>
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-lime">Cast &amp; Crew</p>
            <h1 className="mt-2 text-4xl md:text-5xl">{person.name}</h1>
            <p className="mt-2 text-sm text-mute">{person.known_for_department || 'Film professional'}</p>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-mute">Born</dt><dd>{formatDate(person.birthday)}</dd></div>
            <div><dt className="text-mute">Place of birth</dt><dd>{person.place_of_birth || 'Not available'}</dd></div>
            {person.deathday && <div><dt className="text-mute">Died</dt><dd>{formatDate(person.deathday)}</dd></div>}
          </dl>
          <div>
            <h2 className="mb-2 text-xl">Biography</h2>
            <p className="max-w-4xl whitespace-pre-line text-sm leading-relaxed text-sand/90">{person.biography || 'No biography is available for this person.'}</p>
          </div>
        </div>
      </section>

      <section className="mt-12 border-t border-edge pt-8" aria-labelledby="filmography-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="filmography-heading" className="text-2xl">Filmography</h2><p className="mt-1 text-sm text-mute">Movies linked to this person on TMDB.</p></div>
          <div className="flex gap-2" role="group" aria-label="Filter filmography">
            {(['all', 'acting', 'crew'] as const).map(value => <button key={value} type="button" className={filter === value ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilter(value)}>
              {value === 'all' ? 'All' : value === 'acting' ? 'Acting' : 'Crew'}
            </button>)}
          </div>
        </div>
        {visibleCredits.length ? <Grid>{visibleCredits.map((credit, index) => <MovieCard
          key={`${credit.id}-${credit.credit_id}-${index}`}
          tmdbId={credit.id}
          title={creditTitle(credit)}
          path={credit.poster_path}
          date={creditDate(credit)}
          sub={roleFor(credit)}
        />)}</Grid> : <Empty title="No filmography available" hint={filter === 'acting' ? 'No acting credits were found.' : filter === 'crew' ? 'No crew credits were found.' : 'No movie credits were found for this person.'} />}
      </section>
    </div>
  )
}
