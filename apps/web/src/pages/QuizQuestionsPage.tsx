import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { kahootApi, type Question } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MiB

export function validateQuestionImageFile(
  file: File,
): 'IMAGE_UNSUPPORTED' | 'IMAGE_TOO_LARGE' | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return 'IMAGE_UNSUPPORTED';
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'IMAGE_TOO_LARGE';
  }
  return null;
}

export function QuizQuestionsPage() {
  const { quizId = '' } = useParams<{ quizId: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [statement, setStatement] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctOption, setCorrectOption] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [error, setError] = useState<unknown>(null);

  const quizQuery = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => kahootApi.getQuiz(quizId),
    enabled: Boolean(quizId),
  });

  const questionsQuery = useQuery({
    queryKey: ['questions', quizId],
    queryFn: () => kahootApi.listQuestions(quizId),
    enabled: Boolean(quizId),
  });

  const createQuestionMutation = useMutation({
    mutationFn: () =>
      kahootApi.createQuestion(quizId, {
        statement: statement.trim(),
        options: options.map((o) => o.trim()),
        correctOption,
        explanation: explanation.trim() || null,
      }),
    onSuccess: () => {
      setExplanation('');
      setStatement('');
      setOptions(['', '']);
      setCorrectOption(0);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['questions', quizId] });
      void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
    onError: (err) => setError(err),
  });

  const updateQuestionMutation = useMutation({
    mutationFn: (questionId: string) =>
      kahootApi.updateQuestion(quizId, questionId, {
        statement: statement.trim(),
        options: options.map((o) => o.trim()),
        correctOption,
        explanation: explanation.trim() || null,
      }),
    onSuccess: () => {
      setEditingQuestion(null);
      setExplanation('');
      setStatement('');
      setOptions(['', '']);
      setCorrectOption(0);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['questions', quizId] });
    },
    onError: (err) => setError(err),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) =>
      kahootApi.deleteQuestion(quizId, questionId),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['questions', quizId] });
      void queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
    onError: (err) => setError(err),
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ questionId, file }: { questionId: string; file: File }) =>
      kahootApi.uploadQuestionImage(quizId, questionId, file),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['questions', quizId] });
    },
    onError: (err) => setError(err),
  });

  const removeImageMutation = useMutation({
    mutationFn: (questionId: string) =>
      kahootApi.deleteQuestionImage(quizId, questionId),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['questions', quizId] });
    },
    onError: (err) => setError(err),
  });

  const handleSubmitQuestion = (event: React.FormEvent) => {
    event.preventDefault();
    if (!statement.trim()) {
      return;
    }
    if (editingQuestion) {
      updateQuestionMutation.mutate(editingQuestion.id);
    } else {
      createQuestionMutation.mutate();
    }
  };

  const handleImageFileChange = (
    questionId: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    const validationError = validateQuestionImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    uploadImageMutation.mutate({ questionId, file });
  };

  const startEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setStatement(q.statement);
    setOptions(q.options);
    setCorrectOption(q.correctOption);
    setExplanation(q.explanation ?? '');
  };

  const cancelEditQuestion = () => {
    setEditingQuestion(null);
    setExplanation('');
    setStatement('');
    setOptions(['', '']);
    setCorrectOption(0);
  };

  const setOptionText = (index: number, value: string) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));

  const addOption = () =>
    setOptions((prev) => (prev.length < 4 ? [...prev, ''] : prev));

  const removeOption = (index: number) => {
    setOptions((prev) =>
      prev.length > 2 ? prev.filter((_, i) => i !== index) : prev,
    );
    setCorrectOption((prev) =>
      prev === index ? 0 : prev > index ? prev - 1 : prev,
    );
  };

  const usePresetTrueFalse = () => {
    setOptions([t('questions.trueOption'), t('questions.falseOption')]);
    setCorrectOption(0);
  };

  return (
    <div className="page-stack questions-page">
      <div className="page-header">
        <Link to="/quizzes" className="btn btn--ghost">
          ← {t('questions.backToQuizzes')}
        </Link>
        <h1>
          {t('questions.title')}
          {quizQuery.data ? ` — ${quizQuery.data.title}` : ''}
        </h1>
        <p className="section-description">
          {t('design.questionsDescription')}
        </p>
      </div>

      <ErrorBanner
        error={error ?? questionsQuery.error}
        onDismiss={() => setError(null)}
      />

      <div className="workspace-grid">
        <section
          className="card question-editor"
          aria-labelledby="question-form-heading"
        >
          <h2 id="question-form-heading" className="card__subtitle">
            {editingQuestion
              ? t('questions.editTitle')
              : t('questions.addTitle')}
          </h2>

          <form onSubmit={handleSubmitQuestion} className="form-stack">
            <div className="form-field">
              <label htmlFor="question-statement-input">
                {t('questions.statementLabel')}
              </label>
              <textarea
                id="question-statement-input"
                data-testid="input-question-statement"
                required
                minLength={1}
                maxLength={500}
                rows={3}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="question-explanation-input">
                {t('questions.explanationLabel')}
              </label>
              <textarea
                id="question-explanation-input"
                data-testid="input-question-explanation"
                maxLength={300}
                rows={2}
                value={explanation}
                placeholder={t('questions.explanationPlaceholder')}
                onChange={(e) => setExplanation(e.target.value)}
              />
              <p className="quiz-item__desc">{t('questions.explanationHint')}</p>
            </div>

            <fieldset className="form-field">
              <legend>{t('questions.optionsLabel')}</legend>
              <div className="options-editor">
                {options.map((option, index) => (
                  <div key={index} className="options-editor__row">
                    <label
                      className="radio-pill"
                      title={t('questions.markCorrect')}
                    >
                      <input
                        type="radio"
                        name="correctOption"
                        data-testid={`radio-correct-${index}`}
                        checked={correctOption === index}
                        onChange={() => setCorrectOption(index)}
                        aria-label={t('questions.markCorrect')}
                      />
                    </label>
                    <input
                      type="text"
                      data-testid={`input-option-${index}`}
                      required
                      maxLength={120}
                      value={option}
                      placeholder={t('questions.optionPlaceholder', {
                        n: index + 1,
                      })}
                      aria-label={t('questions.optionPlaceholder', {
                        n: index + 1,
                      })}
                      onChange={(e) => setOptionText(index, e.target.value)}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        data-testid={`btn-remove-option-${index}`}
                        className="btn btn--ghost btn--sm"
                        onClick={() => removeOption(index)}
                      >
                        {t('questions.removeOptionBtn')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="quiz-item__desc">{t('questions.optionsHint')}</p>
              <div className="button-row">
                {options.length < 4 && (
                  <button
                    type="button"
                    data-testid="btn-add-option"
                    className="btn btn--secondary btn--sm"
                    onClick={addOption}
                  >
                    {t('questions.addOptionBtn')}
                  </button>
                )}
                <button
                  type="button"
                  data-testid="btn-preset-true-false"
                  className="btn btn--ghost btn--sm"
                  onClick={usePresetTrueFalse}
                >
                  {t('questions.presetTrueFalse')}
                </button>
              </div>
            </fieldset>

            <div className="button-row">
              <button
                type="submit"
                data-testid="btn-save-question"
                className="btn btn--primary"
                disabled={
                  createQuestionMutation.isPending ||
                  updateQuestionMutation.isPending
                }
              >
                {editingQuestion
                  ? t('questions.saveQuestionBtn')
                  : t('questions.addQuestionBtn')}
              </button>
              {editingQuestion && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={cancelEditQuestion}
                >
                  {t('quizzes.cancelBtn')}
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="question-list" aria-label={t('questions.title')}>
          {questionsQuery.isPending && (
            <p className="loading-state" role="status">
              {t('design.loadingQuestions')}
            </p>
          )}
          {questionsQuery.isError && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void questionsQuery.refetch()}
            >
              {t('design.retry')}
            </button>
          )}
          {questionsQuery.data && questionsQuery.data.length === 0 && (
            <p className="empty-state">{t('questions.empty')}</p>
          )}

          {questionsQuery.data?.map((q) => (
            <article
              key={q.id}
              className="card question-item"
              data-testid={`question-card-${q.id}`}
            >
              <div className="question-item__header">
                <span className="badge">#{q.position}</span>
                <span className="badge badge--true">
                  {t('questions.correctLabel')}: {q.options[q.correctOption]}
                </span>
              </div>

              <p className="question-item__statement">{q.statement}</p>
              <ul
                className="library-options"
                data-testid={`question-options-${q.id}`}
              >
                {q.options.map((option, index) => (
                  <li
                    key={index}
                    className={
                      index === q.correctOption ? 'library-option--correct' : ''
                    }
                  >
                    {option}
                  </li>
                ))}
              </ul>
              {q.explanation && (
                <p
                  className="question-item__explanation"
                  data-testid={`question-explanation-${q.id}`}
                >
                  {t('questions.explanationShown')}: {q.explanation}
                </p>
              )}

              {q.imageUrl && (
                <div className="question-item__image-wrap">
                  <img
                    src={q.imageUrl}
                    alt={q.statement}
                    className="question-item__image"
                    data-testid={`question-image-${q.id}`}
                  />
                </div>
              )}

              <div className="question-item__actions">
                <label className="btn btn--secondary btn--file">
                  <span>{t('questions.uploadImageBtn')}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    data-testid={`input-question-image-${q.id}`}
                    onChange={(e) => handleImageFileChange(q.id, e)}
                  />
                </label>

                {q.imageUrl && (
                  <button
                    type="button"
                    data-testid={`btn-remove-image-${q.id}`}
                    className="btn btn--ghost"
                    onClick={() => removeImageMutation.mutate(q.id)}
                  >
                    {t('questions.removeImageBtn')}
                  </button>
                )}

                <button
                  type="button"
                  data-testid={`btn-edit-question-${q.id}`}
                  className="btn btn--ghost"
                  onClick={() => startEditQuestion(q)}
                >
                  {t('questions.editTitle')}
                </button>

                <button
                  type="button"
                  data-testid={`btn-delete-question-${q.id}`}
                  className="btn btn--danger"
                  onClick={() => deleteQuestionMutation.mutate(q.id)}
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
