import { Capacitor } from '@capacitor/core';
import { CapacitorVideoPlayer } from 'capacitor-video-player';
import type { PlayerStrategy } from './PlayerStrategy';
import type { AttachOpts, PlayerError } from '@/types/player';

const ATTACH_TIMEOUT_MS = 10000;

/**
 * Estrategia de reserva nativa (ExoPlayer no Android) — toca formatos que o
 * WebView do navegador nao aguenta: MKV, AC3, HEVC, DTS, etc.
 *
 * No Android abre em tela cheia via plugin; no browser ignora.
 */
export class ExoPlayerStrategy implements PlayerStrategy {
  readonly name = 'native' as const; // mesmo nome pra compatibilidade com tipos

  private active = false;

  canHandle(url: string, _videoOrContentType?: HTMLVideoElement | string): boolean {
    // So funciona no Android nativo
    if (!Capacitor.isNativePlatform()) return false;

    // Toca tudo o que o browser falha: MKV, AVI, HEVC, etc.
    const lurl = url.toLowerCase();
    const nativeFormats = ['.mkv', '.avi', '.mpg', '.mpeg', '.ts', '.m2ts', '.flv', '.wmv', '.mov'];
    return nativeFormats.some(ext => lurl.includes(ext));
  }

  async attach(_video: HTMLVideoElement, url: string, opts?: AttachOpts): Promise<void> {
    this.active = true;

    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener('jeepCapVideoPlayerExit', onExit);
        window.removeEventListener('jeepCapVideoPlayerEnded', onEnd);
        window.removeEventListener('jeepCapVideoPlayerError', onError);
      };

      const onExit = () => {
        if (settled) return;
        cleanup();
        resolve(); // fechou o player = "resolve" pra cadeia de fallback continuar
      };
      const onEnd = () => {
        if (settled) return;
        cleanup();
        resolve();
      };
      const onError = (e: any) => {
        if (settled) return;
        cleanup();
        reject(new Error(`ExoPlayer error: ${e?.message || 'unknown'}`));
      };

      window.addEventListener('jeepCapVideoPlayerExit', onExit);
      window.addEventListener('jeepCapVideoPlayerEnded', onEnd);
      window.addEventListener('jeepCapVideoPlayerError', onError);

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`ExoPlayer timeout (${ATTACH_TIMEOUT_MS/1000}s)`));
      }, ATTACH_TIMEOUT_MS);

      CapacitorVideoPlayer.initPlayer({
        mode: 'fullscreen',
        url,
        playerId: 'exo-fallback',
        headers: (opts?.headers as Record<string, string>) || {},
        exitOnEnd: true,
        showControls: true,
        chromecast: false,
      }).then(() => {
        if (!settled) resolve();
      }).catch((err) => {
        cleanup();
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  }

  detach(): void {
    if (!this.active) return;
    this.active = false;
    try {
      void CapacitorVideoPlayer.stopAllPlayers();
    } catch {}
  }

  onError(_cb: (err: PlayerError) => void): void {
    // ExoPlayer gerencia seus próprios erros via events
  }
}
