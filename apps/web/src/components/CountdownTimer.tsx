import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { playCountdownTick } from '../audio/soundEngine';

export interface CountdownTimerProps {
  closesAt: string | null;
  openedAt?: string | null;
  durationSeconds?: number;
  clockOffsetMs: number;
  nowProvider?: () => number;
  enableTickSound?: boolean;
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

export function computeProgressPercent(
  closesAt: string | null,
  openedAt: string | null | undefined,
  durationSeconds: number | undefined,
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
  const openedAtMs = openedAt ? Date.parse(openedAt) : NaN;
  const totalMs =
    typeof durationSeconds === 'number' && durationSeconds > 0
      ? durationSeconds * 1000
      : !Number.isNaN(openedAtMs) && closesAtMs > openedAtMs
        ? closesAtMs - openedAtMs
        : 20_000;
  const estimatedServerNowMs = nowMs + clockOffsetMs;
  const remainingMs = Math.max(0, Math.min(totalMs, closesAtMs - estimatedServerNowMs));
  return Math.round((remainingMs / totalMs) * 100);
}

export function CountdownTimer({
  closesAt,
  openedAt = null,
  durationSeconds = 20,
  clockOffsetMs,
  nowProvider = Date.now,
  enableTickSound = false,
}: CountdownTimerProps) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    computeRemainingSeconds(closesAt, clockOffsetMs, nowProvider()),
  );
  const [progressPct, setProgressPct] = useState<number>(() =>
    computeProgressPercent(closesAt, openedAt, durationSeconds, clockOffsetMs, nowProvider()),
  );
  const lastTickSecondRef = useRef<number | null>(null);

  useEffect(() => {
    lastTickSecondRef.current = null;
    const update = () => {
      const now = nowProvider();
      const secs = computeRemainingSeconds(closesAt, clockOffsetMs, now);
      const pct = computeProgressPercent(closesAt, openedAt, durationSeconds, clockOffsetMs, now);
      setSecondsLeft(secs);
      setProgressPct(pct);
      if (enableTickSound && secs > 0 && lastTickSecondRef.current !== secs) {
        if (lastTickSecondRef.current !== null) {
          playCountdownTick(secs);
        }
        lastTickSecondRef.current = secs;
      }
    };
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [closesAt, openedAt, durationSeconds, clockOffsetMs, nowProvider, enableTickSound]);

  if (!closesAt) {
    return null;
  }

  const isUrgent = secondsLeft <= 5;
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="countdown-widget" data-testid="countdown-widget">
      <div className="countdown-row">
        <svg
          className="countdown-ring"
          width="36"
          height="36"
          viewBox="0 0 36 36"
          aria-hidden="true"
          data-testid="countdown-ring"
        >
          <circle className="countdown-ring__track" cx="18" cy="18" r={radius} strokeWidth="4" />
          <circle
            className={`countdown-ring__fill ${isUrgent ? 'countdown-ring__fill--urgent' : ''}`}
            cx="18"
            cy="18"
            r={radius}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>

        <div
          className={`countdown-badge ${isUrgent ? 'countdown-badge--urgent' : ''}`}
          role="timer"
          aria-live="polite"
          data-testid="countdown-timer"
        >
          {secondsLeft > 0 ? t('game.timeRemaining', { seconds: secondsLeft }) : t('game.timeUp')}
        </div>
      </div>

      <div
        className={`countdown-progress ${isUrgent ? 'countdown-progress--urgent' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={durationSeconds}
        aria-valuenow={secondsLeft}
        data-testid="countdown-progress-bar"
      >
        <div
          className={`countdown-progress__fill ${isUrgent ? 'countdown-progress__fill--urgent' : ''}`}
          style={{ width: `${progressPct}%` }}
          data-testid="countdown-progress-fill"
        />
      </div>
    </div>
  );
}
