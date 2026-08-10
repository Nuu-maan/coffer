import { useEffect, useRef, useState } from 'react'
import type { Item } from '@shared/types/item'

type Props = {
  item: Item
  selected: boolean
  copied: boolean
  onSelect: () => void
  onCopy: () => void
  onToggle: () => void
  onRemove: () => void
  onUpdate: (text: string) => void
  onDragStart: () => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: () => void
}

export function ItemRow({
  item,
  selected,
  copied,
  onSelect,
  onCopy,
  onToggle,
  onRemove,
  onUpdate,
  onDragStart,
  onDragOver,
  onDrop
}: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    setDraft(item.text)
  }, [item.text])

  function commit(): void {
    setEditing(false)
    if (draft.trim() !== item.text) onUpdate(draft)
  }

  return (
    <li
      draggable={!editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseDown={onSelect}
      className={`group flex items-start gap-2.5 rounded-lg border px-2.5 py-2.5 ${
        selected ? 'border-line bg-surface' : 'border-transparent hover:bg-surface'
      }`}
    >
      <button
        onClick={onToggle}
        aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
        className="mt-0.5 h-[17px] w-[17px] shrink-0 rounded-[5px] border border-line text-[11px] leading-none text-accent hover:border-accent"
      >
        {item.done ? '✓' : ''}
      </button>

      {editing ? (
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              commit()
            }
            if (event.key === 'Escape') {
              setDraft(item.text)
              setEditing(false)
            }
          }}
          className="flex-1 whitespace-pre-wrap break-words text-left leading-normal outline-none"
        />
      ) : (
        <button
          onClick={onCopy}
          onDoubleClick={() => setEditing(true)}
          className={`flex-1 whitespace-pre-wrap break-words text-left leading-normal ${
            item.done ? 'text-ink-dim line-through' : ''
          }`}
        >
          {item.text}
        </button>
      )}

      <span
        className={`shrink-0 self-center text-[11px] text-accent transition-opacity ${
          copied ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Copied
      </span>

      <button
        onClick={onRemove}
        aria-label="Delete"
        className="shrink-0 self-center text-base leading-none text-ink-dim opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
      >
        ×
      </button>
    </li>
  )
}
