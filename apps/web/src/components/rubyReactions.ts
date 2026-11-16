import type { LiveQuestionResult, LiveRankingEntry } from '../api/events';
import type { RubyMood } from './RubyMascot';

// Presentation threshold only: this never changes positions or points.
export const RUBY_NEAR_PODIUM_POINTS = 100;

export function closedQuestionMood({
  isHost,
  results,
  result,
  previousStreak,
}: {
  isHost: boolean;
  results: LiveQuestionResult[];
  result?: LiveQuestionResult;
  previousStreak?: number;
}): RubyMood {
  const nobodyCorrect =
    results.length > 0 && results.every((entry) => !entry.correct);
  if (isHost)
    return nobodyCorrect ? 'sad' : results.length ? 'celebrate' : 'idle';
  if (!result) return 'think';
  if (!result.answered) return 'surprised';
  if (result.correct) return 'celebrate';
  if (
    previousStreak !== undefined &&
    previousStreak >= 2 &&
    result.streak === 0
  )
    return 'surprised';
  return nobodyCorrect ? 'sad' : 'empathy';
}

export function droppedInRanking(
  ranking: LiveRankingEntry[],
  participantId: string | null,
  previousPosition?: number,
): boolean {
  const current = ranking.find(
    (entry) => entry.participantId === participantId,
  );
  return (
    current !== undefined &&
    previousPosition !== undefined &&
    current.position > previousPosition
  );
}

export function finalRubyMood(
  ranking: LiveRankingEntry[],
  participantId: string | null,
  isHost: boolean,
): RubyMood {
  if (isHost) return 'celebrate';
  const current = ranking.find(
    (entry) => entry.participantId === participantId,
  );
  if (!current) return 'welcome';
  if (current.position <= 3) return 'celebrate';
  const third = ranking.find((entry) => entry.position === 3);
  if (
    third &&
    third.score >= current.score &&
    third.score - current.score <= RUBY_NEAR_PODIUM_POINTS
  )
    return 'sad';
  return 'motivate';
}
