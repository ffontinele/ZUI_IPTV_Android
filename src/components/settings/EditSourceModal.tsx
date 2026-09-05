import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableButton } from '@/components/common/FocusableButton';
import { FocusableInput } from '@/components/common/FocusableInput';
import { useSourceStore } from '@/state/sourceStore';
import type { Source } from '@/types/source';

type Props = {
  source: Source;
  onSuccess: () => void;
  onCancel: () => void;
};

export function EditSourceModal({ source, onSuccess, onCancel }: Props) {
  const { t } = useTranslation();
  const updateSource = useSourceStore((s) => s.updateSource);
  const syncSource = useSourceStore((s) => s.syncSource);

  const [name, setName] = useState(source.name);
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [m3uUrl, setM3uUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (source.type === 'xtream') {
      const cfg = source.config as { host: string; port: number; username: string; password: string };
      // Se o host nao tem porta embutida, adiciona a porta original
      const hasPort = /:\d+\s*$/.test(cfg.host) || cfg.host.includes(':') && cfg.host.match(/:\d+/g)?.length;
      const hostWithPort = hasPort || !cfg.port || cfg.port === 80 || cfg.port === 443
        ? cfg.host
        : `${cfg.host.replace(/\/$/, '')}:${cfg.port}`;
      setHost(hostWithPort);
      setUsername(cfg.username);
      setPassword(cfg.password);
    } else {
      const cfg = source.config as { url: string };
      setM3uUrl(cfg.url);
    }
  }, [source]);

  const isValid =
    source.type === 'xtream'
      ? host.trim() && username.trim() && password.trim()
      : /^https?:\/\/.+/.test(m3uUrl.trim());

  const handleSubmit = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);

    try {
      const patch: Partial<Source> = { name: name.trim() || source.name };
      if (source.type === 'xtream') {
        // Extrair porta do host se existir, senao usar 80 como padrao
        let cleanHost = host.trim();
        let port = 80;
        const portMatch = cleanHost.match(/:(\d+)\s*$/);
        if (portMatch) {
          port = parseInt(portMatch[1], 10);
          cleanHost = cleanHost.replace(/:\d+\s*$/, '');
        } else if (cleanHost.startsWith('https://')) {
          port = 443;
        }
        patch.config = {
          host: cleanHost,
          port,
          username: username.trim(),
          password: password.trim(),
        };
      } else {
        patch.config = { url: m3uUrl.trim() };
      }

      await updateSource(source.id, patch);
      const result = await syncSource(source.id);
      if (result.ok) {
        onSuccess();
      } else {
        setError(result.error);
        setSaving(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setSaving(false);
    }
  };

  const { ref, focusKey } = useFocusable({
    focusKey: 'EDIT_SOURCE_MODAL',
    isFocusBoundary: true,
    trackChildren: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="bg-bg-surface rounded-xl p-8 w-[640px] max-w-[90vw] max-h-[90vh] overflow-y-auto"
        >
          <div className="flex flex-col gap-4">
            <h2 className="text-h2 text-text-primary">{t('playlists.edit_title')}</h2>

            <div className="flex flex-col gap-2">
              <label className="text-small text-text-secondary">{t('add_source.name_label')}</label>
              <FocusableInput
                focusKey="edit-name"
                value={name}
                onChange={setName}
                placeholder={source.type === 'xtream' ? t('add_source.xtream_default_name') : t('add_source.m3u_default_name')}
                type="text"
              />
            </div>

            {source.type === 'xtream' ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-small text-text-secondary">{t('add_source.xtream_title')} (com porta, se necessário)</label>
                  <FocusableInput
                    focusKey="edit-host"
                    value={host}
                    onChange={setHost}
                    placeholder="http://servidor.com:8080"
                  />
                  <p className="text-[11px] text-text-tertiary mt-1">
                    💡 Se o servidor tiver porta, inclua assim: <span className="font-mono">http://host:porta</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-small text-text-secondary">{t('add_source.username_label')}</label>
                  <FocusableInput
                    focusKey="edit-username"
                    value={username}
                    onChange={setUsername}
                    placeholder="username"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-small text-text-secondary">{t('add_source.password_label')}</label>
                  <div className="relative">
                    <FocusableInput
                      focusKey="edit-password"
                      value={password}
                      onChange={setPassword}
                      placeholder="password"
                      type={showPassword ? 'text' : 'password'}
                      className="pr-14"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-white/10 transition-colors"
                      title={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                    >
                      {showPassword ? (
                        // Olho fechado (senha visível)
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        // Olho aberto (senha oculta)
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-small text-text-secondary">M3U URL</label>
                <FocusableInput
                  focusKey="edit-url"
                  value={m3uUrl}
                  onChange={setM3uUrl}
                  placeholder="https://example.com/playlist.m3u"
                />
              </div>
            )}

            {error && <p className="text-small text-live">{error}</p>}

            <div className="flex gap-4 mt-4">
              <FocusableButton
                focusKey="edit-cancel"
                variant="ghost"
                size="sm"
                onEnterPress={onCancel}
                disabled={saving}
              >
                {t('common.cancel')}
              </FocusableButton>
              <FocusableButton
                focusKey="edit-save"
                variant="primary"
                size="md"
                onEnterPress={handleSubmit}
                disabled={!isValid || saving}
              >
                {saving ? t('playlists.saving') : t('common.save')}
              </FocusableButton>
            </div>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
