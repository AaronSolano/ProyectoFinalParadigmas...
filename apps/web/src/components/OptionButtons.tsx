import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnswerRejectedReason } from '../api/events';

export interface OptionButtonsProps {
  questionIndex: number;
  options: string[];
  hasAnswered: boolean;
  answerAccepted: boolean;
  rejectedReason: AnswerRejectedReason | null;
  disabled?: boolean;
  onSubmitAnswer: (option: number) => void;
}

const SHAPES = ['▲', '◆', '●', '■'];

export function OptionButtons({
  questionIndex,
  options,
  hasAnswered,
  answerAccepted,
  rejectedReason,
  disabled = false,
  onSubmitAnswer,
}: OptionButtonsProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const [submittedLocal, setSubmittedLocal] = useState(false);

  useEffect(() => {
    setSelected(null);
    setSubmittedLocal(false);
  }, [questionIndex]);

  const isLocked = disabled || hasAnswered || submittedLocal;

  const handleChoose = (index: number) => {
    if (isLocked) {
      return;
    }
    setSelected(index);
    setSubmittedLocal(true);
    onSubmitAnswer(index);
  };

  return (
    <div className="tf-section">
      <div className="tf-grid" role="group" aria-label={t('game.optionsGroup')}>
        {options.map((label, index) => (
          <button
            key={index}
            type="button"
            data-testid={`btn-answer-${index}`}
            className={`tf-button option-button option-button--${index} ${
              selected === index ? 'tf-button--selected' : ''
            }`}
            disabled={isLocked}
            aria-pressed={selected === index}
            onClick={() => handleChoose(index)}
          >
            <span className="tf-button__icon" aria-hidden="true">
              {SHAPES[index] ?? '●'}
            </span>
            <span className="tf-button__label">{label}</span>
          </button>
        ))}
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
