import type { XtreamCredentials } from '@/types/xtream';
import { useSourceStore } from '@/state/sourceStore';

/**
 * Pega as credenciais Xtream do primeiro source ativo.
 * Usada pelos modais (filmes/series) para construir URLs de download/copia.
 */
export function getXtreamCreds(): XtreamCredentials | null {
  const sources = useSourceStore.getState().sources;
  const src = sources.find((s: any) => s.enabled && s.type === 'xtream');
  return src ? (src.config as XtreamCredentials) : null;
}
