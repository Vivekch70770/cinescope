import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabaseReady = !!url && !!key && !url.includes('your-project-ref') && !key.startsWith('your_')
// Placeholder values keep the app from crashing when env vars are missing; App shows a setup screen instead.
export const supabase = createClient(supabaseReady ? url! : 'http://localhost:54321', supabaseReady ? key! : 'missing-key')

export function unwrap<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data
}
