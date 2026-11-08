import { useEffect, useState } from 'react'
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setLoading(true); setError(null)
    fn().then(d => { if (live) { setData(d); setLoading(false) } })
      .catch((e: unknown) => { if (live) { setError(e instanceof Error ? e.message : String(e)); setLoading(false) } })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { data, loading, error, reload: () => setTick(t => t + 1) }
}
