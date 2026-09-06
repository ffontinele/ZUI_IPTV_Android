// OSD com gestos: tap para mostrar/ocultar, swipe direita=volume, esquerda=brilho
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/state/playerStore';
import { useToast } from '@/components/ui/Toast';
import { useSettingsStore, LANGUAGE_LOCALES } from '@/state/settingsStore';

function useClock() {
  const language   = useSettingsStore(s => s.language);
  const timeFormat = useSettingsStore(s => s.timeFormat);
  const locale     = LANGUAGE_LOCALES[language] ?? 'en-US';
  const hour12     = timeFormat === '12h';
  const fmt = () => new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12 });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, [locale, hour12]);
  return time;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '--:--';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}



function EpisodeNav() {
  const seriesContext = usePlayerStore((s) => s.seriesContext);
  const playNext = usePlayerStore((s) => s.playNextEpisode);
  const playPrev = usePlayerStore((s) => s.playPrevEpisode);
  const showToast = useToast((s) => s.show);
  if (!seriesContext) return null;
  const go = (dir: 'prev' | 'next') => {
    const res = dir === 'next' ? playNext() : playPrev();
    if (res === 'no_more') showToast(dir === 'next' ? '⏭ Fim dos episodios' : '⏮ Inicio da serie');
  };
  return (
    <div className="flex justify-center gap-4 pb-2 pointer-events-auto">
      <button onClick={() => go('prev')} className="px-6 h-10 rounded-full bg-[#E8B567] text-[#0e0b0a] text-[12px] font-bold uppercase tracking-[0.2em]">⏮ Episodio anterior</button>
      <button onClick={() => go('next')} className="px-6 h-10 rounded-full bg-[#E8B567] text-[#0e0b0a] text-[12px] font-bold uppercase tracking-[0.2em]">Proximo episodio ⏭</button>
    </div>
  );
}

interface ControlsProps { videoRef: React.RefObject<HTMLVideoElement | null>; }

