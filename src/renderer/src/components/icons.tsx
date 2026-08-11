import {
  ArrowUp as ArrowUpIcon,
  CaretDown,
  CaretRight,
  CaretUp,
  Check as CheckMark,
  CheckCircle,
  CircleNotch,
  Copy as CopyIcon,
  Crop as CropIcon,
  DotsSixVertical,
  ImageSquare,
  Info as InfoGlyph,
  Keyboard as KeyboardIcon,
  Lightning,
  Minus as MinusIcon,
  Monitor as MonitorIcon,
  Moon as MoonIcon,
  Palette as PaletteIcon,
  Plus as PlusIcon,
  Power as PowerIcon,
  PushPin,
  SelectionPlus,
  Sun as SunIcon,
  Timer as TimerIcon,
  Warning,
  X as XGlyph,
  XCircle,
  type Icon,
  type IconProps
} from '@phosphor-icons/react'

/*
 * One place the drawing comes from, so a screen asks for "the close icon"
 * rather than for a particular vendor's spelling of it.
 *
 * Phosphor rather than the usual outline set: it is drawn with rounded caps
 * and joins on a 16px grid, which is what makes it hold together at the 13 and
 * 14 pixels this window spends most of its time at, and it carries a real
 * weight axis. Regular is the body weight; the tinted squares in settings ask
 * for bold, the way a filled glyph on a coloured chip does on the platforms
 * this is imitating. Size stays with the caller: every control already sets it.
 */
function icon(Glyph: Icon, weight: IconProps['weight'] = 'regular') {
  return function Wrapped(props: IconProps): React.JSX.Element {
    return <Glyph weight={weight} {...props} />
  }
}

export const ArrowUp = icon(ArrowUpIcon, 'bold')
export const Check = icon(CheckMark, 'bold')
export const CheckIcon = Check
export const ChevronDownIcon = icon(CaretDown, 'bold')
export const ChevronRightIcon = icon(CaretRight, 'bold')
export const ChevronUpIcon = icon(CaretUp, 'bold')
export const Copy = icon(CopyIcon)
export const Crop = icon(CropIcon)
export const GripVertical = icon(DotsSixVertical, 'bold')
export const ImagePlus = icon(ImageSquare)
export const Info = icon(InfoGlyph)
export const Keyboard = icon(KeyboardIcon)
export const Minus = icon(MinusIcon, 'bold')
export const Monitor = icon(MonitorIcon)
export const Moon = icon(MoonIcon)
export const MousePointerSquareDashed = icon(SelectionPlus)
export const PanelTop = icon(PushPin)
export const Pin = PanelTop
export const Palette = icon(PaletteIcon)
export const Plus = icon(PlusIcon, 'bold')
export const Power = icon(PowerIcon)
export const Sun = icon(SunIcon)
export const Timer = icon(TimerIcon)
export const X = icon(XGlyph, 'bold')
export const XIcon = X
export const Zap = icon(Lightning)

export const CircleCheckIcon = icon(CheckCircle, 'fill')
export const InfoIcon = icon(InfoGlyph, 'fill')
export const Loader2Icon = icon(CircleNotch, 'bold')
export const OctagonXIcon = icon(XCircle, 'fill')
export const TriangleAlertIcon = icon(Warning, 'fill')

export function CircleIcon({ className }: { className?: string }): React.JSX.Element {
  return <span className={`block size-2 rounded-full bg-current ${className ?? ''}`} />
}
