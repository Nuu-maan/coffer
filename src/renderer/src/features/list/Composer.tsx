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

  async function grabSelection(): Promise<void> {
    setStashing(true)
    try {
      await coffer.stash.selection()
    } finally {
      setStashing(false)
    }
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-line px-3.5 py-3">
      <textarea
        ref={ref}
        rows={1}
        value={text}
        placeholder="Type a stash…"
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
        className="max-h-36 overflow-y-auto rounded-lg border border-line bg-surface px-3 py-2 leading-normal outline-none focus:border-accent"
      />

      <div className="flex justify-between gap-2">
        <ComposerButton
          onClick={() => void grabSelection()}
          disabled={stashing}
          title="Copy the current selection from whatever app is in front"
        >
          {stashing ? 'Grabbing…' : 'Grab selection'}
        </ComposerButton>

        <ComposerButton onClick={submit} disabled={!text.trim()} emphasis>
          Add
        </ComposerButton>
      </div>
    </div>
  )
}

function ComposerButton({
  onClick,
  disabled = false,
  emphasis = false,
  title,
  children
}: {
  onClick: () => void
  disabled?: boolean
  emphasis?: boolean
  title?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-[7px] border border-line px-2.5 py-1 text-xs transition-colors disabled:cursor-default disabled:opacity-45 ${
        emphasis ? 'text-accent' : 'text-ink-dim'
      } enabled:hover:border-accent enabled:hover:text-ink`}
    >
      {children}
    </button>
  )
}

function resize(element: HTMLTextAreaElement | null): void {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 140)}px`
}
