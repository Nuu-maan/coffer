import { execFile } from 'node:child_process'
import { UiohookKey, uIOhook } from 'uiohook-napi'

export type CopyChord = {
  key: number
  modifiers: number[]
}

export type ShellCopy = readonly [command: string, args: string[]]

/** Copy is ⌘C on macOS. Ctrl+C is inert in a Cocoa text view and SIGINT in a terminal. */
export function copyChord(platform: NodeJS.Platform = process.platform): CopyChord {
  return {
    key: UiohookKey.C,
    modifiers: [platform === 'darwin' ? UiohookKey.Meta : UiohookKey.Ctrl]
  }
}

export function shellCopy(platform: NodeJS.Platform = process.platform): ShellCopy {
  if (platform === 'linux') return ['xdotool', ['key', '--clearmodifiers', 'ctrl+c']]

  if (platform === 'darwin') {
    return [
      'osascript',
      ['-e', 'tell application "System Events" to keystroke "c" using command down']
    ]
  }

  return [
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^c")'
    ]
  ]
}

export type ShellCopyFailure = 'automation-denied' | 'accessibility-denied' | 'unknown'

/*
 * osascript reports a refused consent as an ordinary script error, and the two
 * that matter here send the user to two different panes of System Settings.
 */
export function classifyShellFailure(stderr: string): ShellCopyFailure {
  if (stderr.includes('-1743') || stderr.includes('Not authorized to send Apple events')) {
    return 'automation-denied'
  }
  if (stderr.includes('-25211') || stderr.includes('is not allowed to send keystrokes')) {
    return 'accessibility-denied'
  }
  return 'unknown'
}

export function sendCopyKeystroke(): boolean {
  try {
    const { key, modifiers } = copyChord()
    uIOhook.keyTap(key, modifiers)
    return true
  } catch {
    return false
  }
}

/*
 * Resolves on what the process actually did. The old version returned true the
 * moment it had spawned something, so a missing xdotool — or, on macOS, the
 * powershell.exe it used to reach for — read as a delivered keystroke, and the
 * caller skipped restoring the clipboard it had just cleared.
 */
export function sendCopyViaShell(): Promise<boolean> {
  const [command, args] = shellCopy()

  return new Promise((resolve) => {
    const child = execFile(command, args, { timeout: 2000, windowsHide: true }, (error, _out, err) => {
      if (!error) return resolve(true)

      const reason = classifyShellFailure(String(err ?? ''))
      console.error(`[selection] ${command} could not send the copy key (${reason})`, error.message)
      resolve(false)
    })
    child.on('error', () => resolve(false))
  })
}
