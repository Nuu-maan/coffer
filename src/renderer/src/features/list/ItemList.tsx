import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus } from '@/components/icons'
import { AnimatePresence, LayoutGroup, Reorder, frame, motion, useDragControls } from 'motion/react'
import { sameTag, type Item, type Section } from '@shared/types/item'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { coffer } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import { ease, spring } from '@/lib/motion'
import { useImageIntake } from '@/hooks/use-image-intake'
import { useStagedImages } from '@/hooks/use-staged-images'
import { useItems } from '@/hooks/use-items'
import { useReportScrolled } from '@/hooks/use-scrolled'
import { usePlatform } from '@/hooks/use-platform'
import { useSettings } from '@/hooks/use-settings'
import { format } from '@/lib/accelerator'
import { Textarea } from '@/components/ui/textarea'
import { ItemRow, type SelectModifiers } from './ItemRow'
import { SectionCaption } from './SectionCaption'
import { group, matches, type Group } from './sections'
import { asNumberedList, asParagraphs } from './copy-text'
import { Composer } from './Composer'

type Props = {
  /** What the title bar's search field holds. '' shows everything. */
  query: string
}

/*
 * A card with one line of text and its timestamp, which is the shortest a card
 * gets. The empty-section placeholder is drawn at exactly this, so the gap it
 * leaves is the shape of the thing that goes in it.
 *
 * Derived rather than guessed: py-2 top and bottom, one line of --text-base at
 * its 1.46 leading, the gap-1 under it, and one line of --text-2xs at 1.3.
 */
const CARD_HEIGHT = 8 + Math.round(13 * 1.46) + 4 + Math.round(10 * 1.3) + 8

/* What a section made from the + menu is called until it is named. Numbered
   only when it has to be, so the first one is not "New section 1". */
function nextSectionName(sections: Section[]): string {
  const base = 'New section'
  if (!sections.some((section) => sameTag(section.name, base))) return base
  for (let n = 2; ; n += 1) {
    const candidate = `${base} ${n}`
    if (!sections.some((section) => sameTag(section.name, candidate))) return candidate
  }
}

