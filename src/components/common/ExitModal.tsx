import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableButton } from './FocusableButton';

type Props = {
  title: string;
  message: string;
  onExit: () => void;
  onReload: () => void;
  onCancel: () => void;
};

export function ExitModal({
  title,
  message,
  onExit,
  onReload,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const { ref, focusKey, setFocus } = useFocusable({
    focusKey: 'EXIT_MODAL',
    isFocusBoundary: true,
    focusable: false,
    saveLastFocusedChild: false,
  });

  useEffect(() => {
    setFocus('exit-cancel');
  }, []);

  return (
    <FocusContext.Provider value={focusKey}>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="bg-bg-elevated rounded-lg p-12 max-w-md w-full"
        >
          <h2 className="text-h2 text-text-primary">{title}</h2>
          <p className="text-body text-text-secondary mt-4">{message}</p>
          <div className="flex flex-col gap-3 mt-8">
            <FocusableButton
              focusKey="exit-reload"
              variant="secondary"
              size="md"
              onEnterPress={onReload}
            >
              🔄 {t('app.reload_lists')}
            </FocusableButton>
            <div className="flex gap-4 justify-end mt-2">
              <FocusableButton
                focusKey="exit-cancel"
                variant="secondary"
                size="md"
                onEnterPress={onCancel}
              >
                {t('app.exit_cancel')}
              </FocusableButton>
              <FocusableButton
                focusKey="exit-confirm"
                variant="primary"
                size="md"
                onEnterPress={onExit}
              >
                {t('app.exit_confirm')}
              </FocusableButton>
            </div>
          </div>
        </div>
      </div>
    </FocusContext.Provider>
  );
}
