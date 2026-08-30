import { WINDOW_RADIUS, type Settings, type ThemeChoice } from '@shared/types/item'
import { coffer } from '@/lib/ipc'

const QUERY = '(prefers-color-scheme: dark)'

/*
 * The two settings that are properties of the surface rather than of any one
 * screen, applied to the document root so every window picks them up — the
 * panel, the clip form and the region picker all call this.
 */
export function installTheme(): void {
  const query = window.matchMedia(QUERY)
  let choice: ThemeChoice = 'system'

  const apply = (): void => {
    const dark = choice === 'system' ? query.matches : choice === 'dark'
    document.documentElement.classList.toggle('dark', dark)
  }

  /* One number on the root, and global.css derives the rest of the scale from
     it. Clamped here as well as in the slider: a stored value from a hand-
     edited settings file has no business drawing a 400px corner. */
  const applyRadius = (settings: Settings): void => {
    const radius = Math.min(
      WINDOW_RADIUS.max,
      Math.max(WINDOW_RADIUS.min, Math.round(settings.windowRadius ?? WINDOW_RADIUS.default))
    )
    document.documentElement.style.setProperty('--window-radius', `${radius}px`)
  }

  apply()
  query.addEventListener('change', apply)

  void coffer.settings.get().then((settings) => {
    choice = settings.theme
    apply()
    applyRadius(settings)
    document.documentElement.style.setProperty(
      'transition',
      'background-color 220ms var(--ease-out-quart), color 220ms var(--ease-out-quart)'
    )
  })

  coffer.on.settingsChanged((settings) => {
    choice = settings.theme
    apply()
    applyRadius(settings)
  })
}
