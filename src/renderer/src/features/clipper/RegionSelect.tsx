import { useEffect, useRef, useState } from 'react'
import type { OverlayFrame } from '@shared/ipc/contract'
import { coffer } from '@/lib/ipc'

type Point = { x: number; y: number }

const MIN_SIZE = 4

export function RegionSelect(): React.JSX.Element {
  const [frame, setFrame] = useState<OverlayFrame | null>(null)
  const [origin, setOrigin] = useState<Point | null>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const committed = useRef(false)

  useEffect(() => {
    void coffer.clipper.frame().then(setFrame)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') coffer.clipper.cancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const rect = origin && cursor ? toRect(origin, cursor) : null

  function finish(): void {
    if (committed.current) return
    if (!rect || rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
      setOrigin(null)
      setCursor(null)
      return
    }
    committed.current = true
    coffer.clipper.region(rect)
  }

  return (
    <div
      className="fixed inset-0 cursor-crosshair select-none overflow-hidden bg-black"
      onMouseDown={(event) => {
        if (event.button !== 0) return
        committed.current = false
        setOrigin({ x: event.clientX, y: event.clientY })
        setCursor({ x: event.clientX, y: event.clientY })
      }}
      onMouseMove={(event) => {
        if (origin) setCursor({ x: event.clientX, y: event.clientY })
      }}
      onMouseUp={finish}
      onContextMenu={(event) => {
        event.preventDefault()
        coffer.clipper.cancel()
      }}
    >
      {frame && (
        <img
          src={frame.dataUrl}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-black/45" />

      {rect && (
        <>
          <div
            className="pointer-events-none absolute overflow-hidden outline outline-2 outline-white/90"
            style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          >
            {frame && (
              <img
                src={frame.dataUrl}
                alt=""
                draggable={false}
                className="absolute h-screen w-screen max-w-none"
                style={{ left: -rect.x, top: -rect.y }}
              />
            )}
          </div>

          <div
            className="pointer-events-none absolute rounded bg-black/75 px-1.5 py-0.5 text-[11px] tabular-nums text-white"
            style={{ left: rect.x, top: Math.max(0, rect.y - 22) }}
          >
            {rect.width} × {rect.height}
          </div>
        </>
      )}

      {!rect && (
        <p className="pointer-events-none absolute inset-x-0 top-10 text-center text-sm text-white/80">
          Drag to clip · Esc to cancel
        </p>
      )}
    </div>
  )
}

function toRect(a: Point, b: Point): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round(Math.min(a.x, b.x)),
    y: Math.round(Math.min(a.y, b.y)),
    width: Math.round(Math.abs(a.x - b.x)),
    height: Math.round(Math.abs(a.y - b.y))
  }
}
