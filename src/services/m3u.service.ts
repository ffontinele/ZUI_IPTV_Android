import M3UParserWorker from '@/workers/m3uParser.worker?worker';
import type { Source, M3UConfig } from '@/types/source';
import type { WorkerResponse } from '@/types/parser';
import type { Channel } from '@/types/channel';

export type SyncProgress = {
  parsed: number;
  total: number;
  percent: number;
};

export type SyncResult = {
  channelCount: number;
  categories: string[];
  channels: Channel[];
};

export async function syncM3USource(
  source: Source,
  onProgress?: (p: SyncProgress) => void
): Promise<SyncResult> {
  const config = source.config as M3UConfig;

  // 1. Baixa o texto aqui (thread principal -> CapacitorHttp -> sem CORS)
  const fetchHeaders: Record<string, string> = { ...(config.headers ?? {}) };
  if (config.userAgent) fetchHeaders['User-Agent'] = config.userAgent;
  const res = await fetch(config.url, { headers: fetchHeaders });
  if (!res.ok) throw new Error('Fetch failed: ' + res.status + ' ' + res.statusText);
  const text = await res.text();

  // 2. Worker faz apenas o parse (sem rede)
  return new Promise((resolve, reject) => {
    const worker = new M3UParserWorker();

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;

      if (msg.type === 'progress') {
        onProgress?.({
          parsed: msg.parsed,
          total: msg.total,
          percent: Math.round((msg.parsed / msg.total) * 100),
        });
      } else if (msg.type === 'done') {
        worker.terminate();
        resolve({
          channelCount: msg.channelCount,
          categories: msg.categories,
          channels: msg.channels ?? [],
        });
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error('Worker error: ' + e.message));
    };

    worker.postMessage({
      type: 'parse',
      sourceId: source.id,
      text,
    });
  });
}

// Legacy alias — Onboarding still calls this directly
export { syncM3USource as syncSource };
