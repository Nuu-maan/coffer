import { clipboard } from 'electron'
import { isLinux, isWayland } from '@main/platform/session'
import { readClipboard, restoreClipboard, snapshotClipboard } from './clipboard'
import { sendCopyKeystroke } from './copy-key'
import type { Capture } from './types'

export type { Capture } from './types'

const SETTLE_POLL_MS = 25
const SETTLE_TIMEOUT_MS = 500

export async function readSelection(): Promise<Capture> {
  return isLinux() ? readSelectionLinux() : readSelectionRoundTrip()
}

async function readSelectionLinux(): Promise<Capture> {
  const primary = readClipboard('selection')
  if (primary.ok) return primary

  if (isWayland()) {
    const current = readClipboard('clipboard')
    return current.ok ? current : { ok: false, reason: 'empty' }
  }

  return readSelectionRoundTrip()
}

async function readSelectionRoundTrip(): Promise<Capture> {
  const previous = snapshotClipboard()

  clipboard.clear()

  if (!sendCopyKeystroke()) {
    restoreClipboard(previous)
    return { ok: false, reason: 'failed' }
  }

  const captured = await waitForClipboard()

  if (!captured.ok) {
    restoreClipboard(previous)
    return { ok: false, reason: 'empty' }
  }

  return captured
}

async function waitForClipboard(): Promise<Capture> {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS

  while (Date.now() < deadline) {
    const result = readClipboard('clipboard')
    if (result.ok) return result
    await delay(SETTLE_POLL_MS)
  }

  return readClipboard('clipboard')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
