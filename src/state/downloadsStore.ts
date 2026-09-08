import { create } from 'zustand';

export type DownloadItem = {
  id: string;            // vod-123 ou series-ep-456
  kind: 'movie' | 'episode';
  title: string;         // nome do filme ou da serie
  subtitle?: string;     // S02:E03 - nome do episodio
  url: string;
  fileName: string;
  filePath?: string;     // caminho local final
  progress: number;      // 0-100
  bytesDone?: number;
  bytesTotal?: number;
  status: 'queued' | 'downloading' | 'done' | 'error';
  error?: string;
  addedAt: number;
};

type DownloadsStore = {
  items: DownloadItem[];
  reopenModal: boolean;
  hydrate: () => void;
  persist: () => void;
  add: (item: DownloadItem) => void;
  update: (id: string, patch: Partial<DownloadItem>) => void;
  remove: (id: string) => void;
};

const KEY = 'zui-downloads-v1';

export const useDownloadsStore = create<DownloadsStore>((set, get) => ({
  items: [],
  reopenModal: false,
  hydrate: () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) set({ items: JSON.parse(raw) as DownloadItem[] });
    } catch { /* ignora */ }
  },
  persist: () => {
    try { localStorage.setItem(KEY, JSON.stringify(get().items)); } catch { /* ignora */ }
  },
  add: (item) => {
    set((s) => ({ items: [item, ...s.items.filter((i) => i.id !== item.id)] }));
    get().persist();
  },
  update: (id, patch) => {
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
    get().persist();
  },
  remove: (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    get().persist();
  },
}));

export function formatBytes(n?: number): string {
  if (!n || n <= 0) return '0 MB';
  const mb = n / (1024 * 1024);
  if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
  return mb.toFixed(1) + ' MB';
}
