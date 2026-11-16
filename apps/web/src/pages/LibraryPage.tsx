import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { kahootApi, type Question, type Quiz } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';

function LibraryQuestions({ quizId }: { quizId: string }) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['library-questions', quizId],
    queryFn: () => kahootApi.listLibraryQuestions(quizId),
  });
  if (query.isLoading) return <p className="empty-state">{t('library.loading')}</p>;
  return (
    <ol className="library-questions" data-testid={`library-questions-${quizId}`}>
      {query.data?.map((q: Question) => (
        <li key={q.id}>
          <p className="question-item__statement">{q.statement}</p>
          <ul className="library-options">
            {q.options.map((option, index) => (
              <li key={index} className={index === q.correctOption ? 'library-option--correct' : ''}>
                {option}
                {index === q.correctOption ? ' ✓' : ''}
              </li>
            ))}
          </ul>
          {q.explanation && (
            <p className="question-item__explanation">{t('questions.explanationShown')}: {q.explanation}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

export function LibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hostingQuiz, setHostingQuiz] = useState<Quiz | null>(null);
  const [questionTimeSeconds, setQuestionTimeSeconds] = useState<number>(20);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const libraryQuery = useQuery({
    queryKey: ['library'],
    queryFn: () => kahootApi.listLibrary(),
  });

  const copyMutation = useMutation({
    mutationFn: (quizId: string) => kahootApi.copyLibraryQuiz(quizId),
    onSuccess: (copy) => {
      setCopiedId(copy.title);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
    onError: (err) => setError(err),
  });

  const hostMutation = useMutation({
    mutationFn: ({ quizId, timeSeconds }: { quizId: string; timeSeconds: number }) =>
      kahootApi.createSession({ quizId, questionTimeSeconds: timeSeconds }),
    onSuccess: (session) => {
      setHostingQuiz(null);
      setError(null);
      navigate(`/host/${session.code}`);
    },
    onError: (err) => setError(err),
  });

  const handleCreateRoom = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hostingQuiz) return;
    const clamped = Math.min(120, Math.max(5, Number(questionTimeSeconds) || 20));
    hostMutation.mutate({ quizId: hostingQuiz.id, timeSeconds: clamped });
  };

  const categories = Array.from(
    new Set((libraryQuery.data ?? []).map((quiz) => quiz.category ?? '')),
  );

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>{t('library.title')}</h1>
      </div>
      <p className="quiz-item__desc">{t('library.subtitle')}</p>

      <ErrorBanner error={error ?? libraryQuery.error} onDismiss={() => setError(null)} />

      {copiedId && (
        <p className="tf-feedback tf-feedback--ok" role="status" data-testid="library-copied">
          {t('library.copied', { title: copiedId })}
        </p>
      )}

      {hostingQuiz && (
        <section className="card card--highlight" aria-labelledby="library-host-heading">
          <h2 id="library-host-heading" className="card__subtitle">
            {t('quizzes.hostRoomBtn')}: {hostingQuiz.title}
          </h2>
          <form onSubmit={handleCreateRoom} className="form-stack">
            <div className="form-field">
              <label htmlFor="library-question-time">{t('quizzes.questionTimeLabel')}</label>
              <input
                id="library-question-time"
                data-testid="input-question-time"
                type="number"
                min={5}
                max={120}
                required
                value={questionTimeSeconds}
                onChange={(e) => setQuestionTimeSeconds(Number(e.target.value))}
              />
            </div>
            <div className="button-row">
              <button
                type="submit"
                data-testid="btn-confirm-create-room"
                className="btn btn--primary"
                disabled={hostMutation.isPending}
              >
                {t('quizzes.startHostBtn')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setHostingQuiz(null)}>
                {t('quizzes.cancelBtn')}
              </button>
            </div>
          </form>
        </section>
      )}

      {categories.map((category) => (
        <section key={category} className="quiz-list" aria-label={category}>
          <h2 className="card__subtitle">{category}</h2>
          {libraryQuery.data
            ?.filter((quiz) => (quiz.category ?? '') === category)
            .map((quiz) => (
              <article key={quiz.id} className="card quiz-item" data-testid={`library-card-${quiz.id}`}>
                <div className="quiz-item__info">
                  <h3 className="quiz-item__title">{quiz.title}</h3>
                  {quiz.description && <p className="quiz-item__desc">{quiz.description}</p>}
                  <p className="quiz-item__desc">{t('library.questionCount', { count: quiz.questionCount })}</p>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    data-testid={`btn-host-library-${quiz.id}`}
                    className="btn btn--primary"
                    onClick={() => setHostingQuiz(quiz)}
                  >
                    {t('quizzes.hostRoomBtn')}
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setExpanded(expanded === quiz.id ? null : quiz.id)}
                  >
                    {expanded === quiz.id ? t('library.hideBtn') : t('library.previewBtn')}
                  </button>
                  <button
                    type="button"
                    data-testid={`btn-copy-library-${quiz.id}`}
                    className="btn btn--ghost"
                    disabled={copyMutation.isPending}
                    onClick={() => copyMutation.mutate(quiz.id)}
                  >
                    {t('library.copyBtn')}
                  </button>
                </div>
                {expanded === quiz.id && <LibraryQuestions quizId={quiz.id} />}
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}
