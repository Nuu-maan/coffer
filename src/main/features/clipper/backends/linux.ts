import { execFile } from 'node:child_process'
import { readFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { nativeImage, screen, type NativeImage } from 'electron'
import type { DisplayFrame } from '../capture'
import { screenshotViaPortal } from './portal'

export type LinuxBackend = 'grim' | 'spectacle' | 'portal'

const EXEC_TIMEOUT_MS = 5000
const MAX_BUFFER = 256 * 1024 * 1024

let cached: LinuxBackend | null = null
let portalGranted = false

export async function captureLinux(): Promise<DisplayFrame[]> {
  const order = cached ? [cached, ...preference().filter((name) => name !== cached)] : preference()

  for (const backend of order) {
    try {
      const frames = await run(backend)
      if (frames.length > 0) {
        cached = backend
        return frames
      }
    } catch (error) {
      console.error(`[clipper] ${backend} capture failed`, error)
    }
  }

  return []
}

function preference(): LinuxBackend[] {
  const desktops = (process.env['XDG_CURRENT_DESKTOP'] ?? '').toUpperCase().split(':')
  const wlroots =
    Boolean(process.env['SWAYSOCK']) ||
    Boolean(process.env['HYPRLAND_INSTANCE_SIGNATURE']) ||
    desktops.some((name) => ['SWAY', 'HYPRLAND', 'RIVER', 'NIRI', 'WLROOTS'].includes(name))

  if (wlroots) return ['grim', 'portal', 'spectacle']
  if (desktops.includes('KDE')) return ['portal', 'spectacle', 'grim']
  return ['portal', 'grim', 'spectacle']
}

async function run(backend: LinuxBackend): Promise<DisplayFrame[]> {
  if (backend === 'grim') return captureWithGrim()
  if (backend === 'spectacle') return sliceComposite(await captureWithSpectacle())
  return sliceComposite(await captureWithPortal())
}

async function captureWithPortal(): Promise<NativeImage> {
  try {
    const bytes = await screenshotViaPortal(false)
    portalGranted = true
    return nativeImage.createFromBuffer(bytes)
  } catch (error) {
    if (portalGranted) throw error
    const bytes = await screenshotViaPortal(true)
    portalGranted = true
    return nativeImage.createFromBuffer(bytes)
  }
}

/*
 * The name grim knows a monitor by.
 *
 * Electron's Wayland label is the monitor's marketing name with the connector
 * in brackets after it — "Lenovo Group Limited R27qe Gen2 UTP083DG (HDMI-A-1)"
 * — and grim only answers to the connector. Handing it the whole label is an
 * unknown output, which failed the capture for every display and took the whole
 * grim backend down with it; the clip then came from the portal instead, which
 * on wlroots is the slow path the preference order exists to avoid. On X11 the
 * label is already the connector and the brackets are simply absent.
 */
export function connectorName(label: string): string {
  return (/\(([^()]+)\)\s*$/.exec(label)?.[1] ?? label).trim()
}

async function captureWithGrim(): Promise<DisplayFrame[]> {
  const displays = screen.getAllDisplays()
  const frames: DisplayFrame[] = []

  for (const display of displays) {
    const output = connectorName(display.label)
    if (!output) break

    /* Per display is the better capture — one image per monitor, at that
       monitor's own resolution — but it is an optimisation, not the contract.
       A name grim does not recognise stops the loop and the whole layout is
       taken in one shot below, which is correct on every compositor. */
    try {
      const png = await exec('grim', ['-t', 'png', '-l', '1', '-o', output, '-'])
      const image = nativeImage.createFromBuffer(png)
      if (image.isEmpty()) break
      frames.push({ displayId: display.id, bounds: display.bounds, image })
    } catch {
      break
    }
  }

  if (frames.length > 0 && frames.length === displays.length) return frames
  return sliceComposite(nativeImage.createFromBuffer(await exec('grim', ['-t', 'png', '-l', '1', '-'])))
}

async function captureWithSpectacle(): Promise<NativeImage> {
  const path = join(tmpdir(), `coffer-${randomBytes(6).toString('hex')}.png`)

  try {
    await exec('spectacle', ['-b', '-n', '-f', '-o', path])
    return nativeImage.createFromBuffer(await readFile(path))
  } finally {
    void unlink(path).catch(() => undefined)
  }
}

function sliceComposite(composite: NativeImage): DisplayFrame[] {
  if (composite.isEmpty()) return []

  const displays = screen.getAllDisplays()
  const size = composite.getSize()

  const left = Math.min(...displays.map((display) => display.bounds.x))
  const top = Math.min(...displays.map((display) => display.bounds.y))
  const right = Math.max(...displays.map((display) => display.bounds.x + display.bounds.width))

  const scale = size.width / (right - left)

  return displays
    .map((display) => {
      const rect = {
        x: Math.max(0, Math.round((display.bounds.x - left) * scale)),
        y: Math.max(0, Math.round((display.bounds.y - top) * scale)),
        width: Math.round(display.bounds.width * scale),
        height: Math.round(display.bounds.height * scale)
      }

      rect.width = Math.min(rect.width, size.width - rect.x)
      rect.height = Math.min(rect.height, size.height - rect.y)
      if (rect.width < 2 || rect.height < 2) return null

      const image = displays.length === 1 ? composite : composite.crop(rect)
      if (image.isEmpty()) return null

      return { displayId: display.id, bounds: display.bounds, image }
    })
    .filter((frame): frame is DisplayFrame => frame !== null)
}

function exec(command: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout: EXEC_TIMEOUT_MS, maxBuffer: MAX_BUFFER, encoding: 'buffer' },
      (error, stdout) => (error ? reject(error) : resolve(stdout))
    )
  })
}
