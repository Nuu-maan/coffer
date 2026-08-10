import { execFile } from 'node:child_process'
import type { ItemSource } from '@shared/types/item'

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

let inFlight: Promise<ItemSource | undefined> | null = null

export function beginSourceCapture(): void {
  if (process.platform !== 'win32') return
  inFlight = readForegroundWindow()
}

export async function takeCapturedSource(): Promise<ItemSource | undefined> {
  const pending = inFlight
  inFlight = null
  if (!pending) return undefined
  return pending
}

function readForegroundWindow(): Promise<ItemSource | undefined> {
  return new Promise((resolve) => {
    const child = execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', PS_SCRIPT],
      { timeout: 2500, windowsHide: true },
      (error, stdout) => {
        if (error) return resolve(undefined)
        try {
          const parsed = JSON.parse(stdout) as Partial<ItemSource>
          if (!parsed.title && !parsed.app) return resolve(undefined)
          resolve({ app: parsed.app ?? '', title: parsed.title ?? '' })
        } catch {
          resolve(undefined)
        }
      }
    )
    child.on('error', () => resolve(undefined))
  })
}
