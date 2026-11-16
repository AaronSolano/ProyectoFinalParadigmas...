import React from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth/AuthContext';
import { LanguageSelector } from './components/LanguageSelector';
import { AuthPage } from './pages/AuthPage';
import { LibraryPage } from './pages/LibraryPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { QuizQuestionsPage } from './pages/QuizQuestionsPage';
import { JoinRoomPage } from './pages/JoinRoomPage';
import { GameRoomPage } from './pages/GameRoomPage';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function App() {
  const { t } = useTranslation();
  const { isAuthenticated, profile, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav__brand">
          <Link to={isAuthenticated ? '/quizzes' : '/login'} className="brand-link">
            {t('app.title')}
          </Link>
          <span className="brand-subtitle">{t('app.subtitle')}</span>
        </div>

        <nav className="top-nav__links" aria-label="Navegación principal">
          {isAuthenticated ? (
            <>
              <Link to="/quizzes" className="nav-link">
                {t('app.nav.quizzes')}
              </Link>
              <Link to="/library" className="nav-link">
                {t('app.nav.library')}
              </Link>
              <Link to="/join" className="nav-link">
                {t('app.nav.join')}
              </Link>
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
              <Link to="/login" className="nav-link">
                {t('app.nav.login')}
              </Link>
              <Link to="/register" className="nav-link">
                {t('app.nav.register')}
              </Link>
            </>
          )}
          <LanguageSelector />
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? '/quizzes' : '/login'} replace />}
          />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
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
            path="/library"
            element={
              <ProtectedRoute>
                <LibraryPage />
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
    </div>
  );
}
