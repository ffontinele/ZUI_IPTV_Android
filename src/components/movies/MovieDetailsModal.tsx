import { useEffect } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';
import { useMoviesStore } from '@/state/moviesStore';
import { useToast } from '@/components/ui/Toast';

export function MovieDetailsModal() {
  const { t } = useTranslation();
  const detailsMovieId = useMoviesStore(s => s.detailsMovieId);
  const movie = useMoviesStore(s =>
    detailsMovieId ? (s.allMovies.find(m => m.id === detailsMovieId) ?? null) : null
  );
  const isFavorite = useMoviesStore(s =>
    detailsMovieId ? s.favoriteIds.includes(detailsMovieId) : false
  );
  const closeMovieDetails = useMoviesStore(s => s.closeMovieDetails);
  const playMovie = useMoviesStore(s => s.playMovie);
  const toggleFavorite = useMoviesStore(s => s.toggleFavorite);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'GoBack' || e.keyCode === 461 || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        closeMovieDetails();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [closeMovieDetails]);

  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'MDM_ROOT',
    isFocusBoundary: true,
    trackChildren: true,
    saveLastFocusedChild: true,
  });

  const { ref: playRef, focused: playFocused } = useFocusable({
    focusKey: 'MDM_PLAY',
    onEnterPress: () => { if (movie) { closeMovieDetails(); playMovie(movie.id); } },
  });

  const { ref: favRef, focused: favFocused } = useFocusable({
    focusKey: 'MDM_FAV',
    onEnterPress: () => {
      if (!movie) return;
      const adding = !isFavorite;
      toggleFavorite(movie.id);
      useToast.getState().show(adding ? t('hero.fav_added') : t('hero.fav_removed'));
    },
  });

  useEffect(() => {
    if (movie) setTimeout(() => setFocus('MDM_PLAY'), 80);
  }, [movie]);

  if (!movie) return null;

  const c1 = movie.gradient?.[0] ?? '#3A3A3A';
  const c2 = movie.gradient?.[1] ?? '#1A1A1A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-[#0e0b0a]/85 backdrop-blur-sm"
        onClick={closeMovieDetails}
      />

      <button
        onClick={closeMovieDetails}
        className="absolute top-6 right-8 z-10 w-9 h-9 rounded-full border border-white/10 bg-white/5 grid place-items-center text-white/40 hover:text-white/70 transition-all"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <FocusContext.Provider value={focusKey}>
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="relative w-[1000px] h-[560px] rounded-[28px] overflow-hidden border border-white/8 flex"
          style={{ background: `linear-gradient(145deg, ${c1}18 0%, #131110 35%)` }}
        >
          <div className="w-[320px] shrink-0 p-6 flex items-center justify-center">
            <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden border border-white/8 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)]">
              {movie.posterUrl ? (
                <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center"
                  style={{ background: `linear-gradient(155deg, ${c1}, ${c2})` }}>
                  <span className="font-serif italic text-[80px] text-white/10 leading-none">
                    {movie.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4 px-6 py-6 overflow-y-auto">
            <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.35em] text-[#E8B567]/85 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8B567] shadow-[0_0_8px_#E8B567]" />
              {movie.isNew ? t('hero.new_added') : t('hero.featured')}
              <span className="w-10 h-px bg-[#E8B567]/40" />
            </div>

            <h1 className="font-serif text-[38px] font-light tracking-tight text-white leading-tight">
              {movie.title}
            </h1>

            <div className="flex items-center gap-2 text-[13px] text-white/70 flex-wrap">
              <span className="flex items-center gap-1 text-[#E8B567] font-bold">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {movie.rating.toFixed(1)}
              </span>
              <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
              <span>{movie.year}</span>
              {movie.runtime && (
                <>
                  <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                  <span>{movie.runtime}</span>
                </>
              )}
              {movie.genre && (
                <span className="px-2 py-0.5 rounded border border-white/15 text-[10px] uppercase tracking-[0.2em] font-semibold">
                  {movie.genre}
                </span>
              )}
            </div>

            {movie.synopsis && (
              <p className="text-[14px] text-white/60 leading-relaxed mt-2">
                {movie.synopsis}
              </p>
            )}

            <div className="flex items-center gap-3 mt-auto pt-4">
              <button
                ref={playRef as React.RefObject<HTMLButtonElement>}
                onClick={() => { closeMovieDetails(); playMovie(movie.id); }}
                className={[
                  'flex items-center gap-2 px-6 h-12 rounded-full bg-[#E8B567] text-[#0e0b0a] text-[14px] font-bold tracking-wide transition-all',
                  playFocused ? 'scale-105 shadow-[0_0_40px_-4px_#E8B567]' : 'shadow-[0_0_24px_-6px_#E8B567]',
                ].join(' ')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M7 4v16l13-8z" />
                </svg>
                {t('hero.watch')}
              </button>

              <button
                ref={favRef as React.RefObject<HTMLButtonElement>}
                onClick={() => {
                  const adding = !isFavorite;
                  toggleFavorite(movie.id);
                  useToast.getState().show(adding ? t('hero.fav_added') : t('hero.fav_removed'));
                }}
                className={[
                  'flex items-center gap-2 px-5 h-12 rounded-full text-[14px] font-bold transition-all',
                  favFocused
                    ? 'border-2 border-white bg-[#E8B567] text-[#0e0b0a] scale-105 shadow-[0_0_40px_-4px_#E8B567]'
                    : 'border-2 border-[#E8B567] bg-[#E8B567] text-[#0e0b0a]',
                ].join(' ')}
              >
                <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {t(isFavorite ? 'hero.favorited' : 'hero.favorite')}
              </button>

              <button
                onClick={closeMovieDetails}
                className='ml-auto px-5 h-12 rounded-full border-2 border-[#E8B567] bg-[#E8B567] text-[#0e0b0a] text-[14px] font-bold transition-all'
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </FocusContext.Provider>
    </div>
  );
}
