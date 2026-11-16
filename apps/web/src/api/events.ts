export type GameSessionStatus = 'waiting' | 'question_open' | 'question_closed' | 'finished';

export interface LiveParticipant {
  id: string;
  displayName: string;
}

export interface LiveCurrentQuestion {
  questionIndex: number;
  total: number;
  statement: string;
  imageUrl: string | null;
  closesAt: string;
  openedAt: string;
  durationSeconds: number;
}

export interface LiveQuestionResult {
  participantId: string;
  answered: boolean;
  correct: boolean;
  pointsAwarded: number;
  elapsedMs: number | null;
  streak: number;
  totalScore: number;
}

export interface LiveRankingEntry {
  position: number;
  participantId: string;
  displayName: string;
  score: number;
}

export interface QuestionOpenedEvent {
  questionIndex: number;
  total: number;
  statement: string;
  imageUrl: string | null;
  closesAt: string;
  serverTime: string;
  openedAt: string;
  durationSeconds: number;
}

export interface QuestionClosedEvent {
  questionIndex: number;
  correctAnswer: boolean;
  results: LiveQuestionResult[];
  ranking: LiveRankingEntry[];
}

export interface StateSyncEvent {
  code: string;
  status: GameSessionStatus;
  isHost: boolean;
  participantId: string | null;
  participants: LiveParticipant[];
  totalQuestions: number;
  currentQuestion: LiveCurrentQuestion | null;
  closesAt: string | null;
  serverTime: string;
  myScore: number;
  hasAnswered: boolean;
  lastClosed?: QuestionClosedEvent | null;
  ranking?: LiveRankingEntry[] | null;
}

export interface ParticipantJoinedEvent {
  participant: LiveParticipant;
}

export interface ParticipantLeftEvent {
  participantId: string;
}

export interface SessionStartedEvent {
  totalQuestions: number;
}

export interface AnswerAcceptedEvent {
  questionIndex: number;
}

export type AnswerRejectedReason =
  | 'already_answered'
  | 'late'
  | 'closed'
  | 'not_in_session'
  | 'invalid_state';

export interface AnswerRejectedEvent {
  questionIndex: number;
  reason: AnswerRejectedReason;
}

export interface SessionFinishedEvent {
  ranking: LiveRankingEntry[];
}

export interface LiveErrorEvent {
  code: 'FORBIDDEN' | 'ROOM_NOT_FOUND' | 'INVALID_PAYLOAD' | 'INVALID_STATE' | 'INTERNAL_ERROR';
  message: string;
}
