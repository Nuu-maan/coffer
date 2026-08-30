import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { OverlayFrame } from '@shared/ipc/contract'
import { coffer } from '@/lib/ipc'
import { ease } from '@/lib/motion'

type Point = { x: number; y: number }
type Rect = { x: number; y: number; width: number; height: number }

const MIN_SIZE = 4
const LOUPE = 132
const LOUPE_ZOOM = 8
const LOUPE_OFFSET = 22

export function RegionSelect(): React.JSX.Element {
  const [frame, setFrame] = useState<OverlayFrame | null>(null)
  const [origin, setOrigin] = useState<Point | null>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [pointer, setPointer] = useState<Point | null>(null)
  const [inside, setInside] = useState(false)
  const committed = useRef(false)

  useEffect(() => {
    let current = 0

    const stop = coffer.on.clipperFrame((next) => {
      const generation = ++current

      setOrigin(null)
      setCursor(null)
      setPointer(null)
      setInside(false)
      committed.current = false

      const image = new Image()
      image.src = next.url

      const paint = (): void => {
        if (generation !== current) return
        setFrame(next)
        requestAnimationFrame(() => requestAnimationFrame(() => coffer.clipper.painted()))
      }

      image.decode().then(paint, paint)
    })

    coffer.clipper.mounted()
    return stop
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') coffer.clipper.cancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const rect = origin && cursor ? toRect(origin, cursor) : null
  const dragging = rect !== null

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
      className="fixed inset-0 cursor-crosshair overflow-hidden select-none"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        committed.current = false
        setOrigin({ x: event.clientX, y: event.clientY })
        setCursor({ x: event.clientX, y: event.clientY })
      }}
      onPointerMove={(event) => {
        setInside(true)
        setPointer({ x: event.clientX, y: event.clientY })
        if (origin) setCursor({ x: event.clientX, y: event.clientY })
      }}
      onPointerLeave={() => setInside(false)}
      onPointerUp={finish}
      onContextMenu={(event) => {
        event.preventDefault()
        coffer.clipper.cancel()
      }}
    >
      {frame && (
        <img
          src={frame.url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-black/55" />

      {!dragging && pointer && inside && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 h-px bg-white/30"
            style={{ top: pointer.y }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-white/30"
            style={{ left: pointer.x }}
          />
        </>
      )}

      {rect && (
        <>
          <div
            className="pointer-events-none absolute overflow-hidden outline outline-[1.5px] outline-white/90"
            style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          >
            {frame && (
              <img
                src={frame.url}
                alt=""
                draggable={false}
                className="absolute h-screen w-screen max-w-none"
                style={{ left: -rect.x, top: -rect.y }}
              />
            )}
          </div>

          {rect.width > 40 && rect.height > 40 && (
            <div
              className="pointer-events-none absolute"
              style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
            >
              {HANDLES.map(({ key, className }) => (
                <span
                  key={key}
                  className={`absolute size-[7px] rounded-[2px] bg-white shadow-[0_0_2px_rgb(0_0_0/0.5)] ${className}`}
                />
              ))}
            </div>
          )}
        </>
      )}

      {pointer && inside && frame && !dragging && <Loupe frame={frame} pointer={pointer} />}

      {pointer && rect && <SizeReadout pointer={pointer} rect={rect} />}

      <AnimatePresence>
        {!dragging && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={ease}
            className="material-hud pointer-events-none absolute top-9 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-sm font-medium shadow-hud"
          >
            Drag to clip · Esc to cancel
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function Loupe({ frame, pointer }: { frame: OverlayFrame; pointer: Point }): React.JSX.Element {
  const flipX = pointer.x + LOUPE_OFFSET + LOUPE > window.innerWidth
  const flipY = pointer.y + LOUPE_OFFSET + LOUPE + 26 > window.innerHeight
  const left = flipX ? pointer.x - LOUPE_OFFSET - LOUPE : pointer.x + LOUPE_OFFSET
  const top = flipY ? pointer.y - LOUPE_OFFSET - LOUPE - 26 : pointer.y + LOUPE_OFFSET

  return (
    <div
      className="pointer-events-none absolute flex flex-col items-center gap-1"
      style={{ left, top, width: LOUPE }}
    >
      <div
        className="relative overflow-hidden rounded-lg border border-white/25 shadow-[0_8px_24px_rgb(0_0_0/0.5)]"
        style={{ width: LOUPE, height: LOUPE }}
      >
        <img
          src={frame.url}
          alt=""
          draggable={false}
          className="absolute top-0 left-0 h-screen w-screen max-w-none"
          style={{
            transformOrigin: `${pointer.x}px ${pointer.y}px`,
            transform: `translate(${(LOUPE / 2 - pointer.x) / LOUPE_ZOOM}px, ${(LOUPE / 2 - pointer.y) / LOUPE_ZOOM}px) scale(${LOUPE_ZOOM})`,
            imageRendering: 'pixelated'
          }}
        />

        <div
          className="absolute border border-white/80 bg-white/10"
          style={{
            left: LOUPE / 2 - LOUPE_ZOOM / 2,
            top: LOUPE / 2 - LOUPE_ZOOM / 2,
            width: LOUPE_ZOOM,
            height: LOUPE_ZOOM
          }}
        />
      </div>

      <span className="material-hud vibrant rounded-full px-2 py-[2px] text-2xs tabular-nums shadow-hud">
        {pointer.x}, {pointer.y}
      </span>
    </div>
  )
}

function SizeReadout({ pointer, rect }: { pointer: Point; rect: Rect }): React.JSX.Element {
  const flipX = pointer.x + 16 + 92 > window.innerWidth
  const flipY = pointer.y + 16 + 24 > window.innerHeight

  return (
    <span
      className="material-hud vibrant pointer-events-none absolute rounded-full px-2 py-[2px] text-xs tabular-nums shadow-hud"
      style={{
        left: flipX ? pointer.x - 16 - 92 : pointer.x + 16,
        top: flipY ? pointer.y - 16 - 24 : pointer.y + 16
      }}
    >
      {rect.width} × {rect.height}
    </span>
  )
}

const HANDLES = [
  { key: 'tl', className: '-top-[3px] -left-[3px]' },
  { key: 'tc', className: '-top-[3px] left-1/2 -translate-x-1/2' },
  { key: 'tr', className: '-top-[3px] -right-[3px]' },
  { key: 'ml', className: 'top-1/2 -left-[3px] -translate-y-1/2' },
  { key: 'mr', className: 'top-1/2 -right-[3px] -translate-y-1/2' },
  { key: 'bl', className: '-bottom-[3px] -left-[3px]' },
  { key: 'bc', className: '-bottom-[3px] left-1/2 -translate-x-1/2' },
  { key: 'br', className: '-right-[3px] -bottom-[3px]' }
]

function toRect(a: Point, b: Point): Rect {
  return {
    x: Math.round(Math.min(a.x, b.x)),
    y: Math.round(Math.min(a.y, b.y)),
    width: Math.round(Math.abs(a.x - b.x)),
    height: Math.round(Math.abs(a.y - b.y))
  }
}
