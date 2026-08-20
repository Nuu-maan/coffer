import { shell, systemPreferences } from 'electron'

export type ScreenAccess = 'granted' | 'denied' | 'restricted' | 'not-determined' | 'unknown'

type PrivacyPane = 'accessibility' | 'screen'

const PANES: Record<PrivacyPane, string> = {
  accessibility: 'Privacy_Accessibility',
  screen: 'Privacy_ScreenCapture'
}

function isMac(): boolean {
  return process.platform === 'darwin'
}

/*
 * Everything here answers permissively off macOS so callers never branch. Only
 * macOS gates a keyboard hook, a synthesised keystroke, or a screen read behind
 * a consent the user grants outside the app.
 */
export function hasAccessibility(): boolean {
  if (!isMac()) return true
  return systemPreferences.isTrustedAccessibilityClient(false)
}

/** Raises the system's own 'control this computer' alert. */
export function askAccessibility(): boolean {
  if (!isMac()) return true
  return systemPreferences.isTrustedAccessibilityClient(true)
}

export function screenAccess(): ScreenAccess {
  if (!isMac()) return 'granted'
  return systemPreferences.getMediaAccessStatus('screen') as ScreenAccess
}

/*
 * There is no request API for the screen: askForMediaAccess rejects with
 * 'Invalid media type' because its parser knows only camera and microphone.
 * Calling desktopCapturer is what raises the prompt, so the clipper does that
 * itself and this only opens the pane for someone who already said no.
 */
export function openPrivacyPane(pane: PrivacyPane): void {
  if (!isMac()) return
  void shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${PANES[pane]}`)
}

/*
 * Both reads underneath are cached for the life of the process — AXIsProcessTrusted
 * keeps its answer, and getMediaAccessStatus bottoms out in
 * CGPreflightScreenCaptureAccess, which does the same (electron/electron#36722).
 * A grant made while Coffer is running does not show up until it restarts, and
 * anything shown to the user has to say that rather than inviting them to press
 * the same button again.
 */
export const RESTART_NOTE = 'Quit and reopen Coffer once you have granted it.'
