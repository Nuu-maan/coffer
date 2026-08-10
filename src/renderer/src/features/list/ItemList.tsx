import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import type { Item } from '@shared/types/item'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { coffer } from '@/lib/ipc'
import { cn } from '@/lib/utils'
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
  const dragId = useRef<string | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    copiedTimer.current = setTimeout(() => setCopied(null), 1200)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.target instanceof HTMLTextAreaElement) return
      if (event.target instanceof HTMLInputElement) return

      const index = items.findIndex((item) => item.id === selectedId)

      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault()
        const next = items[Math.min(index + 1, items.length - 1)] ?? items[0]
        if (next) setSelectedId(next.id)
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault()
        const prev = items[Math.max(index - 1, 0)] ?? items[0]
        if (prev) setSelectedId(prev.id)
      } else if (event.key === 'Enter' && index >= 0) {
        event.preventDefault()
        const item = items[index]
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
  }, [items, selectedId, copy, toggle, remove])

  function handleDrop(targetId: string): void {
    const sourceId = dragId.current
    dragId.current = null
    if (!sourceId || sourceId === targetId) return

    const targetIndex = items.findIndex((item) => item.id === targetId)
    const sourceIndex = items.findIndex((item) => item.id === sourceId)
    if (targetIndex < 0 || sourceIndex < 0) return

    const movingDown = sourceIndex < targetIndex
    const beforeId = movingDown ? targetId : (items[targetIndex - 1]?.id ?? null)
    const afterId = movingDown ? (items[targetIndex + 1]?.id ?? null) : targetId

    move(sourceId, beforeId, afterId)
  }

  const pending = items.filter((item) => !item.done).length
  const doneCount = items.length - pending
  const trigger = platform?.supportsDoubleShift ? 'tap Shift twice' : 'press Ctrl+Shift+Space'

  return (
    <div className="relative flex h-full min-h-0 flex-col" {...handlers}>
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-8 text-center">
          <p className="text-[15px] [text-wrap:balance]">Nothing stashed yet</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Select anything, then {trigger}. Images can be pasted or dropped here.
          </p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <ul className="list-none space-y-1.5 px-3 pb-2 pt-1">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                copied={copied?.id === item.id ? copied.what : null}
                onSelect={() => setSelectedId(item.id)}
                onCopy={(what) => copy(item, what)}
                onToggle={() => toggle(item.id)}
                onRemove={() => remove(item.id)}
                onUpdate={(text) => update(item.id, text)}
                onDragStart={() => {
                  dragId.current = item.id
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(item.id)}
              />
            ))}
          </ul>
        </ScrollArea>
      )}

      {items.length > 0 && (
        <>
          <Separator />
          <footer className="flex shrink-0 items-center justify-between px-4 py-1.5 text-[11px] tabular-nums text-muted-foreground">
            <span>{pending} open</span>
            {doneCount > 0 && (
              <Button variant="ghost" size="xs" onClick={clearDone}>
                Clear {doneCount} done
              </Button>
            )}
          </footer>
        </>
      )}

      <Composer onSubmit={addText} />

      <div
        className={cn(
          'pointer-events-none absolute inset-2 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ring bg-background/85 text-sm transition-opacity',
          dragging ? 'opacity-100' : 'opacity-0'
        )}
      >
        <ImagePlus className="size-6 text-muted-foreground" />
        Drop to stash the image
      </div>
    </div>
  )
}
