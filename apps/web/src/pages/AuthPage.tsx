import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ErrorBanner';
import { RubyMascot } from '../components/RubyMascot';
import { Icon } from '../components/Icon';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: AuthPageProps) {
  const { t } = useTranslation();
  const { login, register, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    clearSessionExpired();
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        });
      } else {
        await login({
          email: email.trim(),
          password,
        });
      }
      navigate('/quizzes');
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const displayedError = error ?? (sessionExpired ? 'SESSION_EXPIRED' : null);

  return (
    <div className="auth-layout">
      <aside className="auth-welcome" aria-labelledby="welcome-heading">
        <h2 id="welcome-heading">
          {t('design.welcomeTitle')}
          <span>{t('design.welcomeAccent')}</span>
        </h2>
        <p className="auth-welcome__description">
          {t('design.welcomeDescription')}
        </p>
        <div className="ruby-stage">
          <p className="ruby-speech">{t('design.rubyHello')}</p>
          <RubyMascot className="ruby-mascot--hero" />
        </div>
        <p className="auth-welcome__note">
          <Icon name="book" />
          {t('design.welcomeNote')}
        </p>
      </aside>
      <section className="card auth-card" aria-labelledby="auth-heading">
        <h1 id="auth-heading" className="card__title">
          {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
        </h1>
        <p className="section-description">
          {t(
            mode === 'login'
              ? 'design.loginDescription'
              : 'design.registerDescription',
          )}
        </p>

        <ErrorBanner
          error={displayedError}
          onDismiss={() => {
            setError(null);
            clearSessionExpired();
          }}
        />

        <form
          onSubmit={handleSubmit}
          className="form-stack"
          aria-busy={submitting}
        >
          {mode === 'register' && (
            <div className="form-field">
              <label htmlFor="auth-display-name">{t('auth.displayName')}</label>
              <input
                id="auth-display-name"
                data-testid="input-display-name"
                type="text"
                autoComplete="nickname"
                required
                minLength={2}
                maxLength={40}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="auth-email">{t('auth.email')}</label>
            <input
              id="auth-email"
              data-testid="input-email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="auth-password">{t('auth.password')}</label>
            <div className="password-field">
              <input
                id="auth-password"
                data-testid="input-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={
                  mode === 'register' ? 'new-password' : 'current-password'
                }
                required
                minLength={mode === 'register' ? 8 : 1}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={t(
                  showPassword ? 'design.hidePassword' : 'design.showPassword',
                )}
                aria-pressed={showPassword}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} />
              </button>
            </div>
            {mode === 'register' && (
              <small className="form-hint">{t('auth.passwordHint')}</small>
            )}
          </div>

          <button
            type="submit"
            data-testid="btn-auth-submit"
            className="btn btn--primary btn--block"
            disabled={submitting}
          >
            {submitting
              ? t('auth.submitting')
              : mode === 'login'
                ? t('auth.submitLogin')
                : t('auth.submitRegister')}
            {!submitting && <Icon name="arrow" />}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              {t('auth.noAccount')}{' '}
              <Link to="/register">{t('auth.goToRegister')}</Link>
            </>
          ) : (
            <>
              {t('auth.hasAccount')}{' '}
              <Link to="/login">{t('auth.goToLogin')}</Link>
            </>
          )}
        </p>
      </section>
    </div>
  );
}
