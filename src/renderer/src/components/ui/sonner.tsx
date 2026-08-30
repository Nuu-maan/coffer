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
           * no-drag is what actually makes the swipe possible.
           *
           * The toast sits 12px from the top of the window, which is inside the
           * 44px title bar — and that bar is -webkit-app-region: drag. A press
           * there is claimed by the window manager before the page sees it, so
           * the pointer moved the whole window and the toast sat still. Sonner
           * was never the problem; nothing was reaching it.
           */
          toast:
            'no-drag material-hud !rounded-full !border-0 !px-3 !py-1.5 !text-xs !font-medium !shadow-float',
          description: '!text-muted-foreground',
          icon: '!mr-1.5',
          /* The toast is a dark capsule whatever the theme, so the action
             inside it is styled against that rather than against the window —
             an unstyled sonner action lands as dark text on a dark pill. */
          actionButton:
            '!ml-1.5 !rounded-full !bg-white/15 !px-2 !py-0.5 !text-xs !font-medium !text-[var(--hud-foreground)] hover:!bg-white/25'
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
       * --normal-bg carries the fill, and it used to be transparent.
       *
       * The idea was that material-hud beside it would paint the capsule. It
       * cannot: sonner sets `background: var(--normal-bg)` on the toast, an
       * inline custom property beats a class every time, and the shorthand
       * wipes the utility's background-color. So the toast was transparent with
       * --hud-foreground text — white on white in light mode, which is a toast
       * that renders perfectly and cannot be read. Dark mode hid it, because
       * white on a dark panel looks intentional.
       *
       * Pointing it at the same token material-hud would have used settles it
       * without an !important arms race. The utility keeps the blur, the
       * saturation and the border, which are the parts nothing is fighting it
       * over.
       */
      style={
        {
          '--normal-bg': 'var(--hud)',
          '--normal-text': 'var(--hud-foreground)',
          '--normal-border': 'transparent',
          '--border-radius': '9999px'
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
