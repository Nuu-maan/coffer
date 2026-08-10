import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RegionSelect } from '@/features/clipper/RegionSelect'
import { installTheme } from '@/lib/theme'
import '@/styles/global.css'

installTheme()

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RegionSelect />
  </StrictMode>
)
