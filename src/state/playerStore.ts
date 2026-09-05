import { create } from 'zustand';
import type { PlayerError, PlayerState, StreamSource } from '@/types/player';
import type { XtreamSeriesEpisode } from '@/types/xtream';
import { buildSeriesEpisodeUrl } from '@/services/series.service';

export type SeriesContext = {
  seriesId: string;
  seasonKey: number;
  episodeIndex: number;
  allEpisodes: XtreamSeriesEpisode[];
  seriesTitle: string;
};

type PlayerStore = {
  state: PlayerState;
  currentSource: StreamSource | null;
  error: PlayerError | null;
  audioWarning: string | null;
  osdVisible: boolean;
  seriesContext: SeriesContext | null;
  resumeRatio: number;
  setResumeRatio: (r: number) => void;
  resumeSec: number;
  setResumeSec: (sec: number) => void;

  setSource: (s: StreamSource) => void;
  setState: (s: PlayerState) => void;
  setError: (e: PlayerError | null) => void;
  setAudioWarning: (w: string | null) => void;
  showOSD: () => void;
  hideOSD: () => void;
  setSeriesContext: (c: SeriesContext | null) => void;
  playNextEpisode: () => 'ok' | 'no_more' | 'no_context';
  playPrevEpisode: () => 'ok' | 'no_more' | 'no_context';
};

function gotoEpisode(index: number): 'ok' | 'no_more' | 'no_context' {
  const state = usePlayerStore.getState();
  const ctx = state.seriesContext;
  if (!ctx || !Array.isArray(ctx.allEpisodes) || ctx.allEpisodes.length === 0) {
    return 'no_context';
  }
  if (index < 0 || index >= ctx.allEpisodes.length) {
    return 'no_more';
  }
  const creds = (window as any).__ZUI_XTREAM_CREDS;
  const ep = ctx.allEpisodes[index];
  if (!creds || !ep || !ep.id || !ep.container_extension) {
    return 'no_more';
  }

  try {
    const url = buildSeriesEpisodeUrl(creds, ep.id, ep.container_extension);
    const seasonNum = String(ctx.seasonKey).padStart(2, '0');
    const epNum = String(ep.episode_num).padStart(2, '0');

    usePlayerStore.getState().setSource({
      id: `series-ep-${ep.id}`,
      name: `${ctx.seriesTitle} · S${seasonNum}·E${epNum}`,
      url,
      sourceType: 'xtream',
    });
    usePlayerStore.getState().setSeriesContext({ ...ctx, episodeIndex: index });
    return 'ok';
  } catch (err) {
    console.error('[ZUI] gotoEpisode error:', err);
    return 'no_more';
  }
}

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  state: 'idle',
  currentSource: null,
  error: null,
  audioWarning: null,
  osdVisible: true,
  seriesContext: null,
  resumeRatio: 0,
  resumeSec: 0,

  setSource: (s) => set({ currentSource: s, error: null, audioWarning: null, state: 'loading' }),
  setState: (s) => set({ state: s }),
  setError: (e) => set({ error: e, state: e ? 'error' : 'idle' }),
  setAudioWarning: (w) => set({ audioWarning: w }),
  showOSD: () => set({ osdVisible: true }),
  hideOSD: () => set({ osdVisible: false }),
  setSeriesContext: (c) => set({ seriesContext: c }),
  setResumeRatio: (r) => set({ resumeRatio: r }),
  setResumeSec: (sec) => set({ resumeSec: sec }),
  playNextEpisode: () => {
    const ctx = get().seriesContext;
    if (!ctx) return 'no_context';
    return gotoEpisode(ctx.episodeIndex + 1);
  },
  playPrevEpisode: () => {
    const ctx = get().seriesContext;
    if (!ctx) return 'no_context';
    return gotoEpisode(ctx.episodeIndex - 1);
  },
}));
