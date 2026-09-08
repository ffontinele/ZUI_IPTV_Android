import { useDownloadsStore } from '@/state/downloadsStore';

export function DownloadProgressBar() {
  const items = useDownloadsStore((s) => s.items);
  const active = items.find((i) => i.status === 'downloading' || i.status === 'queued');
  if (!active) return null;
  const title = active.subtitle ? active.title + ' · ' + active.subtitle : active.title;
  const progress = active.progress ?? 0;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-2 bg-[#1a1208]/95 backdrop-blur border-t border-[#E8B567]/30 shadow-[0_-4px_20px_-4px_rgba(232,181,103,0.3)]">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#E8B567] shrink-0 animate-pulse"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[11px] text-white/80 truncate font-medium">{title}</p>
            <span className="text-[11px] tabular-nums text-[#E8B567] font-bold">{progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#E8B567] transition-all duration-500 shadow-[0_0_8px_#E8B567]" style={{ width: progress + '%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
