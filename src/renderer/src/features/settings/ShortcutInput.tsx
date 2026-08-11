import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePlatform } from '@/hooks/use-platform'

type Props = {
  value: string
  invalid?: boolean
  onChange: (accelerator: string) => void
}

export function ShortcutInput({ value, invalid, onChange }: Props): React.JSX.Element {
  const [recording, setRecording] = useState(false)
  const mac = usePlatform()?.platform === 'darwin'

  useEffect(() => {
    if (!recording) return

    function onKeyDown(event: KeyboardEvent): void {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setRecording(false)
        return
      }

      const accelerator = toAccelerator(event)
      if (!accelerator) return

      onChange(accelerator)
      setRecording(false)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recording, onChange])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setRecording((current) => !current)}
      aria-live="polite"
      className={cn(
        'relative w-40 justify-center gap-1 text-xs tabular-nums',
        recording && 'border-tint text-tint',
        invalid && !recording && 'border-destructive text-destructive'
      )}
    >
      {recording ? (
        <>
          <motion.span
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="size-1.5 rounded-full bg-tint"
          />
          Press keys…
        </>
      ) : (
        <span className="flex items-center gap-1">
          {parts(value, mac).map((part, index) => (
            <kbd
              key={`${part}-${index}`}
              className="rounded-[4px] bg-well px-1.5 py-px text-[10px] leading-4 text-foreground shadow-[inset_0_0_0_0.5px_var(--border)]"
            >
              {part}
            </kbd>
          ))}
        </span>
      )}
    </Button>
  )
}

function toAccelerator(event: KeyboardEvent): string | null {
  const key = keyName(event.code)
  if (!key) return null

  const modifiers: string[] = []
  if (event.ctrlKey) modifiers.push('Control')
  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')
  if (event.metaKey) modifiers.push('Super')

  const isFunctionKey = /^F\d{1,2}$/.test(key)
  if (modifiers.length === 0 && !isFunctionKey) return null

  return [...modifiers, key].join('+')
}

function keyName(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit\d$/.test(code)) return code.slice(5)
  if (/^F\d{1,2}$/.test(code)) return code

  const named: Record<string, string> = {
    Space: 'Space',
    Enter: 'Return',
    Tab: 'Tab',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Insert: 'Insert',
    Delete: 'Delete'
  }

  return named[code] ?? null
}

/* The Mac glyphs are Mac keys. Off macOS the same modifier is a differently
   named, differently placed key, and printing ⌘ for it names a key the
   keyboard does not have. */
function parts(accelerator: string, mac: boolean): string[] {
  return accelerator.split('+').map((part) => {
    if (part === 'Control') return mac ? '⌃' : 'Ctrl'
    if (part === 'Super') return mac ? '⌘' : 'Super'
    if (part === 'Shift') return mac ? '⇧' : 'Shift'
    if (part === 'Alt') return mac ? '⌥' : 'Alt'
    if (part === 'Return') return mac ? '⏎' : 'Enter'
    return part
  })
}
