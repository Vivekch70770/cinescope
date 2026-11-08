import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) return setMsg({ ok: false, text: 'Password must be at least 6 characters.' })
    setBusy(true); setMsg(null)
    const { data, error } = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) return setMsg({ ok: false, text: error.message })
    if (mode === 'up' && !data.session) setMsg({ ok: true, text: 'Account created. Check your email to confirm it, then log in.' })
  }

  return (
    <div className="login-stage grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-5 border-edge/80 bg-char/90 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="border-b border-edge pb-5"><p className="text-xs uppercase tracking-[0.22em] text-lime">A personal film journal</p><h1 className="mt-2 font-display text-5xl font-semibold italic text-sand">Cinescope</h1><p className="mt-2 text-sm text-mute">Your films. Your memories. Your perspective.</p></div>
        <label className="block text-sm">Email<input className="input mt-1" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
        <label className="block text-sm">Password<input className="input mt-1" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
        {msg && <div role="alert" className={`rounded-lg border p-3 text-sm ${msg.ok ? 'border-lime/40 text-lime' : 'border-red-900 bg-red-950/40 text-red-200'}`}>{msg.text}</div>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Log in' : 'Create account'}</button>
        <button type="button" className="w-full text-sm text-mute hover:text-lime" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>
          {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Log in'}
        </button>
      </form>
    </div>
  )
}
