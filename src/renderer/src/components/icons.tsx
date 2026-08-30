import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  CancelCircleIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  ComputerIcon,
  Copy01Icon,
  CropIcon,
  CursorPointer01Icon,
  CursorRectangleSelection02Icon,
  DragDropVerticalIcon,
  FlashIcon,
  FolderAddIcon,
  HistoryIcon,
  ImageAdd02Icon,
  InformationCircleIcon,
  KeyboardIcon,
  Loading03Icon,
  MinusSignIcon,
  Moon02Icon,
  MoreHorizontalIcon,
  PaintBoardIcon,
  PinIcon,
  PlusSignIcon,
  PowerIcon,
  Search01Icon,
  Settings02Icon,
  SquareRoundCornerIcon,
  Sun03Icon,
  Tag01Icon,
  Tick02Icon,
  Timer02Icon,
  Delete02Icon
} from '@hugeicons/core-free-icons'

type Props = {
  className?: string
  strokeWidth?: number
}

/*
 * One place the drawing comes from, so a screen asks for "the close icon"
 * rather than for a particular vendor's spelling of it. Which is what made this
 * swap a file rather than a hundred edits.
 *
 * Hugeicons, drawn on a 24px grid with an open stroke and rounded joins. Two
 * things it does that matter at the sizes this window lives at: the strokes are
 * genuinely uniform, so a glyph does not thicken at its curves and read heavier
 * than the one beside it, and the shapes are drawn wide rather than tall, which
 * is what keeps a 14px icon from turning into a smudge with a hole in it.
 *
 * Weight is set here rather than at the call sites. At 24px the vendor's 1.5 is
 * right; scaled down to the 13 and 14 pixels most of these are drawn at, it
 * thins out below what a stroke can survive, so the body weight is 1.8 and the
 * handful that carry meaning on their own — a tick, a plus, an arrow — take 2.2.
 * Size stays with the caller: every control already sets it, and a Tailwind
 * `size-*` class beats the width the component writes as an attribute.
 */
function icon(glyph: IconSvgElement, weight = 1.8) {
  return function Wrapped({ className, strokeWidth }: Props): React.JSX.Element {
    return (
      <HugeiconsIcon
        icon={glyph}
        size="1em"
        strokeWidth={strokeWidth ?? weight}
        className={className}
      />
    )
  }
}

export const ArrowUp = icon(ArrowUp01Icon, 2.2)
export const Check = icon(Tick02Icon, 2.4)
export const CheckIcon = Check
export const ChevronDownIcon = icon(ArrowDown01Icon, 2.2)
export const ChevronLeftIcon = icon(ArrowLeft01Icon, 2.2)
export const ChevronRightIcon = icon(ArrowRight01Icon, 2.2)
export const ChevronUpIcon = icon(ArrowUp01Icon, 2.2)
export const Copy = icon(Copy01Icon)
export const Crop = icon(CropIcon)
export const GripVertical = icon(DragDropVerticalIcon)
export const Hand = icon(CursorPointer01Icon)
export const ImagePlus = icon(ImageAdd02Icon)
export const Info = icon(InformationCircleIcon)
export const Keyboard = icon(KeyboardIcon)
export const Minus = icon(MinusSignIcon, 2.4)
export const Monitor = icon(ComputerIcon)
export const Moon = icon(Moon02Icon)
export const MousePointerSquareDashed = icon(CursorRectangleSelection02Icon)
export const PanelTop = icon(PinIcon)
export const Pin = PanelTop
export const Palette = icon(PaintBoardIcon)
export const Plus = icon(PlusSignIcon, 2.2)
export const Power = icon(PowerIcon)
export const Sun = icon(Sun03Icon)
export const Timer = icon(Timer02Icon)
export const X = icon(Cancel01Icon, 2.2)
export const XIcon = X
export const Zap = icon(FlashIcon)
export const Search = icon(Search01Icon, 2.2)
export const MoreHorizontal = icon(MoreHorizontalIcon, 2.4)
export const Tag = icon(Tag01Icon)
export const Settings = icon(Settings02Icon)
export const History = icon(HistoryIcon)
export const SectionPlus = icon(FolderAddIcon)
export const Trash = icon(Delete02Icon)
export const Corners = icon(SquareRoundCornerIcon)
export const Clock = icon(Clock01Icon)

export const CircleCheckIcon = icon(CheckmarkCircle02Icon, 2)
export const InfoIcon = icon(InformationCircleIcon, 2)
export const Loader2Icon = icon(Loading03Icon, 2.2)
export const OctagonXIcon = icon(CancelCircleIcon, 2)
export const TriangleAlertIcon = icon(Alert02Icon, 2)

export function CircleIcon({ className }: { className?: string }): React.JSX.Element {
  return <span className={`block size-2 rounded-full bg-current ${className ?? ''}`} />
}

/*
 * The mark, kept in step with resources/logo-mark.svg — the coffer as a box in
 * isometric, its two walls held back and its lid at full strength with the
 * slot cut out of it. Inline rather than an <img> so it takes currentColor and
 * dims with the label beside it. Nothing is stacked on anything: the slot is a
 * hole in the lid rather than a shape over it, and each plane carries the same
 * opacity on its fill and its stroke, so no seam darkens where the two meet.
 *
 * Miter joins, clamped. Round ones eat every corner of a box this small, and
 * unclamped miters throw spikes off the three acute tips; a limit of 1.5 keeps
 * the near-square corners sharp and bevels only those.
 */
export function Logo({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="1.9 3.9 20.2 18.2" aria-hidden="true" className={className}>
      <g
        fill="currentColor"
        fillRule="evenodd"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="miter"
        strokeMiterlimit={1.5}
      >
        <path d="M2.6 9.3 L12 14 L12 21.4 L2.6 16.7 Z" fillOpacity={0.5} strokeOpacity={0.5} />
        <path d="M21.4 9.3 L12 14 L12 21.4 L21.4 16.7 Z" fillOpacity={0.75} strokeOpacity={0.75} />
        <path d="M12 4.6 L21.4 9.3 L12 14 L2.6 9.3 Z M16.25 11.58 L13.75 12.83 L7.75 9.58 L10.25 8.33 Z" />
      </g>
    </svg>
  )
}
