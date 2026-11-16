import { QuizFilters, matchesQuiz } from '../components/QuizFilters';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { kahootApi, type Quiz } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  AutoAdvanceField,
  DEFAULT_AUTO_ADVANCE_SECONDS,
} from '../components/AutoAdvanceField';
import { RubyMascot } from '../components/RubyMascot';
import { Icon } from '../components/Icon';

export function QuizzesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [hostingQuiz, setHostingQuiz] = useState<Quiz | null>(null);
  const [questionTimeSeconds, setQuestionTimeSeconds] = useState<number>(20);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState<number>(
    DEFAULT_AUTO_ADVANCE_SECONDS,
  );
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
    mutationFn: ({
      quizId,
      timeSeconds,
      advanceSeconds,
    }: {
      quizId: string;
      timeSeconds: number;
      advanceSeconds: number;
    }) =>
      kahootApi.createSession({
        quizId,
        questionTimeSeconds: timeSeconds,
        autoAdvanceSeconds: advanceSeconds,
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
    const clamped = Math.min(
      120,
      Math.max(5, Number(questionTimeSeconds) || 20),
    );
    createSessionMutation.mutate({
      quizId: hostingQuiz.id,
      timeSeconds: clamped,
      advanceSeconds: autoAdvanceSeconds,
    });
  };

  const filteredQuizzes =
    quizzesQuery.data?.filter((quiz) => matchesQuiz(quiz, search)) ?? [];

  return (
    <div className="page-stack library-page">
      <div className="page-header library-header">
        <div>
          <h1>{t('quizzes.title')}</h1>
          <p className="section-description">
            {t('design.libraryDescription')}
          </p>
          <Link to="/join" className="btn btn--secondary">
            <Icon name="play" />
            {t('app.nav.join')}
          </Link>
        </div>
        <RubyMascot className="ruby-mascot--library" />
      </div>

      <ErrorBanner
        error={error ?? quizzesQuery.error}
        onDismiss={() => setError(null)}
      />

      <div className="workspace-grid">
        <div className="quiz-editor">
          <section className="card" aria-labelledby="quiz-form-heading">
            <h2 id="quiz-form-heading" className="card__subtitle">
              {editingQuiz ? t('quizzes.editTitle') : t('quizzes.createTitle')}
            </h2>
            <form onSubmit={handleSubmitQuiz} className="form-stack">
              <div className="form-field">
                <label htmlFor="quiz-title-input">
                  {t('quizzes.quizTitleLabel')}
                </label>
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
                <label htmlFor="quiz-desc-input">
                  {t('quizzes.quizDescLabel')}
                </label>
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
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {editingQuiz ? t('quizzes.saveBtn') : t('quizzes.createBtn')}
                </button>
                {editingQuiz && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={cancelEditing}
                  >
                    {t('quizzes.cancelBtn')}
                  </button>
                )}
              </div>
            </form>
          </section>

          {hostingQuiz && (
            <section
              className="card card--highlight"
              aria-labelledby="host-modal-heading"
            >
              <h2 id="host-modal-heading" className="card__subtitle">
                {t('quizzes.hostRoomBtn')}: {hostingQuiz.title}
              </h2>
              <form onSubmit={handleCreateRoom} className="form-stack">
                <div className="form-field">
                  <label htmlFor="question-time-input">
                    {t('quizzes.questionTimeLabel')}
                  </label>
                  <input
                    id="question-time-input"
                    data-testid="input-question-time"
                    type="number"
                    min={5}
                    max={120}
                    required
                    value={questionTimeSeconds}
                    onChange={(e) =>
                      setQuestionTimeSeconds(Number(e.target.value))
                    }
                  />
                </div>
                <AutoAdvanceField
                  id="auto-advance-input"
                  value={autoAdvanceSeconds}
                  onChange={setAutoAdvanceSeconds}
                />
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
        </div>

        <section className="quiz-list" aria-label={t('quizzes.title')}>
          <h2 className="card__subtitle library-list-title">
            {t('design.yourLibrary')}
            <span className="badge">{quizzesQuery.data?.length ?? 0}</span>
          </h2>
          <QuizFilters
            search={search}
            onSearch={setSearch}
            count={filteredQuizzes.length}
          />
          {quizzesQuery.isPending && (
            <p className="loading-state" role="status">
              {t('design.loadingQuizzes')}
            </p>
          )}
          {quizzesQuery.isError && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void quizzesQuery.refetch()}
            >
              {t('design.retry')}
            </button>
          )}
          {quizzesQuery.data && quizzesQuery.data.length === 0 && (
            <div className="empty-state library-empty">
              <Icon name="book" />
              <p>{t('quizzes.empty')}</p>
              <p className="form-hint">{t('design.emptyHint')}</p>
            </div>
          )}

          {filteredQuizzes.map((quiz) => (
            <article
              key={quiz.id}
              className="card quiz-item"
              data-testid={`quiz-card-${quiz.id}`}
            >
              <div className="quiz-item__info">
                <h3 className="quiz-item__title">{quiz.title}</h3>
                {quiz.description && (
                  <p className="quiz-item__desc">{quiz.description}</p>
                )}
              </div>

              <div className="button-row">
                <Link
                  to={`/quizzes/${quiz.id}/questions`}
                  data-testid={`link-questions-${quiz.id}`}
                  className="btn btn--secondary"
                >
                  {t('quizzes.manageQuestionsBtn', {
                    count: quiz.questionCount,
                  })}
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
    </div>
  );
}
