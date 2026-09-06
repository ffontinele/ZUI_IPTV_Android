import { parse } from 'iptv-playlist-parser';
import type { WorkerRequest, WorkerResponse } from '@/types/parser';
import type { Channel } from '@/types/channel';

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  if (e.data.type !== 'parse') return;
  const { sourceId, text: rawText } = e.data as any;

  try {
    const playlist = parse(rawText);
    const totalItems = playlist.items.length;

    const BATCH_SIZE = 500;
    const channels: Channel[] = [];
    const categoriesSet = new Set<string>();

    for (let i = 0; i < totalItems; i++) {
      const item = playlist.items[i];
      const channel: Channel = {
        id: 'm3u:' + sourceId + ':' + i,
        sourceId,
        sourceType: 'm3u',
        name: item.name || item.tvg?.name || ('Kanal ' + (i + 1)),
        streamUrl: item.url,
        logoUrl: item.tvg?.logo || undefined,
        group: item.group?.title || undefined,
        tvgId: item.tvg?.id || undefined,
        originalIndex: i,
      };
      channels.push(channel);
      if (channel.group) categoriesSet.add(channel.group);

      if ((i + 1) % BATCH_SIZE === 0 || i === totalItems - 1) {
        const progress: WorkerResponse = {
          type: 'progress',
          sourceId,
          parsed: i + 1,
          total: totalItems,
        };
        self.postMessage(progress);
      }
    }

    const done: WorkerResponse = {
      type: 'done',
      sourceId,
      channelCount: channels.length,
      categories: Array.from(categoriesSet),
      channels,
    };
    self.postMessage(done);
  } catch (err) {
    const error: WorkerResponse = {
      type: 'error',
      sourceId,
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
};
