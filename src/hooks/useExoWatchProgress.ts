import { useEffect, useRef } from 'react';
import { CapacitorVideoPlayer } from 'capacitor-video-player';
import type { PluginListenerHandle } from '@capacitor/core';
import { usePlayerStore } from '@/state/playerStore';
import { useMoviesStore } from '@/state/moviesStore';
import { useSeriesStore } from '@/state/seriesStore';
import { usePlaylistStore } from '@/state/playlistStore';

const PLAYER_IDS = ['exo-player', 'exo-player-next', 'exo-chooser', 'exo-chooser-next'];

export function useExoWatchProgress(exoActive: boolean) {
  const lastSavedRef = useRef<number>(0);
  const currentSourceId = usePlayerStore((s) => s.currentSource?.id ?? null);

  useEffect(() => {
    if (!exoActive || !currentSourceId) return;
    const listeners: PluginListenerHandle[] = [];

    const getCurrentTime = async (): Promise<number | null> => {
      for (const pid of PLAYER_IDS) {
        try {
          const res: any = await CapacitorVideoPlayer.getCurrentTime({ playerId: pid });
          if (res && typeof res.value === 'number' && res.value > 0) return res.value;
        } catch { /* tenta o proximo */ }
      }
      return null;
    };

    const getDuration = async (): Promise<number | null> => {
      for (const pid of PLAYER_IDS) {
        try {
          const res: any = await CapacitorVideoPlayer.getDuration({ playerId: pid });
          if (res && typeof res.value === 'number' && res.value > 0) return res.value;
        } catch { /* tenta o proximo */ }
      }
      return null;
    };

    const saveProgress = async () => {
      const currentSource = usePlayerStore.getState().currentSource;
      if (!currentSource || !currentSource.id) return;

      const currentTime = await getCurrentTime();
      const duration = await getDuration();
      if (currentTime === null || duration === null) return;
      if (currentTime < 10 || !isFinite(duration) || duration <= 0) return;

      const progress = currentTime / duration;
      if (progress >= 0.95) return;

      const now = Date.now();
      if (now - lastSavedRef.current < 5000) return;
      lastSavedRef.current = now;

      const id = currentSource.id;
      if (!id.startsWith('channel-')) {
        usePlaylistStore.getState().addToRecent(id);
      }

      if (id.startsWith('vod-')) {
        useMoviesStore.getState().setWatchProgress(id.replace('vod-', ''), progress);
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

    const interval = setInterval(() => { void saveProgress(); }, 5000);

    CapacitorVideoPlayer.addListener('jeepCapVideoPlayerPause', () => { void saveProgress(); })
      .then((h) => listeners.push(h)).catch(() => {});
    CapacitorVideoPlayer.addListener('jeepCapVideoPlayerEnded', () => { lastSavedRef.current = 0; void saveProgress(); })
      .then((h) => listeners.push(h)).catch(() => {});
    CapacitorVideoPlayer.addListener('jeepCapVideoPlayerExit', () => { lastSavedRef.current = 0; void saveProgress(); })
      .then((h) => listeners.push(h)).catch(() => {});

    return () => {
      clearInterval(interval);
      listeners.forEach((h) => { h.remove(); });
      void saveProgress();
    };
  }, [exoActive, currentSourceId]);
}
