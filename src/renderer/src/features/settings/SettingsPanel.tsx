import { useEffect, useState } from 'react'
import type { Settings } from '@shared/types/item'
import { coffer } from '@/lib/ipc'

export function SettingsPanel(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    void coffer.settings.get().then(setSettings)
    return coffer.on.settingsChanged(setSettings)
  }, [])

  if (!settings) return <div className="px-4 py-3.5" />

  function patch(next: Partial<Settings>): void {
    void coffer.settings.set(next).then(setSettings)
  }

  const control =
    'rounded-full bg-surface-hi px-3 py-2 text-[13px] text-ink shadow-card outline-none focus-visible:ring-1 focus-visible:ring-accent'

  const row =
    'raised flex items-center justify-between gap-3 rounded-card bg-surface px-4 py-3.5 text-[13px] shadow-card'

  return (
    <div className="flex flex-col gap-2 px-3 pt-0.5">
      <label className={row}>
        <span>Trigger</span>
        <select
          value={settings.hotkeyMode}
          onChange={(event) => patch({ hotkeyMode: event.target.value as Settings['hotkeyMode'] })}
          className={control}
        >
          <option value="double-shift">Double tap Shift</option>
          <option value="accelerator">Ctrl+Shift+Space</option>
        </select>
      </label>

      {settings.hotkeyMode === 'double-shift' && (
        <label className={row}>
          <span>Tap window</span>
          <input
            type="range"
            min={200}
            max={600}
            step={25}
            value={settings.doubleTapWindowMs}
            onChange={(event) => patch({ doubleTapWindowMs: Number(event.target.value) })}
            className="flex-1 accent-accent"
          />
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-dim">
            {settings.doubleTapWindowMs}ms
          </span>
        </label>
      )}

      <label className={row}>
        <span>Launch on login</span>
        <input
          type="checkbox"
          checked={settings.launchOnLogin}
          onChange={(event) => patch({ launchOnLogin: event.target.checked })}
          className="accent-accent"
        />
      </label>
    </div>
  )
}
