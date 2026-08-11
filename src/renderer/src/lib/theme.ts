import type { ThemeChoice } from '@shared/types/item'
import { coffer } from '@/lib/ipc'

const QUERY = '(prefers-color-scheme: dark)'

export function installTheme(): void {
  const query = window.matchMedia(QUERY)
  let choice: ThemeChoice = 'system'

  const apply = (): void => {
    const dark = choice === 'system' ? query.matches : choice === 'dark'
    document.documentElement.classList.toggle('dark', dark)
  }

  apply()
  query.addEventListener('change', apply)

  void coffer.settings.get().then((settings) => {
    choice = settings.theme
    apply()
    document.documentElement.style.setProperty(
      'transition',
      'background-color 220ms var(--ease-out-quart), color 220ms var(--ease-out-quart)'
    )
  })

  coffer.on.settingsChanged((settings) => {
    choice = settings.theme
    apply()
  })
}
