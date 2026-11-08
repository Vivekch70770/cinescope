import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, X } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { supabase, unwrap } from '../lib/supabase'
import { ensureMovie, tmdb, tmdbEnabled } from '../lib/tmdb'
import { useAuth } from '../hooks/useAuth'
import type { Movie, TmdbMovie } from '../types'
import { Empty, ErrorBox, Grid, MovieCard, Page, Poster, Spinner } from '../components/ui'

interface Col { id: string; name: string; description: string | null; collection_movies: { movies: Movie | null }[] }

export default function Collections() {
  const { id } = useParams()
  return id ? <Detail id={id} /> : <List />
}

function List() {
  const { session } = useAuth()
  const { data, loading, error, reload } = useAsync(async () => unwrap(await supabase.from('collections').select('id, name, description, collection_movies(movies(*))').order('created_at', { ascending: false })) as unknown as Col[], [])
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [err, setErr] = useState<string | null>(null)
  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setErr('Give the collection a name.')
    try { unwrap(await supabase.from('collections').insert({ name: name.trim(), description: desc.trim() || null, user_id: session!.user.id }).select('id').single()); setName(''); setDesc(''); setErr(null); reload() }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not create the collection.') }
  }
  if (loading) return <Spinner />
  if (error || !data) return <ErrorBox msg={error ?? 'Could not load collections.'} />
  return (
    <Page title="Collections" sub="Group films your own way.">
      <form onSubmit={create} className="card mb-8 grid gap-3 md:grid-cols-[1fr_1.5fr_auto]">
        <input className="input" placeholder="Collection name, e.g. Comfort Movies" value={name} onChange={e => setName(e.target.value)} aria-label="Collection name" />
        <input className="input" placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} aria-label="Description" />
        <button className="btn-primary"><Plus size={16} /> Create</button>
        {err && <div className="md:col-span-3"><ErrorBox msg={err} /></div>}
      </form>
      {!data.length ? <Empty title="No collections yet" hint="Create one above, then add films from its page." /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map(c => { const ms = c.collection_movies.map(x => x.movies).filter((m): m is Movie => !!m); return (
            <Link key={c.id} to={`/collections/${c.id}`} className="collection-card card block transition duration-300 hover:-translate-y-1 hover:border-lime/40 hover:shadow-[0_18px_40px_rgba(0,0,0,0.26)]">
              <div className="mb-3 grid grid-cols-4 gap-1">{ms.slice(0, 4).map(m => <Poster key={m.id} path={m.poster_path} title={m.title} className="rounded" />)}{!ms.length && <div className="col-span-4 h-24 rounded border border-dashed border-edge" />}</div>
              <h3 className="text-2xl text-sand">{c.name}</h3><p className="mt-1 text-xs text-mute">{ms.length} {ms.length === 1 ? 'film' : 'films'}{c.description ? ` · ${c.description}` : ''}</p>
            </Link>) })}
        </div>)}
    </Page>
  )
}

function Detail({ id }: { id: string }) {
  const nav = useNavigate()
  const { data, loading, error, reload } = useAsync(async () => unwrap(await supabase.from('collections').select('id, name, description, collection_movies(id, movies(*))').eq('id', id).maybeSingle()) as unknown as (Omit<Col, 'collection_movies'> & { collection_movies: { id: string; movies: Movie }[] }) | null, [id])
  const [name, setName] = useState<string | null>(null)
  const [desc, setDesc] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<TmdbMovie[]>([])
  const [err, setErr] = useState<string | null>(null)
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); setErr(null); reload() } catch (x) { setErr(x instanceof Error ? x.message : 'Something went wrong.') } }
  if (loading) return <Spinner />
  if (error) return <ErrorBox msg={error} />
  if (!data) return <Empty title="Collection not found" action={<Link to="/collections" className="btn-ghost mt-2">Back to collections</Link>} />
  const have = new Set(data.collection_movies.map(c => c.movies.tmdb_id))
  return (
    <Page title={data.name} sub={data.description ?? undefined} actions={<Link to="/collections" className="btn-ghost">All collections</Link>}>
      {err && <div className="mb-4"><ErrorBox msg={err} /></div>}
      <div className="card mb-6 grid gap-3 md:grid-cols-[1fr_1.5fr_auto_auto]">
        <input className="input" value={name ?? data.name} onChange={e => setName(e.target.value)} aria-label="Name" />
        <input className="input" value={desc ?? data.description ?? ''} onChange={e => setDesc(e.target.value)} aria-label="Description" />
        <button className="btn-primary" onClick={() => { const n = (name ?? data.name).trim(); if (!n) return setErr('Name cannot be empty.'); run(async () => { unwrap(await supabase.from('collections').update({ name: n, description: (desc ?? data.description ?? '').trim() || null }).eq('id', id).select('id').single()); setName(null); setDesc(null) }) }}>Save</button>
        <button className="btn-danger" onClick={() => { if (confirm('Delete this collection? Films stay in your diary.')) run(async () => { unwrap(await supabase.from('collections').delete().eq('id', id).select('id')); nav('/collections') }) }}><Trash2 size={14} /> Delete</button>
      </div>
      <div className="card mb-8 space-y-3">
        <form className="flex gap-2" onSubmit={async e => { e.preventDefault(); if (!q.trim()) return; try { setResults((await tmdb.search(q.trim())).slice(0, 8)); setErr(null) } catch (x) { setErr(x instanceof Error ? x.message : 'Search failed.') } }}>
          <input className="input" placeholder={tmdbEnabled ? 'Search a movie to add' : 'Search (demo mode: sample titles)'} value={q} onChange={e => setQ(e.target.value)} aria-label="Search movies to add" /><button className="btn-ghost">Search</button></form>
        {results.length > 0 && <ul className="divide-y divide-edge">{results.map(m => (
          <li key={m.id} className="flex items-center justify-between py-2 text-sm"><span>{m.title} <span className="text-mute">{m.release_date?.slice(0, 4)}</span></span>
            {have.has(m.id) ? <span className="text-mute">Added</span> : <button className="btn-ghost px-2 py-1 text-xs" onClick={() => run(async () => { const mid = await ensureMovie(m); unwrap(await supabase.from('collection_movies').insert({ collection_id: id, movie_id: mid }).select('id').single()) })}><Plus size={12} /> Add</button>}</li>))}</ul>}
      </div>
      {!data.collection_movies.length ? <Empty title="This collection is empty" hint="Search above to add your first film." /> : (
        <Grid>{data.collection_movies.map(c => (
          <div key={c.id}><MovieCard tmdbId={c.movies.tmdb_id} title={c.movies.title} path={c.movies.poster_path} date={c.movies.release_date} />
            <button className="btn-ghost mt-2 w-full px-2 py-1 text-xs" onClick={() => run(async () => { unwrap(await supabase.from('collection_movies').delete().eq('id', c.id).select('id')) })}><X size={12} /> Remove</button></div>))}</Grid>)}
    </Page>
  )
}
