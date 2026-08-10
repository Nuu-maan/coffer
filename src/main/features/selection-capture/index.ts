import { execFile } from 'node:child_process'
import { clipboard } from 'electron'
import { UiohookKey, uIOhook } from 'uiohook-napi'

const SETTLE_POLL_MS = 25
const SETTLE_TIMEOUT_MS = 500

export type SelectionResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty' | 'failed' }

export async function readSelection(): Promise<SelectionResult> {
  const previous = clipboard.readText()

  clipboard.clear()

  const sent = sendCopyKeystroke()
  if (!sent) {
    restore(previous)
    return { ok: false, reason: 'failed' }
  }

  const text = await waitForClipboard()

  if (!text.trim()) {
    restore(previous)
    return { ok: false, reason: 'empty' }
  }

  return { ok: true, text: text.trim() }
}

function restore(previous: string): void {
  if (previous) clipboard.writeText(previous)
}

function sendCopyKeystroke(): boolean {
  try {
    uIOhook.keyTap(UiohookKey.C, [UiohookKey.Ctrl])
    return true
  } catch {
    return sendCopyViaShell()
  }
}

function sendCopyViaShell(): boolean {
  try {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^c")'
      ],
      { timeout: 2000, windowsHide: true }
    )
    return true
  } catch {
    return false
  }
}

async function waitForClipboard(): Promise<string> {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS

  while (Date.now() < deadline) {
    const text = clipboard.readText()
    if (text) return text
    await delay(SETTLE_POLL_MS)
  }

  return clipboard.readText()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
