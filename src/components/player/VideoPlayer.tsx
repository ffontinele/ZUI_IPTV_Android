import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { usePlayerStore } from '@/state/playerStore';
import { useUIStore } from '@/state/uiStore';
import { useSettingsStore, SUBTITLE_SIZE_PX } from '@/state/settingsStore';
import { usePlayer } from '@/hooks/usePlayer';
import { CapacitorVideoPlayer } from 'capacitor-video-player';
import { useRemote } from '@/hooks/useRemote';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { useAudioWatchdog } from '@/hooks/useAudioWatchdog';
import { useStreamWatchdog } from '@/hooks/useStreamWatchdog';
import { OSD } from './OSD';
import { ErrorOverlay } from './ErrorOverlay';
import { Spinner } from '@/components/common/Spinner';
import type { PlaybackAttempt } from '@/types/player';

export function VideoPlayer() {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [chooserOpen, setChooserOpen] = useState(true);
  const [useExo, setUseExo] = useState(false);

  // Reseta o modal ao trocar de source (cada video novo pergunta de novo)
  useEffect(() => {
    if (currentSource) {
      setChooserOpen(true);
      setUseExo(false);
    }
  }, [currentSource?.id]);
  const subtitleEnabled = useSettingsStore((s) => s.subtitleEnabled);
  const subtitleSize    = useSettingsStore((s) => s.subtitleSize);
  const playerState = usePlayerStore((s) => s.state);
  const error = usePlayerStore((s) => s.error);
  const currentSource = usePlayerStore((s) => s.currentSource);
  const setSource = usePlayerStore((s) => s.setSource);
  const clearError = usePlayerStore((s) => s.setError);

  const navigate = useUIStore((s) => s.navigate);
  const lastMainScreen = useUIStore((s) => s.lastMainScreen);

  // Spatial nav: Player'da arrow-key focus istemiyoruz — RemoteRouter handle ediyor
  const { pause, resume } = useFocusable({ focusKey: 'PLAYER_ROOT' });
  useEffect(() => {
    pause();
    return () => resume();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Persistent error state ─────────────────────────────────────────────────
  // Set by onFatalError (all url × strategy combinations exhausted) OR by a
  // non-recoverable post-attach error from strategy.onError().
  const [persistentError, setPersistentError] = useState<{
    message: string;
    attempts: PlaybackAttempt[];
  } | null>(null);

  // D-031: onFatalError callback — called by usePlayer when all attempts fail.
  // useCallback so the ref identity is stable across renders (avoids usePlayer
  // effect re-firing just because the callback was re-created).
  const onFatalError = useCallback(
    (message: string, attempts: PlaybackAttempt[]) => {
      setPersistentError({ message, attempts });
    },
    [],
  );

  // Watchdog escalation: when all 3 retries fail, restart the full fallback chain.
  // Spread creates a new object → usePlayer effect dependency changes → re-run
  const handleWatchdogEscalation = useCallback(() => {
    if (currentSource) {
      console.warn('[player] watchdog escalated, restarting full fallback chain');
      setSource({ ...currentSource });
    }
  }, [currentSource, setSource]);

  const handleWatchdogRetry = useCallback(() => {
    if (currentSource) {
      console.log('[player] watchdog triggering stream re-init');
      setSource({ ...currentSource });
    }
  }, [currentSource, setSource]);

  // ─── Subtitle enable / disable ──────────────────────────────────────────────
  // Applies to HLS WebVTT / CEA-608 tracks embedded in the stream.
  // 'addtrack' listener ensures tracks added after playback starts are also covered.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyMode = () => {
      const mode: TextTrackMode = subtitleEnabled ? 'showing' : 'hidden';
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = mode;
      }
    };

    applyMode();
    video.textTracks.addEventListener('addtrack', applyMode);
    return () => {
      video.textTracks.removeEventListener('addtrack', applyMode);
    };
  }, [subtitleEnabled]);

  usePlayer(useExo ? { current: null } : videoRef, onFatalError);

  // Limpa a mensagem de erro quando o video comeca a tocar
  // (novo canal/video selecionado -> erro antigo deixa de ser infinito)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handlePlaying = () => setPersistentError(null);
    v.addEventListener('playing', handlePlaying);
    return () => v.removeEventListener('playing', handlePlaying);
  }, []);

  // Limpa a mensagem de erro quando o video comeca a tocar
  // (novo canal/video selecionado -> erro antigo deixa de ser infinito)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handlePlaying = () => setPersistentError(null);
    v.addEventListener('playing', handlePlaying);
    return () => v.removeEventListener('playing', handlePlaying);
  }, []);

  // Limpa a mensagem de erro quando o video comeca a tocar
  // (novo canal/video selecionado -> erro antigo deixa de ser infinito)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handlePlaying = () => setPersistentError(null);
    v.addEventListener('playing', handlePlaying);
    return () => v.removeEventListener('playing', handlePlaying);
  }, []);
  useRemote(videoRef);
  useWatchProgress(videoRef);
  useAudioWatchdog(videoRef);
  useStreamWatchdog({
    videoRef,
    url: currentSource?.url ?? '',
    onAllRetriesFailed: handleWatchdogEscalation,
    onRetry: handleWatchdogRetry,
    enabled: false,
  });

  // ─── Post-attach non-recoverable error → persistent error overlay ───────────
  // strategy.onError() fires mid-stream (after successful attach). Fatal
  // mid-stream errors have no URL fallback left — show persistent overlay.
  useEffect(() => {
    if (error && !error.recoverable && !persistentError) {
      setPersistentError({ message: error.message, attempts: [] });
    }
  }, [error, persistentError]);

  // Error overlay görünürken spatial nav'ı resume et (Geri butonuna focus gelebilsin)
  // NOT: cleanup içinde pause() YOK.
  // Neden: React, unmount sırasında effect cleanup'larını tanım sırasına göre çalıştırır:
  //   Effect 1 cleanup → resume()   (correct: leaving player)
  //   Effect 2 cleanup → pause()    (BUG: nav paused after unmount!)
  // handleBack() zaten navigate() çağırdığından bileşen unmount olur;
  // Effect 1'in resume() cleanup'ı yeterli.
  useEffect(() => {
    if (persistentError) {
      resume();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistentError]);

  // Auto-proximo episodio quando ExoPlayer termina
  useEffect(() => {
    if (!useExo) return;
    const onEnded = () => {
      const res = usePlayerStore.getState().playNextEpisode();
      if (res === 'ok') {
        // Abre o proximo episodio no ExoPlayer tambem
        const next = usePlayerStore.getState().currentSource;
        if (next) {
          setTimeout(() => {
            CapacitorVideoPlayer.initPlayer({
              mode: 'fullscreen',
              url: next.url,
              playerId: 'exo-chooser-next',
              headers: next.headers || {},
              exitOnEnd: true,
              showControls: true,
              chromecast: false,
              title: next.name || '',
            }).catch(console.error);
          }, 500);
        }
      }
    };
    window.addEventListener('jeepCapVideoPlayerEnded', onEnded);
    return () => window.removeEventListener('jeepCapVideoPlayerEnded', onEnded);
  }, [useExo]);

  const escolherExo = async () => {
    if (!currentSource) return;
    setChooserOpen(false);
    setUseExo(true);
    try {
      await CapacitorVideoPlayer.initPlayer({
        mode: 'fullscreen',
        url: currentSource.url,
        playerId: 'exo-chooser',
        headers: currentSource.headers || {},
        exitOnEnd: true,
        showControls: true,
        chromecast: false,
        title: currentSource.name || '',
      });
    } catch (e) {
      console.error('[ExoPlayer] erro:', e);
      setUseExo(false);
      setChooserOpen(true);
    }
  };

  const escolherZui = () => {
    setChooserOpen(false);
    setUseExo(false);
  };

  const handleBack = () => {
    setPersistentError(null);
    clearError(null);
    navigate(lastMainScreen);
  };

  const handleRetry = () => {
    if (currentSource) {
      setPersistentError(null);
      clearError(null);
      // Spread creates a new object → usePlayer effect dependency changes → re-run
      setSource({ ...currentSource });
    }
  };

  return (
    <div className="relative w-full h-full bg-bg-base overflow-hidden">
      {/* Dynamic subtitle font size — targets native ::cue rendering */}
      <style>{`video::cue { font-size: ${SUBTITLE_SIZE_PX[subtitleSize]}; }`}</style>

      {chooserOpen && currentSource && (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center pointer-events-auto">
          <div className="bg-[#1a1715] rounded-3xl p-10 border border-[#E8B567]/30 max-w-2xl w-[90%]">
            <h2 className="font-serif text-[28px] font-light text-white text-center mb-3">
              Escolha o reprodutor
            </h2>
            <p className="text-[13px] text-white/60 text-center mb-8">
              Selecione qual player usar para este video
            </p>
            <div className="grid grid-cols-2 gap-5">
              <button
                onClick={escolherZui}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#E8B567]/10 border-2 border-[#E8B567]/50 hover:bg-[#E8B567]/20 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-[#E8B567] grid place-items-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#0e0b0a]">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <div className="font-serif text-[18px] font-light text-white">ZUI Player</div>
                <div className="text-[11px] text-white/50 text-center">Visual do app</div>
              </button>
              <button
                onClick={escolherExo}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border-2 border-white/20 hover:bg-white/10 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-white grid place-items-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#0e0b0a]">
                    <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-11 9l-4-4 4-4v3h6v2h-6v3z"/>
                  </svg>
                </div>
                <div className="font-serif text-[18px] font-light text-white">ExoPlayer</div>
                <div className="text-[11px] text-white/50 text-center">Tela cheia nativa</div>
              </button>
            </div>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
        playsInline
        autoPlay
      />

      {playerState === 'loading' && !persistentError && (
        <div className="absolute inset-0">
          <Spinner />
        </div>
      )}

      {/* Kurtarılabilir hata (ağ kesintisi) — retry butonu */}
      {playerState === 'error' && error?.recoverable && !persistentError && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-8">
          <div className="w-20 h-20 rounded-full bg-bg-surface flex items-center justify-center">
            <span className="text-display text-live">!</span>
          </div>
          <p className="text-h2 text-text-primary text-center max-w-xl px-12">
            {error.message}
          </p>
          <button
            className="px-10 py-4 bg-accent text-accent-text text-body font-medium rounded-lg"
            onClick={handleRetry}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          >
            {t('player.retry')}
          </button>
        </div>
      )}

      {/* Kalıcı hata — tüm URL × strateji adayları tükendi */}
      {persistentError && (
        <ErrorOverlay
          message={persistentError.message}
          attempts={persistentError.attempts}
          onBack={handleBack}
        />
      )}

      <OSD videoRef={videoRef} />
    </div>
  );
}
