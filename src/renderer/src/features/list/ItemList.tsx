import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item } from '@shared/types/item'
import { coffer } from '@/lib/ipc'
import { useItems } from '@/hooks/use-items'
import { ItemRow } from './ItemRow'
import { Composer } from './Composer'
import './list.css'

export function ItemList(): React.JSX.Element {
  const { items, toggle, update, remove, clearDone, move } = useItems()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback((item: Item) => {
    void coffer.clipboard.write(item.text)
    setCopiedId(item.id)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopiedId(null), 1200)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.target instanceof HTMLTextAreaElement) return

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
        if (item) copy(item)
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

  if (items.length === 0) {
    return (
      <div className="list">
        <Composer />
        <div className="empty">
          <p className="empty__title">Nothing stashed yet</p>
          <p className="empty__hint">
            Select text anywhere, then tap Shift twice to stash it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="list">
      <Composer />
      <ul className="list__items">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            copied={item.id === copiedId}
            onSelect={() => setSelectedId(item.id)}
            onCopy={() => copy(item)}
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

      <footer className="list__footer">
        <span>{pending} open</span>
        {doneCount > 0 && (
          <button className="list__clear" onClick={clearDone}>
            Clear {doneCount} done
          </button>
        )}
      </footer>
    </div>
  )
}
