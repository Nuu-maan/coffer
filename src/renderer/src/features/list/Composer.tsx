import { useRef, useState } from 'react'
import { ArrowUp, Crop, ImagePlus, MousePointerSquareDashed } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { coffer } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import { toBytes } from '@/lib/images'
import { ease, springSnap } from '@/lib/motion'

type Props = {
  onSubmit: (text: string) => void
}

export function Composer({ onSubmit }: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [stashing, setStashing] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const canSubmit = text.trim().length > 0
  const expanded = focused || canSubmit

  function submit(): void {
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setText('')
  }

  async function grabSelection(): Promise<void> {
    setStashing(true)
    try {
      await coffer.stash.selection()
    } finally {
      setStashing(false)
    }
  }

  async function pickImages(files: FileList | null): Promise<void> {
    for (const file of Array.from(files ?? [])) {
      const bytes = await toBytes(file)
      if (!bytes) {
        toast.error(`${file.name} is too large to stash`)
        continue
      }
      await coffer.items.addImage({ data: bytes })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="material relative z-20 shrink-0 border-t border-border">
      {/* The field is the whole control: the accessories sit inside its border
          so there is one focus ring and one rectangle, not four. */}
      <div
        data-focused={focused || undefined}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) areaRef.current?.focus()
        }}
        className={cn(
          'm-1.5 flex items-end gap-1 rounded-lg border border-input-border bg-input px-1 py-1',
          /* Recessed rather than flat: a field you type into is a well in the
             surface, and on a dark ground the only thing that says so is the
             shadow the top edge casts into it. */
          'shadow-[inset_0_1px_2px_var(--well)]',
          'transition-[border-color,box-shadow] duration-100',
          'data-[focused]:border-ring data-[focused]:ring-[3px] data-[focused]:ring-ring/30'
        )}
      >
        {/* Both accessories add content, so they sit together on one side and
            leave the right edge to the one control that commits. Split across
            the two edges, the clipper sat where the send button appears and
            read as the thing that submits. */}
        <div className="flex shrink-0 items-center self-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hit-36"
                aria-label="Add an image"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add an image file</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="hit-36"
                aria-label="Clip a region"
                onClick={() => void coffer.clipper.start()}
              >
                <Crop />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clip a region of the screen</TooltipContent>
          </Tooltip>
        </div>

        <Textarea
          ref={areaRef}
          variant="bare"
          rows={1}
          value={text}
          placeholder="Type a stash…"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          /* Grown by field-sizing rather than by measuring: measuring after a
             submit reads the height of text React has not cleared yet, which
             is what left the box stuck open at its full height. */
          className="max-h-28 flex-1 self-center py-[3px] leading-snug"
        />

        {/* The slot is held open whether or not the button is in it, so the
            field does not lose 26px of width — and rewrap the line being
            typed — on the first character. */}
        <div className="flex size-[26px] shrink-0 items-center justify-center self-end">
          <AnimatePresence initial={false}>
            {canSubmit && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={springSnap}
              >
                <Button variant="tint" size="icon-sm" aria-label="Add stash" onClick={submit}>
                  <ArrowUp />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={ease}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 border-t border-border px-2 py-1">
              <Button
                variant="ghost"
                size="xs"
                disabled={stashing}
                onClick={() => void grabSelection()}
              >
                <MousePointerSquareDashed />
                {stashing ? 'Grabbing…' : 'Grab selection'}
              </Button>

              <span className="ml-auto pr-1 text-2xs text-muted-foreground">
                Return to stash · Shift-Return for a new line
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => void pickImages(event.target.files)}
      />
    </div>
  )
}
