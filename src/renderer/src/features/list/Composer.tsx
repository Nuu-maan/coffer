import { useRef, useState } from 'react'
import { ArrowUp, Crop, ImagePlus, MousePointerSquareDashed } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { coffer } from '@/lib/ipc'
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
    resize(areaRef.current)
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
      <div className="flex items-end gap-1 px-1.5 py-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hit-36 mb-[1px] shrink-0"
              aria-label="Add an image"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add an image file</TooltipContent>
        </Tooltip>

        <Textarea
          ref={areaRef}
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
          className="max-h-28 min-h-[24px] flex-1 resize-none py-[3px] leading-snug"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hit-36 mb-[1px] shrink-0"
              aria-label="Clip a region"
              onClick={() => void coffer.clipper.start()}
            >
              <Crop />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clip a region of the screen</TooltipContent>
        </Tooltip>

        <AnimatePresence mode="popLayout">
          {canSubmit && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springSnap}
              className="mb-[1px] shrink-0"
            >
              <Button variant="tint" size="icon-sm" aria-label="Add stash" onClick={submit}>
                <ArrowUp />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
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
            <div className="flex items-center gap-2 border-t border-border px-1.5 py-1">
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

function resize(element: HTMLTextAreaElement | null): void {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 112)}px`
}
