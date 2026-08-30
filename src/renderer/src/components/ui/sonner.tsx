import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon
} from '@/components/icons'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps): React.JSX.Element => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      offset={12}
      /*
       * Any direction throws it away, not just the one the position implies.
       *
       * Sonner infers a single swipe axis from where the toast sits, so at
       * top-center it only left when you pushed it up — and up is the one
       * direction nobody tries, because the toast is already at the top of the
       * window and it does not look like it has anywhere to go. Sideways is
       * what a capsule this shape invites, so sideways works.
       */
      swipeDirections={['top', 'left', 'right']}
      /* Long enough to read the sentence and reach the Undo in it. The default
         four seconds is a notice; this one is an offer. */
      duration={6000}
      toastOptions={{
        closeButton: false,
        classNames: {
          /*
           * The same material a menu is made of, rather than a HUD.
           *
           * A HUD is dark in both themes on purpose: the copy badge over an
           * image and the region picker's readouts float on content this app
           * knows nothing about, so they have to bring their own dark ground.
           * A toast floats on the panel, which is a surface we own and have a
           * colour for. Dark in light mode made it the only inverted thing on
           * screen, for the least important message on it.
           *
           * no-drag is what makes the swipe possible. The toast sits 12px from
           * the top, inside the 44px title bar, and that bar is
           * -webkit-app-region: drag — a press there is claimed by the window
           * manager before the page sees it, so the pointer moved the whole
           * window and the toast sat still.
           */
          toast:
            'no-drag material-thick material-edge !rounded-full !px-3 !py-1.5 !text-xs !font-medium !shadow-overlay',
          description: '!text-muted-foreground',
          icon: '!mr-1.5',
          /* Ink on the panel's own hover wash, so it reads in either theme —
             it used to be white on white/15, which only worked on a dark pill. */
          actionButton:
            '!ml-1.5 !rounded-full !bg-accent-strong !px-2 !py-0.5 !text-xs !font-medium !text-foreground hover:!bg-accent-strong'
        }
      }}
      icons={{
        success: <CircleCheckIcon className="size-3.5" />,
        info: <InfoIcon className="size-3.5" />,
        warning: <TriangleAlertIcon className="size-3.5" />,
        error: <OctagonXIcon className="size-3.5" />,
        loading: <Loader2Icon className="size-3.5 animate-spin" />
      }}
      /*
       * --normal-bg carries the fill, and it has to be set here rather than
       * left to the class. Sonner sets `background: var(--normal-bg)` on the
       * toast; an inline custom property beats a class every time, and the
       * shorthand wipes the utility's background-color with it. Left at
       * transparent — which is how this started — the toast rendered perfectly
       * and could not be read.
       *
       * Pointed at the material tokens, it is a menu: white with dark text in
       * light, dark with light text in dark. The utility keeps the blur, the
       * saturation and the edge, which are the parts nothing is fighting it
       * over.
       */
      style={
        {
          '--normal-bg': 'var(--mat-thick)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'transparent',
          '--border-radius': '9999px'
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
