import type { XtreamCredentials } from '@/types/xtream';
import { useSourceStore } from '@/state/sourceStore';

/**
 * Credenciais Xtream da primeira fonte ativa.
 * Usada pelos modais para construir URLs de download/copia no clique.
 */
export function getXtreamCreds(): XtreamCredentials | null {
  const sources = useSourceStore.getState().sources;
  const src = sources.find((s) => s.enabled && s.type === 'xtream');
  return src ? (src.config as XtreamCredentials) : null;
}
