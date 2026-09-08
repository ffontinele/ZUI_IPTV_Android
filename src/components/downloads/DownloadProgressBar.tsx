import { useDownloadsStore, formatBytes } from '@/state/downloadsStore';
import { useDraggable } from '@/hooks/useDraggable';

export function DownloadProgressBar() {
  const items = useDownloadsStore((s) => s.items);
  const active = items.find((i) => i.status === 'downloading' || i.status === 'queued');
  const { style, handlers } = useDraggable('download-bar', { x: 0, y: 0 });
  if (!active) return null;
  const title = active.subtitle ? active.title + ' · ' + active.subtitle : active.title;
  const progress = active.progress ?? 0;
  return (
    <div
      data-drag="download-bar"
      style={{
        ...style,
        left: '50%',
        bottom: '24px',
        marginLeft: '-160px',
      }}
      className="fixed z-40 w-[320px] px-4 py-3 rounded-2xl bg-[#1a1208]/95 backdrop-blur border border-[#E8B567]/40 shadow-[0_8px_32px_-8px_rgba(232,181,103,0.45)] cursor-grab active:cursor-grabbing select-none"
      {...handlers}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#E8B567] shrink-0 animate-pulse"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        <p className="flex-1 min-w-0 text-[11px] text-white/85 truncate font-medium">{title}</p>
        <span className="text-[11px] tabular-nums text-[#E8B567] font-bold">{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-[#E8B567] transition-all duration-500 shadow-[0_0_8px_#E8B567]" style={{ width: progress + '%' }} />
      </div>
      <p className="mt-1 text-[10px] tabular-nums text-white/45 text-right">{formatBytes(active.bytesDone)} / {formatBytes(active.bytesTotal)}</p>
    </div>
  );
}
