import { useEffect, useState } from 'react'
import {
  ChevronLeftIcon,
  History,
  Logo,
  MoreHorizontal,
  Settings as SettingsGlyph
} from '@/components/icons'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ChangelogPanel } from '@/features/changelog/ChangelogPanel'
import { ItemList } from '@/features/list/ItemList'
import { SearchField } from '@/features/list/SearchField'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { cn } from '@/lib/utils'
import { coffer } from '@/lib/ipc'
import { PAGE_BLUR, PAGE_SLIDE, pageSlide } from '@/lib/motion'
import { useScrolled } from '@/hooks/use-scrolled'

type Tab = 'list' | 'settings' | 'changelog'

/* Left to right, so a switch knows which way it is travelling. */
const TABS: Tab[] = ['list', 'settings', 'changelog']

const TITLES: Record<Tab, string> = {
  list: '',
  settings: 'Settings',
  changelog: 'Changelog'
}

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('list')
  const [query, setQuery] = useState('')
  const { scrolled, reset, Provider: ScrolledProvider } = useScrolled()
  const [direction, setDirection] = useState(1)

  function show(next: Tab): void {
    if (next === tab) return
    setDirection(TABS.indexOf(next) > TABS.indexOf(tab) ? 1 : -1)
    /* The incoming panel starts at its top and has not scrolled yet, so it has
       nothing to report — without this the bar keeps the rule the outgoing one
       left behind. */
    reset()
    setTab(next)
  }

  /* macOS draws its own window controls in this bar, so the bar's content has
     to start after them. env(titlebar-area-x) is where they end; everywhere
     else it is not defined and the fallback is the ordinary padding.

     Coffer draws none of its own. A pair of hand-rolled buttons in the corner
     of a window that already has a tray icon and an Escape key was chrome
     nobody asked for, and on macOS it would have been a second pair. */

  // macOS opens preferences from its own menu, on ⌘, — the tab has to follow.
  useEffect(() => coffer.on.showSettings(() => show('settings')), [])

  const onList = tab === 'list'

  return (
    /*
     * reducedMotion="user" is the whole of this app's answer to
     * prefers-reduced-motion for anything the motion library draws — and that
     * is nearly all of it: the page slide, the row enter and exit, the section
     * and row drags, the composer's submit button, the drop overlays.
     *
     * The stylesheet's own @media block only ever reached CSS transitions and
     * keyframes. Every spring in here ran at full travel with the preference
     * set, which is exactly the class of motion the preference exists to turn
     * off. This makes the library drop transform and layout animation and keep
     * opacity, which is the substitution the preference asks for rather than
     * the silence it does not.
     */
    <MotionConfig reducedMotion="user">
    <TooltipProvider delayDuration={500} skipDelayDuration={250}>
      {/*
        The window itself, drawn here rather than by the frame: the BrowserWindow
        is transparent, so the sheet, its corners and its edge are the renderer's
        to paint. material-thick over the panel colour rather than the colour
        alone — a panel that floats over whatever is behind it should show that
        it is floating.

        overflow-hidden is what makes the corners hold: without it the list
        scrolls square content out past the rounded edge.
      */}
      <div
        className={cn(
          /*
           * No material-edge. It drew a hairline right round the panel and a
           * bright inset line along the top — a frame, on a window whose whole
           * argument is that it is a sheet lying on the desktop rather than a
           * box bolted to it. The corner radius is what says where the panel
           * ends; a line tracing that same corner says it twice, and the second
           * time in a colour the desktop behind it did not agree to.
           */
          'sheet flex h-full min-h-0 flex-col overflow-hidden'
        )}
      >
        {/*
          One bar, and what is in it depends on where you are: the search field
          on the list, because searching is the only thing you do to a list you
          are already looking at, and a back button everywhere else, because
          there is nothing on those screens to search.

          Settings and the changelog sit behind the ⋯ rather than beside the
          list in a tab bar. A tab bar advertises places of equal standing, and
          these are not — one is the app, the others are what you read about it.
          Adding to the panel is not up here at all any more; it is the + on the
          composer, next to the field a stash is typed into.
        */}
        <header
          className="drag-region relative z-20 flex h-[44px] shrink-0 items-center gap-2 pr-3 select-none"
          style={{ paddingLeft: 'env(titlebar-area-x, 12px)' }}
        >
          {/* A child rather than a border so it can fade. A border cannot be
              animated to nothing without also moving the 38px the rest of the
              bar is measured against. */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-px bg-separator',
              'transition-opacity duration-150',
              scrolled ? 'opacity-100' : 'opacity-0'
            )}
          />

          {onList ? (
            <>
              <Logo className="size-4 shrink-0 text-muted-foreground" />
              <SearchField value={query} onChange={setQuery} />
            </>
          ) : (
            <>
              <Button
                variant="default"
                size="icon"
                className="no-drag hit-36 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => show('list')}
                aria-label="Back to the list"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="text-sm font-semibold">{TITLES[tab]}</span>
            </>
          )}

          <div className="no-drag ml-auto shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/*
                  A control with a surface under it, not a glyph floating in the
                  bar. Three dots on their own are the weakest possible target:
                  nothing says where the click has to land, and beside a search
                  field that *is* drawn as a surface it read as a decoration
                  someone had left there. Same fill and lift as the field, so
                  the two ends of the bar agree with each other.
                */}
                <Button
                  variant="default"
                  size="icon"
                  className="hit-36 text-muted-foreground hover:text-foreground"
                  aria-label="Menu"
                >
                  {/* Sized to the field beside it, and the glyph sized to the
                      button. Three dots at 14px inside a 22px circle left a
                      ring of fill around a mark too small to aim at. */}
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {/* The two places that are not the list. Both are read rather
                    than worked in, which is why neither has a tab. */}
                <DropdownMenuItem onSelect={() => show('settings')}>
                  <SettingsGlyph />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => show('changelog')}>
                  <History />
                  Changelog
                </DropdownMenuItem>

                {!onList && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => show('list')}>
                      <ChevronLeftIcon />
                      Back to the list
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-hidden">
          {/*
            The default sync mode, not "wait": the two panels overlap for the
            200ms rather than queueing, so the switch is one movement instead
            of a fade-out followed by a fade-in with a gap in the middle. That
            means both are mounted for a moment, which is what the absolute
            positioning is for.
          */}
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={tab}
              custom={direction}
              variants={{
                enter: (d: number) => ({
                  opacity: 0,
                  x: d * PAGE_SLIDE,
                  filter: `blur(${PAGE_BLUR}px)`
                }),
                settled: { opacity: 1, x: 0, filter: 'blur(0px)' },
                leave: (d: number) => ({
                  opacity: 0,
                  x: d * -PAGE_SLIDE,
                  filter: `blur(${PAGE_BLUR}px)`
                })
              }}
              initial="enter"
              animate="settled"
              exit="leave"
              transition={pageSlide}
              className="absolute inset-0"
            >
              <ScrolledProvider>
                {tab === 'list' ? (
                  <ItemList query={query} />
                ) : tab === 'settings' ? (
                  <SettingsPanel />
                ) : (
                  <ChangelogPanel />
                )}
              </ScrolledProvider>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toaster position="top-center" />
    </TooltipProvider>
    </MotionConfig>
  )
}
