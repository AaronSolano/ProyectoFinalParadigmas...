export interface Quiz {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
}
export interface Question {
  id: string;
  quizId: string;
  statement: string;
  correctAnswer: boolean;
  imageFilename: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}
export type SessionStatus = "waiting" | "in_progress" | "finished";
export interface Session {
  id: string;
  code: string;
  quizId: string;
  quizTitle: string;
  hostId: string;
  status: SessionStatus;
  questionTimeSeconds: number;
  participantCount: number;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}
export interface SessionQuestion {
  sessionId: string;
  position: number;
  statement: string;
  correctAnswer: boolean;
  imageFilename: string | null;
}
export interface Participant {
  active?: boolean;
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  joinedAt: Date;
  score: number;
}
export interface RankingEntry {
  position: number;
  participantId: string;
  displayName: string;
  score: number;
  correctAnswers: number;
}
export interface SessionResults {
  sessionId: string;
  code: string;
  quizTitle: string;
  finishedAt: Date | null;
  totalQuestions: number;
  ranking: RankingEntry[];
}
export interface Identity {
  id: string;
  name: string;
}
