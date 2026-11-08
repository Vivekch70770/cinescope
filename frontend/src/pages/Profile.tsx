import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { computeStats, loadDiary } from '../lib/data'
import { supabase, unwrap } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Profile as P } from '../types'
import { Empty, ErrorBox, Grid, MovieCard, Page, Spinner } from '../components/ui'

export default function Profile() {
  const { session } = useAuth()
  const { data, loading, error, reload } = useAsync(async () => {
    const profile = unwrap(await supabase.from('profiles').select('*').eq('id', session!.user.id).maybeSingle()) as P | null
    const [entries, collections] = await Promise.all([
      loadDiary(),
      supabase.from('collections').select('id, name').order('created_at', { ascending: false }).limit(4),
    ])
    const collectionRows = unwrap(collections) as { id: string; name: string }[]
    return { profile, entries, stats: computeStats(entries), collections: collectionRows }
  }, [])
  const [form, setForm] = useState<{ username: string; avatar: string; bio: string; genres: string } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  if (loading) return <Spinner />
  if (error || !data) return <ErrorBox msg={error ?? 'Could not load your profile.'} />
  const p = data.profile
  const f = form ?? { username: p?.username ?? '', avatar: p?.avatar_url ?? '', bio: p?.bio ?? '', genres: (p?.favourite_genres ?? []).join(', ') }
  const set = (k: keyof typeof f, v: string) => setForm({ ...f, [k]: v })
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (f.username && f.username.trim().length < 2) return setMsg({ ok: false, text: 'Username needs at least 2 characters.' })
    try {
      unwrap(await supabase.from('profiles').upsert({ id: session!.user.id, username: f.username.trim() || null, avatar_url: f.avatar.trim() || null, bio: f.bio.trim() || null, favourite_genres: f.genres.split(',').map(g => g.trim()).filter(Boolean) }).select('id').single())
      setMsg({ ok: true, text: 'Profile saved.' }); setForm(null); reload()
    } catch (x) { const t = x instanceof Error ? x.message : 'Could not save.'; setMsg({ ok: false, text: t.includes('duplicate') ? 'That username is taken.' : t }) }
  }
  const s = data.stats
  const seen = new Set<string>()
  const favourites = data.entries.filter(entry =>
    (entry.rating ?? 0) >= 4.5 && !seen.has(entry.movie_id) && !!seen.add(entry.movie_id),
  ).slice(0, 4)
  return (
    <Page title="My Profile" sub="A portrait of your life in film.">
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="card space-y-4 text-center">
          {f.avatar ? <img src={f.avatar} alt="Avatar" className="mx-auto h-28 w-28 rounded-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
            : <div className="mx-auto grid h-28 w-28 place-items-center rounded-full border border-edge bg-ink font-display text-4xl text-lime">{(f.username || session?.user.email || '?')[0].toUpperCase()}</div>}
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-lime">The viewer</p>
          <h2 className="text-3xl text-sand">{p?.username || 'Unnamed viewer'}</h2>
          <p className="text-sm text-mute">{p?.bio || 'No bio yet.'}</p>
          {!!p?.favourite_genres.length && <p className="text-xs text-lime">{p.favourite_genres.join(', ')}</p>}
          <div className="grid grid-cols-3 gap-2 border-t border-edge pt-4 text-xs uppercase tracking-wide text-mute"><div><b className="mb-1 block font-display text-2xl text-sand">{s.total}</b>films</div><div><b className="mb-1 block font-display text-2xl text-sand">{s.avg ? s.avg.toFixed(2) : '–'}</b>avg</div><div><b className="mb-1 block font-display text-2xl text-sand">{s.hours}</b>hours</div></div>
        </div>
        <form onSubmit={save} className="card space-y-4">
          <div><h2 className="text-2xl text-sand">Your details</h2><p className="mt-1 text-sm text-mute">Shape the profile that accompanies your film journal.</p></div>
          <label className="block text-sm">Username<input className="input mt-1" value={f.username} maxLength={30} onChange={e => set('username', e.target.value)} /></label>
          <label className="block text-sm">Avatar image URL<input className="input mt-1" type="url" placeholder="https://..." value={f.avatar} onChange={e => set('avatar', e.target.value)} /></label>
          <label className="block text-sm">Short bio<textarea className="input mt-1" maxLength={280} value={f.bio} onChange={e => set('bio', e.target.value)} /></label>
          <label className="block text-sm">Favourite genres (comma separated)<input className="input mt-1" placeholder="Sci-Fi, Drama" value={f.genres} onChange={e => set('genres', e.target.value)} /></label>
          {msg && <div role="alert" className={`rounded-lg border p-3 text-sm ${msg.ok ? 'border-lime/40 text-lime' : 'border-red-900 bg-red-950/40 text-red-200'}`}>{msg.text}</div>}
          <button className="btn-primary">Save profile</button>
        </form>
      </div>
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-3xl text-sand">Personal favourites</h2><p className="mt-1 text-sm text-mute">Films you have rated 4.5 stars or higher.</p></div><Link to="/diary" className="text-sm text-lime hover:text-lime-hover">Your diary →</Link></div>
        {favourites.length ? <Grid>{favourites.map(entry => <MovieCard key={entry.id} tmdbId={entry.movies.tmdb_id} title={entry.movies.title} path={entry.movies.poster_path} date={entry.movies.release_date} />)}</Grid>
          : <Empty title="Your favourites are waiting" hint="Give a film 4.5 stars or more in your diary to feature it here." />}
      </section>
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-3xl text-sand">Your collections</h2><p className="mt-1 text-sm text-mute">Curated shelves from your film library.</p></div><Link to="/collections" className="text-sm text-lime hover:text-lime-hover">All collections →</Link></div>
        {data.collections.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.collections.map(collection => <Link key={collection.id} to={`/collections/${collection.id}`} className="card transition-colors hover:border-lime/40"><p className="font-display text-xl text-sand">{collection.name}</p><p className="mt-1 text-xs uppercase tracking-wide text-mute">Open collection →</p></Link>)}</div>
          : <Empty title="No collections yet" hint="Create a collection to organize films into your own personal shelves." action={<Link to="/collections" className="btn-ghost mt-2">Create a collection</Link>} />}
      </section>
    </Page>
  )
}
