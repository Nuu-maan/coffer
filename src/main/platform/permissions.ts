import { execFile } from 'node:child_process'
import { desktopCapturer, shell, systemPreferences } from 'electron'
import { APP_ID } from '@shared/constants'
import type { PermissionKind, Permissions, ScreenAccess } from '@shared/types/item'

const PANES: Record<PermissionKind, string> = {
  accessibility: 'Privacy_Accessibility',
  screen: 'Privacy_ScreenCapture'
}

const TCC_SERVICES: Record<PermissionKind, string> = {
  accessibility: 'Accessibility',
  screen: 'ScreenCapture'
}

function isMac(): boolean {
  return process.platform === 'darwin'
}

export function hasAccessibility(): boolean {
  if (!isMac()) return true
  return systemPreferences.isTrustedAccessibilityClient(false)
}

export function askAccessibility(): boolean {
  if (!isMac()) return true
  return systemPreferences.isTrustedAccessibilityClient(true)
}

export function screenAccess(): ScreenAccess {
  if (!isMac()) return 'granted'
  return systemPreferences.getMediaAccessStatus('screen') as ScreenAccess
}

export function openPrivacyPane(pane: PermissionKind): void {
  if (!isMac()) return
  void shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${PANES[pane]}`)
}

export const RESTART_NOTE = 'Quit and reopen Coffer once you have granted it.'

export function permissions(needsRestart = false): Permissions {
  return { accessibility: hasAccessibility(), screen: screenAccess(), needsRestart }
}

/* A grant held for an older signature shows as switched on while the running
   app is untrusted, and macOS will not prompt again for an app it already lists. */
function forgetStaleGrant(kind: PermissionKind): Promise<void> {
  return new Promise((resolve) => {
    execFile('tccutil', ['reset', TCC_SERVICES[kind], APP_ID], { timeout: 5000 }, () => resolve())
  })
}

export async function requestScreen(): Promise<boolean> {
  if (!isMac() || screenAccess() === 'granted') return true

  await forgetStaleGrant('screen')
  await desktopCapturer
    .getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
    .catch(() => undefined)

  if (screenAccess() === 'granted') return true
  openPrivacyPane('screen')
  return false
}

export async function requestAccessibility(): Promise<boolean> {
  if (!isMac() || hasAccessibility()) return true

  await forgetStaleGrant('accessibility')

  const granted = askAccessibility()
  if (!granted) openPrivacyPane('accessibility')
  return granted
}

export async function requestPermission(kind: PermissionKind): Promise<Permissions> {
  if (!isMac()) return permissions()

  if (kind === 'screen') return permissions(!(await requestScreen()))

  await requestAccessibility()
  return permissions()
}
