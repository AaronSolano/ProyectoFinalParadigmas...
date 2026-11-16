import {
  GameSession,
  GameParticipant,
  GameQuestion,
  GameAnswer,
  QuestionClosed,
  RankingEntry,
} from "../game";
export interface GameTransaction {
  session: GameSession;
  participants(): Promise<GameParticipant[]>;
  questions(): Promise<GameQuestion[]>;
  answers(index: number): Promise<GameAnswer[]>;
  join(userId: string, name: string): Promise<GameParticipant>;
  leave(participantId: string): Promise<void>;
  insertAnswer(
    participantId: string,
    index: number,
    option: number,
    receivedAt: number,
  ): Promise<boolean>;
  open(index: number, closesAt: number, now: number): Promise<void>;
  close(result: QuestionClosed): Promise<void>;
  finish(ranking: RankingEntry[], now: number): Promise<void>;
}
export interface GameStore {
  transaction<T>(
    code: string,
    work: (tx: GameTransaction) => Promise<T>,
  ): Promise<T>;
  openSessions(): Promise<{ code: string; closesAt: number }[]>;
  activeSessionCount(): Promise<number>;
}
