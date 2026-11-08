import { useState } from 'react'
import { Search } from 'lucide-react'
import { useAsync } from '../hooks/useAsync'
import { tmdb, tmdbEnabled } from '../lib/tmdb'
import { Empty, ErrorBox, Grid, MovieCard, Page, Spinner } from '../components/ui'
import type { TmdbMovie } from '../types'

const LANGS: [string, string][] = [['en', 'English'], ['hi', 'Hindi'], ['te', 'Telugu'], ['ta', 'Tamil'], ['ko', 'Korean'], ['ja', 'Japanese'], ['fr', 'French'], ['es', 'Spanish'], ['it', 'Italian'], ['de', 'German']]

export default function Discover() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [genre, setGenre] = useState('')
  const [year, setYear] = useState('')
  const [lang, setLang] = useState('')
  const genres = useAsync(() => tmdb.genres(), [])
  const filtering = !!(q || genre || year || lang)
  const res = useAsync<{ results: TmdbMovie[]; trending: TmdbMovie[] }>(async () => {
    if (!filtering) { const [popular, trending] = await Promise.all([tmdb.popular(), tmdb.trending()]); return { results: popular, trending } }
    let results = q ? await tmdb.search(q, year || undefined) : await tmdb.discover({ genre, year, lang })
    if (q) results = results.filter(m => (!genre || m.genre_ids?.includes(Number(genre))) && (!lang || m.original_language === lang))
    return { results, trending: [] }
  }, [q, genre, year, lang])
  const years = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - i))
  const list = (m: TmdbMovie[]) => <Grid>{m.slice(0, 18).map(x => <MovieCard key={x.id} tmdbId={x.id} title={x.title} path={x.poster_path} date={x.release_date} sub={x.vote_average ? `· ★ ${x.vote_average.toFixed(1)}` : ''} />)}</Grid>
  return (
    <Page title="Discover" sub={tmdbEnabled ? 'Search the full TMDB catalogue.' : 'Demo mode: sample titles only.'}>
      <form onSubmit={e => { e.preventDefault(); setQ(input.trim()) }} className="mb-8 grid gap-3 rounded-xl border border-edge/70 bg-char/75 p-4 sm:p-5 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(130px,auto))_auto]">
        <div className="relative"><Search size={17} className="absolute left-3 top-3 text-mute" /><input className="input pl-10" placeholder="Search the film library" value={input} onChange={e => setInput(e.target.value)} aria-label="Search movies" /></div>
        <select className="input" value={genre} onChange={e => setGenre(e.target.value)} aria-label="Genre"><option value="">All genres</option>{(genres.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <select className="input" value={year} onChange={e => setYear(e.target.value)} aria-label="Year"><option value="">Any year</option>{years.map(y => <option key={y}>{y}</option>)}</select>
        <select className="input" value={lang} onChange={e => setLang(e.target.value)} aria-label="Language"><option value="">Any language</option>{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
        <button className="btn-primary">Search</button>
      </form>
      {res.loading ? <Spinner /> : res.error ? <ErrorBox msg={res.error} /> : !res.data ? null : filtering ? (
        res.data.results.length ? <><h2 className="mb-4 text-2xl">Results</h2>{list(res.data.results)}</> : <Empty title="No movies found" hint="Try a different title or loosen a filter." action={<button className="btn-ghost mt-2" onClick={() => { setInput(''); setQ(''); setGenre(''); setYear(''); setLang('') }}>Clear filters</button>} />
      ) : (
        <div className="space-y-10"><div><h2 className="mb-4 text-2xl">Trending this week</h2>{list(res.data.trending)}</div><div><h2 className="mb-4 text-2xl">Popular</h2>{list(res.data.results)}</div></div>
      )}
    </Page>
  )
}
