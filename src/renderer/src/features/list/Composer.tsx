import { useRef, useState } from 'react'
import { coffer } from '@/lib/ipc'

export function Composer(): React.JSX.Element {
  const [text, setText] = useState('')
  const [stashing, setStashing] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  function submit(): void {
    const trimmed = text.trim()
    if (!trimmed) return
    void coffer.items.add({ text: trimmed })
    setText('')
    resize(ref.current)
  }

  async function stashSelection(): Promise<void> {
    setStashing(true)
    try {
      await coffer.stash.selection()
    } finally {
      setStashing(false)
    }
  }

  return (
    <div className="composer">
      <textarea
        ref={ref}
        className="composer__input"
        placeholder="Type a stash…"
        value={text}
        rows={1}
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
      />

      <div className="composer__actions">
        <button
          className="composer__grab"
          onClick={() => void stashSelection()}
          disabled={stashing}
          title="Copy the current selection from whatever app is in front"
        >
          {stashing ? 'Grabbing…' : 'Grab selection'}
        </button>

        <button className="composer__add" onClick={submit} disabled={!text.trim()}>
          Add
        </button>
      </div>
    </div>
  )
}

function resize(element: HTMLTextAreaElement | null): void {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 140)}px`
}
