import { execFile } from 'node:child_process'
import { nativeImage } from 'electron'
import type { Capture } from './types'

let installed: Promise<boolean> | null = null

function paste(args: string[]): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const child = execFile(
      'wl-paste',
      args,
      { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, timeout: 2000 },
      (error, stdout) => resolve(error ? null : stdout)
    )
    child.on('error', () => resolve(null))
  })
}

function hasWlPaste(): Promise<boolean> {
  installed ??= paste(['--version']).then((out) => out !== null)
  return installed
}

function text(out: Buffer | null): string {
  return out?.toString('utf8').trim() ?? ''
}

/* Chromium only receives clipboard offers while one of its surfaces has
   focus, and Coffer never does when a shortcut fires. wl-paste reads through
   the data-control protocol, which has no such condition. */
export async function readWaylandSelection(): Promise<Capture | null> {
  if (!(await hasWlPaste())) return null

  const primary = text(await paste(['--primary', '--no-newline']))
  if (primary) return { ok: true, kind: 'text', text: primary }

  const png = await paste(['--type', 'image/png'])
  if (png && png.length > 0) {
    const image = nativeImage.createFromBuffer(png)
    if (!image.isEmpty()) return { ok: true, kind: 'image', image }
  }

  const clipboard = text(await paste(['--no-newline']))
  if (clipboard) return { ok: true, kind: 'text', text: clipboard }

  return { ok: false, reason: 'empty' }
}
