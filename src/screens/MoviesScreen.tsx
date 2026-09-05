// MoviesScreen — root layout for the Movies (VOD) screen.
// Global TopBar is rendered by App.tsx (same as channelList/epg/settings).
// Layout: 22% sidebar + 1fr main (hero + grid).

import { useEffect, useRef, useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useMoviesStore } from '@/state/moviesStore';
import { MovieCategorySidebar } from '@/components/movies/MovieCategorySidebar';
import { MoviesHero } from '@/components/movies/MoviesHero';
import { MoviesGrid } from '@/components/movies/MoviesGrid';
import { MovieDetailsModal } from '@/components/movies/MovieDetailsModal';

let lastMoviesGridFocus: { categoryId: string; id: string | null } = { categoryId: '', id: null };

export function MoviesScreen() {
  const visibleMovies = useMoviesStore(s => s.visibleMovies);
  const activeCategory = useMoviesStore(s => s.activeCategory);
  const status = useMoviesStore(s => s.status);
  const error = useMoviesStore(s => s.error);
  const loadVodData = useMoviesStore(s => s.loadVodData);

  const { t } = useTranslation();
  const detailsMovieId = useMoviesStore(s => s.detailsMovieId);
  const [focusedMovieId, setFocusedMovieId] = useState<string | null>(null);

  // Page-level focus context — declared BEFORE any conditional returns
  // so FocusContext is always mounted (loading/error states live inside it).
  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'MOVIES_PAGE',
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  // Load VOD data on mount if not already loaded.
  // Also retry if status is 'error' — covers the case where an Xtream source
  // was passive on last visit and the user has since enabled it.
  useEffect(() => {
    if (status === 'idle' || status === 'error') {
      void loadVodData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear search query when leaving the movies screen so it doesn't persist stale
  useEffect(() => {
    return () => {
      useMoviesStore.getState().setCategorySearch('');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set D-pad focus when data becomes ready.
  // Small delay (1 frame) lets the sidebar/grid DOM mount before setFocus.
  useEffect(() => {
    if (status === 'ready') {
      const t = setTimeout(() => setFocus('MOVIES_GRID_VIRTUAL'), 60);
      return () => clearTimeout(t);
    }
  }, [status, setFocus]);

  const prevCategoryRef = useRef(activeCategory);

  // Categoria mudou dentro da tela → primeiro card.
  // Voltou do player na mesma categoria → restaura o último card focado.
  useEffect(() => {
    const categoryChanged = prevCategoryRef.current !== activeCategory;
    prevCategoryRef.current = activeCategory;

    if (categoryChanged) {
      const first = visibleMovies[0]?.id ?? null;
      setFocusedMovieId(first);
      lastMoviesGridFocus = { categoryId: activeCategory, id: first };
      return;
    }

    const saved =
      lastMoviesGridFocus.categoryId === activeCategory &&
      lastMoviesGridFocus.id &&
      visibleMovies.some(m => m.id === lastMoviesGridFocus.id)
        ? lastMoviesGridFocus.id
        : visibleMovies[0]?.id ?? null;

    setFocusedMovieId(saved);
  }, [activeCategory, visibleMovies]);

  // Modal fechado → devolve o foco para o grid (evita direcional morto)
  const prevDetailsRef = useRef(detailsMovieId);
  useEffect(() => {
    const wasOpen = prevDetailsRef.current !== null;
    prevDetailsRef.current = detailsMovieId;
    if (wasOpen && detailsMovieId === null) {
      const timer = setTimeout(() => setFocus('MOVIES_GRID_VIRTUAL'), 60);
      return () => clearTimeout(timer);
    }
  }, [detailsMovieId, setFocus]);

  const focusedMovie =
    visibleMovies.find(m => m.id === focusedMovieId) ?? visibleMovies[0] ?? null;

  const handleFocusMovie = (id: string | null) => {
    setFocusedMovieId(id);
    lastMoviesGridFocus = { categoryId: activeCategory, id };
  };

  // ── Always render FocusContext so norigin context is present
  // even during loading / error (prevents focus being orphaned). ──────────────
  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="relative flex-1 overflow-hidden h-full"
      >

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {status === 'loading' && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4 text-white/50">
              <svg className="w-8 h-8 animate-spin text-[#E8B567]" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
              </svg>
              <span className="font-serif italic text-[16px]">{t('movies.loading')}</span>
            </div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {status === 'error' && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-center max-w-[400px]">
              <svg className="w-12 h-12 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
              <p className="font-serif italic text-[16px] text-white/60">{error ?? t('movies.error')}</p>
              <button
                onClick={() => void loadVodData()}
                className="mt-2 px-4 h-9 rounded-full border border-[#E8B567]/55 text-[#E8B567] text-[12px] uppercase tracking-[0.25em] font-semibold"
              >
                {t('common.retry')}
              </button>
            </div>
          </div>
        )}

        {/* ── Main layout ─────────────────────────────────────────────────── */}
        {status === 'ready' && (
          <div className="grid grid-cols-[22%_1fr] gap-6 px-12 py-6 h-full overflow-hidden">
            <MovieCategorySidebar />

            <main className="flex flex-col gap-5 overflow-hidden min-h-0">
              <MoviesHero movie={focusedMovie} />
              <MoviesGrid
                focusedMovieId={focusedMovieId}
                onFocusMovie={handleFocusMovie}
                onEscapeToLeft={() => setFocus(`movie-cat-${activeCategory}`)}
              />
            </main>
          </div>
        )}
              {detailsMovieId && <MovieDetailsModal />}
      </div>
    </FocusContext.Provider>
  );
}
