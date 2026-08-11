import { Info, Monitor, Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
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
import { cn } from '@/lib/utils'
import { ease } from '@/lib/motion'
import { usePlatform } from '@/hooks/use-platform'
import { useHotkeyStatus } from '@/hooks/use-hotkey-status'
import { patchSettings, useSettings } from '@/hooks/use-settings'
import { PortalShortcuts } from './PortalShortcuts'
import { ShortcutInput } from './ShortcutInput'

export function SettingsPanel(): React.JSX.Element {
  const settings = useSettings()
  const platform = usePlatform()
  const hotkeys = useHotkeyStatus()

  if (!settings) return <div className="h-full bg-background" />

  const patch = patchSettings

  const doubleShiftAvailable = platform?.supportsDoubleShift ?? true
  const acceleratorsAvailable = platform?.supportsAccelerators ?? true
  const effectiveMode = doubleShiftAvailable ? settings.hotkeyMode : 'accelerator'
  const collides =
    acceleratorsAvailable &&
    effectiveMode === 'accelerator' &&
    settings.accelerator === settings.clipperAccelerator

  return (
    <ScrollArea className="h-full bg-background">
      <div className="flex flex-col gap-4 px-3 py-3">
        <Group title="Appearance">
          <Row label="Theme" htmlFor="theme">
            <ToggleGroup
              type="single"
              size="sm"
              variant="segment"
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
        </Group>

        {acceleratorsAvailable ? (
          <>
            <Group title="Clipper">
              <Row label="Clip a region" htmlFor="clipper-shortcut">
                <ShortcutInput
                  value={settings.clipperAccelerator}
                  invalid={collides}
                  onChange={(accelerator) => patch({ clipperAccelerator: accelerator })}
                />
              </Row>
            </Group>

            <Group title="Stashing">
              <Row label="Trigger" htmlFor="trigger">
                <Select
                  value={effectiveMode}
                  disabled={!doubleShiftAvailable}
                  onValueChange={(value) => patch({ hotkeyMode: value as Settings['hotkeyMode'] })}
                >
                  <SelectTrigger id="trigger" size="sm" className="w-40">
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

              <AnimatePresence initial={false}>
                {effectiveMode === 'accelerator' && (
                  <Reveal key="stash-shortcut">
                    <Row label="Stash the selection" htmlFor="stash-shortcut">
                      <ShortcutInput
                        value={settings.accelerator}
                        invalid={collides}
                        onChange={(accelerator) => patch({ accelerator })}
                      />
                    </Row>
                  </Reveal>
                )}

                {effectiveMode === 'double-shift' && (
                  <Reveal key="tap-window">
                    <Row label="Tap window" htmlFor="tap-window">
                      <div className="flex w-40 items-center gap-2.5">
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
                        <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                          {settings.doubleTapWindowMs}ms
                        </span>
                      </div>
                    </Row>
                  </Reveal>
                )}
              </AnimatePresence>
            </Group>

            <AnimatePresence initial={false}>
              {hotkeys?.error && (
                <Reveal key="hotkey-error">
                  <Note variant="warning">{hotkeys.error}</Note>
                </Reveal>
              )}
            </AnimatePresence>
          </>
        ) : (
          <section className="flex flex-col gap-1">
            <h2 className="px-1 text-sm font-semibold text-muted-foreground">Shortcuts</h2>
            {platform && hotkeys && <PortalShortcuts status={hotkeys} platform={platform} />}
          </section>
        )}

        <Group title="Window">
          <Row label="Always on top" htmlFor="always-on-top">
            <Switch
              id="always-on-top"
              checked={settings.alwaysOnTop}
              onCheckedChange={(checked) => patch({ alwaysOnTop: checked })}
            />
          </Row>
        </Group>

        <Group title="System">
          <Row label="Launch on login" htmlFor="launch">
            <Switch
              id="launch"
              checked={settings.launchOnLogin}
              onCheckedChange={(checked) => patch({ launchOnLogin: checked })}
            />
          </Row>
        </Group>

        {platform && (
          <p className="px-1 pb-1 text-2xs text-muted-foreground">
            {sessionLabel(platform.session)}
            {platform.supportsSourceCapture ? '' : ' · source app is not recorded here'}
          </p>
        )}
      </div>
    </ScrollArea>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-1 text-sm font-semibold text-muted-foreground">{title}</h2>
      <div
        className={cn(
          'overflow-hidden rounded-lg bg-card shadow-card',
          '[&>*:first-child]:border-t-0'
        )}
      >
        {children}
      </div>
    </section>
  )
}

function Reveal({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={ease}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  )
}

function Note({
  children,
  variant = 'info'
}: {
  children: React.ReactNode
  variant?: 'info' | 'warning'
}): React.JSX.Element {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
        variant === 'warning'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-card text-muted-foreground shadow-card'
      )}
    >
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
    <div
      className={cn(
        'flex min-h-[34px] items-center justify-between gap-3 px-3 py-1.5',
        'border-t border-border'
      )}
    >
      <Label htmlFor={htmlFor}>{label}</Label>
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
