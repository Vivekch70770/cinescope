import { useState } from 'react'
import { X } from 'lucide-react'
import type { DiaryEntry, TmdbMovie } from '../types'
import { supabase, unwrap } from '../lib/supabase'
import { ensureMovie, yearOf } from '../lib/tmdb'
import { useAuth } from '../hooks/useAuth'
import { Stars } from './ui'

interface Props { movie: TmdbMovie; entry?: DiaryEntry; onClose: () => void; onSaved: () => void }

export default function LogModal({ movie, entry, onClose, onSaved }: Props) {
  const { session } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(entry?.watched_on ?? today)
  const [rating, setRating] = useState<number | null>(entry?.rating ?? null)
  const [review, setReview] = useState(entry?.review ?? '')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [rewatch, setRewatch] = useState(entry?.is_rewatch ?? false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return setErr('Choose the date you watched it.')
    if (date > today) return setErr('The watch date cannot be in the future.')
    setBusy(true); setErr(null)
    try {
      const payload = { watched_on: date, rating, review: review.trim() || null, notes: notes.trim() || null, is_rewatch: rewatch }
      if (entry) unwrap(await supabase.from('diary_entries').update(payload).eq('id', entry.id).select('id').single())
      else {
        const movie_id = await ensureMovie(movie)
        unwrap(await supabase.from('diary_entries').insert({ ...payload, movie_id, user_id: session!.user.id }).select('id').single())
      }
      onSaved()
    } catch (x) { setErr(x instanceof Error ? x.message : 'Could not save this entry.'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Log a movie">
      <form onSubmit={save} className="card max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-xl">{entry ? 'Edit entry' : 'Log a movie'}</h2><p className="text-sm text-mute">{movie.title} {yearOf(movie.release_date) && `(${yearOf(movie.release_date)})`}</p></div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-mute hover:text-sand"><X /></button>
        </div>
        <label className="block text-sm">Date watched<input type="date" max={today} className="input mt-1" value={date} onChange={e => setDate(e.target.value)} required /></label>
        <div className="text-sm">Rating<div className="mt-1 flex items-center gap-3"><Stars value={rating} onChange={setRating} size={28} /><span className="text-mute">{rating ? `${rating} / 5` : 'Not rated'}</span></div></div>
        <label className="block text-sm">Review<textarea className="input mt-1 min-h-24" value={review} onChange={e => setReview(e.target.value)} placeholder="What did you think?" /></label>
        <label className="block text-sm">Private notes<textarea className="input mt-1" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Only you can see this" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rewatch} onChange={e => setRewatch(e.target.checked)} /> This was a rewatch</label>
        {err && <div role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{err}</div>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : entry ? 'Save changes' : 'Log movie'}</button></div>
      </form>
    </div>
  )
}
