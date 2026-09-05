import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { init } from '@noriginmedia/norigin-spatial-navigation'
import './styles/globals.css'
import './i18n'   // initialize i18next before any component renders
import App from './App'

init({
  debug: false,
  visualDebug: false,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { useToast as __zuiToast } from '@/components/ui/Toast';
window.addEventListener('error', (e) => {
  try { __zuiToast.getState().show('⚠ ERRO: ' + (e.message ?? 'desconhecido')); } catch {}
});
window.addEventListener('unhandledrejection', (e) => {
  try { __zuiToast.getState().show('⚠ PROMISE: ' + String(e.reason)); } catch {}
});

