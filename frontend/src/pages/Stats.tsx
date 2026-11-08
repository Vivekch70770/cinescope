import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { computeStats, loadDiary } from '../lib/data'
import { Empty, ErrorBox, Page, Spinner, Stars } from '../components/ui'

function Chart({ title, data, horizontal }: { title: string; data: { name: string; count: number }[]; horizontal?: boolean }) {
  return (
    <div className="card"><h3 className="mb-3 text-lg">{title}</h3>
      {data.length ? <div className="h-64"><ResponsiveContainer>
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: horizontal ? 24 : 0 }}>
          <CartesianGrid stroke="#34343A" strokeDasharray="3 5" vertical={false} />
          {horizontal ? <><XAxis type="number" allowDecimals={false} stroke="#77727B" /><YAxis type="category" dataKey="name" width={110} stroke="#A7A19A" fontSize={12} tickLine={false} axisLine={false} /></>
            : <><XAxis dataKey="name" stroke="#A7A19A" fontSize={12} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} stroke="#77727B" tickLine={false} axisLine={false} /></>}
          <Tooltip contentStyle={{ background: '#222228', border: '1px solid #34343A', borderRadius: '10px', color: '#F1E5D5' }} cursor={{ fill: '#34343A', opacity: 0.35 }} />
          <Bar dataKey="count" name="Films" fill="#B83232" radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div> : <p className="text-sm text-mute">Not enough data yet.</p>}</div>
  )
}

export default function Stats() {
  const { data, loading, error } = useAsync(loadDiary, [])
  if (loading) return <Spinner />
  if (error || !data) return <ErrorBox msg={error ?? 'Could not load statistics.'} />
  if (!data.length) return <Page title="Statistics"><Empty title="No data yet" hint="Log a few films and your statistics will appear here." action={<Link to="/discover" className="btn-primary mt-2">Find a movie</Link>} /></Page>
  const s = computeStats(data)
  const tiles = [['Films watched', s.total], ['Hours watched', s.hours], ['Average rating', s.avg ? s.avg.toFixed(2) : '–'], ['Rewatches', s.rewatches]]
  return (
    <Page title="Statistics" sub="Calculated from your diary entries.">
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">{tiles.map(([l, v], index) => <div key={l} className="metric-card card relative overflow-hidden transition-colors hover:border-lime/35"><span className="metric-card__index">0{index + 1}</span><p className="font-display text-4xl font-semibold text-sand">{v}</p><p className="text-xs uppercase tracking-[0.1em] text-mute">{l}</p></div>)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Chart title="Most-watched genres" data={s.genres} horizontal />
        <Chart title="Most-watched directors" data={s.directors} horizontal />
        <Chart title="Films per month (last 12)" data={s.perMonth} />
        <Chart title="Films per year" data={s.perYear} />
      </div>
      <div className="card mt-4"><h3 className="mb-3 text-lg">Highest rated</h3>
        {s.topRated.length ? <ol className="divide-y divide-edge">{s.topRated.map(e => <li key={e.id} className="flex items-center justify-between py-2 text-sm"><Link to={`/movie/${e.movies.tmdb_id}`} className="hover:text-lime">{e.movies.title}</Link><Stars value={e.rating} size={14} /></li>)}</ol> : <p className="text-sm text-mute">Rate a film to see it here.</p>}</div>
    </Page>
  )
}
