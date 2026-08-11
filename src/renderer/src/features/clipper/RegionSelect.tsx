import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { OverlayFrame } from '@shared/ipc/contract'
import { coffer } from '@/lib/ipc'
import { ease } from '@/lib/motion'

type Point = { x: number; y: number }

const MIN_SIZE = 4

export function RegionSelect(): React.JSX.Element {
  const [frame, setFrame] = useState<OverlayFrame | null>(null)
  const [origin, setOrigin] = useState<Point | null>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [pointer, setPointer] = useState<Point | null>(null)
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

  // The readout sits above the selection, or below it when there is no room —
  // it should never cover the thing being measured.
  const chipAbove = rect ? rect.y > 30 : true

  return (
    <div
      className="fixed inset-0 cursor-crosshair overflow-hidden bg-black select-none"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        committed.current = false
        setOrigin({ x: event.clientX, y: event.clientY })
        setCursor({ x: event.clientX, y: event.clientY })
      }}
      onPointerMove={(event) => {
        setPointer({ x: event.clientX, y: event.clientY })
        if (origin) setCursor({ x: event.clientX, y: event.clientY })
      }}
      onPointerUp={finish}
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

      {/* Crosshair guides before the drag starts: they make the first click
          land where the user meant it to. */}
      {!rect && pointer && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 h-px bg-white/25"
            style={{ top: pointer.y }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-white/25"
            style={{ left: pointer.x }}
          />
        </>
      )}

      {rect && (
        <>
          <div
            className="pointer-events-none absolute overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_8px_32px_rgba(0,0,0,0.35)] outline outline-[1.5px] outline-white"
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

          {/* Corner marks tell you the selection is a thing with edges, not
              just a hole in the dimming. */}
          {rect.width > 24 && rect.height > 24 && (
            <div
              className="pointer-events-none absolute"
              style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
            >
              {corners.map(({ key, className }) => (
                <span key={key} className={`absolute size-2.5 bg-white ${className}`} />
              ))}
            </div>
          )}

          <div
            className="material-thick material-edge pointer-events-none absolute rounded-full px-2 py-0.5 text-xs font-medium text-white tabular-nums"
            style={{
              left: rect.x,
              top: chipAbove ? rect.y - 26 : rect.y + rect.height + 8
            }}
          >
            {rect.width} × {rect.height}
          </div>
        </>
      )}

      <AnimatePresence>
        {!rect && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={ease}
            className="material-thick material-edge pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1.5 text-sm font-medium text-white shadow-float"
          >
            Drag to clip · esc to cancel
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

const corners = [
  { key: 'tl', className: '-top-px -left-px' },
  { key: 'tr', className: '-top-px -right-px' },
  { key: 'bl', className: '-bottom-px -left-px' },
  { key: 'br', className: '-right-px -bottom-px' }
]

function toRect(a: Point, b: Point): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round(Math.min(a.x, b.x)),
    y: Math.round(Math.min(a.y, b.y)),
    width: Math.round(Math.abs(a.x - b.x)),
    height: Math.round(Math.abs(a.y - b.y))
  }
}