function BottomControls({ videoRef }: ControlsProps) {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const v = videoRef.current;
      if (v) { setCurrentTime(v.currentTime); setDuration(v.duration); setPaused(v.paused); }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [videoRef]);
  const isLive = !isFinite(duration) || isNaN(duration) || duration === 0;
  const progress = isLive || duration === 0 ? 0 : Math.min(1, currentTime / duration);
  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) void v.play(); else v.pause();
  };
  const seek = (delta: number) => {
    const v = videoRef.current; if (!v || isLive) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + delta));
  };
  return (
    <div className="px-12 pb-8 flex flex-col gap-3">
      {!isLive && (
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium tabular-nums text-white/80 shrink-0 w-12 text-right">{formatTime(currentTime)}</span>
          <div className="flex-1 h-1 rounded-full bg-white/20 relative overflow-hidden">
            <div className="h-full bg-[#E8B567] rounded-full" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="text-[13px] font-medium tabular-nums text-white/50 shrink-0 w-12">{formatTime(duration)}</span>
        </div>
      )}
      <div className="relative flex items-center justify-center gap-6">
        {!isLive && (
          <button onClick={() => seek(-10)} className="flex flex-col items-center gap-1 text-[#E8B567] group">
            <div className="w-11 h-11 rounded-full bg-[#E8B567] text-[#0e0b0a] grid place-items-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 5V2L7 7l5 5V9c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                <text x="50%" y="67%" textAnchor="middle" fontSize="5" fill="currentColor" dy=".1em">10</text>
              </svg>
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#0e0b0a]">−10s</span>
          </button>
        )}
        <button onClick={togglePlay} className="bg-transparent flex flex-col items-center gap-1.5 group">
          <div className="w-14 h-14 rounded-full bg-[#E8B567] grid place-items-center shadow-[0_0_28px_-4px_#E8B567]">
            {paused ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#0e0b0a] translate-x-[1px]">
                <path d="M7 4v16l13-8z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#0e0b0a]">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#0e0b0a]">
            {paused ? t('player.play') : t('player.pause')}
          </span>
        </button>
        {!isLive && (
          <button onClick={() => seek(10)} className="flex flex-col items-center gap-1 text-[#E8B567] group">
            <div className="w-11 h-11 rounded-full bg-[#E8B567] text-[#0e0b0a] grid place-items-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 5V2l5 5-5 5V9c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                <text x="50%" y="67%" textAnchor="middle" fontSize="5" fill="currentColor" dy=".1em">10</text>
              </svg>
            </div>
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#0e0b0a]">+10s</span>
          </button>
        )}
      </div>
      {isLive && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 px-3 h-7 rounded-full bg-red-500/20 border border-red-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">{t('player.live')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface OSDProps { videoRef: React.RefObject<HTMLVideoElement | null>; }

export function OSD({ videoRef }: OSDProps) {
  const osdVisible = usePlayerStore((s) => s.osdVisible);
  const showOSD = usePlayerStore((s) => s.showOSD);
  const hideOSD = usePlayerStore((s) => s.hideOSD);
  const currentSource = usePlayerStore((s) => s.currentSource);
  const audioWarning = usePlayerStore((s) => s.audioWarning);
  const playerState = usePlayerStore((s) => s.state);
  const time = useClock();
  const [gesture, setGesture] = useState<{ type: 'volume' | 'brightness'; value: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const gestureRef = useRef<{ type: 'volume' | 'brightness'; start: number } | null>(null);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetOSDTimer = () => {
    showOSD();
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(hideOSD, 10000);
  };
  useEffect(() => () => { if (osdTimerRef.current) clearTimeout(osdTimerRef.current); }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    gestureRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dy) > Math.abs(dx)) {
      const isRight = touchStartRef.current.x > window.innerWidth / 2;
      const type = isRight ? 'volume' : 'brightness';
      if (!gestureRef.current) {
        const currentVal = isRight ? video.volume : (parseFloat((video.style.filter || '').match(/brightness\(([^)]+)\)/)?.[1] || '1') || 1);
        gestureRef.current = { type, start: currentVal };
      }
      const sens = type === 'volume' ? 0.002 : 0.003;
      let val = gestureRef.current.start - dy * sens;
      if (type === 'volume') {
        val = Math.max(0, Math.min(1, val));
        video.volume = val;
      } else {
        val = Math.max(0.3, Math.min(1.5, val));
        video.style.filter = `brightness(${val})`;
      }
      setGesture({ type, value: val });
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = Math.abs(t.clientX - touchStartRef.current.x);
    const dy = Math.abs(t.clientY - touchStartRef.current.y);
    const dur = Date.now() - touchStartRef.current.time;
    if (dx < 10 && dy < 10 && dur < 300) {
      if (osdVisible) hideOSD(); else resetOSDTimer();
    }
    setTimeout(() => setGesture(null), 1000);
    touchStartRef.current = null;
    gestureRef.current = null;
  };

  if (playerState === 'error') return null;

  return (
    <>
      {gesture && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 px-8 py-6 rounded-2xl pointer-events-none z-50">
          <div className="flex items-center gap-4">
            {gesture.type === 'volume' ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.55 4.96l1.41-1.41 2.12 2.12-1.41 1.41-2.12-2.12zM16.92 17.49l1.41-1.41 2.12 2.12-1.41 1.41-2.12-2.12zM1 11h3v2H1v-2zm19 0h3v2h-3v-2zM3.55 19.04l2.12-2.12 1.41 1.41-2.12 2.12-1.41-1.41zM16.92 6.51l2.12-2.12 1.41 1.41-2.12 2.12-1.41-1.41z"/>
              </svg>
            )}
            <div>
              <div className="text-white text-2xl font-bold mb-1">{Math.round(gesture.value * 100)}%</div>
              <div className="w-32 h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-[#E8B567]" style={{ width: `${gesture.value * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
      <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        className={['absolute inset-0 transition-opacity duration-300 flex flex-col justify-between',
          osdVisible ? 'opacity-100' : 'opacity-0'].join(' ')}>
        <div className="bg-gradient-to-b from-black/75 to-transparent px-12 pt-8 pb-10 pointer-events-auto">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[22px] font-light tracking-tight text-white drop-shadow">
              {currentSource?.name ?? ''}
            </span>
            <span className="font-serif text-[20px] font-light tabular-nums text-white/70">{time}</span>
          </div>
          {audioWarning && (
            <div className="mt-3 px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg inline-flex">
              <span className="text-[13px] text-yellow-200">⚠️ {audioWarning}</span>
            </div>
          )}
        </div>
        <div className="flex-1" />
        <div className="bg-gradient-to-t from-black/75 to-transparent pointer-events-auto">
          <EpisodeNav />
          <BottomControls videoRef={videoRef} />
        </div>
      </div>
    </>
  );
}
