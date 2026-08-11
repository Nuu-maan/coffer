import { useState } from 'react'
import { Minus, X } from '@/components/icons'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ItemList } from '@/features/list/ItemList'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { coffer } from '@/lib/ipc'
import { ease } from '@/lib/motion'

type Tab = 'list' | 'settings'

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('list')

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex h-full min-h-0 flex-col bg-card">
        <header className="drag-region relative z-20 flex h-[38px] shrink-0 items-center border-b border-border px-2.5">
          <span className="text-sm font-semibold text-muted-foreground select-none">Coffer</span>

          <div className="no-drag absolute left-1/2 -translate-x-1/2">
            <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
              <TabsList className="h-[24px]">
                <TabsTrigger value="list">List</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="no-drag ml-auto flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className="hit-36"
              onClick={() => coffer.window.minimize()}
              aria-label="Minimise"
            >
              <Minus />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              className="hit-36 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => coffer.window.hideMain()}
              aria-label="Close to tray"
            >
              <X />
            </Button>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={ease}
              className="h-full"
            >
              {tab === 'list' ? <ItemList /> : <SettingsPanel />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toaster position="top-center" closeButton={false} />
    </TooltipProvider>
  )
}
