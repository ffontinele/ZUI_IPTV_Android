import { useToast } from '@/components/ui/Toast';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { usePlayerStore } from '@/state/playerStore';
import { useMoviesStore } from '@/state/moviesStore';
import { useSeriesStore } from '@/state/seriesStore';

export function useWatchProgress(videoRef: RefObject<HTMLVideoElement>) {
  const lastSavedRef = useRef<number>(0);
  const currentSourceId = usePlayerStore(s => s.currentSource?.id ?? null);

  useEffect(() => {
    let video: HTMLVideoElement | null = null;
    let attached = false;
    let warnedDuration = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const saveProgress = () => {
      const v = videoRef.current;
      const currentSource = usePlayerStore.getState().currentSource;
      if (!v || !currentSource || !currentSource.id) return;

      const currentTime = v.currentTime;
      const duration = v.duration;

      if (currentTime < 10 || !duration || !isFinite(duration)) {
        if (!warnedDuration && currentTime > 10) {
          warnedDuration = true;
        }
        return;
      }
      const progress = currentTime / duration;
      if (progress >= 0.95) return;

      const now = Date.now();
      if (now - lastSavedRef.current < 5000) return;
      lastSavedRef.current = now;

      const id = currentSource.id;

      if (id.startsWith('vod-')) {
        const movieId = id.replace('vod-', '');
        useMoviesStore.getState().setWatchProgress(movieId, progress);
        return;
      }

      if (id.startsWith('series-ep-')) {
        const ctx = usePlayerStore.getState().seriesContext;
        if (!ctx || !ctx.seriesId) {
          return;
        }

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

    const saveNow = () => {
      lastSavedRef.current = 0;
      saveProgress();
    };

    const onMetadata = () => {
      const v = videoRef.current;
      if (!v) return;
      const st = usePlayerStore.getState();
      const ratio = st.resumeRatio;
      const sec = st.resumeSec;
      if (ratio > 0.02 && ratio < 0.95 && isFinite(v.duration) && v.duration > 0) {
        const target = ratio * v.duration;
        if (target > 5 && target < v.duration - 5) {
          v.currentTime = target;
          useToast.getState().show('Continuando de ' + Math.round(ratio * 100) + '%');
        }
      } else if (sec > 10 && isFinite(v.duration) && sec < v.duration - 5) {
        v.currentTime = sec;
        useToast.getState().show('Continuando de ' + Math.floor(sec / 60) + 'min');
      }
      st.setResumeRatio(0);
      st.setResumeSec(0);
    };

    const attach = () => {
      const v = videoRef.current;
      if (!v || attached) return;
      video = v;
      attached = true;
      v.addEventListener('timeupdate', saveProgress);
      v.addEventListener('pause', saveNow);
      v.addEventListener('ended', saveNow);
      v.addEventListener('loadedmetadata', onMetadata);
      window.addEventListener('beforeunload', saveNow);
      if (v.readyState >= 1) onMetadata();
    };

    if (videoRef.current) {
      attach();
    } else {
      retryTimer = setTimeout(attach, 400);
    }

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      try { saveNow(); } catch (e) {}
      if (attached && video) {
        video.removeEventListener('timeupdate', saveProgress);
        video.removeEventListener('pause', saveNow);
        video.removeEventListener('ended', saveNow);
        video.removeEventListener('loadedmetadata', onMetadata);
      }
      window.removeEventListener('beforeunload', saveNow);
    };
  }, [videoRef, currentSourceId]);
}
