import { BrowserWindow, app, screen, type Rectangle } from 'electron'
import { CH } from '@shared/ipc/channels'
import type { OverlayFrame } from '@shared/ipc/contract'
import type { DisplayFrame } from '@main/features/clipper/capture'
import { frameFor } from '@main/features/clipper/frames'
import { loadPage, preloadPath } from './load'

const REVEAL_TIMEOUT_MS = 800

type Overlay = {
  displayId: number
  window: BrowserWindow
  mounted: boolean
  pending: OverlayFrame | null
}

const overlays = new Map<number, Overlay>()
const painted = new Set<number>()

let open = false
let revealTimer: NodeJS.Timeout | null = null
let revealed = false

export function primeOverlays(): void {
  const displays = screen.getAllDisplays()
  const live = new Set(displays.map((display) => display.id))

  for (const [displayId, overlay] of overlays) {
    if (live.has(displayId)) continue
    if (!overlay.window.isDestroyed()) overlay.window.destroy()
    overlays.delete(displayId)
  }

  for (const display of displays) {
    const existing = overlays.get(display.id)
    if (existing && !existing.window.isDestroyed()) {
      existing.window.setBounds(floor(display.bounds))
      continue
    }

    overlays.set(display.id, create(display.id, floor(display.bounds)))
  }
}

function create(displayId: number, bounds: Rectangle): Overlay {
  const window = new BrowserWindow({
    ...bounds,
    frame: false,
    show: false,
    paintWhenInitiallyHidden: true,
    backgroundColor: '#000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreen: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    acceptFirstMouse: true,
    alwaysOnTop: true,
    ...(process.platform === 'win32' ? { type: 'toolbar' as const } : {}),
    /* AppKit shrinks any frame that would cover the menu bar unless a window
       opts out of that constraint, and Electron only bypasses the override when
       this is set. Without it the overlay stops short of the top of the screen
       and the frozen frame no longer lines up with what is behind it.

       Not type:'panel': that forces a non-activating panel, so the app never
       becomes active and macOS ignores the crosshair cursor, and it joins every
       Space, so the frozen frame follows the user somewhere it does not
       describe. */
    ...(process.platform === 'darwin' ? { enableLargerThanScreen: true } : {}),
    webPreferences: {
      preload: preloadPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  window.setAlwaysOnTop(true, 'screen-saver')
  window.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true
  })
  window.on('closed', () => overlays.delete(displayId))

  loadPage(window, 'clipper.html')

  return { displayId, window, mounted: false, pending: null }
}

export function markOverlayMounted(window: BrowserWindow): void {
  const overlay = find(window)
  if (!overlay) return

  overlay.mounted = true
  if (!overlay.pending) return

  overlay.window.webContents.send(CH.ON_CLIPPER_FRAME, overlay.pending)
  overlay.pending = null
}

export function markOverlayPainted(window: BrowserWindow): void {
  const overlay = find(window)
  if (!overlay || !open) return

  painted.add(overlay.displayId)
  if (painted.size >= overlays.size) reveal()
}

export function openOverlays(frames: DisplayFrame[]): void {
  primeOverlays()

  open = true
  revealed = false
  painted.clear()

  for (const frame of frames) {
    const overlay = overlays.get(frame.displayId)
    if (!overlay || overlay.window.isDestroyed()) continue

    const payload = frameFor(frame.displayId)
    if (!payload) continue

    if (overlay.mounted) overlay.window.webContents.send(CH.ON_CLIPPER_FRAME, payload)
    else overlay.pending = payload
  }

  revealTimer = setTimeout(reveal, REVEAL_TIMEOUT_MS)
}

function reveal(): void {
  if (revealed || !open) return
  revealed = true

  if (revealTimer) {
    clearTimeout(revealTimer)
    revealTimer = null
  }

  const nearest = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id

  for (const overlay of overlays.values()) {
    if (overlay.window.isDestroyed()) continue
    overlay.window.setAlwaysOnTop(true, 'screen-saver')
    overlay.window.showInactive()
  }

  const primary = overlays.get(nearest) ?? overlays.values().next().value
  if (!primary || primary.window.isDestroyed()) return

  /* Focusing a window on macOS does not activate the app — Electron asks AppKit
     not to steal from other apps — and an inactive app's cursor requests are
     ignored, so the region select would show an arrow instead of a crosshair.
     Clip is a deliberate, user-initiated takeover of the screen, which is one
     of the few times stealing focus is the correct thing to do. */
  if (process.platform === 'darwin') app.focus({ steal: true })
  primary.window.focus()
}

export function overlaysOpen(): boolean {
  return open
}

export function overlayDisplayId(window: BrowserWindow): number | null {
  return find(window)?.displayId ?? null
}

export function closeOverlays(): void {
  if (revealTimer) {
    clearTimeout(revealTimer)
    revealTimer = null
  }

  open = false
  revealed = false
  painted.clear()

  for (const overlay of overlays.values()) {
    if (!overlay.window.isDestroyed()) overlay.window.hide()
  }
}

export function destroyOverlays(): void {
  closeOverlays()

  for (const overlay of overlays.values()) {
    if (!overlay.window.isDestroyed()) overlay.window.destroy()
  }
  overlays.clear()
}

function find(window: BrowserWindow): Overlay | null {
  for (const overlay of overlays.values()) {
    if (overlay.window === window) return overlay
  }
  return null
}

function floor(bounds: Rectangle): Rectangle {
  return {
    x: Math.floor(bounds.x),
    y: Math.floor(bounds.y),
    width: Math.floor(bounds.width),
    height: Math.floor(bounds.height)
  }
}
