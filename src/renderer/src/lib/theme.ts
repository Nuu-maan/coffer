import type { ThemeChoice } from '@shared/types/item'
import { coffer } from '@/lib/ipc'

const QUERY = '(prefers-color-scheme: dark)'

/**
 * Every window resolves the theme the same way, so the clipper and the list can
 * never disagree about what mode the app is in. A theme change eases rather
 * than snaps: an abrupt brightness jump is uncomfortable in a dark room (§14).
 */
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
    // Only start the cross-fade once the initial theme is on screen, so the
    // first paint is never animated from the wrong colour.
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
