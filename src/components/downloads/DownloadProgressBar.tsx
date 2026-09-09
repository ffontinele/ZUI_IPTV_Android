import { useDownloadsStore, formatBytes } from '@/state/downloadsStore';
import { useDraggable } from '@/hooks/useDraggable';

export function DownloadProgressBar() {
  const items = useDownloadsStore((s) => s.items);
  const active = items.find((i) => i.status === 'downloading' || i.status === 'queued');
  const { style, handlers } = useDraggable('download-bar', { x: 0, y: 0 });
  if (!active) return null;
  const title = active.subtitle ? active.title + ' \u00b7 ' + active.subtitle : active.title;
  const progress = active.progress ?? 0;
  return (
    <div
      data-drag="download-bar"
      style={{
        ...style,
        left: '50%',
        bottom: '28px',
        marginLeft: '-550px',
      }}
      className="fixed z-40 w-[1100px] max-w-[96vw] px-6 py-4 rounded-2xl bg-[#1a1208]/95 backdrop-blur border border-[#E8B567]/40 shadow-[0_8px_32px_-8px_rgba(232,181,103,0.45)] cursor-grab active:cursor-grabbing select-none"
      {...handlers}
    >
      <div className="flex items-center gap-3 mb-2">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-[#E8B567] shrink-0 animate-pulse"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        <p className="flex-1 min-w-0 text-[14px] text-white/90 truncate font-medium">{title}</p>
        <span className="text-[14px] tabular-nums text-[#E8B567] font-bold">{progress}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-[#E8B567] transition-all duration-500 shadow-[0_0_10px_#E8B567]" style={{ width: progress + '%' }} />
      </div>
      <p className="mt-2 text-[12px] tabular-nums text-white/50 text-right">{formatBytes(active.bytesDone)} / {formatBytes(active.bytesTotal)}</p>
    </div>
  );
}
