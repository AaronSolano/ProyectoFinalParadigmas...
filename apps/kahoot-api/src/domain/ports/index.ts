import { Quiz, Question, Session, Participant, RankingEntry } from '../entities';
import { QuizInput, QuestionInput } from '../inputs';
export interface QuizRepository {
 findById(id: string, lock?: boolean): Promise<Quiz | undefined>;
 findQuestion(quizId: string, id: string): Promise<Question | undefined>;
 listQuestions(quizId: string): Promise<Question[]>;
 listOwned(ownerId: string): Promise<Quiz[]>;
 create(ownerId: string, input: QuizInput): Promise<Quiz>;
 update(id: string, input: QuizInput): Promise<Quiz>;
 remove(id: string): Promise<void>;
 createQuestion(id: string, quizId: string, input: QuestionInput, position: number): Promise<void>;
 updateQuestion(id: string, input: QuestionInput): Promise<void>;
 setQuestionPosition(id: string, position: number): Promise<void>;
 removeQuestion(id: string, quizId: string, position: number): Promise<void>;
 touch(id: string, at: Date): Promise<void>;
 setImage(id: string, name: string | null): Promise<Question>;
 imageReferenced(name: string): Promise<boolean>;
}
export interface SessionRepository {
 findByCode(code: string, lock?: boolean): Promise<Session | undefined>;
 listHosted(hostId: string): Promise<Session[]>;
 participants(sessionId: string): Promise<Participant[]>;
 createWithSnapshot(code: string, quiz: Quiz, hostId: string, seconds: number, questions: Question[]): Promise<Session>;
 addParticipant(sessionId: string, userId: string, displayName: string): Promise<Participant>;
 countSnapshotQuestions(sessionId: string): Promise<number>;
 ranking(sessionId: string): Promise<RankingEntry[]>;
}
export interface Repositories { quizzes: QuizRepository; sessions: SessionRepository; }
export interface UnitOfWork { transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>; }
export interface ImageStorage { put(name: string, bytes: Buffer, type: string): Promise<void>; get(name: string): Promise<Buffer>; remove(name: string): Promise<void>; }
export interface Clock { now(): Date; }
export interface IdGenerator { uuid(): string; roomCode(): string; }
export class DuplicateRoomCode extends Error {}
