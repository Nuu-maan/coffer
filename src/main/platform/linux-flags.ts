import { app } from 'electron'
import { isLinux, isWayland } from './session'

const WAYLAND_FEATURES = ['GlobalShortcutsPortal', 'WaylandWindowDecorations']

export function applyLinuxCommandLineFlags(): void {
  if (!isLinux()) return

  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')

  if (isWayland()) {
    app.commandLine.appendSwitch('enable-features', WAYLAND_FEATURES.join(','))
  }
}
