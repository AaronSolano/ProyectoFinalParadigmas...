import React from 'react';
import { useTranslation } from 'react-i18next';
import { setAppLanguage, type SupportedLanguage } from '../i18n';

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const currentLang: SupportedLanguage = i18n.language?.startsWith('en') ? 'en' : 'es';

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value === 'en' ? 'en' : 'es';
    setAppLanguage(next);
  };

  return (
    <label className="lang-selector">
      <span className="sr-only">{t('app.language.label')}</span>
      <select
        aria-label={t('app.language.label')}
        data-testid="language-selector"
        value={currentLang}
        onChange={handleChange}
      >
        <option value="es">{t('app.language.es')}</option>
        <option value="en">{t('app.language.en')}</option>
      </select>
    </label>
  );
}
