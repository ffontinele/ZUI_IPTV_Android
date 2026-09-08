import { useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/components/ui/Toast';
import { useDownloadsStore, type DownloadItem } from '@/state/downloadsStore';

export function useDownloadAndCopy() {
  const [downloading, setDownloading] = useState(false);
  const showToast = useToast((s) => s.show);
  const addDownload = useDownloadsStore((s) => s.add);
  const updateDownload = useDownloadsStore((s) => s.update);

  const download = async (item: Omit<DownloadItem, 'progress' | 'status' | 'addedAt'>) => {
    if (downloading) {
      showToast('⏳ Aguarde o download atual terminar');
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      showToast('❌ Download só funciona no Android');
      return;
    }

    const fullItem: DownloadItem = {
      ...item,
      progress: 0,
      status: 'downloading',
      addedAt: Date.now(),
    };

    addDownload(fullItem);
    setDownloading(true);
    showToast(`⬇ Iniciando: ${item.title}`);

    try {
      const permission = await Filesystem.checkPermissions();
      if (permission.publicStorage !== 'granted') {
        await Filesystem.requestPermissions();
      }

      let progressListener: any = null;
      
      // Monitora progresso via addListener
      try {
        progressListener = await (Filesystem as any).addListener('progress', (data: any) => {
          if (data.status === 'progress' && data.bytes && data.contentLength) {
            const progress = Math.round((data.bytes / data.contentLength) * 100);
            updateDownload(item.id, { progress, status: 'downloading' });
          }
        });
      } catch (e) {
        console.warn('[Download] addListener progress falhou:', e);
      }

      const response = await Filesystem.downloadFile({
        url: item.url,
        path: item.fileName,
        directory: Directory.Documents,
        recursive: true,
      });

      if (progressListener) await progressListener.remove();

      if (response.path) {
        updateDownload(item.id, {
          progress: 100,
          status: 'done',
          filePath: response.path,
        });
        showToast(`✅ Download concluído: ${item.title}`);
      } else {
        throw new Error('Caminho não retornado');
      }
    } catch (err) {
      console.error('[Download] erro:', err);
      updateDownload(item.id, {
        status: 'error',
        error: (err as Error).message || 'Erro desconhecido',
      });
      showToast(`❌ Falha no download: ${(err as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  const copyLink = async (url: string, title: string) => {
    try {
      await Clipboard.write({ string: url });
      showToast(`📋 Link copiado: ${title}`);
    } catch (err) {
      showToast(`❌ Erro ao copiar: ${(err as Error).message}`);
    }
  };

  return { download, copyLink, downloading };
}
