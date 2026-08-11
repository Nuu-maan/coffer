import { useState } from 'react'
import { Minus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ItemList } from '@/features/list/ItemList'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { coffer } from '@/lib/ipc'
import { spring } from '@/lib/motion'

type Tab = 'list' | 'settings'

const ORDER: Tab[] = ['list', 'settings']

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('list')
  const [previous, setPrevious] = useState<Tab>('list')

  // Panels travel in the direction of the tab that was clicked, so moving back
  // retraces the same path it came in on (§7).
  const direction = ORDER.indexOf(tab) > ORDER.indexOf(previous) ? 1 : -1

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="drag-region flex h-11 shrink-0 items-center gap-2 px-3">
          <span className="pl-0.5 text-2xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Coffer
          </span>

          <div className="no-drag ml-auto flex items-center gap-1">
            <Tabs
              value={tab}
              onValueChange={(value) => {
                setPrevious(tab)
                setTab(value as Tab)
              }}
            >
              <TabsList variant="glass" className="h-7">
                <TabsTrigger value="list" className="px-2.5 text-xs">
                  List
                </TabsTrigger>
                <TabsTrigger value="settings" className="px-2.5 text-xs">
                  Settings
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
              className="hit-36"
              onClick={() => coffer.window.hideMain()}
              aria-label="Close to tray"
            >
              <X />
            </Button>
          </div>
        </header>

        {/* The content is a sheet floating on the window's chrome, the way a
            widget sits on a desktop — the inset is what makes it read as an
            object rather than as the window's own background. */}
        <main className="relative min-h-0 flex-1 overflow-hidden px-2 pb-2">
          <div className="relative h-full overflow-hidden rounded-2xl bg-card shadow-raised">
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <motion.div
                key={tab}
                custom={direction}
                initial={{ opacity: 0, x: direction * 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -18 }}
                transition={spring}
                className="h-full"
              >
                {tab === 'list' ? <ItemList /> : <SettingsPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Toaster position="top-center" richColors closeButton={false} />
    </TooltipProvider>
  )
}
