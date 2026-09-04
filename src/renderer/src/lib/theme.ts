import type { ThemeChoice } from '@shared/types/item'
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

  /*
   * Flipping the theme changes colour, background, border and shadow on very
   * nearly every element in the window at once, and every transition on those
   * properties fires together. The switch smears over a fifth of a second
   * instead of landing — a card, its hairline, its text and its shadow each
   * crossing at their own rate, through whatever is between the two themes.
   *
   * So the document is frozen for the swap and released on the next frame.
   * There used to be a 220ms colour transition *added* to the root for this
   * moment, which is the same mistake from the other end: it smoothed the one
   * element that could afford to snap and left the smear on everything else.
   */
  const apply = (): void => {
    const dark = choice === 'system' ? query.matches : choice === 'dark'
    if (document.documentElement.classList.contains('dark') === dark) return

    const freeze = document.createElement('style')
    freeze.textContent = '*,*::before,*::after{transition:none !important}'
    document.head.append(freeze)

    document.documentElement.classList.toggle('dark', dark)

    /* Read a layout property so the freeze is in force before the class change
       is painted. Without it both land in the same frame and the browser
       transitions between them regardless. */
    void document.documentElement.offsetHeight
    requestAnimationFrame(() => freeze.remove())
  }

  apply()
  query.addEventListener('change', apply)

  void coffer.settings.get().then((settings) => {
    choice = settings.theme
    apply()
  })

  coffer.on.settingsChanged((settings) => {
    choice = settings.theme
    apply()
  })
}
