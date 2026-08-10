import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'
import { APP_NAME } from '@shared/constants'

const DESKTOP_FILE = 'coffer.desktop'

function autostartDir(): string {
  const configHome = process.env['XDG_CONFIG_HOME'] || join(homedir(), '.config')
  return join(configHome, 'autostart')
}

export async function setLinuxAutostart(enabled: boolean): Promise<void> {
  const target = join(autostartDir(), DESKTOP_FILE)

  if (!enabled) {
    try {
      await unlink(target)
    } catch {
      return
    }
    return
  }

  const exec = process.env['APPIMAGE'] ?? app.getPath('exe')
  const contents = [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${APP_NAME}`,
    `Exec="${exec}" --hidden`,
    'Icon=coffer',
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    ''
  ].join('\n')

  await mkdir(autostartDir(), { recursive: true })
  await writeFile(target, contents, 'utf8')
}
