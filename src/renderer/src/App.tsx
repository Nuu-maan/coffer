import { useState } from 'react'
import { ItemList } from '@/features/list/ItemList'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { coffer } from '@/lib/ipc'
import './app.css'

type Tab = 'list' | 'settings'

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('list')

  return (
    <div className="app">
      <header className="titlebar">
        <div className="titlebar__drag">
          <span className="titlebar__title">Coffer</span>
        </div>
        <nav className="titlebar__actions">
          <button
            className={tab === 'list' ? 'is-active' : ''}
            onClick={() => setTab('list')}
            title="List"
          >
            List
          </button>
          <button
            className={tab === 'settings' ? 'is-active' : ''}
            onClick={() => setTab('settings')}
            title="Settings"
          >
            Settings
          </button>
          <button onClick={() => coffer.window.minimize()} title="Minimise">
            –
          </button>
          <button onClick={() => coffer.window.hideMain()} title="Close to tray">
            ×
          </button>
        </nav>
      </header>

      <main className="app__body">
        {tab === 'list' ? <ItemList /> : <SettingsPanel />}
      </main>
    </div>
  )
}
