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

const SH_SCRIPT =
  'id=$(xdotool getactivewindow) || exit 1; ' +
  'printf "%s\\n" "$(xdotool getwindowname "$id")" "$(xprop -id "$id" WM_CLASS)"'

let inFlight: Promise<ItemSource | undefined> | null = null

export function beginSourceCapture(): void {
  if (!platformInfo().supportsSourceCapture) return
  inFlight = process.platform === 'win32' ? readWindows() : readX11()
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
