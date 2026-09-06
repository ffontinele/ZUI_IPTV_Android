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


// ─── Android: botão VOLTAR do controle/celular navega dentro do app ───
import { App as CapApp } from '@capacitor/app';
CapApp.addListener('backButton', () => {
  const fire = (target: EventTarget) => {
    const e: any = new KeyboardEvent('keydown', {
      key: 'Backspace', code: 'Backspace', bubbles: true, cancelable: true,
    } as any);
    try {
      Object.defineProperty(e, 'keyCode', { value: 461 });
      Object.defineProperty(e, 'which', { value: 461 });
    } catch {}
    target.dispatchEvent(e);
  };
  fire(window);
  fire(document);
});




// ─── Letterbox 1920x1080 com zoom/pan (absolute, documento rolavel) ───
function fitStage() {
  const root = document.getElementById('root') as HTMLElement | null;
  if (!root) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / 1920, vh / 1080);
  const w = 1920 * scale;
  const h = 1080 * scale;
  const body = document.body;
  body.style.width = '1920px';
  body.style.height = h + 'px';
  body.style.overflow = 'visible';
  root.style.position = 'absolute';
  root.style.left = ((vw - w) / 2) + 'px';
  root.style.top = ((vh - h) / 2) + 'px';
  root.style.width = '1920px';
  root.style.height = '1080px';
  root.style.transform = 'scale(' + scale + ')';
  root.style.transformOrigin = 'top left';
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', fitStage);
fitStage();
