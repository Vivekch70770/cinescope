import { useEffect, useRef } from 'react'

const TILE_COUNT = 220
const TILE_INDICES = Array.from({ length: TILE_COUNT }, (_, index) => index)
const PLACEHOLDER_LABELS = ['NOIR', 'DRAMA', 'CINEMA', 'MEMORY', 'FRAME', 'STORY']
const PLACEHOLDER_STYLES = ['mosaic-poster--lime', 'mosaic-poster--blue', 'mosaic-poster--red', 'mosaic-poster--olive', 'mosaic-poster--violet']
const GLOW_RADIUS = 190

export default function MoviePosterMosaic({ posterUrls = [] }: { posterUrls?: readonly string[] }) {
  const mosaicRef = useRef<HTMLDivElement>(null)
  const rippleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mosaic = mosaicRef.current
    const host = mosaic?.parentElement
    if (!mosaic || !host) return

    let frame = 0
    let lastRipple = 0
    let latestEvent: PointerEvent | null = null
    let rippleAnimation: Animation | undefined
    let tilePositions: { tile: HTMLElement; x: number; y: number; width: number; height: number }[] = []

    const refreshTilePositions = () => {
      const bounds = mosaic.getBoundingClientRect()
      tilePositions = Array.from(mosaic.querySelectorAll<HTMLElement>('.movie-mosaic__tile')).map(tile => {
        const tileBounds = tile.getBoundingClientRect()
        return {
          tile,
          x: tileBounds.left - bounds.left,
          y: tileBounds.top - bounds.top,
          width: tileBounds.width,
          height: tileBounds.height,
        }
      })
    }

    const clearGlow = () => {
      tilePositions.forEach(({ tile }) => {
        tile.style.setProperty('--tile-glow', '0')
      })
    }

    refreshTilePositions()
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      latestEvent = event
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        if (!latestEvent) return
        const bounds = mosaic.getBoundingClientRect()
        const x = latestEvent.clientX - bounds.left
        const y = latestEvent.clientY - bounds.top
        tilePositions.forEach(({ tile, x: tileX, y: tileY, width, height }) => {
          const dx = tileX + width / 2 - x
          const dy = tileY + height / 2 - y
          const distance = Math.hypot(dx, dy)
          tile.style.setProperty('--tile-glow', String(Math.max(0, 1 - distance / GLOW_RADIUS)))
        })

        const now = performance.now()
        if (now - lastRipple > 180 && rippleRef.current) {
          lastRipple = now
          const ripple = rippleRef.current
          ripple.style.left = `${x}px`
          ripple.style.top = `${y}px`
          rippleAnimation?.cancel()
          rippleAnimation = ripple.animate(
            [{ transform: 'translate(-50%, -50%) scale(0.15)', opacity: 0.42 }, { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 }],
            { duration: 900, easing: 'ease-out' },
          )
        }
      })
    }

    const onPointerLeave = () => {
      latestEvent = null
      if (frame) window.cancelAnimationFrame(frame)
      frame = 0
      clearGlow()
    }

    host.addEventListener('pointermove', onPointerMove)
    host.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('resize', refreshTilePositions)
    return () => {
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('resize', refreshTilePositions)
      if (frame) window.cancelAnimationFrame(frame)
      rippleAnimation?.cancel()
    }
  }, [])

  return (
    <div ref={mosaicRef} className="movie-mosaic" aria-hidden="true">
      <div className="movie-mosaic__tiles">
        {TILE_INDICES.map(index => {
          const url = posterUrls.length ? posterUrls[(index * 7) % posterUrls.length] : undefined
          const label = PLACEHOLDER_LABELS[index % PLACEHOLDER_LABELS.length]
          return (
            <div className="movie-mosaic__tile" key={index}>
              <div className={`movie-mosaic__placeholder ${PLACEHOLDER_STYLES[index % PLACEHOLDER_STYLES.length]}`}>
                <span>{label}</span>
              </div>
              {url && <img src={url} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.style.display = 'none' }} />}
            </div>
          )
        })}
      </div>
      <div className="movie-mosaic__ambient" />
      <div ref={rippleRef} className="movie-mosaic__ripple" />
      <div className="movie-mosaic__shade" />
    </div>
  )
}
