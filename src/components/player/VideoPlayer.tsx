import { useRef, useEffect } from 'react';
import { CapacitorVideoPlayer } from 'capacitor-video-player';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { usePlayerStore } from '@/state/playerStore';
import { useUIStore } from '@/state/uiStore';
import { useSettingsStore, SUBTITLE_SIZE_PX } from '@/state/settingsStore';
import { useExoWatchProgress } from '@/hooks/useExoWatchProgress';
import { useAudioWatchdog } from '@/hooks/useAudioWatchdog';
import { OSD } from './OSD';
import { ErrorOverlay } from './ErrorOverlay';
import { Spinner } from '@/components/common/Spinner';

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const subtitleSize    = useSettingsStore((s) => s.subtitleSize);
  const playerState = usePlayerStore((s) => s.state);
  const error = usePlayerStore((s) => s.error);
  const currentSource = usePlayerStore((s) => s.currentSource);
  const setState = usePlayerStore((s) => s.setState);
  const setError = usePlayerStore((s) => s.setError);
  const resumeSec = usePlayerStore((s) => s.resumeSec);

  const navigate = useUIStore((s) => s.navigate);
  const lastMainScreen = useUIStore((s) => s.lastMainScreen);

  // Spatial nav
  const { pause, resume } = useFocusable({ focusKey: 'PLAYER_ROOT' });
  useEffect(() => {
    pause();
    return () => resume();
  }, []);

  // ExoPlayer: abrir direto ao montar
  useEffect(() => {
    if (!currentSource) return;
    setState('loading');

    const openExo = async () => {
      try {
        await CapacitorVideoPlayer.initPlayer({
          mode: 'fullscreen',
          url: currentSource.url,
          playerId: 'exo-player',
          headers: currentSource.headers || {},
          exitOnEnd: false,
          showControls: true,
          chromecast: false,
          title: currentSource.name || '',
        });
        setState('playing');

        // Retomar de onde parou
        if (resumeSec > 10) {
          await new Promise(r => setTimeout(r, 1000));
          await CapacitorVideoPlayer.setCurrentTime({
            playerId: 'exo-player',
            seektime: resumeSec,
          }).catch(() => {});
        }
      } catch (err) {
        console.error('[ExoPlayer] erro:', err);
        setError({
          code: 'fatal',
          message: 'ExoPlayer falhou: ' + (err as Error).message,
          recoverable: false,
        });
        setState('error');
      }
    };

    openExo();

    // Auto-proximo episodio
    const onEnded = () => {
      const res = usePlayerStore.getState().playNextEpisode();
      if (res === 'ok') {
        const next = usePlayerStore.getState().currentSource;
        if (next) {
          setTimeout(() => {
            CapacitorVideoPlayer.initPlayer({
              mode: 'fullscreen',
              url: next.url,
              playerId: 'exo-player-next',
              headers: next.headers || {},
              exitOnEnd: false,
              showControls: true,
              chromecast: false,
              title: next.name || '',
            }).catch(console.error);
          }, 500);
        }
      }
    };
    window.addEventListener('jeepCapVideoPlayerEnded', onEnded);

    return () => {
      window.removeEventListener('jeepCapVideoPlayerEnded', onEnded);
      CapacitorVideoPlayer.stopAllPlayers().catch(() => {});
    };
  }, [currentSource]);

  // ExoPlayer: salvar progresso
  useExoWatchProgress(true);

  // Audio watchdog (mantido)
  useAudioWatchdog(videoRef);

  const handleBack = () => {
    setError(null);
    navigate(lastMainScreen);
  };

  return (
    <div className="relative w-full h-full bg-bg-base overflow-hidden">
      <style>{`video::cue { font-size: ${SUBTITLE_SIZE_PX[subtitleSize]}; }`}</style>
      <video ref={videoRef} className="absolute inset-0 w-full h-full" playsInline autoPlay />

      {playerState === 'loading' && (
        <div className="absolute inset-0">
          <Spinner />
        </div>
      )}

      {error && !error.recoverable && (
        <ErrorOverlay message={error.message} attempts={[]} onBack={handleBack} />
      )}

      <OSD videoRef={videoRef} />
    </div>
  );
}
