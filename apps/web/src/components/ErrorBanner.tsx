import { useTranslation } from 'react-i18next';
import { ApiProblemError } from '../api/client';

interface ErrorBannerProps {
  error: unknown;
  onDismiss?: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }

  let message: string;
  let details: Array<{ field?: string; message?: string }> | undefined;

  if (error instanceof ApiProblemError) {
    const key = `errors.${error.code}`;
    const translated = t(key);
    message = translated !== key ? translated : error.message;
    details = error.details;
  } else if (typeof error === 'string') {
    const key = `errors.${error}`;
    const translated = t(key);
    message = translated !== key ? translated : error;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = t('errors.INTERNAL_ERROR');
  }

  return (
    <div className="error-banner" role="alert" data-testid="error-banner">
      <div className="error-banner__content">
        <p className="error-banner__message">{message}</p>
        {details && details.length > 0 && (
          <ul className="error-banner__details">
            {details.map((d, idx) => (
              <li key={idx}>
                {d.field ? `${d.field}: ` : ''}
                {d.message}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
        >
          ×
        </button>
      )}
    </div>
  );
}
