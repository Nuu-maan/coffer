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
      className={`row${selected ? ' row--selected' : ''}${item.done ? ' row--done' : ''}`}
      draggable={!editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseDown={onSelect}
    >
      <button
        className="row__check"
        onClick={onToggle}
        aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
      >
        {item.done ? '✓' : ''}
      </button>

      {editing ? (
        <textarea
          ref={inputRef}
          className="row__edit"
          value={draft}
          rows={1}
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
        />
      ) : (
        <button className="row__text" onClick={onCopy} onDoubleClick={() => setEditing(true)}>
          {item.text}
        </button>
      )}

      <span className={`row__status${copied ? ' row__status--on' : ''}`}>Copied</span>

      <button className="row__remove" onClick={onRemove} aria-label="Delete">
        ×
      </button>
    </li>
  )
}
