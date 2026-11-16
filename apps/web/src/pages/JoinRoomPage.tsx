import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { kahootApi } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import { RubyMascot } from '../components/RubyMascot';
import { Icon } from '../components/Icon';

export const ROOM_CODE_REGEX = /^[2-9A-HJ-NP-Z]{6}$/;

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(code);
}

export function JoinRoomPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) {
      setError(t('join.invalidCodeFormat'));
      return;
    }

    setJoining(true);
    try {
      const trimmedName = displayName.trim();
      await kahootApi.joinSession(
        normalized,
        trimmedName ? { displayName: trimmedName } : undefined,
      );
      navigate(`/play/${normalized}`);
    } catch (err) {
      setError(err);
    } finally {
      setJoining(false);
    }
  };

  return (
    <section className="card join-card" aria-labelledby="join-heading">
      <RubyMascot className="ruby-mascot--join" />
      {isValidRoomCode(normalizeRoomCode(code)) && displayName.trim() && (
        <p className="ruby-join-greeting" role="status">
          {t('ruby.helloName', { name: displayName.trim() })}
        </p>
      )}
      <h1 id="join-heading" className="card__title">
        {t('join.title')}
      </h1>
      <p className="section-description">{t('design.joinDescription')}</p>

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      <form
        onSubmit={handleSubmit}
        className="form-stack"
        noValidate
        aria-busy={joining}
      >
        <div className="form-field">
          <label htmlFor="room-code-input">{t('join.codeLabel')}</label>
          <input
            id="room-code-input"
            data-testid="input-room-code"
            type="text"
            className="code-input"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby="room-code-hint"
            maxLength={6}
            placeholder={t('join.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
          />
          <small id="room-code-hint" className="form-hint">
            {t('design.codeHint')}
          </small>
        </div>

        <div className="form-field">
          <label htmlFor="join-display-name">
            {t('join.displayNameLabel')}
          </label>
          <input
            id="join-display-name"
            data-testid="input-join-display-name"
            type="text"
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <button
          type="submit"
          data-testid="btn-join-room"
          className="btn btn--primary btn--block"
          disabled={joining}
        >
          {joining ? t('join.joining') : t('join.joinBtn')}
          {!joining && <Icon name="arrow" />}
        </button>
      </form>
    </section>
  );
}
