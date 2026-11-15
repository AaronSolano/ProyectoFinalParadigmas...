import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface CountdownTimerProps {
  closesAt: string | null;
  clockOffsetMs: number;
  nowProvider?: () => number;
}

export function computeRemainingSeconds(
  closesAt: string | null,
  clockOffsetMs: number,
  nowMs: number = Date.now(),
): number {
  if (!closesAt) {
    return 0;
  }
  const closesAtMs = Date.parse(closesAt);
  if (Number.isNaN(closesAtMs)) {
    return 0;
  }
  const estimatedServerNowMs = nowMs + clockOffsetMs;
  const remainingMs = closesAtMs - estimatedServerNowMs;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function CountdownTimer({
  closesAt,
  clockOffsetMs,
  nowProvider = Date.now,
}: CountdownTimerProps) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    computeRemainingSeconds(closesAt, clockOffsetMs, nowProvider()),
  );

  useEffect(() => {
    const update = () => {
      setSecondsLeft(computeRemainingSeconds(closesAt, clockOffsetMs, nowProvider()));
    };
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [closesAt, clockOffsetMs, nowProvider]);

  if (!closesAt) {
    return null;
  }

  return (
    <div
      className={`countdown-badge ${secondsLeft <= 5 ? 'countdown-badge--urgent' : ''}`}
      role="timer"
      aria-live="polite"
      data-testid="countdown-timer"
    >
      {secondsLeft > 0
        ? t('game.timeRemaining', { seconds: secondsLeft })
        : t('game.timeUp')}
    </div>
  );
}
