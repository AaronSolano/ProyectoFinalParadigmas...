import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RubyMascot, type RubyMood } from './RubyMascot';

export function RubyFeedback({
  mood,
  className = '',
  messageKey,
  celebrate = false,
}: {
  mood: RubyMood;
  className?: string;
  messageKey?: string;
  celebrate?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`ruby-feedback ${className}`}
      data-testid="ruby-feedback"
      data-mood={mood}
    >
      <div
        className={`ruby-feedback__art ${celebrate && mood === 'celebrate' ? 'ruby-feedback__art--celebrating' : ''}`}
      >
        <RubyMascot mood={mood} />
        {mood === 'think' && (
          <span className="ruby-question-mark" aria-hidden="true">
            ?
          </span>
        )}
        {celebrate && mood === 'celebrate' && (
          <span className="ruby-confetti" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        )}
      </div>
      <p className="ruby-feedback__message">
        {t(messageKey ?? `ruby.${mood}`)}
      </p>
    </div>
  );
}

/** Intro is visual feedback only; inputs and the server's clock stay active. */
export function RubyQuestionCompanion({
  openedAt,
  clockOffsetMs,
}: {
  openedAt: string;
  clockOffsetMs: number;
}) {
  const [cheering, setCheering] = useState(() => {
    const age = Date.now() + clockOffsetMs - Date.parse(openedAt);
    return age >= 0 && age < 700;
  });
  useEffect(() => {
    const age = Date.now() + clockOffsetMs - Date.parse(openedAt);
    const remaining = 700 - age;
    if (!Number.isFinite(remaining) || age < 0 || remaining <= 0) {
      setCheering(false);
      return;
    }
    const timer = window.setTimeout(() => setCheering(false), remaining);
    return () => window.clearTimeout(timer);
  }, [openedAt, clockOffsetMs]);
  return (
    <RubyFeedback
      mood={cheering ? 'cheer' : 'think'}
      className="ruby-feedback--question"
    />
  );
}
