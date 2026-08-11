import { useRef, useState } from 'react'
import { ArrowUp, Crop, ImagePlus, MousePointerSquareDashed } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { coffer } from '@/lib/ipc'
import { toBytes } from '@/lib/images'
import { cn } from '@/lib/utils'
import { ease, spring, springSheet } from '@/lib/motion'

type Props = {
  onSubmit: (text: string) => void
}

/**
 * A pill of glass floating over the list, not a panel welded to the bottom of
 * the window. It stays small until you have something to say, then grows to
 * make room — the list keeps scrolling underneath it the whole time.
 */
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
    <motion.div
      layout
      transition={springSheet}
      animate={{ borderRadius: expanded ? 20 : 24 }}
      className={cn(
        'material material-edge absolute inset-x-3 bottom-3 z-20 overflow-hidden shadow-float'
      )}
    >
      <motion.div layout="position" className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hit-40 ml-1.5 shrink-0"
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
          variant="bare"
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
          className="vibrant max-h-32 min-h-0 flex-1 py-3 text-base leading-snug"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hit-40 shrink-0"
              aria-label="Clip a region"
              onClick={() => void coffer.clipper.start()}
            >
              <Crop />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clip a region of the screen</TooltipContent>
        </Tooltip>

        {/* The send button only exists once there is something to send, and it
            arrives with the small bounce of something dropping into place. */}
        <AnimatePresence mode="popLayout">
          {canSubmit && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: 'spring', bounce: 0.35, duration: 0.34 }}
              className="mr-1.5 shrink-0"
            >
              <Button size="icon-sm" aria-label="Add stash" onClick={submit}>
                <ArrowUp />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!canSubmit && <span className="mr-1.5" />}
      </motion.div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 border-t border-white/20 px-2 py-1.5 dark:border-white/[0.06]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={stashing}
                    onClick={() => void grabSelection()}
                  >
                    <MousePointerSquareDashed />
                    {stashing ? 'Grabbing…' : 'Grab selection'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy whatever is selected in the app in front</TooltipContent>
              </Tooltip>

              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...ease, delay: 0.06 }}
                className="ml-auto pr-1.5 text-2xs text-muted-foreground"
              >
                ⏎ to stash · ⇧⏎ for a new line
              </motion.span>
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
    </motion.div>
  )
}

function resize(element: HTMLTextAreaElement | null): void {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 128)}px`
}
