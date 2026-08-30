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
      toastOptions={{
        classNames: {
          toast:
            'material-hud !rounded-full !border-0 !px-3 !py-1.5 !text-xs !font-medium !shadow-float',
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
      style={
        {
          '--normal-bg': 'transparent',
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
