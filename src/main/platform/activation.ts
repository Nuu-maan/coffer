import { app } from 'electron'
import { isMac } from './session'

/*
 * Coffer is a menu bar app that also has a window, and macOS has one switch for
 * that rather than two. LSUIElement in Info.plist would settle it at launch and
 * cost too much: an accessory app has no Dock icon, no Cmd+Tab and — the part
 * that matters — no menu bar, and NSMenu key equivalents are how ⌘C and ⌘V
 * reach a text field on macOS at all. Coffer has text fields.
 *
 * So the policy moves with the window. While one is up Coffer is an ordinary
 * app with a menu; once it is back in the menu bar it stops taking up a Dock
 * tile. This is what Raycast and CleanShot do.
 *
 * setActivationPolicy, not app.dock.hide(): the latter debounces for a second
 * and round-trips TransformProcessType, which is a known way to lose key
 * status.
 */
export function setWindowVisible(visible: boolean): void {
  if (!isMac()) return
  app.setActivationPolicy(visible ? 'regular' : 'accessory')
}
