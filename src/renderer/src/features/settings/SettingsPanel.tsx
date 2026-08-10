import { useEffect, useState } from 'react'
import { Info, Monitor, Moon, Sun } from 'lucide-react'
import type { Settings } from '@shared/types/item'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { coffer } from '@/lib/ipc'
import { usePlatform } from '@/hooks/use-platform'
import { ShortcutInput } from './ShortcutInput'

export function SettingsPanel(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const platform = usePlatform()

  useEffect(() => {
    void coffer.settings.get().then(setSettings)
    return coffer.on.settingsChanged(setSettings)
  }, [])

  if (!settings) return <div className="px-4 py-3.5" />

  function patch(next: Partial<Settings>): void {
    void coffer.settings.set(next).then(setSettings)
  }

  const doubleShiftAvailable = platform?.supportsDoubleShift ?? true
  const effectiveMode = doubleShiftAvailable ? settings.hotkeyMode : 'accelerator'
  const collides =
    effectiveMode === 'accelerator' && settings.accelerator === settings.clipperAccelerator

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 px-3 py-3">
        <Section>Appearance</Section>

        <Row label="Theme" htmlFor="theme">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={settings.theme}
            onValueChange={(value) => {
              if (value) patch({ theme: value as Settings['theme'] })
            }}
          >
            <ToggleGroupItem value="light" aria-label="Light">
              <Sun />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark">
              <Moon />
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="Match the system">
              <Monitor />
            </ToggleGroupItem>
          </ToggleGroup>
        </Row>

        <Section>Clipper</Section>

        <Row label="Clip a region" htmlFor="clipper-shortcut">
          <ShortcutInput
            value={settings.clipperAccelerator}
            invalid={collides}
            onChange={(accelerator) => patch({ clipperAccelerator: accelerator })}
          />
        </Row>

        <Section>Stashing</Section>

        <Row label="Trigger" htmlFor="trigger">
          <Select
            value={effectiveMode}
            disabled={!doubleShiftAvailable}
            onValueChange={(value) => patch({ hotkeyMode: value as Settings['hotkeyMode'] })}
          >
            <SelectTrigger id="trigger" size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="double-shift" disabled={!doubleShiftAvailable}>
                Double tap Shift
              </SelectItem>
              <SelectItem value="accelerator">A shortcut</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        {effectiveMode === 'accelerator' && (
          <Row label="Stash the selection" htmlFor="stash-shortcut">
            <ShortcutInput
              value={settings.accelerator}
              invalid={collides}
              onChange={(accelerator) => patch({ accelerator })}
            />
          </Row>
        )}

        {collides && (
          <Note>
            Both shortcuts are set to the same keys, so neither is registered. Change one of them.
          </Note>
        )}

        {!doubleShiftAvailable && (
          <Note>
            This is a Wayland session, which does not let applications watch the keyboard. Coffer
            uses a system shortcut instead, granted through the desktop portal. Log into an X11
            session if you want the double-tap trigger.
          </Note>
        )}

        {effectiveMode === 'double-shift' && (
          <Row label="Tap window" htmlFor="tap-window">
            <div className="flex w-44 items-center gap-3">
              <Slider
                id="tap-window"
                min={200}
                max={600}
                step={25}
                value={[settings.doubleTapWindowMs]}
                onValueChange={([value]) => {
                  if (value !== undefined) patch({ doubleTapWindowMs: value })
                }}
              />
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {settings.doubleTapWindowMs}ms
              </span>
            </div>
          </Row>
        )}

        <Section>System</Section>

        <Row label="Launch on login" htmlFor="launch">
          <Switch
            id="launch"
            checked={settings.launchOnLogin}
            onCheckedChange={(checked) => patch({ launchOnLogin: checked })}
          />
        </Row>

        {platform && (
          <p className="px-1 text-[11px] text-muted-foreground">
            {sessionLabel(platform.session)}
            {platform.supportsSourceCapture ? '' : ' · source app is not recorded here'}
          </p>
        )}
      </div>
    </ScrollArea>
  )
}

function Section({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h2 className="px-1 pt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </h2>
  )
}

function Note({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function Row({
  label,
  htmlFor,
  children
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3.5 py-3 shadow-xs">
      <Label htmlFor={htmlFor} className="text-[13px] font-normal">
        {label}
      </Label>
      {children}
    </div>
  )
}

function sessionLabel(session: string): string {
  if (session === 'windows') return 'Windows'
  if (session === 'x11') return 'Linux · X11'
  if (session === 'wayland') return 'Linux · Wayland'
  return 'Unknown session'
}
