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

async function captureWithGrim(): Promise<DisplayFrame[]> {
  const displays = screen.getAllDisplays()
  const frames: DisplayFrame[] = []

  for (const display of displays) {
    const output = display.label
    const args = ['-t', 'png', '-l', '1', ...(output ? ['-o', output] : []), '-']
    const png = await exec('grim', args)
    const image = nativeImage.createFromBuffer(png)
    if (image.isEmpty()) return []

    frames.push({ displayId: display.id, bounds: display.bounds, image })
  }

  if (frames.length === displays.length) return frames
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
