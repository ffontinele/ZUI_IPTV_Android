import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';
import { useToast } from '@/components/ui/Toast';
import { useDownloadsStore, type DownloadItem } from '@/state/downloadsStore';

export function safeName(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'video';
}

export function useDownloadAndCopy() {
  const showToast = useToast((s) => s.show);

  const copyLink = async (url: string, title: string) => {
    try {
      await Clipboard.write({ string: url });
      showToast('📋 Link copiado: ' + title);
    } catch {
      showToast('❌ Erro ao copiar link');
    }
  };

  const download = async (item: Omit<DownloadItem, 'progress' | 'status' | 'addedAt'>) => {
    if (!Capacitor.isNativePlatform()) {
      showToast('❌ Download disponivel apenas no Android');
      return;
    }
    const existing = useDownloadsStore.getState().items.find((i) => i.id === item.id);
    if (existing && (existing.status === 'downloading' || existing.status === 'queued')) {
      showToast('⏳ Este video ja esta sendo baixado');
      return;
    }
    useDownloadsStore.getState().add({ ...item, progress: 0, status: 'downloading', addedAt: Date.now() });
    showToast('⬇ Baixando: ' + item.title);

    let listener: any = null;
    try {
      listener = await (Filesystem as any).addListener('progress', (data: any) => {
        if (data && data.contentLength > 0 && (!data.url || data.url === item.url)) {
          const progress = Math.min(99, Math.round((data.bytes / data.contentLength) * 100));
          useDownloadsStore.getState().update(item.id, { progress, status: 'downloading', bytesDone: data.bytes, bytesTotal: data.contentLength });
        }
      });
    } catch { /* progresso opcional */ }

    try {
      const res = await Filesystem.downloadFile({
        url: item.url,
        path: item.fileName,
        directory: Directory.Documents,
        recursive: true,
        progress: true,
      });
      if (listener) await listener.remove();
      useDownloadsStore.getState().update(item.id, { progress: 100, status: 'done', filePath: res.path });
      showToast('✅ Download concluido: ' + item.title);
    } catch (err) {
      if (listener) await listener.remove();
      useDownloadsStore.getState().update(item.id, { status: 'error', error: String((err as Error)?.message || err) });
      showToast('❌ Falha no download: ' + item.title);
    }
  };

  return { download, copyLink };
}
