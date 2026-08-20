import { desktopCapturer, shell, systemPreferences } from 'electron'
import type { PermissionKind, Permissions, ScreenAccess } from '@shared/types/item'

const PANES: Record<PermissionKind, string> = {
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
export function openPrivacyPane(pane: PermissionKind): void {
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

export function permissions(needsRestart = false): Permissions {
  return { accessibility: hasAccessibility(), screen: screenAccess(), needsRestart }
}

/*
 * There is no ask for the screen, so the ask is a capture: one throwaway pixel
 * raises the system's prompt, and the status is read back afterwards. It is
 * read back rather than trusted, because it will still say denied until the
 * process restarts even when the user has just said yes — which is what
 * needsRestart carries out to the UI.
 */
export async function requestScreen(): Promise<boolean> {
  if (!isMac() || screenAccess() === 'granted') return true

  try {
    await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
  } catch {
    // The prompt is the point. Whether this particular call succeeded is not.
  }

  if (screenAccess() === 'granted') return true

  openPrivacyPane('screen')
  return false
}

export async function requestPermission(kind: PermissionKind): Promise<Permissions> {
  if (!isMac()) return permissions()

  if (kind === 'screen') {
    const granted = await requestScreen()
    return permissions(!granted)
  }

  const granted = askAccessibility()
  if (!granted) openPrivacyPane('accessibility')
  return permissions(!granted)
}
