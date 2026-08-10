import { useState } from 'react'
import { Minus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ItemList } from '@/features/list/ItemList'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { coffer } from '@/lib/ipc'

type Tab = 'list' | 'settings'

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('list')

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="drag-region flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <span className="pl-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Coffer
          </span>

          <div className="no-drag ml-auto flex items-center gap-2">
            <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
              <TabsList className="h-8">
                <TabsTrigger value="list" className="text-xs">
                  List
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">
                  Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => coffer.window.minimize()}
              aria-label="Minimise"
            >
              <Minus />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => coffer.window.hideMain()}
              aria-label="Close to tray"
            >
              <X />
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1">
          {tab === 'list' ? <ItemList /> : <SettingsPanel />}
        </main>
      </div>

      <Toaster position="top-center" richColors closeButton={false} />
    </TooltipProvider>
  )
}
