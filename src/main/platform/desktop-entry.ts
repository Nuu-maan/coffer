import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'
import { APP_ID, APP_NAME } from '@shared/constants'
import { isLinux } from './session'

/**
 * xdg-desktop-portal will not hand a global shortcut to an application it
 * cannot name, and it names unsandboxed applications by looking up
 * `<app-id>.desktop` through GLib. That lookup fails unless the entry exists in
 * an XDG application directory *and* its Exec resolves to a real binary, so
 * Coffer writes its own hidden entry rather than depending on how it was
 * installed. Hidden entries are still found by the lookup, so this does not put
 * a second Coffer in the launcher.
 */
export function desktopEntryPath(): string {
  const dataHome = process.env['XDG_DATA_HOME'] || join(homedir(), '.local', 'share')
  return join(dataHome, 'applications', `${APP_ID}.desktop`)
}

export function executablePath(): string {
  return process.env['APPIMAGE'] ?? app.getPath('exe')
}

export async function ensureDesktopEntry(): Promise<void> {
  if (!isLinux()) return

  const target = desktopEntryPath()
  const contents = [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${APP_NAME}`,
    `Exec="${executablePath()}"`,
    'Icon=coffer',
    'Terminal=false',
    'Categories=Utility;',
    // Keeps the entry out of launchers: it exists only so the portal can
    // resolve an app id for this process.
    'NoDisplay=true',
    ''
  ].join('\n')

  try {
    if ((await readFile(target, 'utf8')) === contents) return
  } catch {
    // No entry yet, or it is unreadable. Either way, write a fresh one.
  }

  await mkdir(join(target, '..'), { recursive: true })
  await writeFile(target, contents, 'utf8')
}
