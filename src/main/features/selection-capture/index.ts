import { clipboard } from 'electron'
import { isLinux, isMac, isWayland } from '@main/platform/session'
import { hasAccessibility } from '@main/platform/permissions'
import { readClipboard, restoreClipboard, snapshotClipboard } from './clipboard'
import { sendCopyKeystroke, sendCopyViaShell } from './copy-key'
import { readWaylandSelection } from './wayland'
import type { Capture } from './types'

export type { Capture } from './types'

/* Finer than it needs to be on Windows, and about right for the macOS
   pasteboard, which settles in single-digit milliseconds after a synthesised
   ⌘C. The cost of polling more often is nothing; the cost of polling less
   often is latency on every stash. */
const SETTLE_POLL_MS = 10
const SETTLE_TIMEOUT_MS = 500

export async function readSelection(): Promise<Capture> {
  return isLinux() ? readSelectionLinux() : readSelectionRoundTrip()
}

async function readSelectionLinux(): Promise<Capture> {
  if (isWayland()) {
    const viaWlClipboard = await readWaylandSelection()
    if (viaWlClipboard) return viaWlClipboard
  }

  const primary = readClipboard('selection')
  if (primary.ok) return primary

  if (isWayland()) {
    const current = readClipboard('clipboard')
    return current.ok ? current : { ok: false, reason: 'empty' }
  }

  return readSelectionRoundTrip()
}

async function readSelectionRoundTrip(): Promise<Capture> {
  /* Checked before anything is touched, because the failure is invisible from
     here otherwise. libuiohook declares hook_post_event as void and its darwin
     backend discards what CGEventPost returns, so an ungranted keyTap reports
     success, sends nothing, and leaves the clipboard cleared and the user
     reading 'Nothing selected' forever. */
  if (isMac() && !hasAccessibility()) return { ok: false, reason: 'no-permission' }

  const previous = snapshotClipboard()

  clipboard.clear()

  if (!(await sendCopy())) {
    restoreClipboard(previous)
    return { ok: false, reason: 'failed' }
  }

  const captured = await waitForClipboard()
  if (captured.ok) return captured

  /* Restoring is the destructive half of this, so it only happens if the
     clipboard is still the empty one we left. An app slower than the timeout
     writes after we have given up, and putting the old contents back over that
     would throw away the copy the user actually asked for. */
  const late = readClipboard('clipboard')
  if (late.ok) return late

  restoreClipboard(previous)
  return { ok: false, reason: 'empty' }
}

async function sendCopy(): Promise<boolean> {
  return sendCopyKeystroke() ? true : sendCopyViaShell()
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
