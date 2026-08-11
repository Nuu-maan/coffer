import { useState } from 'react'
import { Check, Copy } from '@/components/icons'
import type { HotkeyStatus, PlatformInfo } from '@shared/types/item'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  status: HotkeyStatus
  platform: PlatformInfo
}

/**
 * On Wayland the compositor, not the application, owns key bindings. Coffer
 * registers *named* actions with the desktop portal and the user attaches keys
 * to those names, so this panel shows the names and the config line that binds
 * them.
 */
export function PortalShortcuts({ status, platform }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const config = configFor(platform.desktop, status, quote(platform.executable))

  function copy(): void {
    void navigator.clipboard.writeText(config.snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  if (status.error) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
        <span className="font-medium">The desktop portal would not register Coffer.</span>
        <span className="text-destructive/80">{status.error}</span>
      </div>
    )
  }

  if (status.portalShortcuts.length === 0) {
    return (
      <p className="rounded-lg bg-card px-3 py-2.5 text-sm text-muted-foreground shadow-card">
        Asking the desktop portal for shortcuts…
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="overflow-hidden rounded-lg bg-card shadow-card">
        {status.portalShortcuts.map((shortcut, index) => (
          <div
            key={shortcut.id}
            className={cn(
              'flex min-h-[34px] items-center justify-between gap-3 px-3 py-1.5',
              index > 0 && 'border-t border-border'
            )}
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-base">{shortcut.description}</span>
              <code className="truncate font-mono text-2xs text-muted-foreground">
                {shortcut.id}
              </code>
            </div>

            {shortcut.trigger ? (
              <kbd className="shrink-0 rounded-[4px] bg-well px-1.5 py-px text-xs leading-5 shadow-[inset_0_0_0_0.5px_var(--border)]">
                {shortcut.trigger}
              </kbd>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground">Not bound yet</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-card px-3 py-2.5 shadow-card">
        <p className="text-sm text-muted-foreground">{config.hint}</p>

        <pre className="overflow-x-auto rounded-md bg-well px-2.5 py-2 font-mono text-2xs leading-5 text-foreground">
          {config.snippet}
        </pre>

        <Button variant="outline" size="sm" className="self-start" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

function quote(path: string): string {
  return /\s/.test(path) ? `"${path}"` : path
}

function configFor(
  desktop: string,
  status: HotkeyStatus,
  executable: string
): { hint: string; snippet: string } {
  const [stash, clip] = status.portalShortcuts

  if (desktop.includes('hyprland')) {
    return {
      hint: 'Wayland leaves key bindings to the compositor. Add these to hyprland.conf, then reload with hyprctl reload.',
      snippet: [
        `bind = SUPER, S, global, ${stash?.id ?? ''}`,
        `bind = SUPER SHIFT, S, global, ${clip?.id ?? ''}`
      ].join('\n')
    }
  }

  if (desktop.includes('sway')) {
    return {
      hint: 'Wayland leaves key bindings to the compositor. Sway does not speak the shortcuts portal, so bind the commands instead.',
      snippet: [
        `bindsym $mod+s exec ${executable} --stash`,
        `bindsym $mod+Shift+s exec ${executable} --clip`
      ].join('\n')
    }
  }

  if (desktop.includes('gnome') || desktop.includes('kde') || desktop.includes('plasma')) {
    return {
      hint: 'Wayland leaves key bindings to the desktop. Open Settings → Keyboard → Shortcuts, find Coffer, and give these actions keys.',
      snippet: status.portalShortcuts.map((entry) => entry.id).join('\n')
    }
  }

  return {
    hint: 'Wayland leaves key bindings to the compositor. Bind these action names in your compositor’s configuration, or bind the commands below if it cannot.',
    snippet: [
      ...status.portalShortcuts.map((entry) => entry.id),
      '',
      `${executable} --stash`,
      `${executable} --clip`
    ].join('\n')
  }
}
