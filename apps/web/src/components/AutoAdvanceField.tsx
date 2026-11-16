import { useTranslation } from 'react-i18next';

export const AUTO_ADVANCE_OPTIONS = [0, 3, 5, 10, 15, 30] as const;
export const DEFAULT_AUTO_ADVANCE_SECONDS = 5;

export interface AutoAdvanceFieldProps {
  id: string;
  value: number;
  onChange: (seconds: number) => void;
}

/** Elige cuántos segundos esperar tras cerrar una pregunta antes de pasar sola a la siguiente (0 = solo manual). */
export function AutoAdvanceField({
  id,
  value,
  onChange,
}: AutoAdvanceFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="form-field">
      <label htmlFor={id}>{t('quizzes.autoAdvanceLabel')}</label>
      <select
        id={id}
        data-testid="select-auto-advance"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {AUTO_ADVANCE_OPTIONS.map((seconds) => (
          <option key={seconds} value={seconds}>
            {seconds === 0
              ? t('quizzes.autoAdvanceOff')
              : t('quizzes.autoAdvanceSeconds', { seconds })}
          </option>
        ))}
      </select>
      <p className="quiz-item__desc">{t('quizzes.autoAdvanceHint')}</p>
    </div>
  );
}
