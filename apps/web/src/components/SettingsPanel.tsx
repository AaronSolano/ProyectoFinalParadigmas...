import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { useSoundMuted } from '../audio/useSoundMuted';
import { toggleSoundMuted } from '../audio/soundEngine';

export function SettingsPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const muted = useSoundMuted();
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
    if (!open) return;
    container.current?.querySelector('select')?.focus();
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
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <section
        id="settings-panel"
        className="settings__panel"
        hidden={!open}
        aria-label={t('features.settings')}
      >
        <h2 className="card__subtitle">{t('features.settings')}</h2>
        <div className="form-field">
          <span>{t('app.language.label')}</span>
          <LanguageSelector />
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          data-testid="settings-sound"
          aria-pressed={!muted}
          onClick={toggleSoundMuted}
        >
          {t('features.sound')}: {t(muted ? 'features.off' : 'features.on')}
        </button>
      </section>
    </div>
  );
}
