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
      className={`group raised flex items-start gap-3 rounded-card bg-surface px-3.5 py-3 shadow-card transition-colors ${
        selected ? 'bg-surface-hi ring-1 ring-accent/40' : 'hover:bg-surface-hi'
      }`}
    >
      <button
        onClick={onToggle}
        aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
        className={`hit-36 mt-px grid size-[18px] shrink-0 place-items-center rounded-full transition-[color,background-color,box-shadow,scale] active:scale-[0.96] ${
          item.done
            ? 'bg-accent text-bg'
            : 'ring-1 ring-line-hi hover:ring-accent'
        }`}
      >
        {item.done && (
          <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
            <path
              d="M4 8.5l2.5 2.5L12 5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
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
          className={`flex-1 whitespace-pre-wrap break-words text-left leading-normal [text-wrap:pretty] ${
            item.done ? 'text-ink-dim line-through' : ''
          }`}
        >
          {item.text}
        </button>
      )}

      <span
        className={`shrink-0 self-center rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent transition-opacity ${
          copied ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Copied
      </span>

      <button
        onClick={onRemove}
        aria-label="Delete"
        className="hit-36 grid size-6 shrink-0 self-center place-items-center rounded-full text-ink-faint opacity-0 transition-[color,background-color,opacity,scale] hover:bg-surface hover:text-ink focus-visible:opacity-100 active:scale-[0.96] group-hover:opacity-100"
      >
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
          <path d="M4.5 4.5l7 7m0-7l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  )
}
