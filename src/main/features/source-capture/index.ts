import { execFile } from 'node:child_process'
import type { ItemSource } from '@shared/types/item'
import { platformInfo } from '@main/platform/session'

const PS_SCRIPT = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid);
}
"@
$h = [W]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 512
[void][W]::GetWindowText($h, $sb, 512)
$procId = 0
[void][W]::GetWindowThreadProcessId($h, [ref]$procId)
$proc = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
[Console]::Out.Write((ConvertTo-Json @{ title = $sb.ToString(); app = $proc } -Compress))
`

const MAC_SCRIPT = 'asn=$(lsappinfo front) || exit 1; lsappinfo info -only name "$asn"'

/** lsappinfo answers with `"LSDisplayName"="Safari"`. */
const MAC_NAME = /"LSDisplayName"\s*=\s*"([^"]*)"/

const SH_SCRIPT =
  'id=$(xdotool getactivewindow) || exit 1; ' +
  'printf "%s\\n" "$(xdotool getwindowname "$id")" "$(xprop -id "$id" WM_CLASS)"'

let inFlight: Promise<ItemSource | undefined> | null = null

/*
 * Exhaustive on purpose. This was a ternary that sent anything not Windows to
 * xdotool, which was unreachable only because supportsSourceCapture happened to
 * be false everywhere else. It is true on macOS now, and a fallthrough that
 * shells out to an X11 tool is not a failure worth inheriting.
 */
export function beginSourceCapture(): void {
  if (!platformInfo().supportsSourceCapture) return

  switch (process.platform) {
    case 'win32':
      inFlight = readWindows()
      return
    case 'darwin':
      inFlight = readMac()
      return
    case 'linux':
      inFlight = readX11()
      return
    default:
      inFlight = null
  }
}

export async function takeCapturedSource(): Promise<ItemSource | undefined> {
  const pending = inFlight
  inFlight = null
  if (!pending) return undefined
  return pending
}

function readWindows(): Promise<ItemSource | undefined> {
  return run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PS_SCRIPT], (out) => {
    const parsed = JSON.parse(out) as Partial<ItemSource>
    if (!parsed.title && !parsed.app) return undefined
    return { app: parsed.app ?? '', title: parsed.title ?? '' }
  })
}

/*
 * lsappinfo rather than AppleScript. It names the frontmost application with no
 * consent at all, where asking System Events for the same thing costs an
 * Automation grant and a usage string.
 *
 * The window title is left alone. It is the part macOS gates: without Screen
 * Recording, CGWindowListCopyWindowInfo simply omits the name rather than
 * failing, so the choice is between another permission prompt and doing
 * without. For a field that only ever annotates a stash, doing without is the
 * better trade.
 */
function readMac(): Promise<ItemSource | undefined> {
  return run('/bin/sh', ['-c', MAC_SCRIPT], (out) => {
    const app = out.match(MAC_NAME)?.[1]?.trim()
    return app ? { app, title: '' } : undefined
  })
}

function readX11(): Promise<ItemSource | undefined> {
  return run('sh', ['-c', SH_SCRIPT], (out) => {
    const [title = '', wmClass = ''] = out.split('\n')
    const app = wmClass.match(/"([^"]*)"\s*$/)?.[1] ?? ''
    if (!title && !app) return undefined
    return { app, title: title.trim() }
  })
}

function run(
  command: string,
  args: string[],
  parse: (stdout: string) => ItemSource | undefined
): Promise<ItemSource | undefined> {
  return new Promise((resolve) => {
    const child = execFile(
      command,
      args,
      { timeout: 2500, windowsHide: true },
      (error, stdout) => {
        if (error) return resolve(undefined)
        try {
          resolve(parse(stdout))
        } catch {
          resolve(undefined)
        }
      }
    )
    child.on('error', () => resolve(undefined))
  })
}
