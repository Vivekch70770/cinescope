import { Link, NavLink, Outlet } from 'react-router-dom'
import { BookOpen, Bookmark, Compass, Home, Layers, BarChart3, User, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { tmdbEnabled } from '../lib/tmdb'

const links = [
  { to: '/', label: 'Home', icon: Home }, { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/diary', label: 'Diary', icon: BookOpen }, { to: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { to: '/collections', label: 'Collections', icon: Layers }, { to: '/stats', label: 'Statistics', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="site-header sticky top-0 z-40 border-b border-edge/70 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:gap-7">
          <Link to="/" className="brand-lockup shrink-0" aria-label="Cinescope home"><span className="font-display text-3xl font-semibold italic leading-none text-sand">cine<span className="text-lime">scope</span></span><span className="hidden text-[0.58rem] uppercase tracking-[0.22em] text-mute sm:block">A personal film journal</span></Link>
          <nav className="hidden min-w-0 flex-1 justify-center gap-1 lg:flex" aria-label="Main">
            {links.map(l => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `nav-link whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-char text-sand' : 'text-mute hover:bg-char/60 hover:text-sand'}`}>{l.label}</NavLink>)}
          </nav>
          <button className="btn-ghost ml-auto shrink-0 px-3 lg:ml-0" onClick={() => supabase.auth.signOut()}><LogOut size={16} /><span className="hidden sm:inline">Log out</span></button>
        </div>
      </header>
      {!tmdbEnabled && <div className="border-b border-lime/20 bg-lime/10 px-4 py-2 text-center text-xs text-lime">Demo mode: no TMDB API key found. Only four sample titles are shown. Add VITE_TMDB_API_KEY to .env.</div>}
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-7 sm:pt-9 lg:pb-12"><Outlet /></main>
      <nav className="mobile-nav fixed inset-x-0 bottom-0 z-40 flex border-t border-edge/80 bg-ink/95 backdrop-blur-xl lg:hidden" aria-label="Mobile">
        {links.filter(l => l.to !== '/collections').map(l => <NavLink key={l.to} to={l.to} end={l.to === '/'} aria-label={l.label} className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent px-1 py-2 text-[10px] transition-colors sm:text-[11px] ${isActive ? 'border-t-lime bg-char/40 text-lime' : 'text-mute hover:text-sand'}`}><l.icon size={19} />{l.label}</NavLink>)}
      </nav>
    </div>
  )
}
