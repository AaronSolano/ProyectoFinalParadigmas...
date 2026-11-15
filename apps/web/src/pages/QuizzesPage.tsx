import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { kahootApi, type Quiz } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';

export function QuizzesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [hostingQuiz, setHostingQuiz] = useState<Quiz | null>(null);
  const [questionTimeSeconds, setQuestionTimeSeconds] = useState<number>(20);
  const [error, setError] = useState<unknown>(null);

  const quizzesQuery = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => kahootApi.listQuizzes(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      kahootApi.createQuiz({
        title: title.trim(),
        description: description.trim(),
      }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
    onError: (err) => setError(err),
  });

  const updateMutation = useMutation({
    mutationFn: (quizId: string) =>
      kahootApi.updateQuiz(quizId, {
        title: title.trim(),
        description: description.trim(),
      }),
    onSuccess: () => {
      setEditingQuiz(null);
      setTitle('');
      setDescription('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
    onError: (err) => setError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: (quizId: string) => kahootApi.deleteQuiz(quizId),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
    onError: (err) => setError(err),
  });

  const createSessionMutation = useMutation({
    mutationFn: ({ quizId, timeSeconds }: { quizId: string; timeSeconds: number }) =>
      kahootApi.createSession({
        quizId,
        questionTimeSeconds: timeSeconds,
      }),
    onSuccess: (session) => {
      setHostingQuiz(null);
      setError(null);
      navigate(`/host/${session.code}`);
    },
    onError: (err) => setError(err),
  });

  const handleSubmitQuiz = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    if (editingQuiz) {
      updateMutation.mutate(editingQuiz.id);
    } else {
      createMutation.mutate();
    }
  };

  const startEditing = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title);
    setDescription(quiz.description ?? '');
  };

  const cancelEditing = () => {
    setEditingQuiz(null);
    setTitle('');
    setDescription('');
  };

  const handleCreateRoom = (event: React.FormEvent) => {
    event.preventDefault();
    if (!hostingQuiz) {
      return;
    }
    const clamped = Math.min(120, Math.max(5, Number(questionTimeSeconds) || 20));
    createSessionMutation.mutate({
      quizId: hostingQuiz.id,
      timeSeconds: clamped,
    });
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1>{t('quizzes.title')}</h1>
      </div>

      <ErrorBanner error={error ?? quizzesQuery.error} onDismiss={() => setError(null)} />

      <section className="card" aria-labelledby="quiz-form-heading">
        <h2 id="quiz-form-heading" className="card__subtitle">
          {editingQuiz ? t('quizzes.editTitle') : t('quizzes.createTitle')}
        </h2>
        <form onSubmit={handleSubmitQuiz} className="form-stack">
          <div className="form-field">
            <label htmlFor="quiz-title-input">{t('quizzes.quizTitleLabel')}</label>
            <input
              id="quiz-title-input"
              data-testid="input-quiz-title"
              type="text"
              required
              minLength={1}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="quiz-desc-input">{t('quizzes.quizDescLabel')}</label>
            <textarea
              id="quiz-desc-input"
              data-testid="input-quiz-description"
              maxLength={500}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="button-row">
            <button
              type="submit"
              data-testid="btn-save-quiz"
              className="btn btn--primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingQuiz ? t('quizzes.saveBtn') : t('quizzes.createBtn')}
            </button>
            {editingQuiz && (
              <button type="button" className="btn btn--ghost" onClick={cancelEditing}>
                {t('quizzes.cancelBtn')}
              </button>
            )}
          </div>
        </form>
      </section>

      {hostingQuiz && (
        <section className="card card--highlight" aria-labelledby="host-modal-heading">
          <h2 id="host-modal-heading" className="card__subtitle">
            {t('quizzes.hostRoomBtn')}: {hostingQuiz.title}
          </h2>
          <form onSubmit={handleCreateRoom} className="form-stack">
            <div className="form-field">
              <label htmlFor="question-time-input">{t('quizzes.questionTimeLabel')}</label>
              <input
                id="question-time-input"
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
                disabled={createSessionMutation.isPending}
              >
                {t('quizzes.startHostBtn')}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setHostingQuiz(null)}
              >
                {t('quizzes.cancelBtn')}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="quiz-list" aria-label={t('quizzes.title')}>
        {quizzesQuery.data && quizzesQuery.data.length === 0 && (
          <p className="empty-state">{t('quizzes.empty')}</p>
        )}

        {quizzesQuery.data?.map((quiz) => (
          <article key={quiz.id} className="card quiz-item" data-testid={`quiz-card-${quiz.id}`}>
            <div className="quiz-item__info">
              <h3 className="quiz-item__title">{quiz.title}</h3>
              {quiz.description && <p className="quiz-item__desc">{quiz.description}</p>}
            </div>

            <div className="button-row">
              <Link
                to={`/quizzes/${quiz.id}/questions`}
                data-testid={`link-questions-${quiz.id}`}
                className="btn btn--secondary"
              >
                {t('quizzes.manageQuestionsBtn', { count: quiz.questionCount })}
              </Link>
              <button
                type="button"
                data-testid={`btn-host-quiz-${quiz.id}`}
                className="btn btn--primary"
                onClick={() => setHostingQuiz(quiz)}
              >
                {t('quizzes.hostRoomBtn')}
              </button>
              <button
                type="button"
                data-testid={`btn-edit-quiz-${quiz.id}`}
                className="btn btn--ghost"
                onClick={() => startEditing(quiz)}
              >
                {t('quizzes.editTitle')}
              </button>
              <button
                type="button"
                data-testid={`btn-delete-quiz-${quiz.id}`}
                className="btn btn--danger"
                onClick={() => deleteMutation.mutate(quiz.id)}
              >
                {t('quizzes.deleteBtn')}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
