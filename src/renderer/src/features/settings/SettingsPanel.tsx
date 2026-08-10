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
    'rounded-md border border-line bg-surface px-2 py-1 text-ink outline-none focus:border-accent'

  return (
    <div className="flex flex-col gap-3.5 px-4 py-3.5">
      <label className="flex items-center justify-between gap-3 text-[13px]">
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
        <label className="flex items-center justify-between gap-3 text-[13px]">
          <span>Tap window</span>
          <input
            type="range"
            min={200}
            max={600}
            step={25}
            value={settings.doubleTapWindowMs}
            onChange={(event) => patch({ doubleTapWindowMs: Number(event.target.value) })}
            className={control}
          />
          <span className="w-12 text-right text-xs text-ink-dim">
            {settings.doubleTapWindowMs}ms
          </span>
        </label>
      )}

      <label className="flex items-center justify-between gap-3 text-[13px]">
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
