import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClipForm } from '@/features/clipper/ClipForm'
import { installTheme } from '@/lib/theme'
import '@/styles/global.css'

installTheme()

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ClipForm />
  </StrictMode>
)
