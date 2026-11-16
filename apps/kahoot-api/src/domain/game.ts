export type GameStatus =
  "waiting" | "question_open" | "question_closed" | "finished";
export type Control = "start" | "next" | "close";
export class GameError extends Error {
  constructor(
    public readonly code:
      | "FORBIDDEN"
      | "ROOM_NOT_FOUND"
      | "INVALID_PAYLOAD"
      | "INVALID_STATE"
      | "INTERNAL_ERROR",
    message: string,
  ) {
    super(message);
  }
}
export interface Clock {
  now(): number;
}
export const systemClock: Clock = { now: () => Date.now() };
export function transition(
  status: GameStatus,
  control: Control,
  hasNext = true,
): GameStatus {
  if (control === "start" && status === "waiting") return "question_open";
  if (control === "close" && status === "question_open")
    return "question_closed";
  if (control === "next" && status === "question_closed")
    return hasNext ? "question_open" : "finished";
  throw new GameError(
    "INVALID_STATE",
    "La acción no es válida en el estado actual.",
  );
}
export type Rejection =
  "already_answered" | "late" | "closed" | "not_in_session" | "invalid_state";
export function answerRejection(input: {
  participant: boolean;
  status: GameStatus;
  currentIndex: number | null;
  questionIndex: number;
  closesAt: number | null;
  now: number;
  answered: boolean;
}): Rejection | undefined {
  if (!input.participant) return "not_in_session";
  if (input.currentIndex !== input.questionIndex) return "invalid_state";
  if (input.status === "question_closed" || input.status === "finished")
    return "closed";
  if (input.status !== "question_open" || input.closesAt === null)
    return "invalid_state";
  if (input.now > input.closesAt) return "late";
  if (input.answered) return "already_answered";
  return undefined;
}
export function points({
  option,
  correctOption,
  elapsedMs,
  durationMs,
  basePoints = 1000,
}: {
  option: number | undefined;
  correctOption: number;
  elapsedMs: number | null;
  durationMs: number;
  basePoints?: number;
}): number {
  if (
    option === undefined ||
    option !== correctOption ||
    elapsedMs === null ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    !Number.isFinite(durationMs) ||
    durationMs <= 0
  )
    return 0;
  if (elapsedMs < 500) return basePoints;
  return Math.round(
    (1 - Math.min(elapsedMs, durationMs) / durationMs / 2) * basePoints,
  );
}
export function streak(previous: number, correct: boolean): number {
  return correct ? previous + 1 : 0;
}
export interface RankedPlayer {
  participantId: string;
  displayName: string;
  score: number;
}
export interface RankingEntry extends RankedPlayer {
  position: number;
}
export function rank(players: RankedPlayer[]): RankingEntry[] {
  let position = 0,
    previous: number | undefined;
  return [...players]
    .sort(
      (a, b) =>
        b.score - a.score || a.participantId.localeCompare(b.participantId),
    )
    .map((player) => {
      if (player.score !== previous) position++;
      previous = player.score;
      return { position, ...player };
    });
}
export interface QuestionResult {
  participantId: string;
  answered: boolean;
  correct: boolean;
  pointsAwarded: number;
  elapsedMs: number | null;
  streak: number;
  totalScore: number;
}
export interface QuestionClosed {
  questionIndex: number;
  correctOption: number;
  explanation: string | null;
  nextQuestionAt: string | null;
  results: QuestionResult[];
  ranking: RankingEntry[];
}
export interface GameSession {
  id: string;
  code: string;
  hostId: string;
  status: GameStatus;
  questionTimeSeconds: number;
  autoAdvanceMs: number;
  currentIndex: number | null;
  openedAt: number | null;
  closesAt: number | null;
  lastClosed: QuestionClosed | null;
}
export interface GameParticipant {
  id: string;
  userId: string;
  displayName: string;
  score: number;
  streak: number;
  active: boolean;
}
export interface GameQuestion {
  index: number;
  statement: string;
  options: string[];
  correctOption: number;
  explanation: string | null;
  imageFilename: string | null;
}
export interface GameAnswer {
  participantId: string;
  questionIndex: number;
  option: number;
  receivedAt: number;
}
