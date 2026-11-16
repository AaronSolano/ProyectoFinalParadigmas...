import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { useSoundMuted } from '../audio/useSoundMuted';
import { toggleSoundMuted } from '../audio/soundEngine';

/** Engranaje de 8 dientes con un círculo central. */
function GearIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.23 4.61L10.64 1.89L13.36 1.89L13.77 4.61L15.97 5.52L18.19 3.89L20.11 5.81L18.48 8.03L19.39 10.23L22.11 10.64L22.11 13.36L19.39 13.77L18.48 15.97L20.11 18.19L18.19 20.11L15.97 18.48L13.77 19.39L13.36 22.11L10.64 22.11L10.23 19.39L8.03 18.48L5.81 20.11L3.89 18.19L5.52 15.97L4.61 13.77L1.89 13.36L1.89 10.64L4.61 10.23L5.52 8.03L3.89 5.81L5.81 3.89L8.03 5.52Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function SettingsPanel() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const muted = useSoundMuted();
  const currentLanguage = i18n.language?.startsWith('en') ? 'en' : 'es';
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const bottom = trigger.current?.getBoundingClientRect().bottom ?? 0;
      container.current?.style.setProperty('--settings-top', `${Math.max(8, bottom + 8)}px`);
    };
    position();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [open]);
  useEffect(() => {
    if (!open) {
      setLanguageOpen(false);
      return;
    }
    // Al abrir se muestra el menú; el idioma queda plegado hasta que se elige.
    container.current
      ?.querySelector<HTMLElement>('[data-testid="settings-language-toggle"]')
      ?.focus();
    const close = () => {
      setOpen(false);
      trigger.current?.focus();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    const outside = (e: PointerEvent) => {
      if (e.target instanceof Node && !container.current?.contains(e.target))
        close();
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);
  return (
    <div className="settings" ref={container}>
      <button
        type="button"
        ref={trigger}
        className="btn btn--ghost settings__trigger"
        data-testid="btn-settings"
        aria-label={t('features.settings')}
        aria-expanded={open}
        aria-controls="settings-panel"
        onClick={() => setOpen(!open)}
      >
        <GearIcon />
      </button>
      <section
        id="settings-panel"
        className="settings__panel"
        hidden={!open}
        aria-label={t('features.settings')}
      >
        <h2 className="card__subtitle">{t('features.settings')}</h2>
        <div className="settings__menu">
          <button
            type="button"
            className="settings__row"
            data-testid="settings-language-toggle"
            aria-expanded={languageOpen}
            aria-controls="settings-language-options"
            onClick={() => setLanguageOpen(!languageOpen)}
          >
            <span>{t('app.language.label')}</span>
            <span className="settings__value">
              {t(currentLanguage === 'en' ? 'app.language.en' : 'app.language.es')}
              <span className="settings__chevron" aria-hidden="true">
                {languageOpen ? '▴' : '▾'}
              </span>
            </span>
          </button>
          <div
            id="settings-language-options"
            className="settings__options"
            hidden={!languageOpen}
          >
            <LanguageSelector />
          </div>
          <button
            type="button"
            className="settings__row"
            data-testid="settings-sound"
            aria-pressed={!muted}
            onClick={toggleSoundMuted}
          >
            <span>{t('features.sound')}</span>
            <span className="settings__value">
              {t(muted ? 'features.off' : 'features.on')}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
