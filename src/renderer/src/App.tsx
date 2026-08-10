import { useState } from 'react'
import { ItemList } from '@/features/list/ItemList'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { coffer } from '@/lib/ipc'

type Tab = 'list' | 'settings'

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('list')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="drag-region flex h-14 shrink-0 items-center gap-2 px-3">
        <span className="pl-2 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-faint">
          Coffer
        </span>

        <div className="no-drag ml-auto flex items-center gap-2">
          <div className="raised flex rounded-full bg-surface p-1 shadow-card">
            <SegmentButton active={tab === 'list'} onClick={() => setTab('list')}>
              List
            </SegmentButton>
            <SegmentButton active={tab === 'settings'} onClick={() => setTab('settings')}>
              Settings
            </SegmentButton>
          </div>

          <RoundButton onClick={() => coffer.window.minimize()} title="Minimise">
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path d="M4 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </RoundButton>

          <RoundButton onClick={() => coffer.window.hideMain()} title="Close to tray">
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path
                d="M4.5 4.5l7 7m0-7l-7 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </RoundButton>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {tab === 'list' ? <ItemList /> : <SettingsPanel />}
      </main>
    </div>
  )
}

function SegmentButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
        active ? 'bg-surface-hi text-ink shadow-card' : 'text-ink-dim hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function RoundButton({
  onClick,
  title,
  children
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="raised hit-40 grid size-9 place-items-center rounded-full bg-surface text-ink-dim shadow-card transition-[color,background-color,scale] hover:bg-surface-hi hover:text-ink active:scale-[0.96]"
    >
      {children}
    </button>
  )
}
