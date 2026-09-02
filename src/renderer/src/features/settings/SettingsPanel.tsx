import {
  CircleCheckIcon,
  Crop,
  Hand,
  Info,
  Keyboard,
  Monitor,
  Moon,
  Palette,
  Pin,
  Power,
  Sun,
  Timer,
  Zap
} from '@/components/icons'
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
import { Button } from '@/components/ui/button'
import { coffer } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import { ease } from '@/lib/motion'
import { usePlatform } from '@/hooks/use-platform'
import { requestPermission, usePermissions } from '@/hooks/use-permissions'
import { useHotkeyStatus } from '@/hooks/use-hotkey-status'
import { useReportScrolled } from '@/hooks/use-scrolled'
import { patchSettings, useSettings } from '@/hooks/use-settings'
import { PortalShortcuts } from './PortalShortcuts'
import { ShortcutInput } from './ShortcutInput'

export function SettingsPanel(): React.JSX.Element {
  const settings = useSettings()
  const platform = usePlatform()
  const hotkeys = useHotkeyStatus()
  const access = usePermissions()
  const reportScrolled = useReportScrolled()

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
    <ScrollArea className="h-full bg-background" onViewportScroll={reportScrolled}>
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
                {mac && !doubleShiftAvailable && (
                  <Reveal key="needs-accessibility">
                    <Row
                      label="Double tap Shift is unavailable"
                      hint="Reading Shift anywhere on the desktop needs Accessibility access"
                      icon={<Hand />}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-40"
                        onClick={() => void requestPermission('accessibility')}
                      >
                        Grant…
                      </Button>
                    </Row>
                  </Reveal>
                )}

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
            {/* Hand-rolled rather than a Group, because this section's card is
                PortalShortcuts' own. Same heading treatment as Group's. */}
            <h2 className="px-2 text-sm font-semibold text-muted-foreground">Shortcuts</h2>
            {platform && hotkeys && <PortalShortcuts status={hotkeys} platform={platform} />}
          </section>
        )}

        {mac && access && (
          <Group title="Permissions">
            <Row
              label="Accessibility"
              hint="Lets Coffer copy the selection out of another app"
              icon={<Hand />}
            >
              <Access
                granted={access.accessibility}
                onGrant={() => void requestPermission('accessibility')}
              />
            </Row>

            <Row
              label="Screen Recording"
              hint="Lets Clip read the screen it is freezing"
              icon={<Crop />}
            >
              <Access
                granted={access.screen === 'granted'}
                onGrant={() => void requestPermission('screen')}
              />
            </Row>
          </Group>
        )}

        {mac && access && (!access.accessibility || access.screen !== 'granted') && (
          <Note>
            Already switched on in System Settings? macOS is holding that permission
            for an earlier copy of Coffer. Grant… clears it and asks again.
          </Note>
        )}

        {mac && access?.needsRestart && (
          <Note variant="warning">
            <span className="flex flex-col items-start gap-2">
              macOS applies Screen Recording to an app only after it is reopened.
              <Button variant="outline" size="sm" onClick={() => coffer.app.relaunch()}>
                Relaunch Coffer
              </Button>
            </span>
          </Note>
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

/* Granted is a dead end rather than a toggle: nothing in an app can take a TCC
   consent back, and offering a control that looks like it might would be a lie.
   Revoking is System Settings' job. */
function Access({
  granted,
  onGrant
}: {
  granted: boolean
  onGrant: () => void
}): React.JSX.Element {
  if (granted) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CircleCheckIcon className="size-4 text-tint" />
        Granted
      </span>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={onGrant} className="w-40">
      Grant…
    </Button>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="flex flex-col gap-1.5">
      {/* Sentence case, not caps. macOS System Settings and iOS both stopped
          shouting their group headers; the type scale's own tracking is tuned
          for lowercase and an uppercase override fights it. */}
      <h2 className="px-2 text-sm font-semibold text-muted-foreground">{title}</h2>
      {/*
        The hairline belongs to the row below it, and the first row in a card
        has nothing above it to be divided from.

        The radius is pinned rather than taken from the scale: settings is a
        dense column of rows and small controls where the app's larger radii
        round the cards off faster than the 46px rows inside them can bear.
      */}
      <div className="overflow-hidden rounded-[8px] bg-card shadow-card [&>:first-child_[data-rule]]:hidden">
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
        'flex items-start gap-2 rounded-[8px] px-3 py-2.5 text-sm',
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
  /** Omitted where the row holds something that is not a labelled control. */
  htmlFor?: string
  icon?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="relative flex min-h-[44px] items-center gap-2.5 px-2.5 py-2">
      <span data-rule className="absolute top-0 right-0 left-[42px] h-px bg-separator" />

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