export function ItemList({ query }: Props): React.JSX.Element {
  const {
    items,
    sections,
    addText,
    addImages,
    toggle,
    update,
    remove,
    removeMany,
    restore,
    clearDone,
    move,
    setTag,
    addSection,
    renameSection,
    removeSection,
    moveSection
  } = useItems()
  const platform = usePlatform()
  const settings = useSettings()
  const staging = useStagedImages()
  const { dragging, handlers } = useImageIntake(staging.attach)
  const reportScrolled = useReportScrolled()
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  /* Where a shift-range measures from. Set by every plain click and every
     unshifted arrow, left alone while the range is being stretched. */
  const anchorId = useRef<string | null>(null)
  /* The end of the selection the keyboard is holding, which is the row a plain
     arrow steps from and a shift-arrow stretches. */
  const focusId = useRef<string | null>(null)
  /* `index` says which picture of a multi-image stash flashed, so the mark
     lands on the one that was clicked rather than on all of them. */
  const [copied, setCopied] = useState<{
    id: string
    what: 'image' | 'text'
    index: number
  } | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /* The section the + menu just made, which opens its caption for naming. A
     name rather than a flag, so a rename landing from another window does not
     put an unrelated caption into edit. */
  const [naming, setNaming] = useState<string | null>(null)
  /* The section whose caption's + was pressed, which opens a card-shaped field
     at the head of that section. A name rather than a flag, so two sections
     cannot both think the field is theirs. */
  const [composingIn, setComposingIn] = useState<string | null>(null)

  /*
   * Filing by drag.
   *
   * A Reorder.Group only ever permutes its own values, so a card dragged out of
   * one section and over another is, as far as motion is concerned, still in
   * the first — it reorders inside it and springs back. Which section the
   * pointer is actually over has to be worked out here, against the blocks'
   * own rectangles, and acted on when the card is let go.
   *
   * Rectangles read live rather than cached: the list reflows continuously
   * under a drag, and a map of rects measured at drag start is wrong by the
   * second frame.
   */
  const blocks = useRef(new Map<string, HTMLElement>())
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const dropTargetRef = useRef<string | null>(null)
  /* Whether a card is in the air at all, as against which section it is over.
     The empty sections only draw themselves as targets while there is something
     to catch. */
  const [carrying, setCarrying] = useState(false)
  const carryingRef = useRef(false)
  /* How tall the card in the air is. An empty section's well used to be one
     line of text tall whatever was being dropped into it, so carrying a stash
     with a picture and a caption over a 48px slot meant aiming a 136px card at
     a target a third of its size. Measured from the row itself rather than
     guessed from its kind, because a caption can wrap to any number of
     lines. */
  const [carriedHeight, setCarriedHeight] = useState<number | null>(null)

  const registerBlock = useCallback((name: string, element: HTMLElement | null) => {
    if (element) blocks.current.set(name, element)
    else blocks.current.delete(name)
  }, [])

  /* The card in the air and where the pointer last had it, and whether a test
     against the blocks is already booked for it. */
  const carried = useRef<{ item: Item; point: { x: number; y: number } } | null>(null)
  const booked = useRef(false)

  /*
   * Which block the pointer is over, measured in the frame loop's read step.
   *
   * onDrag fires inside motion's update step, and asking for a rectangle there
   * forces the browser to flush layout in the middle of a frame motion is still
   * writing transforms into — a forced reflow per frame, for the whole length of
   * a drag, on the one interaction in this window that has to hold 60fps.
   * Booked into the read step instead, where reading costs nothing, and only one
   * is ever outstanding: the pointer moves faster than the answer changes.
   */
  const hitTest = useCallback(() => {
    booked.current = false
    const carrying = carried.current
    /* Let go between the booking and the read. */
    if (!carrying || !carryingRef.current) return

    let found: string | null = null
    for (const [name, element] of blocks.current) {
      const box = element.getBoundingClientRect()
      if (carrying.point.y >= box.top && carrying.point.y <= box.bottom) {
        found = name
        break
      }
    }

    /* Its own section is not a target — dropping a card back where it started
       is a reorder, which the group under it is already handling. */
    const own = carrying.item.tag ?? ''
    const next = found === null || found.toLocaleLowerCase() === own.toLocaleLowerCase()
      ? null
      : found

    if (next !== dropTargetRef.current) {
      dropTargetRef.current = next
      setDropTarget(next)
    }
  }, [])

  const trackDrag = useCallback(
    (item: Item, point: { x: number; y: number }) => {
      if (!carryingRef.current) {
        carryingRef.current = true
        setCarrying(true)
        const row = document.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`)
        setCarriedHeight(row ? Math.round(row.getBoundingClientRect().height) : null)
      }

      carried.current = { item, point }
      if (booked.current) return
      booked.current = true
      frame.read(hitTest)
    },
    [hitTest]
  )

  const [ordered, setOrdered] = useState<Item[]>(items)
  const reordering = useRef(false)

  /* The same trick for the captions: held locally for the length of a drag so
     the list reflows under the pointer, then handed to the store on drop. */
  const [orderedSections, setOrderedSections] = useState<Section[]>(sections)
  const reorderingSections = useRef(false)

  /*
   * Measured rather than assumed. The chrome at the foot of the list changes
   * height as the composer opens and as the done strip comes and goes, and a
   * constant written for one of those states hides a row in the others.
   */
  const chromeRef = useRef<HTMLDivElement>(null)
  const [chrome, setChrome] = useState(44)

  useEffect(() => {
    const el = chromeRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setChrome(entry.contentRect.height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!reordering.current) setOrdered(items)
  }, [items])

  useEffect(() => {
    if (!reorderingSections.current) setOrderedSections(sections)
  }, [sections])

  /*
   * What is actually on screen, and in the order it is on screen: the sections
   * in their own order, each holding its own items in theirs, and the unfiled
   * ones last. Everything downstream — the keyboard's j/k, shift-ranges,
   * select-all — reads the flattened form of this rather than the raw list, so
   * a search narrows what those act on and an arrow steps the way the eye does.
   */
  const groups = useMemo(() => {
    const filtered = query.trim() ? ordered.filter((item) => matches(item, query)) : ordered
    const all = group(filtered, orderedSections)
    /* A search hides the captions it emptied. An empty section is a real thing
       to show at rest — it is what "New section" makes — but during a search it
       is a caption for nothing that matched, which reads as a bad result. */
    return query.trim() ? all.filter((entry) => entry.items.length > 0) : all
  }, [ordered, orderedSections, query])

  const visible = useMemo(() => groups.flatMap((entry) => entry.items), [groups])

  /*
   * The three ways a list selects, in the order the platform expects them:
   * shift stretches a range from the anchor, the platform's own modifier adds
   * and removes one row, and a plain click starts over.
   */
  const select = useCallback(
    (id: string, modifiers: SelectModifiers) => {
      setSelectedIds((current) => {
        if (modifiers.shift && anchorId.current) {
          const from = visible.findIndex((item) => item.id === anchorId.current)
          const to = visible.findIndex((item) => item.id === id)
          if (from < 0 || to < 0) return new Set([id])
          const [start, end] = from < to ? [from, to] : [to, from]
          return new Set(visible.slice(start, end + 1).map((item) => item.id))
        }

        if (modifiers.toggle) {
          const next = new Set(current)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          anchorId.current = id
          return next
        }

        anchorId.current = id
        return new Set([id])
      })
    },
    [visible]
  )

  const clearSelection = useCallback(() => {
    anchorId.current = null
    setSelectedIds(new Set())
  }, [])

  /* `index` picks the picture out of a multi-image stash. It is ignored for
     text, and 0 is the only picture there is on a stash holding one. */
  const copy = useCallback((item: Item, what: 'image' | 'text', index = 0) => {
    if (item.kind === 'image' && what === 'image') {
      const image = item.images[index]
      if (!image) return
      void coffer.clipboard.writeImage(image.file, item.caption)
    } else {
      const text = item.kind === 'image' ? item.caption : item.text
      if (!text) return
      void coffer.clipboard.write(text)
    }

    setCopied({ id: item.id, what, index })
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(null), 1400)
  }, [])

  /*
   * What Return in the composer does, and the only place the two halves of a
   * stash are put together.
   *
   * With pictures waiting, the typed line is their caption and the whole tray
   * becomes one stash — which is the point of staging them. With nothing
   * waiting it is the plain text stash it always was. Empty text and an empty
   * tray is not a stash at all, and the composer will not offer it.
   */
  const commit = useCallback(
    (text: string) => {
      if (staging.images.length === 0) {
        addText(text)
        return
      }
      const batch = staging.images.map((image) => image.bytes)
      staging.clear()
      void addImages(batch, text)
    },
    [staging, addText, addImages]
  )

  const selection = useCallback(
    (): Item[] => visible.filter((item) => selectedIds.has(item.id)),
    [visible, selectedIds]
  )

  /* Ticked, in the order the list shows them — which is the order they will be
     numbered in. Search-filtered along with everything else on screen: what is
     copied is what is in front of you. */
  const ticked = useMemo(() => visible.filter((item) => item.done), [visible])

  /*
   * Two copies, and they take their rows from different places on purpose.
   *
   * Plain copy is about the highlighted rows and joins them with blank lines,
   * the way copying paragraphs does. As a list is about the *ticked* rows:
   * ticking is how a run of stashes is gathered up over a session, and the
   * numbered list is the thing that run was being gathered for. Asking the user
   * to tick a set and then highlight the same set again to get it out is asking
   * them to say it twice.
   *
   * With nothing ticked it falls back to the highlighted rows, so the command
   * is never simply dead — a menu item that does nothing at all reads as broken
   * rather than as inapplicable.
   */
  const copySelection = useCallback(
    (asList: boolean) => {
      const chosen = asList && ticked.length > 0 ? ticked : selection()
      if (chosen.length === 0) return

      if (chosen.length === 1 && !asList) {
        const only = chosen[0]
        if (only) copy(only, only.kind === 'image' ? 'image' : 'text')
        return
      }

      const text = asList ? asNumberedList(chosen) : asParagraphs(chosen)
      if (!text) return

      void coffer.clipboard.write(text)

      /*
       * The ticked rows are not necessarily the row the menu was opened on, or
       * even on screen — the flash on a card cannot be the only word back. The
       * count is, and it doubles as a check that the list is the length it was
       * meant to be.
       */
      if (asList) {
        /* One line per entry is what asNumberedList promises, so the lines
           are the entries. */
        const copiedCount = text.split('\n').length
        toast(copiedCount === 1 ? 'Copied as a list' : `${copiedCount} stashes copied as a list`)
      }

      const first = chosen[0]
      if (first) {
        setCopied({ id: first.id, what: 'text', index: 0 })
        if (copiedTimer.current) clearTimeout(copiedTimer.current)
        copiedTimer.current = setTimeout(() => setCopied(null), 1400)
      }
    },
    [ticked, selection, copy]
  )

  /*
   * Every delete in the panel goes through here, so every delete carries the
   * same offer. The buffer that makes it possible lives in the main process;
   * this only has to say how many went and hand the count back.
   */
  const discard = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      if (ids.length === 1) remove(ids[0] as string)
      else removeMany(ids)

      toast(ids.length === 1 ? 'Stash deleted' : `${ids.length} stashes deleted`, {
        action: { label: 'Undo', onClick: () => restore(ids) }
      })
    },
    [remove, removeMany, restore]
  )

  function reorderWithin(before: Item[], next: Item[]): Item[] {
    reordering.current = true
    const slots = ordered
      .map((item, index) => (before.includes(item) ? index : -1))
      .filter((index) => index >= 0)
    const merged = [...ordered]
    slots.forEach((slot, i) => {
      const item = next[i]
      if (item) merged[slot] = item
    })
    setOrdered(merged)
    return merged
  }

  /*
   * One step up or down, by keyboard, and it stops at the section boundary —
   * the same rule the drag follows, because a row's order says where it sits
   * inside its own section and moving between sections is filing, not sorting.
   */
  const nudgeRow = useCallback(
    (id: string, direction: -1 | 1) => {
      const home = groups.find((entry) => entry.items.some((item) => item.id === id))
      if (!home) return

      const within = home.items.findIndex((item) => item.id === id)
      const landing = within + direction
      if (landing < 0 || landing >= home.items.length) return

      const next = [...home.items]
      const [moved] = next.splice(within, 1)
      if (!moved) return
      next.splice(landing, 0, moved)

      const merged = reorderWithin(home.items, next)
      reordering.current = false

      const at = merged.findIndex((item) => item.id === id)
      move(id, merged[at - 1]?.id ?? null, merged[at + 1]?.id ?? null)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, ordered, move]
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.target instanceof HTMLTextAreaElement) return
      if (event.target instanceof HTMLInputElement) return

      /* The cursor end of the selection: the row an arrow moves from and a
         shift-arrow stretches. A range keeps its far end here. */
      const cursorId = focusId.current
      const index = visible.findIndex((item) => item.id === cursorId)
      const chosen = visible.filter((item) => selectedIds.has(item.id))

      function moveTo(next: Item | undefined, extend: boolean): void {
        if (!next) return
        focusId.current = next.id
        if (extend) select(next.id, { shift: true, toggle: false })
        else select(next.id, { shift: false, toggle: false })
      }

      /* Alt and an arrow carries the row rather than the cursor — the same
         chord that moves a line in every text editor, and the only way to
         reorder without a pointer. */
      if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault()
        if (cursorId) nudgeRow(cursorId, event.key === 'ArrowDown' ? 1 : -1)
      } else if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault()
        moveTo(visible[Math.min(index + 1, visible.length - 1)] ?? visible[0], event.shiftKey)
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault()
        moveTo(visible[Math.max(index - 1, 0)] ?? visible[0], event.shiftKey)
      } else if (event.key === 'a' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSelectedIds(new Set(visible.map((item) => item.id)))
      } else if (event.key.toLowerCase() === 'c' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        copySelection(event.shiftKey)
      } else if (event.key === 'Enter' && chosen.length > 0) {
        event.preventDefault()
        copySelection(false)
      } else if (event.key === ' ' && chosen.length > 0) {
        event.preventDefault()
        for (const item of chosen) toggle(item.id)
      } else if ((event.key === 'Backspace' || event.key === 'Delete') && chosen.length > 0) {
        event.preventDefault()
        discard(chosen.map((item) => item.id))
        clearSelection()
      } else if (event.key === 'Escape') {
        if (chosen.length > 0) clearSelection()
        else coffer.window.hideMain()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, selectedIds, select, clearSelection, copySelection, toggle, discard, nudgeRow])

  /* Dropped over another section, the card is filed there; dropped over its
     own, it has only been reordered. The two cannot both happen — a card that
     changed section takes its place at the end of the one it landed in. */
  function commitOrder(id: string): void {
    reordering.current = false

    const target = dropTargetRef.current
    dropTargetRef.current = null
    carryingRef.current = false
    carried.current = null
    setDropTarget(null)
    setCarrying(false)
    setCarriedHeight(null)

    if (target !== null) {
      setTag(id, target)
      return
    }

    const index = ordered.findIndex((item) => item.id === id)
    if (index < 0) return
    move(id, ordered[index - 1]?.id ?? null, ordered[index + 1]?.id ?? null)
  }

  /* The same, one level up: a caption dropped between two others takes an order
     between theirs. Only the section list moves — the items keep the order they
     had, because their order says where they sit inside their own section and
     nothing about where the section sits. */
  function commitSectionOrder(name: string): void {
    reorderingSections.current = false
    const index = orderedSections.findIndex((section) => sameTag(section.name, name))
    if (index < 0) return
    moveSection({
      name,
      beforeName: orderedSections[index - 1]?.name ?? null,
      afterName: orderedSections[index + 1]?.name ?? null
    })
  }

  /*
   * One section, one step. The same move the drag makes on drop, reachable
   * from the caption's own keyboard handler.
   */
  function nudgeSection(name: string, direction: -1 | 1): void {
    const index = orderedSections.findIndex((section) => sameTag(section.name, name))
    const landing = index + direction
    if (index < 0 || landing < 0 || landing >= orderedSections.length) return

    const next = [...orderedSections]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(landing, 0, moved)

    moveSection({
      name,
      beforeName: next[landing - 1]?.name ?? null,
      afterName: next[landing + 1]?.name ?? null
    })
  }

  function newSection(): void {
    const name = nextSectionName(sections)
    addSection(name)
    setNaming(name)
  }

  /* Reordering rows inside one section, put back into the whole list in the
     places that section occupied. A drag inside a section cannot move anything
     out of it. */
  const doneCount = ordered.filter((item) => item.done).length

  /* Read from the live setting rather than written down. The literal here
     named the clipper's shortcut for an instruction about stashing, went stale
     the moment either was rebound, and printed a key macOS does not use. */
  const trigger = platform?.supportsDoubleShift
    ? 'tap Shift twice'
    : settings
      ? `press ${format(settings.accelerator, platform?.platform === 'darwin')}`
      : 'use your stash shortcut'

  const rowProps = {
    tags: orderedSections.map((section) => section.name),
    selectedIds,
    copied,
    tickedCount: ticked.length,
    focusId,
    select,
    copy,
    copySelection,
    toggle,
    update,
    setTag,
    trackDrag,
    commitOrder,
    discard
  }

  const tagged = groups.filter((entry) => entry.section !== null)
  const untagged = groups.find((entry) => entry.section === null)
  const empty = ordered.length === 0 && orderedSections.length === 0

  return (
    <div className="relative flex h-full min-h-0 flex-col" {...handlers}>
      {empty ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={ease}
          className="flex flex-1 flex-col items-center justify-center gap-1 px-8 text-center"
        >
          <p className="text-md font-semibold [text-wrap:balance]">Nothing stashed yet</p>
          <p className="text-base text-muted-foreground [text-wrap:balance]">
            Select anything, then {trigger}. Images can be pasted or dropped here.
          </p>
        </motion.div>
      ) : (
        <ScrollArea
          className="min-h-0 flex-1"
          onViewportScroll={reportScrolled}
          onMouseDown={(event) => {
            if (!(event.target as HTMLElement).closest('[data-slot="item-row"]')) {
              clearSelection()
            }
          }}
        >
          <LayoutGroup>
            {/*
              Two levels of dragging, and the clearance for the floating
              composer hangs off the bottom as padding so the last card can
              still scroll clear of it.

              gap-4 between sections against gap-1.5 between the cards inside
              one: a caption has to read as belonging to what is under it rather
              than floating between two groups, and at the old spacing — a
              caption 12px under the cards above and 6px over its own — it read
              as belonging to the wrong ones.
            */}
            <div className="px-3 pt-1" style={{ paddingBottom: chrome + 8 }}>
              <Reorder.Group
                axis="y"
                values={orderedSections}
                onReorder={(next) => {
                  reorderingSections.current = true
                  setOrderedSections(next)
                }}
                className="flex list-none flex-col gap-4"
              >
                {tagged.map((entry) => (
                  <SectionBlock
                    key={entry.section?.name ?? ''}
                    entry={entry}
                    naming={naming}
                    rowProps={rowProps}
                    dropping={
                      dropTarget !== null && sameTag(dropTarget, entry.section?.name ?? undefined)
                    }
                    carrying={carrying}
                    carriedHeight={carriedHeight}
                    register={registerBlock}
                    onReorderItems={reorderWithin}
                    onDropSection={commitSectionOrder}
                    composing={
                      composingIn !== null && sameTag(composingIn, entry.section?.name ?? undefined)
                    }
                    onRename={renameSection}
                    onRemove={removeSection}
                    onCompose={setComposingIn}
                    onNudge={nudgeSection}
                    onCommit={(text) => {
                      addText(text, entry.section?.name ?? '')
                      setComposingIn(null)
                    }}
                    onCancel={() => setComposingIn(null)}
                    onNamed={() => setNaming(null)}
                  />
                ))}
              </Reorder.Group>

              {/*
                No caption over the unfiled items. There is no name to print, and
                a caption reading "Untagged" is a label for an absence — the gap
                above them already says it.

                Drawn while a card is in the air even when there is nothing in
                it, which is the whole of how a card gets back out of a section.
                The run only existed when it had members, so filing the last
                loose stash took the target away with it and everything on the
                panel was stuck in a section for good — the one move with no
                menu item behind it and no way left to make it.
              */}
              {(untagged || carrying) && (
                <div
                  ref={(element) => registerBlock('', element)}
                  className={cn(
                    '-mx-1.5 rounded-card px-1.5 py-1 transition-colors duration-150',
                    tagged.length > 0 && 'mt-2',
                    /* Unfiling by drag: the unsectioned run at the foot of the
                       list is a drop target like any other, and dropping a card
                       on it is how a card leaves its section without a menu. */
                    dropTarget === '' ? 'bg-accent' : 'bg-transparent'
                  )}
                >
                  {untagged ? (
                    <Rows
                      items={untagged.items}
                      rowProps={rowProps}
                      onReorderItems={reorderWithin}
                    />
                  ) : (
                    <Well
                      height={carriedHeight}
                      over={dropTarget === ''}
                      label="Drop here to unfile"
                    />
                  )}
                </div>
              )}
            </div>
          </LayoutGroup>
        </ScrollArea>
      )}

      {/*
        Floated over the list rather than stacked under it, so the rows pass
        beneath the composer instead of stopping at a fence drawn across the
        window. The list carries the clearance for it as padding, which is what
        lets the last row scroll clear of it.
      */}
      <div ref={chromeRef} className="absolute inset-x-0 bottom-0 z-20">
        {/*
          Only here when there is something to clear. As a permanent strip it
          spent almost all of its life reporting a count the list is already
          showing — and it put the control that clears the done items two bars
          away from them. It arrives with them and leaves with them instead.
        */}
        <AnimatePresence initial={false}>
          {doneCount > 0 && (
            <motion.footer
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 26, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={ease}
              className="flex items-center overflow-hidden px-3"
            >
              {/* A capsule rather than a band, now that the composer under it is
                  one too. It used to be a translucent strip the width of the
                  window, which only worked while the composer was drawing the
                  same strip directly beneath it. */}
              <div
                className={cn(
                  'flex min-h-[20px] items-center gap-1 rounded-full bg-card pr-0.5 pl-2',
                  'text-2xs text-muted-foreground shadow-float tabular-nums'
                )}
              >
                <span>{doneCount === 1 ? '1 done' : `${doneCount} done`}</span>

                {/* Through the same offer as any other delete: clearing the
                    done items removes them, and removing is undoable. */}
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-[16px] px-1.5"
                  onClick={() => {
                    const cleared = ordered.filter((item) => item.done).map((item) => item.id)
                    clearDone()
                    toast(
                      cleared.length === 1
                        ? '1 stash cleared'
                        : `${cleared.length} stashes cleared`,
                      { action: { label: 'Undo', onClick: () => restore(cleared) } }
                    )
                  }}
                >
                  Clear
                </Button>
              </div>
            </motion.footer>
          )}
        </AnimatePresence>

        <Composer
          onSubmit={commit}
          onNewSection={newSection}
          staged={staging.images}
          onRemoveStaged={staging.remove}
          onAttach={staging.attach}
        />
      </div>

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={ease}
            className={cn(
              'material-thick pointer-events-none absolute inset-1.5 z-30 flex flex-col',
              'items-center justify-center gap-2 rounded-card text-base font-medium',
              'ring-2 ring-tint ring-inset'
            )}
          >
            <ImagePlus className="size-5 text-tint" />
            Drop to attach
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* Everything a row needs that is the same for every row, passed as one object
   rather than as fifteen props repeated at three call sites. */
type RowProps = {
  tags: string[]
  selectedIds: ReadonlySet<string>
  copied: { id: string; what: 'image' | 'text'; index: number } | null
  /** How many rows are ticked, for the label on Copy as list. */
  tickedCount: number
  focusId: React.RefObject<string | null>
  select: (id: string, modifiers: SelectModifiers) => void
  copy: (item: Item, what: 'image' | 'text', index?: number) => void
  copySelection: (asList: boolean) => void
  toggle: (id: string) => void
  update: (id: string, text: string) => void
  setTag: (id: string, tag: string) => void
  trackDrag: (item: Item, point: { x: number; y: number }) => void
  commitOrder: (id: string) => void
  discard: (ids: string[]) => void
}

/*
 * One section: its caption, and the cards under it, as a single thing that can
 * be dragged past its neighbours.
 *
 * A component of its own rather than a branch in the map above, because the
 * drag controls are a hook and a hook cannot be called per iteration. It also
 * puts the caption and the rows it captions in one place, which is what they
 * are on screen.
 */
function SectionBlock({
  entry,
  naming,
  rowProps,
  dropping,
  carrying,
  carriedHeight,
  composing,
  register,
  onReorderItems,
  onDropSection,
  onRename,
  onRemove,
  onCompose,
  onNudge,
  onCommit,
  onCancel,
  onNamed
}: {
  entry: Group
  naming: string | null
  rowProps: RowProps
  /** A card is being carried over this section right now. */
  dropping: boolean
  /** A card is being carried somewhere — not necessarily here. */
  carrying: boolean
  /** How tall that card is, so a well can be cut to fit it. */
  carriedHeight: number | null
  /** The caption's + was pressed, so this section has a field open. */
  composing: boolean
  register: (name: string, element: HTMLElement | null) => void
  onReorderItems: (before: Item[], next: Item[]) => void
  onDropSection: (name: string) => void
  onRename: (from: string, to: string) => void
  onRemove: (name: string) => void
  onCompose: (name: string) => void
  onNudge: (name: string, direction: -1 | 1) => void
  onCommit: (text: string) => void
  onCancel: () => void
  onNamed: () => void
}): React.JSX.Element {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  const section = entry.section as Section

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false)
        onDropSection(section.name)
      }}
      /* The same spring the cards inside it travel on. Left to the default, a
         section moved on one curve while every row it contains moved on
         another — two speeds for one movement, which reads as the contents
         sliding around inside the block rather than coming with it. */
      transition={spring}
      layout="position"
      style={{ position: 'relative' }}
      /* Only the stacking. The lift itself is drawn one level in, on the box
         that has padding — see below. */
      className={cn('list-none rounded-card', dragging && 'z-30')}
    >
      {/*
        The rectangle the drop test is run against, and the thing that lights up
        when a card is held over it.

        A wash rather than a ring. The ring was two solid pixels of the accent
        drawn around a whole section — the loudest thing in the window, for a
        state that lasts as long as a pointer is held still. Tinting the ground
        under the section says the same thing at a tenth of the volume, which is
        all a drop target has to say: not *look at me*, but *here*.

        Its own element rather than a ref on the Reorder.Item: the item owns its
        transform while it is being dragged, and hanging a measured rectangle
        off the thing that is moving is asking to measure it mid-flight.
      */}
      <div
        ref={(element) => register(section.name, element)}
        className={cn(
          /* The wash bleeds six pixels past the content and the negative margin
             gives them back, so the caption and the cards stay on the list's
             own gutter and the highlight is the only thing that moves.

             Shaped like a card, not like the window. It was rounded-window with
             a whole section inside it — a 20px corner drawn around a group of
             12px corners, which reads as a second window rather than as a
             highlight on this one. */
          '-mx-1.5 rounded-card px-1.5 py-1.5 transition-colors duration-150',
          dropping ? 'bg-accent' : 'bg-transparent',
          /*
             The lift, drawn here rather than on the Reorder.Item above.
             The item's box is pulled tight around the caption and the cards, so
             the hairline in shadow-float traced them with nothing between the
             line and the type — a border with no padding at all. This box
             already holds the six pixels the wash bleeds by, and py-1.5 matches
             them top and bottom, so the same shadow now has a margin to sit in.

             Filled while it travels, too: a section carried over the list with
             a hairline and no ground let the rows underneath show through the
             gaps between its cards.
          */
          dragging && 'bg-elevated shadow-float'
        )}
      >
      <div className="mb-1.5">
        <SectionCaption
          name={section.name}
          autoEdit={naming !== null && sameTag(naming, section.name)}
          onRename={(next) => onRename(section.name, next)}
          onRemove={() => onRemove(section.name)}
          onAdd={() => onCompose(section.name)}
          onNudge={(direction) => onNudge(section.name, direction)}
          onEdited={onNamed}
          onDragHandle={(event) => controls.start(event)}
        />
      </div>

      {/*
        An empty section, in the two states it actually has.
      
        At rest it is a line of small grey type and nothing else. It used to be
        a dashed box the height of a card, always — which is a drop target drawn
        permanently for a drop that is not happening, and with two empty
        sections on screen the panel was mostly dashes. A rectangle is a strong
        shape; spending one on "there is nothing here" says the absence is the
        most important thing in the window.
      
        With a card in the air it becomes the target, because now there is
        something to catch: a well the size of the card that would go in it —
        CARD_HEIGHT rather than a number picked to look right, since a
        placeholder that is not the size of a card reads as a hole. Held over,
        the well fills and lifts into the card itself, so what you are looking
        at is the thing you are about to have.
      */}
      {entry.items.length === 0 && !composing ? (
        carrying ? (
          <Well height={carriedHeight} over={dropping} label="Drop here" />
        ) : (
          <p className="text-2xs text-muted-foreground">Nothing filed here yet</p>
        )
      ) : (
        entry.items.length > 0 && (
          <Rows items={entry.items} rowProps={rowProps} onReorderItems={onReorderItems} />
        )
      )}

      {/* Under the section's own cards, because that is where the card it makes
          will land — a stash is appended, and a field that takes text at the top
          of a group and drops the result at the bottom of it makes the user
          hunt for what they just wrote. */}
      {composing && <SectionField onCommit={onCommit} onCancel={onCancel} />}
      </div>
    </Reorder.Item>
  )
}

/*
 * A card-shaped field at the head of a section, opened by that caption's +.
 *
 * Where it appears is the whole point: the composer at the foot of the window
 * adds to the list, and filing what it made is a second act. This is already in
 * the section, drawn as the card it is about to become and standing exactly
 * where that card will stand, so there is nothing left to say about where the
 * text is going.
 *
 * Committed on Return, abandoned on Escape or on losing focus — the same
 * contract every other one-line field in this window keeps.
 */
function SectionField({
  onCommit,
  onCancel
}: {
  onCommit: (text: string) => void
  onCancel: () => void
}): React.JSX.Element {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => ref.current?.focus(), [])

  function commit(): void {
    const trimmed = text.trim()
    if (trimmed) onCommit(trimmed)
    else onCancel()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={ease}
      className={cn(
        'mt-1.5 flex items-start gap-2 rounded-card bg-card px-2.5 py-2 shadow-card',
        'ring-[3px] ring-ring/30'
      )}
    >
      {/* The circle a stash has, drawn rather than interactive — the same trick
          the main composer plays, and for the same reason: it lines the field
          up with the cards under it. */}
      <span
        aria-hidden
        className="mt-[1px] size-[17px] shrink-0 rounded-full border border-input-border"
      />

      <Textarea
        ref={ref}
        variant="bare"
        rows={1}
        value={text}
        aria-label="Add a stash to this section"
        placeholder="New stash"
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            commit()
          } else if (event.key === 'Escape') {
            onCancel()
          }
        }}
        className="max-h-24 flex-1 text-base leading-snug"
      />
    </motion.div>
  )
}

/*
 * The hole a card is about to go into.
 *
 * Cut to the height of the card actually in the air rather than to one line of
 * text: a placeholder that is not the size of the thing it stands for reads as
 * a gap in the layout, and — worse — asks you to land a tall stash on a short
 * target. CARD_HEIGHT is only the floor now, for the case where the row could
 * not be measured.
 */
function Well({
  height,
  over,
  label
}: {
  height: number | null
  over: boolean
  label: string
}): React.JSX.Element {
  return (
    <div
      style={{ height: Math.max(height ?? CARD_HEIGHT, CARD_HEIGHT) }}
      className={cn(
        'flex items-center justify-center rounded-card text-2xs',
        'transition-colors duration-150',
        over ? 'bg-card text-foreground shadow-card' : 'bg-accent text-muted-foreground'
      )}
    >
      {label}
    </div>
  )
}

function Rows({
  items,
  rowProps,
  onReorderItems
}: {
  items: Item[]
  rowProps: RowProps
  onReorderItems: (before: Item[], next: Item[]) => void
}): React.JSX.Element {
  const {
    tags,
    selectedIds,
    copied,
    tickedCount,
    focusId,
    select,
    copy,
    copySelection,
    toggle,
    update,
    setTag,
    trackDrag,
    commitOrder,
    discard
  } = rowProps

  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={(next) => onReorderItems(items, next)}
      className="flex list-none flex-col gap-1.5"
    >
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <ItemRow
            key={item.id}
            item={item}
            index={index}
            tags={tags}
            selected={selectedIds.has(item.id)}
            selectionSize={selectedIds.size}
            tickedCount={tickedCount}
            copied={copied?.id === item.id ? copied : null}
            onSelect={(modifiers) => {
              focusId.current = item.id
              select(item.id, modifiers)
            }}
            onContextMenu={() => {
              /* Right-clicking outside the selection moves it here, the way
                 every file list does; inside it, the selection is what the menu
                 acts on and must survive the click. */
              if (selectedIds.has(item.id)) return
              focusId.current = item.id
              select(item.id, { shift: false, toggle: false })
            }}
            onCopy={(what, index) => copy(item, what, index)}
            onCopySelection={copySelection}
            onToggle={() => toggle(item.id)}
            onRemove={() => discard([item.id])}
            onUpdate={(text) => update(item.id, text)}
            onSetTag={(tag) => setTag(item.id, tag)}
            onDragMove={(point) => trackDrag(item, point)}
            onDragEnd={() => commitOrder(item.id)}
          />
        ))}
      </AnimatePresence>
    </Reorder.Group>
  )
}
