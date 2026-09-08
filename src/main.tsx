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
import { CapacitorVideoPlayer } from 'capacitor-video-player';
import { useUIStore } from '@/state/uiStore';
CapApp.addListener('backButton', () => {
  // Dentro do player: usar exitPlayer do plugin (igual a setinha da tela)
  // Isso fecha o fragment corretamente e dispara o evento jeepCapVideoPlayerExit
  const currentScreen = useUIStore.getState().currentScreen;
  if (currentScreen === 'player') {
    (CapacitorVideoPlayer as any).exitPlayer().catch(() => {});
    return;
  }

  // Fora do player: comportamento atual (Backspace pro RemoteRouter)
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








// ─── Letterbox 1920x1080 + zoom/pan por gestos (independe do Android) ───
let baseScale = 1, userZoom = 1, tx = 0, ty = 0, baseL = 0, baseT = 0;
function applyStage(): void {
  const root = document.getElementById('root') as HTMLElement | null;
  if (!root) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const s = baseScale * userZoom;
  const W = 1920 * s, H = 1080 * s;
  if (userZoom === 1) { tx = baseL; ty = baseT; }
  else {
    const minTx = Math.min(baseL, vw - W), maxTx = Math.max(baseL, 0);
    const minTy = Math.min(baseT, vh - H), maxTy = Math.max(baseT, 0);
    tx = Math.min(maxTx, Math.max(minTx, tx));
    ty = Math.min(maxTy, Math.max(minTy, ty));
  }
  root.style.position = 'absolute';
  root.style.width = '1920px';
  root.style.height = '1080px';
  root.style.transformOrigin = 'top left';
  root.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
}
function fitStage(): void {
  const vw = window.innerWidth, vh = window.innerHeight;
  baseScale = Math.min(vw / 1920, vh / 1080);
  baseL = (vw - 1920 * baseScale) / 2;
  baseT = (vh - 1080 * baseScale) / 2;
  if (userZoom === 1) { tx = baseL; ty = baseT; }
  applyStage();
}
const pts = new Map<number, { x: number; y: number }>();
let lastDist = 0, lastSingle = { x: 0, y: 0 }, lastTap = 0;
document.addEventListener('touchstart', (e: TouchEvent) => {
  for (const t of Array.from(e.changedTouches)) pts.set(t.identifier, { x: t.clientX, y: t.clientY });
  if (pts.size === 2) {
    const [a, b] = Array.from(pts.values());
    lastDist = Math.hypot(a.x - b.x, a.y - b.y);
  } else if (pts.size === 1) {
    lastSingle = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
}, { passive: false });
document.addEventListener('touchmove', (e: TouchEvent) => {
  for (const t of Array.from(e.changedTouches)) if (pts.has(t.identifier)) pts.set(t.identifier, { x: t.clientX, y: t.clientY });
  if (pts.size >= 2) {
    e.preventDefault();
    const [a, b] = Array.from(pts.values());
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (lastDist > 0) {
      const prevS = baseScale * userZoom;
      userZoom = Math.min(5, Math.max(1, userZoom * (d / lastDist)));
      const newS = baseScale * userZoom;
      tx = mid.x - ((mid.x - tx) * (newS / prevS));
      ty = mid.y - ((mid.y - ty) * (newS / prevS));
      applyStage();
    }
    lastDist = d;
  } else if (pts.size === 1 && userZoom > 1) {
    e.preventDefault();
    const t = e.changedTouches[0];
    tx += t.clientX - lastSingle.x;
    ty += t.clientY - lastSingle.y;
    lastSingle = { x: t.clientX, y: t.clientY };
    applyStage();
  }
}, { passive: false });
function endTouch(e: TouchEvent): void {
  for (const t of Array.from(e.changedTouches)) pts.delete(t.identifier);
  if (pts.size < 2) lastDist = 0;
  if (pts.size === 0 && e.changedTouches.length === 1) {
    const now = Date.now();
    if (now - lastTap < 300) {
      const t = e.changedTouches[0];
      const prevS = baseScale * userZoom;
      userZoom = userZoom > 1 ? 1 : 2;
      const newS = baseScale * userZoom;
      if (userZoom === 1) { tx = baseL; ty = baseT; }
      else {
        tx = t.clientX - ((t.clientX - tx) * (newS / prevS));
        ty = t.clientY - ((t.clientY - ty) * (newS / prevS));
      }
      applyStage();
      lastTap = 0;
    } else lastTap = now;
  }
}
document.addEventListener('touchend', endTouch);
document.addEventListener('touchcancel', endTouch);
['resize', 'orientationchange', 'pageshow', 'focus'].forEach(ev => window.addEventListener(ev, fitStage));
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(fitStage, 100); });
fitStage();
