import { execFile } from 'node:child_process'
import { UiohookKey, uIOhook } from 'uiohook-napi'
import { isLinux } from '@main/platform/session'

export function sendCopyKeystroke(): boolean {
  try {
    uIOhook.keyTap(UiohookKey.C, [UiohookKey.Ctrl])
    return true
  } catch {
    return sendCopyViaShell()
  }
}

function sendCopyViaShell(): boolean {
  const [command, args] = isLinux()
    ? (['xdotool', ['key', '--clearmodifiers', 'ctrl+c']] as const)
    : ([
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^c")'
        ]
      ] as const)

  try {
    const child = execFile(command, [...args], { timeout: 2000, windowsHide: true })
    child.on('error', () => undefined)
    return true
  } catch {
    return false
  }
}
