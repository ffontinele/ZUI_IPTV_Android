import { useEffect, useRef } from 'react';
import { CapacitorVideoPlayer } from 'capacitor-video-player';
import { usePlayerStore } from '@/state/playerStore';
import { useMoviesStore } from '@/state/moviesStore';
import { useSeriesStore } from '@/state/seriesStore';
import { usePlaylistStore } from '@/state/playlistStore';

/**
 * Salva progresso do ExoPlayer (assistidos recentemente + tempo parado).
 * Replica a logica do useWatchProgress mas usa API do plugin Capacitor.
 */
export function useExoWatchProgress(exoActive: boolean) {
  const lastSavedRef = useRef<number>(0);
  const currentSourceId = usePlayerStore(s => s.currentSource?.id ?? null);

  useEffect(() => {
    if (!exoActive || !currentSourceId) return;

    let warnedDuration = false;
    const PLAYER_IDS = ['exo-player', 'exo-player-next', 'exo-chooser', 'exo-chooser-next'];

    const getCurrentTime = async (): Promise<number | null> => {
      for (const pid of PLAYER_IDS) {
        try {
          const res = await CapacitorVideoPlayer.getCurrentTime({ playerId: pid });
          if (res?.value && typeof res.value === 'number') return res.value;
        } catch {}
      }
      return null;
    };

    const getDuration = async (): Promise<number | null> => {
      for (const pid of PLAYER_IDS) {
        try {
          const res = await CapacitorVideoPlayer.getDuration({ playerId: pid });
          if (res?.value && typeof res.value === 'number') return res.value;
        } catch {}
      }
      return null;
    };

    const saveProgress = async () => {
      const currentSource = usePlayerStore.getState().currentSource;
      if (!currentSource || !currentSource.id) return;

      const currentTime = await getCurrentTime();
      const duration = await getDuration();

      if (currentTime === null || duration === null || currentTime < 10 || !isFinite(duration)) {
        if (!warnedDuration && currentTime && currentTime > 10) warnedDuration = true;
        return;
      }

      const progress = currentTime / duration;
      if (progress >= 0.95) return;

      const now = Date.now();
      if (now - lastSavedRef.current < 5000) return;
      lastSavedRef.current = now;

      const id = currentSource.id;

      // Adiciona aos recentes (se nao for canal ao vivo)
      if (!id.startsWith('channel-')) {
        usePlaylistStore.getState().addToRecent(id);
      }

      if (id.startsWith('vod-')) {
        const movieId = id.replace('vod-', '');
        useMoviesStore.getState().setWatchProgress(movieId, progress);
        return;
      }

      if (id.startsWith('series-ep-')) {
        const ctx = usePlayerStore.getState().seriesContext;
        if (!ctx || !ctx.seriesId) return;

        useSeriesStore.getState().setWatchProgress(ctx.seriesId, progress);

        const ep = ctx.allEpisodes[ctx.episodeIndex];
        if (ep) {
          const remainingSec = Math.max(0, Math.round(duration - currentTime));
          const mm = Math.floor(remainingSec / 60);
          const ss = remainingSec % 60;
          useSeriesStore.getState().setCurrentEpisode(ctx.seriesId, {
            season: ctx.seasonKey,
            episode: ep.episode_num,
            title: ep.title || 'Episodio ' + ep.episode_num,
            remaining: mm + 'm ' + ss + 's',
            resumeSec: Math.round(currentTime),
          });
        }
      }
    };

    // Salva a cada 5s + ao pausar/fim
    const interval = setInterval(saveProgress, 5000);

    const onPause = () => saveProgress();
    const onEnded = () => saveProgress();
    const onExit = () => { lastSavedRef.current = 0; saveProgress(); };
    window.addEventListener('jeepCapVideoPlayerExit', onExit);
    window.addEventListener('jeepCapVideoPlayerPause', onPause);
    window.addEventListener('jeepCapVideoPlayerEnded', onEnded);
    window.addEventListener('beforeunload', onPause);

    return () => {
      clearInterval(interval);
      window.removeEventListener('jeepCapVideoPlayerExit', onExit);
      window.removeEventListener('jeepCapVideoPlayerPause', onPause);
      window.removeEventListener('jeepCapVideoPlayerEnded', onEnded);
      window.removeEventListener('beforeunload', onPause);
      saveProgress();
    };
  }, [exoActive, currentSourceId]);
}
