import { useState } from 'react'
import { ItemList } from '@/features/list/ItemList'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { coffer } from '@/lib/ipc'

type Tab = 'list' | 'settings'

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('list')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-[38px] shrink-0 items-center border-b border-line pr-1.5">
        <div className="drag-region flex h-full flex-1 items-center pl-4">
          <span className="text-xs uppercase tracking-[0.08em] text-ink-dim">Coffer</span>
        </div>

        <nav className="no-drag flex gap-0.5">
          <TitlebarButton active={tab === 'list'} onClick={() => setTab('list')}>
            List
          </TitlebarButton>
          <TitlebarButton active={tab === 'settings'} onClick={() => setTab('settings')}>
            Settings
          </TitlebarButton>
          <TitlebarButton onClick={() => coffer.window.minimize()} title="Minimise">
            –
          </TitlebarButton>
          <TitlebarButton onClick={() => coffer.window.hideMain()} title="Close to tray">
            ×
          </TitlebarButton>
        </nav>
      </header>

      <main className="min-h-0 flex-1">
        {tab === 'list' ? <ItemList /> : <SettingsPanel />}
      </main>
    </div>
  )
}

function TitlebarButton({
  active = false,
  onClick,
  title,
  children
}: {
  active?: boolean
  onClick: () => void
  title?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-md px-2.5 py-1 text-xs transition-colors hover:bg-surface-hover hover:text-ink ${
        active ? 'text-ink' : 'text-ink-dim'
      }`}
    >
      {children}
    </button>
  )
}
