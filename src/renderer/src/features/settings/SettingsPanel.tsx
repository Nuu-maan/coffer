import { useEffect, useState } from 'react'
import type { Settings } from '@shared/types/item'
import { coffer } from '@/lib/ipc'
import './settings.css'

export function SettingsPanel(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    void coffer.settings.get().then(setSettings)
    return coffer.on.settingsChanged(setSettings)
  }, [])

  if (!settings) return <div className="settings" />

  function patch(next: Partial<Settings>): void {
    void coffer.settings.set(next).then(setSettings)
  }

  return (
    <div className="settings">
      <label className="settings__row">
        <span>Trigger</span>
        <select
          value={settings.hotkeyMode}
          onChange={(event) => patch({ hotkeyMode: event.target.value as Settings['hotkeyMode'] })}
        >
          <option value="double-shift">Double tap Shift</option>
          <option value="accelerator">Ctrl+Shift+Space</option>
        </select>
      </label>

      {settings.hotkeyMode === 'double-shift' && (
        <label className="settings__row">
          <span>Tap window</span>
          <input
            type="range"
            min={200}
            max={600}
            step={25}
            value={settings.doubleTapWindowMs}
            onChange={(event) => patch({ doubleTapWindowMs: Number(event.target.value) })}
          />
          <span className="settings__value">{settings.doubleTapWindowMs}ms</span>
        </label>
      )}

      <label className="settings__row">
        <span>Launch on login</span>
        <input
          type="checkbox"
          checked={settings.launchOnLogin}
          onChange={(event) => patch({ launchOnLogin: event.target.checked })}
        />
      </label>
    </div>
  )
}
