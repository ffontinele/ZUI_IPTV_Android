import { Filesystem } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useToast } from '@/components/ui/Toast';
import { useDownloadsStore } from '@/state/downloadsStore';
import { usePlayerStore } from '@/state/playerStore';
import { useUIStore } from '@/state/uiStore';

const APP_DOCS_PATH = '/storage/emulated/0/Android/data/com.zui.iptv.android/files/Documents';

function ItemRow({ item, onClose }: { item: any; onClose: () => void }) {
  const remove = useDownloadsStore((s) => s.remove);
  const showToast = useToast((s) => s.show);
  const { ref, focused } = useFocusable({ focusKey: 'DL_' + item.id });

  const handlePlay = () => {
    if (!item.filePath) { showToast('❤ ‚ Arquivo nao encontrado'); return; }
    const url = item.filePath.startsWith('file://') ? item.filePath : 'file://' + item.filePath;
    usePlayerStore.getState().setSource({
      id: 'local-' + item.id,
      name: item.subtitle ? item.title + ' · ' + item.subtitle : item.title,
      url,
      sourceType: 'local' as any,
    });
    useDownloadsStore.setState({ reopenModal: true });
    useUIStore.getState().navigate('player');
    onClose();
  };

  const handleCopyPath = async () => {
    const path = item.filePath || APP_DOCS_PATH;
    try {
      await Clipboard.write({ string: path });
      showToast('📋 Caminho copiado: ' + (path.length > 50 ? path.slice(0, 47) + '...' : path));
    } catch { showToast('❤ ❔ ‚ Erro ao copiar'); }
  };

  const handleOpenFolder = async () => {
    const path = item.filePath || APP_DOCS_PATH;
    try {
      await Clipboard.write({ string: path });
      showToast('📋 Caminho copiado: ' + path);
    } catch {
      showToast('⒠️ Android bloqueou acesso - caminho copiado');
    }
  };

  const handleDelete = async () => {
    if (item.filePath) {
      try { await Filesystem.deleteFile({ path: item.filePath.replace(/^file:\/\//, '') }); }
      catch { /* ignora */ }
    }
    remove(item.id);
    showToast('🗑 ❡️ Removido: ' + item.title);
  };

  const statusLabel = () => {
    if (item.status === 'downloading') return (item.progress ?? 0) + '% baixando...';
    if (item.status === 'done') return '✓ Conclóído';
    if (item.status === 'queued') return 'Na fila';
    return '❤ ❔ ‚ Erro: ' + (item.error || 'desconhecido');
  };

  const focusClass = focused ? 'bg-[#E8B567]/10 border border-[#E8B567]/40 shadow-[0_0_16px_-4px_#E8B567]' : 'bg-white/[0.03] border border-white/10';

  return (
    <div ref={ref as any} className={'flex items-center gap-3 p-3 rounded-xl transition-all ' + focusClass}>
      <div className="shrink-0 w-10 h-10 rounded-lg bg-[[#E8B567]/15 grid place-items-center">
        {item.kind === 'movie' ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#E8B567]"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#E8B567]"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={'text-[14px] font-medium truncate ' + (focused ? 'text-[#E8B567]' : 'text-white/90')}>{item.title}</p>
        {item.subtitle && <p className="text-[12px] text-white/50 truncate">{item.subtitle}</p>}
        <p className={'text-[11px] mt-0.5 truncate ' + (item.status === 'done' ? 'text-green-400' : item.status === 'error' ? 'text-red-400' : 'text-[#E8B567]')}>{statusLabel()}</p>
        {item.status === 'downloading' && (
          <div className="h-1 mt-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#E8B567] transition-all" style={{ width: (item.progress ?? 0) + '%' }} />
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1">
        {item.status === 'done' && (
          <button onClick={handlePlay} className="w-8 h-8 rounded-full bg-[[#E8B567] grid place-items-center shadow-[0_0_10px_-2px_#E8B567]" title="Assistir">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#0e0b0a] translate-x-[1px]"><path d="M7 4v16l13-8z"/></svg>
          </button>
        )}
        <button onClick={handleCopyPath} className="w-8 h-8 rounded-full bg-white/10 border border-white/20 grid place-items-center text-white/70 hover:bg-white/20" title="Copiar caminho">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M16 1H4c-1.1 0-2.9.9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
        </button>
        <button onClick={handleOpenFolder} className="w-8 h-8 rounded-full bg-white/10 border border-white/20 grid place-items-center text-white/70 hover:bg-white/20" title="Ver no app Arquivos">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20 6h8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
        </button>
        <button onClick={handleDelete} className="w-8 h-8 rounded-full grid place-items-center text-white/70 hover:bg-white/20 bg-white/10 border border-white/20" title="Apagar">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div>
    </div>
  );
}

export function DownloadManagerModal({ onClose }: { onClose: () => void }) {
  const items = useDownloadsStore((s) => s.items);
  const { ref } = useFocusable({ focusKey: 'DOWNLOADS_MODAL', isFocusBoundary: true });
  const total = items.length;
  const active = items.filter((i) => i.status === 'downloading' || i.status === 'queued').length;
  const done = items.filter((i) => i.status === 'done').length;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
      <div ref={ref as any} className="w-full max-w-3xl max-h-[85vh] bg-[[#14110e] border border-[#E8B567]/30 rounded-2xl shadow-[0_0_40px_-8px_#E8B567] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-[#E8B567]">Meus Downloads</h2>
            <p className="text-[12px] text-white/50 mt-0.5">
              {total === 0 ? 'Nenhum download ainda' : total + ' item' + (total !== 1 ? 's' : '') + ' · ' + active + ' baixando · ' + done + ' concluído' + (done !== 1 ? 's' : '')}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 border border-white/20 grid place-items-center text-white hover:bg-white/20">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5">
          <p className="text-[11px] text-white/40">Pasta de downloads:</p>
          <p className="text-[11px] text-[#E8B567]/80 font-mono truncate mt-0.5">{APP_DOCS_PATH}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 ? (
            <div className="h-full grid place-items-center py-16">
              <div className="text-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white/20 mx-auto mb-3"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                <p className="text-white/40 text-[14px]">Nenhum download ainda</p>
                <p className="text-white/25 text-[12px] mt-1">Toque em "Baixar" em um filme ou episodio</p>
              </div>
            </div>
          ) : (
            items.map((item) => <ItemRow key={item.id} item={item} onClose={onClose} />)
          )}
        </div>
      </div>
    </div>
  );
}
