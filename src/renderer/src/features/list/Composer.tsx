import { useRef, useState } from 'react'
import { coffer } from '@/lib/ipc'

export function Composer(): React.JSX.Element {
  const [text, setText] = useState('')
  const [stashing, setStashing] = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  function submit(): void {
    const trimmed = text.trim()
    if (!trimmed) return
    void coffer.items.add({ text: trimmed })
    setText('')
    resize(ref.current)
  }

  async function grabSelection(): Promise<void> {
    setStashing(true)
    try {
      await coffer.stash.selection()
    } finally {
      setStashing(false)
    }
  }

  const canSubmit = text.trim().length > 0

  return (
    <div className="shrink-0 px-3 pb-3 pt-1">
      <div
        className={`raised rounded-dock bg-surface p-2 shadow-dock ${
          focused ? 'ring-1 ring-accent/40' : ''
        }`}
      >
        <textarea
          ref={ref}
          rows={1}
          value={text}
          placeholder="Type a stash…"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            setText(event.target.value)
            resize(event.target)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          className="max-h-32 w-full overflow-y-auto bg-transparent px-3 pb-1 pt-2 leading-normal outline-none"
        />

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => void grabSelection()}
            disabled={stashing}
            title="Copy the current selection from whatever app is in front"
            className="hit-40 flex h-9 items-center gap-1.5 rounded-full bg-surface-hi pl-3 pr-3.5 text-xs text-ink-dim shadow-card transition-[color,background-color,scale] disabled:opacity-50 enabled:hover:text-ink enabled:active:scale-[0.96]"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path
                d="M8 3.5v9M3.5 8h9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {stashing ? 'Grabbing…' : 'Grab selection'}
          </button>

          <button
            onClick={submit}
            disabled={!canSubmit}
            title="Add stash"
            aria-label="Add stash"
            className={`hit-40 grid size-9 place-items-center rounded-full transition-[color,background-color,filter,scale] ${
              canSubmit
                ? 'bg-accent text-bg hover:brightness-110 active:scale-[0.96]'
                : 'bg-surface-hi text-ink-faint'
            }`}
          >
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <path
                d="M8 12.5v-9M4 7.5L8 3.5l4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function resize(element: HTMLTextAreaElement | null): void {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 128)}px`
}
