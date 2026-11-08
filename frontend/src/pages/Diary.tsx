import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Repeat, Trash2 } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { loadDiary } from '../lib/data'
import { supabase, unwrap } from '../lib/supabase'
import { toTmdb } from '../lib/tmdb'
import type { DiaryEntry } from '../types'
import { Empty, ErrorBox, Page, Poster, Spinner, Stars } from '../components/ui'
import LogModal from '../components/LogModal'

export default function Diary() {
  const { data, loading, error, reload } = useAsync(loadDiary, [])
  const [edit, setEdit] = useState<DiaryEntry | null>(null)
  const [err, setErr] = useState<string | null>(null)
  async function del(e: DiaryEntry) {
    if (!confirm(`Delete your entry for ${e.movies.title}?`)) return
    try { unwrap(await supabase.from('diary_entries').delete().eq('id', e.id).select('id')); setErr(null); reload() }
    catch (x) { setErr(x instanceof Error ? x.message : 'Could not delete the entry.') }
  }
  if (loading) return <Spinner />
  if (error || !data) return <ErrorBox msg={error ?? 'Could not load your diary.'} />
  return (
    <Page title="My Diary" sub={`${data.length} ${data.length === 1 ? 'entry' : 'entries'}`}>
      {err && <div className="mb-4"><ErrorBox msg={err} /></div>}
      {!data.length ? <Empty title="No entries yet" hint="Open any movie and choose Log as watched." action={<Link to="/discover" className="btn-primary mt-2">Browse movies</Link>} /> : (
        <ul className="relative space-y-4 before:absolute before:bottom-5 before:left-[2.4rem] before:top-5 before:w-px before:bg-edge/80">
          {data.map(e => (
            <li key={e.id} className="card relative flex gap-4 sm:gap-5">
              <span className="absolute left-[2.08rem] top-8 z-10 h-3 w-3 rounded-full border-2 border-ink bg-lime shadow-[0_0_0_4px_rgba(184,50,50,0.12)]" />
              <Link to={`/movie/${e.movies.tmdb_id}`} className="relative z-20 ml-7 w-20 shrink-0 sm:w-24"><Poster path={e.movies.poster_path} title={e.movies.title} /></Link>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><Link to={`/movie/${e.movies.tmdb_id}`} className="font-display text-2xl font-semibold text-sand hover:text-lime">{e.movies.title}</Link>
                  <span className="text-xs uppercase tracking-wide text-mute">{new Date(e.watched_on + 'T00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  {e.is_rewatch && <span className="inline-flex items-center gap-1 rounded-full border border-lime/25 bg-lime/10 px-2 py-1 text-[0.68rem] font-medium uppercase tracking-wide text-lime"><Repeat size={12} /> Rewatch</span>}</div>
                <Stars value={e.rating} size={16} />
                {e.review && <p className="border-l-2 border-lime/45 pl-3 text-sm leading-relaxed text-sand/90">{e.review}</p>}
                {e.notes && <p className="text-xs italic text-mute">Private note: {e.notes}</p>}
              </div>
              <div className="flex flex-col gap-2"><button className="btn-ghost px-2" aria-label="Edit entry" onClick={() => setEdit(e)}><Pencil size={14} /></button><button className="btn-danger px-2" aria-label="Delete entry" onClick={() => del(e)}><Trash2 size={14} /></button></div>
            </li>
          ))}
        </ul>
      )}
      {edit && <LogModal movie={toTmdb(edit.movies)} entry={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </Page>
  )
}
