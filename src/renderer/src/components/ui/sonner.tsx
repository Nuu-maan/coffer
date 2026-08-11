import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon
} from 'lucide-react'
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
          icon: '!mr-1.5'
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
