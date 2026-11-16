import React, { useEffect } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth/AuthContext';
import { LanguageSelector } from './components/LanguageSelector';
import { AuthPage } from './pages/AuthPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { QuizQuestionsPage } from './pages/QuizQuestionsPage';
import { JoinRoomPage } from './pages/JoinRoomPage';
import { GameRoomPage } from './pages/GameRoomPage';
import { Icon } from './components/Icon';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function App() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, profile, logout } = useAuth();

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? 'es';
    document.title = `RubyMind · ${t('app.subtitle')}`;
  }, [i18n.resolvedLanguage, t]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t('design.skip')}
      </a>
      <header className="top-nav">
        <div className="top-nav__brand">
          <Link
            to={isAuthenticated ? '/quizzes' : '/login'}
            className="brand-link"
          >
            <span className="brand-mark">
              <Icon name="paw" />
            </span>
            {t('app.title')}
          </Link>
          <span className="brand-subtitle">{t('app.subtitle')}</span>
        </div>

        <nav className="top-nav__links" aria-label={t('design.navigation')}>
          {isAuthenticated ? (
            <>
              <NavLink to="/quizzes" className="nav-link">
                {t('app.nav.quizzes')}
              </NavLink>
              <NavLink to="/join" className="nav-link">
                {t('app.nav.join')}
              </NavLink>
              {profile && (
                <span className="user-badge" data-testid="nav-user-name">
                  {t('auth.welcome', { name: profile.displayName })}
                </span>
              )}
              <button
                type="button"
                data-testid="btn-logout"
                className="btn btn--ghost btn--sm"
                onClick={logout}
              >
                {t('app.nav.logout')}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-link">
                {t('app.nav.login')}
              </NavLink>
              <NavLink to="/register" className="nav-link">
                {t('app.nav.register')}
              </NavLink>
            </>
          )}
          <LanguageSelector />
        </nav>
      </header>

      <main id="main-content" className="main-content" tabIndex={-1}>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to={isAuthenticated ? '/quizzes' : '/login'} replace />
            }
          />
          <Route
            path="/login"
            element={<AuthPage key="login" mode="login" />}
          />
          <Route
            path="/register"
            element={<AuthPage key="register" mode="register" />}
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <QuizzesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes/:quizId/questions"
            element={
              <ProtectedRoute>
                <QuizQuestionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join"
            element={
              <ProtectedRoute>
                <JoinRoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/:code"
            element={
              <ProtectedRoute>
                <GameRoomPage roleHint="host" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/play/:code"
            element={
              <ProtectedRoute>
                <GameRoomPage roleHint="participant" />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <span>RubyMind</span>
        <span>{t('design.footer')}</span>
      </footer>
    </div>
  );
}
