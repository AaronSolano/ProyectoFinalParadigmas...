import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnswerRejectedReason } from '../api/events';

export interface TrueFalseButtonsProps {
  questionIndex: number;
  hasAnswered: boolean;
  answerAccepted: boolean;
  rejectedReason: AnswerRejectedReason | null;
  disabled?: boolean;
  onSubmitAnswer: (answer: boolean) => void;
}

export function TrueFalseButtons({
  questionIndex,
  hasAnswered,
  answerAccepted,
  rejectedReason,
  disabled = false,
  onSubmitAnswer,
}: TrueFalseButtonsProps) {
  const { t } = useTranslation();
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [submittedLocal, setSubmittedLocal] = useState(false);

  useEffect(() => {
    setSelectedAnswer(null);
    setSubmittedLocal(false);
  }, [questionIndex]);

  const isLocked = disabled || hasAnswered || submittedLocal;

  const handleChoose = (value: boolean) => {
    if (isLocked) {
      return;
    }
    setSelectedAnswer(value);
    setSubmittedLocal(true);
    onSubmitAnswer(value);
  };

  return (
    <div className="tf-section">
      <div className="tf-grid" role="group" aria-label="Verdadero o Falso">
        <button
          type="button"
          data-testid="btn-answer-true"
          className={`tf-button tf-button--true ${
            selectedAnswer === true ? 'tf-button--selected' : ''
          }`}
          disabled={isLocked}
          aria-pressed={selectedAnswer === true}
          onClick={() => handleChoose(true)}
        >
          <span className="tf-button__icon" aria-hidden="true">
            ✓
          </span>
          <span className="tf-button__label">{t('game.trueBtn')}</span>
        </button>

        <button
          type="button"
          data-testid="btn-answer-false"
          className={`tf-button tf-button--false ${
            selectedAnswer === false ? 'tf-button--selected' : ''
          }`}
          disabled={isLocked}
          aria-pressed={selectedAnswer === false}
          onClick={() => handleChoose(false)}
        >
          <span className="tf-button__icon" aria-hidden="true">
            ✕
          </span>
          <span className="tf-button__label">{t('game.falseBtn')}</span>
        </button>
      </div>

      {(submittedLocal || hasAnswered) && !rejectedReason && (
        <p className="tf-feedback tf-feedback--ok" role="status" data-testid="answer-status">
          {answerAccepted ? t('game.answerAccepted') : t('game.answerSubmitted')}
        </p>
      )}

      {rejectedReason && (
        <p className="tf-feedback tf-feedback--rejected" role="alert" data-testid="answer-rejected">
          {t(`rejection.${rejectedReason}`)}
        </p>
      )}
    </div>
  );
}
