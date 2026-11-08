import { supabase, unwrap } from './supabase'
import type { DiaryEntry } from '../types'

export async function loadDiary(): Promise<DiaryEntry[]> {
  return unwrap(await supabase.from('diary_entries').select('*, movies(*)').order('watched_on', { ascending: false }).order('created_at', { ascending: false })) as DiaryEntry[]
}

export function computeStats(entries: DiaryEntry[]) {
  const rated = entries.filter(e => e.rating != null)
  const avg = rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : null
  const minutes = entries.reduce((s, e) => s + (e.movies.runtime ?? 0), 0)
  const tally = (keys: string[]) => Object.entries(keys.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] ?? 0) + 1), a), {})).map(([name, count]) => ({ name, count }))
  const genres = tally(entries.flatMap(e => e.movies.genres)).sort((a, b) => b.count - a.count).slice(0, 8)
  const directors = tally(entries.map(e => e.movies.director).filter((d): d is string => !!d)).sort((a, b) => b.count - a.count).slice(0, 8)
  const perMonth = tally(entries.map(e => e.watched_on.slice(0, 7))).sort((a, b) => a.name.localeCompare(b.name)).slice(-12)
  const perYear = tally(entries.map(e => e.watched_on.slice(0, 4))).sort((a, b) => a.name.localeCompare(b.name))
  const topRated = [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8)
  return { total: entries.length, avg, hours: Math.round((minutes / 60) * 10) / 10, genres, directors, perMonth, perYear,
    rewatches: entries.filter(e => e.is_rewatch).length, topRated }
}
