// LocalSearchInput — busca leve dentro da categoria ativa.
import { useRef } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useTranslation } from 'react-i18next';

export function LocalSearchInput({
  focusKey,
  value,
  onChange,
  categoryLabel,
}: {
  focusKey: string;
  value: string;
  onChange: (v: string) => void;
  categoryLabel: string;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: () => inputRef.current?.focus(),
  });

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={[
        'flex items-center gap-3 w-full h-10 px-4 rounded-full transition-all shrink-0',
        focused
          ? 'border-2 border-white bg-[#E8B567]/[0.08] shadow-[0_0_16px_-6px_#E8B567]'
          : 'border-2 border-[#E8B567] bg-[#E8B567]/[0.03]',
      ].join(' ')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#E8B567] shrink-0">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={categoryLabel ? t('grid.search_in', { category: categoryLabel }) : t('grid.search_here')}
        className="flex-1 bg-transparent outline-none border-0 text-[14px] text-white placeholder:text-white/40 placeholder:italic"
      />
      {value && (
        <button
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="shrink-0 w-5 h-5 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center transition-colors"
          aria-label="Limpar busca"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3 text-white/70">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
