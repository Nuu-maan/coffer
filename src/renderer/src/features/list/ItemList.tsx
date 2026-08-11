import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { AnimatePresence, LayoutGroup, Reorder, motion } from 'motion/react'
import type { Item } from '@shared/types/item'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { coffer } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import { ease, spring } from '@/lib/motion'
import { useImageIntake } from '@/hooks/use-image-intake'
import { useItems } from '@/hooks/use-items'
import { usePlatform } from '@/hooks/use-platform'
import { ItemRow } from './ItemRow'
import { Composer } from './Composer'

export function ItemList(): React.JSX.Element {
  const { items, addText, addImage, toggle, update, remove, clearDone, move } = useItems()
  const platform = usePlatform()
  const { dragging, handlers } = useImageIntake(addImage)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState<{ id: string; what: 'image' | 'text' } | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The list is dragged directly, so the on-screen order has to follow the
  // pointer immediately and only settle with the store when the drag ends.
  const [ordered, setOrdered] = useState<Item[]>(items)
  const reordering = useRef(false)

  useEffect(() => {
    if (!reordering.current) setOrdered(items)
  }, [items])

  const copy = useCallback((item: Item, what: 'image' | 'text') => {
    if (item.kind === 'image' && what === 'image') {
      void coffer.clipboard.writeImage(item.file, item.caption)
    } else {
      const text = item.kind === 'image' ? item.caption : item.text
      if (!text) return
      void coffer.clipboard.write(text)
    }

    setCopied({ id: item.id, what })
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(null), 1400)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.target instanceof HTMLTextAreaElement) return
      if (event.target instanceof HTMLInputElement) return

      const index = ordered.findIndex((item) => item.id === selectedId)

      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault()
        const next = ordered[Math.min(index + 1, ordered.length - 1)] ?? ordered[0]
        if (next) setSelectedId(next.id)
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault()
        const prev = ordered[Math.max(index - 1, 0)] ?? ordered[0]
        if (prev) setSelectedId(prev.id)
      } else if (event.key === 'Enter' && index >= 0) {
        event.preventDefault()
        const item = ordered[index]
        if (item) copy(item, item.kind === 'image' ? 'image' : 'text')
      } else if (event.key === ' ' && index >= 0) {
        event.preventDefault()
        if (selectedId) toggle(selectedId)
      } else if ((event.key === 'Backspace' || event.key === 'Delete') && selectedId) {
        event.preventDefault()
        remove(selectedId)
        setSelectedId(null)
      } else if (event.key === 'Escape') {
        coffer.window.hideMain()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ordered, selectedId, copy, toggle, remove])

  function commitOrder(id: string): void {
    reordering.current = false
    const index = ordered.findIndex((item) => item.id === id)
    if (index < 0) return
    move(id, ordered[index - 1]?.id ?? null, ordered[index + 1]?.id ?? null)
  }

  const pending = ordered.filter((item) => !item.done).length
  const doneCount = ordered.length - pending
  const trigger = platform?.supportsDoubleShift ? 'tap Shift twice' : 'press Ctrl+Shift+Space'

  return (
    <div className="relative flex h-full min-h-0 flex-col" {...handlers}>
      {ordered.length > 0 && (
        <div className="flex h-9 shrink-0 items-center justify-between px-4">
          <span className="text-2xs tracking-[0.08em] text-muted-foreground tabular-nums">
            {pending} open
            {doneCount > 0 && ` · ${doneCount} done`}
          </span>

          <AnimatePresence>
            {doneCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={ease}
              >
                <Button variant="ghost" size="xs" onClick={clearDone}>
                  Clear done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {ordered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex flex-1 flex-col items-center justify-center gap-1.5 px-8 pb-16 text-center"
        >
          <p className="text-lg font-medium [text-wrap:balance]">Nothing stashed yet</p>
          <p className="text-base leading-relaxed text-muted-foreground [text-wrap:balance]">
            Select anything, then {trigger}. Images can be pasted or dropped here.
          </p>
        </motion.div>
      ) : (
        <ScrollArea className="min-h-0 flex-1 scroll-fade-bottom">
          <LayoutGroup>
            <Reorder.Group
              axis="y"
              values={ordered}
              onReorder={(next) => {
                reordering.current = true
                setOrdered(next)
              }}
              className="list-none px-1.5 pb-20"
            >
              {/* Sync, not popLayout: an exiting row must stay in the flow so
                  the rows below it close the gap instead of snapping up. */}
              <AnimatePresence initial={false}>
                {ordered.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    selected={item.id === selectedId}
                    copied={copied?.id === item.id ? copied.what : null}
                    onSelect={() => setSelectedId(item.id)}
                    onCopy={(what) => copy(item, what)}
                    onToggle={() => toggle(item.id)}
                    onRemove={() => remove(item.id)}
                    onUpdate={(text) => update(item.id, text)}
                    onDragEnd={() => commitOrder(item.id)}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </LayoutGroup>
        </ScrollArea>
      )}

      <Composer onSubmit={addText} />

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={spring}
            className={cn(
              'material-thick pointer-events-none absolute inset-2 z-30 flex flex-col',
              'items-center justify-center gap-2 rounded-xl text-base font-medium',
              'ring-2 ring-tint/40 ring-inset'
            )}
          >
            <ImagePlus className="size-6 text-tint" />
            Drop to stash the image
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
