import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { AnimatePresence, LayoutGroup, Reorder, motion } from 'motion/react'
import type { Item } from '@shared/types/item'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { coffer } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import { ease } from '@/lib/motion'
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
        if (selectedId) setSelectedId(null)
        else coffer.window.hideMain()
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

  const doneCount = ordered.filter((item) => item.done).length
  const trigger = platform?.supportsDoubleShift ? 'tap Shift twice' : 'press Ctrl+Shift+Space'

  return (
    <div className="relative flex h-full min-h-0 flex-col" {...handlers}>
      {ordered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={ease}
          className="flex flex-1 flex-col items-center justify-center gap-1 px-8 text-center"
        >
          <p className="text-md font-semibold [text-wrap:balance]">Nothing stashed yet</p>
          <p className="text-base text-muted-foreground [text-wrap:balance]">
            Select anything, then {trigger}. Images can be pasted or dropped here.
          </p>
        </motion.div>
      ) : (
        <ScrollArea
          className="min-h-0 flex-1"
          onMouseDown={(event) => {
            if (!(event.target as HTMLElement).closest('[data-slot="item-row"]')) {
              setSelectedId(null)
            }
          }}
        >
          <LayoutGroup>
            <Reorder.Group
              axis="y"
              values={ordered}
              onReorder={(next) => {
                reordering.current = true
                setOrdered(next)
              }}
              className="list-none px-1.5 py-1.5"
            >
              <AnimatePresence initial={false}>
                {ordered.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    selected={item.id === selectedId}
                    divider={
                      index < ordered.length - 1 &&
                      item.id !== selectedId &&
                      ordered[index + 1]?.id !== selectedId
                    }
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

      {/*
        Only here when there is something to clear. As a permanent strip it
        spent almost all of its life reporting a count the list is already
        showing — and it put the control that clears the done items two bars
        away from them. It arrives with them and leaves with them instead.
      */}
      <AnimatePresence initial={false}>
        {doneCount > 0 && (
          <motion.footer
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 24, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={ease}
            className="flex shrink-0 items-center justify-between overflow-hidden border-t border-border bg-muted px-2.5 text-2xs text-muted-foreground tabular-nums"
          >
            <span>{doneCount === 1 ? '1 done' : `${doneCount} done`}</span>

            <Button variant="ghost" size="xs" className="h-[16px] px-1.5" onClick={clearDone}>
              Clear
            </Button>
          </motion.footer>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={ease}
            className={cn(
              'material-thick pointer-events-none absolute inset-1.5 z-30 flex flex-col',
              'items-center justify-center gap-2 rounded-lg text-base font-medium',
              'ring-2 ring-tint ring-inset'
            )}
          >
            <ImagePlus className="size-5 text-tint" />
            Drop to stash the image
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
