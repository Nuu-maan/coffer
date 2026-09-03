import { useEffect, useRef } from 'react'
import { Search, X } from '@/components/icons'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (value: string) => void
}

/*
 * The panel's own search, in the title bar where a toolbar's search goes.
 *
 * A capsule with the glyph inside it rather than a labelled field with a button
 * beside it: at this width there is room for one control across the top, and a
 * search field that looks like a search field needs no label.
 */
export function SearchField({ value, onChange }: Props): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)

  /* ⌘F / Ctrl-F, and Escape to clear then to leave — the order a find bar
     has everywhere else. Escape with the field already empty falls through to
     the list's own handler, which hides the window. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() === 'f' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div
      className={cn(
        'no-drag group/search relative flex h-[26px] flex-1 items-center gap-1.5 rounded-full px-2.5',
        /* Raised, not recessed. It was a grey well, which on a near-white panel
           is a smudge — and a search field is a thing you put text into, which
           on this platform is drawn as a surface sitting on the window rather
           than as a hole cut into it. Same fill and same lift as the composer,
           because they are the same kind of control. */
        'bg-card text-sm shadow-card',
        'transition-shadow duration-100',
        'focus-within:ring-[3px] focus-within:ring-ring/30'
      )}
    >
      <Search className="size-3.5 shrink-0 text-muted-foreground" />

      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder="Search"
        aria-label="Search stashes"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !value) return
          /* Clearing is the first thing Escape does, and it must not also
             reach the window. */
          event.stopPropagation()
          onChange('')
        }}
        className={cn(
          'min-w-0 flex-1 bg-transparent outline-none',
          'placeholder:text-muted-foreground'
        )}
      />

      {/* Held out of the layout until there is something to clear, so the
          field does not reflow the moment the first character lands. */}
      {value.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          className="press focus-halo -mr-1 shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}
