import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { supabaseReady } from './lib/supabase'
import { Spinner } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Discover from './pages/Discover'
import MovieDetail from './pages/MovieDetail'
import Diary from './pages/Diary'
import Watchlist from './pages/Watchlist'
import Collections from './pages/Collections'
import Stats from './pages/Stats'
import Profile from './pages/Profile'
import PersonDetail from './pages/PersonDetail'

function Setup() {
  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl">Connect Supabase to get started</h1>
      <p className="mt-3 text-sm text-mute">Cinescope could not find your Supabase settings. Copy <code>.env.example</code> to <code>.env</code> in the project root, fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart <code>npm run dev</code>. The README walks through each step.</p>
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()
  if (!supabaseReady) return <Setup />
  if (loading) return <Spinner />
  if (!session) return <Routes><Route path="*" element={<Login />} /></Routes>
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="discover" element={<Discover />} />
        <Route path="movie/:id" element={<MovieDetail />} />
        <Route path="person/:id" element={<PersonDetail />} />
        <Route path="diary" element={<Diary />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="collections" element={<Collections />} />
        <Route path="collections/:id" element={<Collections />} />
        <Route path="stats" element={<Stats />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
