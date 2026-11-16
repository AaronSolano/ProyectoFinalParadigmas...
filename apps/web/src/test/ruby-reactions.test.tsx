import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import {
  RubyQuestionCompanion,
  RubyFeedback,
} from '../components/RubyFeedback';
import {
  closedQuestionMood,
  droppedInRanking,
  finalRubyMood,
} from '../components/rubyReactions';
import type { LiveQuestionResult, LiveRankingEntry } from '../api/events';
import { setAppLanguage } from '../i18n';

const right: LiveQuestionResult = {
  participantId: 'me',
  answered: true,
  correct: true,
  pointsAwarded: 1000,
  elapsedMs: 400,
  streak: 2,
  totalScore: 2000,
};
const wrong: LiveQuestionResult = {
  ...right,
  correct: false,
  pointsAwarded: 0,
  streak: 0,
};
const ranked = (
  id: string,
  position: number,
  score: number,
): LiveRankingEntry => ({
  participantId: id,
  displayName: id,
  position,
  score,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Ruby reflects confirmed results without changing game state', () => {
  it('celebrates a correct answer and responds empathetically to a wrong answer', () => {
    expect(
      closedQuestionMood({ isHost: false, results: [right], result: right }),
    ).toBe('celebrate');
    expect(
      closedQuestionMood({
        isHost: false,
        results: [wrong, { ...right, participantId: 'other' }],
        result: wrong,
      }),
    ).toBe('empathy');
  });
  it('prioritizes timeout and lost streak over the room-wide difficult-question reaction', () => {
    const missed = { ...wrong, answered: false, elapsedMs: null };
    expect(
      closedQuestionMood({ isHost: false, results: [missed], result: missed }),
    ).toBe('surprised');
    expect(
      closedQuestionMood({
        isHost: false,
        results: [wrong],
        result: wrong,
        previousStreak: 2,
      }),
    ).toBe('surprised');
    expect(
      closedQuestionMood({ isHost: false, results: [wrong], result: wrong }),
    ).toBe('sad');
  });
  it('does not interpret missing result data or an empty room as failure', () => {
    expect(closedQuestionMood({ isHost: true, results: [] })).toBe('idle');
    expect(closedQuestionMood({ isHost: false, results: [] })).toBe('think');
    expect(closedQuestionMood({ isHost: true, results: [wrong] })).toBe('sad');
  });
  it('uses server positions and requires a known previous position to detect a drop', () => {
    const ranking = [ranked('other', 1, 2000), ranked('me', 2, 1500)];
    expect(droppedInRanking(ranking, 'me', 1)).toBe(true);
    expect(droppedInRanking(ranking, 'me', 2)).toBe(false);
    expect(droppedInRanking(ranking, 'me')).toBe(false);
    expect(droppedInRanking(ranking, 'missing', 1)).toBe(false);
  });
  it('distinguishes the podium, a near miss, and a larger gap using confirmed scores', () => {
    const ranking = [
      ranked('third', 3, 1000),
      ranked('near', 4, 900),
      ranked('far', 5, 899),
    ];
    expect(finalRubyMood(ranking, 'third', false)).toBe('celebrate');
    expect(finalRubyMood(ranking, 'near', false)).toBe('sad');
    expect(finalRubyMood(ranking, 'far', false)).toBe('motivate');
    expect(finalRubyMood([], null, false)).toBe('welcome');
    expect(finalRubyMood([], null, true)).toBe('celebrate');
  });
  it('changes from encouragement to thinking without withholding the question, and skips old intros on reconnect', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-16T18:00:00Z'));
    const { unmount } = render(
      <RubyQuestionCompanion
        openedAt="2026-11-16T18:00:00Z"
        clockOffsetMs={0}
      />,
    );
    expect(screen.getByTestId('ruby-feedback')).toHaveAttribute(
      'data-mood',
      'cheer',
    );
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByTestId('ruby-feedback')).toHaveAttribute(
      'data-mood',
      'think',
    );
    unmount();
    render(
      <RubyQuestionCompanion
        openedAt="2026-11-16T17:59:55Z"
        clockOffsetMs={0}
      />,
    );
    expect(screen.getByTestId('ruby-feedback')).toHaveAttribute(
      'data-mood',
      'think',
    );
  });
  it('translates feedback and includes confetti only for confirmed celebrations', () => {
    setAppLanguage('es');
    const { container, rerender } = render(
      <RubyFeedback mood="empathy" celebrate />,
    );
    expect(screen.getByText(/¡Casi!/)).toBeInTheDocument();
    expect(container.querySelector('.ruby-confetti')).toBeNull();
    act(() => setAppLanguage('en'));
    expect(screen.getByText(/Almost!/)).toBeInTheDocument();
    rerender(<RubyFeedback mood="celebrate" celebrate />);
    expect(container.querySelectorAll('.ruby-confetti i')).toHaveLength(8);
  });
});
