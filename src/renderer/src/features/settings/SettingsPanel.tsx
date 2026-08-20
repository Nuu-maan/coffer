import { Crop, Info, Keyboard, Monitor, Moon, Palette, Pin, Power, Sun, Timer, Zap } from '@/components/icons'
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

  const mac = platform?.platform === 'darwin'
  const doubleShiftAvailable = platform?.supportsDoubleShift ?? true
  const acceleratorsAvailable = platform?.supportsAccelerators ?? true
  const effectiveMode = doubleShiftAvailable ? settings.hotkeyMode : 'accelerator'
  const collides =
    acceleratorsAvailable &&
    effectiveMode === 'accelerator' &&
    settings.accelerator === settings.clipperAccelerator

  return (
    <ScrollArea className="h-full bg-background">
      <div className="flex flex-col gap-5 px-3 py-3">
        <Group title="Appearance">
          <Row
            label="Theme"
            hint="Light, dark, or whatever the system is set to"
            htmlFor="theme"
            icon={<Palette />}
          >
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
            <Group title="Shortcuts">
              <Row
                label="Clip a region"
                hint="Draw a box on screen and stash it"
                htmlFor="clipper-shortcut"
                icon={<Crop />}
              >
                <ShortcutInput
                  value={settings.clipperAccelerator}
                  invalid={collides}
                  onChange={(accelerator) => patch({ clipperAccelerator: accelerator })}
                />
              </Row>

              <Row
                label="Trigger"
                hint="How stashing the selection is set off"
                htmlFor="trigger"
                icon={<Zap />}
              >
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
                    <Row
                      label="Stash the selection"
                      hint="Copies the selection, then stashes it"
                      htmlFor="stash-shortcut"
                      icon={<Keyboard />}
                    >
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
                    <Row
                      label="Tap window"
                      hint="How closely the taps must follow"
                      htmlFor="tap-window"
                      icon={<Timer />}
                    >
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
          <section className="flex flex-col gap-1.5">
            <h2 className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Shortcuts
            </h2>
            {platform && hotkeys && <PortalShortcuts status={hotkeys} platform={platform} />}
          </section>
        )}

        <Group title="Behaviour">
          <Row
            label="Always on top"
            hint="Keep the panel above other windows"
            htmlFor="always-on-top"
            icon={<Pin />}
          >
            <Switch
              id="always-on-top"
              checked={settings.alwaysOnTop}
              onCheckedChange={(checked) => patch({ alwaysOnTop: checked })}
            />
          </Row>

          <Row
            label="Launch on login"
            hint={`Start Coffer in the ${mac ? 'menu bar' : 'tray'} when you sign in`}
            htmlFor="launch"
            icon={<Power />}
          >
            <Switch
              id="launch"
              checked={settings.launchOnLogin}
              onCheckedChange={(checked) => patch({ launchOnLogin: checked })}
            />
          </Row>
        </Group>

        {platform && (
          <p className="px-2 pb-1 text-center text-2xs text-muted-foreground">
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
    <section className="flex flex-col gap-1.5">
      <h2 className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {/*
        The hairline belongs to the row below it, and the first row in a card
        has nothing above it to be divided from.

        The radius is pinned rather than taken from the scale: settings is a
        dense column of rows and small controls where the app's larger radii
        round the cards off faster than the 46px rows inside them can bear.
      */}
      <div className="overflow-hidden rounded-[14px] bg-card shadow-card [&>:first-child_[data-rule]]:hidden">
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
        /* Pinned to match the cards it sits between. See Group. */
        'flex items-start gap-2 rounded-[14px] px-3 py-2.5 text-sm',
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
  hint,
  htmlFor,
  icon,
  children
}: {
  label: string
  hint?: string
  htmlFor: string
  icon?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="relative flex min-h-[46px] items-center gap-2.5 px-2.5 py-2">
      <span data-rule className="absolute top-0 right-0 left-[42px] h-px bg-border" />

      {icon && (
        <span
          aria-hidden="true"
          className="flex size-[22px] shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-[17px]"
        >
          {icon}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground [text-wrap:pretty]">{hint}</span>}
      </div>

      {children}
    </div>
  )
}

function sessionLabel(session: string): string {
  if (session === 'windows') return 'Windows'
  if (session === 'macos') return 'macOS'
  if (session === 'x11') return 'Linux · X11'
  if (session === 'wayland') return 'Linux · Wayland'
  return 'Unknown session'
}
