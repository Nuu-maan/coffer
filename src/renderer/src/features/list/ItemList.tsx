import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { AnimatePresence, LayoutGroup, Reorder, motion } from 'motion/react'
import { itemLabel, type Item } from '@shared/types/item'
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
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  /* Where a shift-range measures from. Set by every plain click and every
     unshifted arrow, left alone while the range is being stretched. */
  const anchorId = useRef<string | null>(null)
  /* The end of the selection the keyboard is holding, which is the row a plain
     arrow steps from and a shift-arrow stretches. */
  const focusId = useRef<string | null>(null)
  const [copied, setCopied] = useState<{ id: string; what: 'image' | 'text' } | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [ordered, setOrdered] = useState<Item[]>(items)
  const reordering = useRef(false)

  /*
   * Measured rather than assumed. The chrome at the foot of the list changes
   * height as the composer opens and as the done strip comes and goes, and a
   * constant written for one of those states hides a row in the others.
   */
  const chromeRef = useRef<HTMLDivElement>(null)
  const [chrome, setChrome] = useState(44)

  useEffect(() => {
    const el = chromeRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setChrome(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!reordering.current) setOrdered(items)
  }, [items])

  /*
   * The three ways a list selects, in the order the platform expects them:
   * shift stretches a range from the anchor, the platform's own modifier adds
   * and removes one row, and a plain click starts over.
   */
  const select = useCallback(
    (id: string, modifiers: { shift: boolean; toggle: boolean }) => {
      setSelectedIds((current) => {
        if (modifiers.shift && anchorId.current) {
          const from = ordered.findIndex((item) => item.id === anchorId.current)
          const to = ordered.findIndex((item) => item.id === id)
          if (from < 0 || to < 0) return new Set([id])
          const [start, end] = from < to ? [from, to] : [to, from]
          return new Set(ordered.slice(start, end + 1).map((item) => item.id))
        }

        if (modifiers.toggle) {
          const next = new Set(current)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          anchorId.current = id
          return next
        }

        anchorId.current = id
        return new Set([id])
      })
    },
    [ordered]
  )

  const clearSelection = useCallback(() => {
    anchorId.current = null
    setSelectedIds(new Set())
  }, [])

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

  const selection = useCallback(
    (): Item[] => ordered.filter((item) => selectedIds.has(item.id)),
    [ordered, selectedIds]
  )

  /*
   * Plain copy joins the rows with blank lines, the way copying paragraphs
   * does. As a list, each row becomes one bullet and its own line breaks are
   * folded into it, so pasting a two-line stash does not silently turn into
   * two bullets.
   */
  const copySelection = useCallback(
    (asList: boolean) => {
      const chosen = selection()
      if (chosen.length === 0) return

      if (chosen.length === 1 && !asList) {
        const only = chosen[0]
        if (only) copy(only, only.kind === 'image' ? 'image' : 'text')
        return
      }

      const lines = chosen.map((item) => itemLabel(item).trim()).filter(Boolean)
      if (lines.length === 0) return

      void coffer.clipboard.write(
        asList ? lines.map((line) => `- ${line.replace(/\n/g, ' ')}`).join('\n') : lines.join('\n\n')
      )

      const first = chosen[0]
      if (first) {
        setCopied({ id: first.id, what: 'text' })
        if (copiedTimer.current) clearTimeout(copiedTimer.current)
        copiedTimer.current = setTimeout(() => setCopied(null), 1400)
      }
    },
    [selection, copy]
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.target instanceof HTMLTextAreaElement) return
      if (event.target instanceof HTMLInputElement) return

      /* The cursor end of the selection: the row an arrow moves from and a
         shift-arrow stretches. A range keeps its far end here. */
      const cursorId = focusId.current
      const index = ordered.findIndex((item) => item.id === cursorId)
      const chosen = ordered.filter((item) => selectedIds.has(item.id))

      function moveTo(next: Item | undefined, extend: boolean): void {
        if (!next) return
        focusId.current = next.id
        if (extend) select(next.id, { shift: true, toggle: false })
        else select(next.id, { shift: false, toggle: false })
      }

      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault()
        moveTo(ordered[Math.min(index + 1, ordered.length - 1)] ?? ordered[0], event.shiftKey)
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault()
        moveTo(ordered[Math.max(index - 1, 0)] ?? ordered[0], event.shiftKey)
      } else if (event.key === 'a' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSelectedIds(new Set(ordered.map((item) => item.id)))
      } else if (event.key.toLowerCase() === 'c' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        copySelection(event.shiftKey)
      } else if (event.key === 'Enter' && chosen.length > 0) {
        event.preventDefault()
        copySelection(false)
      } else if (event.key === ' ' && chosen.length > 0) {
        event.preventDefault()
        for (const item of chosen) toggle(item.id)
      } else if ((event.key === 'Backspace' || event.key === 'Delete') && chosen.length > 0) {
        event.preventDefault()
        for (const item of chosen) remove(item.id)
        clearSelection()
      } else if (event.key === 'Escape') {
        if (chosen.length > 0) clearSelection()
        else coffer.window.hideMain()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ordered, selectedIds, select, clearSelection, copySelection, toggle, remove])

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
              clearSelection()
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
              className="list-none px-1.5 pt-1.5"
              style={{ paddingBottom: chrome + 6 }}
            >
              <AnimatePresence initial={false}>
                {ordered.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    selected={selectedIds.has(item.id)}
                    divider={
                      index < ordered.length - 1 &&
                      !selectedIds.has(item.id) &&
                      !selectedIds.has(ordered[index + 1]?.id ?? '')
                    }
                    selectionSize={selectedIds.size}
                    copied={copied?.id === item.id ? copied.what : null}
                    onSelect={(modifiers) => {
                      focusId.current = item.id
                      select(item.id, modifiers)
                    }}
                    onContextMenu={() => {
                      /* Right-clicking outside the selection moves it here, the
                         way every file list does; inside it, the selection is
                         what the menu acts on and must survive the click. */
                      if (selectedIds.has(item.id)) return
                      focusId.current = item.id
                      select(item.id, { shift: false, toggle: false })
                    }}
                    onCopy={(what) => copy(item, what)}
                    onCopySelection={copySelection}
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

      {/*
        Floated over the list rather than stacked under it, so the rows pass
        beneath the composer instead of stopping at a fence drawn across the
        window. The list carries the clearance for it as padding, which is what
        lets the last row scroll clear of it.
      */}
      <div ref={chromeRef} className="absolute inset-x-0 bottom-0 z-20">
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
              className="material flex items-center justify-between overflow-hidden px-3 text-2xs text-muted-foreground tabular-nums"
            >
              <span>{doneCount === 1 ? '1 done' : `${doneCount} done`}</span>

              <Button variant="ghost" size="xs" className="h-[16px] px-1.5" onClick={clearDone}>
                Clear
              </Button>
            </motion.footer>
          )}
        </AnimatePresence>

        <Composer onSubmit={addText} />
      </div>

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
