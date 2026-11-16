import {
  SessionRepository,
  UnitOfWork,
  IdGenerator,
  DuplicateRoomCode,
} from "../domain/ports";
import { Identity, SessionResults } from "../domain/entities";
import { SessionInput, JoinInput } from "../domain/inputs";
import { Problem } from "../domain/problem";
import {
  requireWaiting,
  normalizeRoomCode,
  validateAutoAdvanceSeconds,
} from "../domain/session-rules";
import { usableQuiz } from "./quiz-use-cases";
import { GameService } from "./game-service";
async function room(repo: SessionRepository, code: string, lock = false) {
  const session = await repo.findByCode(normalizeRoomCode(code), lock);
  if (!session)
    throw new Problem(
      404,
      "ROOM_NOT_FOUND",
      "No existe una sala con ese codigo.",
    );
  return session;
}
export class SessionUseCases {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly work: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly questionTime: number,
    private readonly autoAdvance: number,
    private readonly game?: GameService,
  ) {}
  listSessions(user: string) {
    return this.sessions.listHosted(user);
  }
  getSession(code: string) {
    return room(this.sessions, code);
  }
  async createSession(user: string, input: SessionInput) {
    const advanceSeconds = validateAutoAdvanceSeconds(
      input.autoAdvanceSeconds ?? this.autoAdvance,
    );
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        return await this.work.transaction(async ({ quizzes, sessions }) => {
          const quiz = await usableQuiz(quizzes, input.quizId, user, true);
          const questions = await quizzes.listQuestions(quiz.id);
          if (!questions.length)
            throw new Problem(
              409,
              "QUIZ_EMPTY",
              "El cuestionario no tiene preguntas.",
            );
          const code = normalizeRoomCode(this.ids.roomCode());
          // Historical results are addressed by code, so do not reuse finished room codes.
          if (await sessions.findByCode(code)) throw new DuplicateRoomCode();
          return sessions.createWithSnapshot(
            code,
            quiz,
            user,
            input.questionTimeSeconds ?? this.questionTime,
            advanceSeconds,
            questions,
          );
        });
      } catch (error) {
        if (!(error instanceof DuplicateRoomCode)) throw error;
      }
    }
    throw new Problem(
      500,
      "INTERNAL_ERROR",
      "No se pudo generar un codigo de sala.",
    );
  }
  joinSession(user: Identity, code: string, input: JoinInput) {
    const join = () =>
      this.work.transaction(async ({ sessions }) => {
        const session = await room(sessions, code, true);
        const existing = (await sessions.participants(session.id)).find(
          (p) => p.userId === user.id,
        );
        if (existing) {
          await sessions.reactivateParticipant?.(existing.id);
          return { participant: existing };
        }
        requireWaiting(session);
        const participant = await sessions.addParticipant(
          session.id,
          user.id,
          input.displayName ?? user.name,
        );
        return {
          participant,
          joined: { id: participant.id, displayName: participant.displayName },
        };
      });
    return this.game
      ? this.game.joinFromRest(normalizeRoomCode(code), join)
      : join().then((result) => result.participant);
  }
  private async accessible(user: string, code: string) {
    const session = await room(this.sessions, code);
    const participants = await this.sessions.participants(session.id);
    if (session.hostId !== user && !participants.some((p) => p.userId === user))
      throw new Problem(403, "FORBIDDEN", "No perteneces a esta sala.");
    return { session, participants };
  }
  async participants(user: string, code: string) {
    return (await this.accessible(user, code)).participants.filter(
      (p) => p.active !== false,
    );
  }
  async results(user: string, code: string): Promise<SessionResults> {
    const { session } = await this.accessible(user, code);
    if (session.status !== "finished")
      throw new Problem(
        409,
        "ROOM_NOT_FINISHED",
        "La sala aun no ha terminado.",
      );
    return {
      sessionId: session.id,
      code: session.code,
      quizTitle: session.quizTitle,
      finishedAt: session.finishedAt,
      totalQuestions: await this.sessions.countSnapshotQuestions(session.id),
      ranking: await this.sessions.ranking(session.id),
    };
  }
}
