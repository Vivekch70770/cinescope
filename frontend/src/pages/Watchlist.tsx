import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { supabase, unwrap } from '../lib/supabase'
import { toTmdb } from '../lib/tmdb'
import type { Movie } from '../types'
import { Empty, ErrorBox, Grid, MovieCard, Page, Spinner } from '../components/ui'
import LogModal from '../components/LogModal'

interface Row { id: string; movies: Movie }

export default function Watchlist() {
  const { data, loading, error, reload } = useAsync(async () => unwrap(await supabase.from('watchlist').select('id, movies(*)').order('created_at', { ascending: false })) as unknown as Row[], [])
  const [q, setQ] = useState('')
  const [genre, setGenre] = useState('')
  const [log, setLog] = useState<Row | null>(null)
  const [err, setErr] = useState<string | null>(null)
  async function remove(id: string) {
    try { unwrap(await supabase.from('watchlist').delete().eq('id', id).select('id')); setErr(null); reload() }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not remove this movie.') }
  }
  if (loading) return <Spinner />
  if (error || !data) return <ErrorBox msg={error ?? 'Could not load your watchlist.'} />
  const genres = [...new Set(data.flatMap(r => r.movies.genres))].sort()
  const shown = data.filter(r => r.movies.title.toLowerCase().includes(q.toLowerCase()) && (!genre || r.movies.genres.includes(genre)))
  return (
    <Page title="Watchlist" sub={`${data.length} to watch`}>
      {err && <div className="mb-4"><ErrorBox msg={err} /></div>}
      {!data.length ? <Empty title="Nothing on your watchlist" hint="Add films from their detail pages." action={<Link to="/discover" className="btn-primary mt-2">Discover movies</Link>} /> : <>
        <div className="mb-6 flex flex-wrap gap-3 rounded-xl border border-edge/70 bg-char/75 p-4"><input className="input max-w-xs" placeholder="Search your watchlist" value={q} onChange={e => setQ(e.target.value)} aria-label="Search watchlist" />
          <select className="input max-w-xs" value={genre} onChange={e => setGenre(e.target.value)} aria-label="Genre"><option value="">All genres</option>{genres.map(g => <option key={g}>{g}</option>)}</select></div>
        {shown.length ? <Grid>{shown.map(r => (
          <div key={r.id}><MovieCard tmdbId={r.movies.tmdb_id} title={r.movies.title} path={r.movies.poster_path} date={r.movies.release_date} />
            <div className="mt-2 flex gap-2"><button className="btn-primary flex-1 px-2 py-1 text-xs" onClick={() => setLog(r)}><Check size={12} /> Watched</button><button className="btn-ghost px-2 py-1" aria-label={`Remove ${r.movies.title}`} onClick={() => remove(r.id)}><X size={12} /></button></div></div>))}</Grid>
          : <p className="text-sm text-mute">No watchlist movies match your search.</p>}</>}
      {log && <LogModal movie={toTmdb(log.movies)} onClose={() => setLog(null)} onSaved={async () => { const r = log; setLog(null); await remove(r.id) }} />}
    </Page>
  )
}
