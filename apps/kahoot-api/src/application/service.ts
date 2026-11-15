import { randomInt, randomUUID } from "node:crypto";
import { Repository, Row } from "../data/repository";
import { Config } from "../config/config";
import { Identity } from "../auth/auth";
import { Problem, requireOwner } from "../domain/problem";
import { ImageStorage, validateImage } from "../modules/images/storage";
import {
  QuizInput,
  QuestionInput,
  SessionInput,
  JoinInput,
} from "../domain/inputs";
export class KahootService {
  constructor(
    private readonly repo: Repository,
    private readonly config: Config,
    private readonly images: ImageStorage,
  ) {}
  private async owned(
    repo: Repository,
    id: string,
    user: string,
    lock = false,
  ): Promise<Row> {
    const quiz = await repo.quiz(id, lock);
    if (!quiz)
      throw new Problem(404, "NOT_FOUND", "Cuestionario no encontrado.");
    requireOwner(user, quiz.owner_id);
    return quiz;
  }
  private async foundQuestion(
    repo: Repository,
    quizId: string,
    id: string,
  ): Promise<Row> {
    const question = await repo.question(quizId, id);
    if (!question)
      throw new Problem(404, "NOT_FOUND", "Pregunta no encontrada.");
    return question;
  }
  private async quizView(q: Row, repo = this.repo) {
    return {
      id: q.id,
      ownerId: q.owner_id,
      title: q.title,
      description: q.description,
      questionCount: await repo.countQuestions(q.id),
      createdAt: q.created_at,
      updatedAt: q.updated_at,
    };
  }
  private questionView(q: Row) {
    return {
      id: q.id,
      quizId: q.quiz_id,
      statement: q.statement,
      correctAnswer: q.correct_answer,
      imageUrl: q.image_filename
        ? `${this.config.publicUrl}/api/v1/images/${q.image_filename}`
        : null,
      position: q.position,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
    };
  }
  private participantView(p: Row) {
    return {
      id: p.id,
      sessionId: p.session_id,
      userId: p.user_id,
      displayName: p.display_name,
      joinedAt: p.joined_at,
      score: p.score,
    };
  }
  private async sessionView(s: Row, repo = this.repo) {
    return {
      id: s.id,
      code: s.code,
      quizId: s.quiz_id,
      hostId: s.host_id,
      status: s.status,
      questionTimeSeconds: s.question_time_seconds,
      participantCount: (await repo.participants(s.id)).length,
      createdAt: s.created_at,
      startedAt: s.started_at,
      finishedAt: s.finished_at,
    };
  }
  async listQuizzes(user: string) {
    return Promise.all(
      (await this.repo.listOwnedQuizzes([user])).map((q) => this.quizView(q)),
    );
  }
  async getQuiz(user: string, id: string) {
    return this.quizView(await this.owned(this.repo, id, user));
  }
  async createQuiz(user: string, input: QuizInput) {
    return this.quizView(
      (
        await this.repo.insertQuiz([user, input.title, input.description ?? ""])
      )[0],
    );
  }
  async updateQuiz(user: string, id: string, input: QuizInput) {
    return this.repo.transaction(async (repo) => {
      await this.owned(repo, id, user, true);
      return this.quizView(
        (await repo.updateQuiz([id, input.title, input.description ?? ""]))[0],
        repo,
      );
    });
  }
  async deleteQuiz(user: string, id: string) {
    const names = await this.repo.transaction(async (repo) => {
      await this.owned(repo, id, user, true);
      const names = (await repo.questions(id))
        .map((q) => q.image_filename)
        .filter(Boolean);
      await repo.deleteQuizQuestions([id]);
      await repo.softDeleteQuiz([id]);
      return names;
    });
    for (const name of names) await this.cleanupImage(name);
  }
  async listQuestions(user: string, quizId: string) {
    await this.owned(this.repo, quizId, user);
    return (await this.repo.questions(quizId)).map((q) => this.questionView(q));
  }
  async getQuestion(user: string, quizId: string, id: string) {
    await this.owned(this.repo, quizId, user);
    return this.questionView(await this.foundQuestion(this.repo, quizId, id));
  }
  async saveQuestion(
    user: string,
    quizId: string,
    input: QuestionInput,
    id?: string,
  ) {
    return this.repo.transaction(async (repo) => {
      await this.owned(repo, quizId, user, true);
      const rows = await repo.questions(quizId);
      const previous = id
        ? await this.foundQuestion(repo, quizId, id)
        : undefined;
      const remaining = rows.filter((q) => q.id !== id);
      const position =
        input.position ?? previous?.position ?? remaining.length + 1;
      if (position > remaining.length + 1)
        throw new Problem(
          400,
          "VALIDATION_ERROR",
          "Posicion fuera del cuestionario.",
        );
      const questionId = id ?? randomUUID();
      remaining.splice(position - 1, 0, { id: questionId });
      if (id)
        await repo.updateQuestionContent([
          id,
          input.statement,
          input.correctAnswer,
        ]);
      else
        await repo.insertQuestion([
          questionId,
          quizId,
          input.statement,
          input.correctAnswer,
          position,
        ]);
      for (let i = 0; i < remaining.length; i++)
        await repo.setQuestionPosition([remaining[i].id, i + 1]);
      await repo.touchQuiz([quizId]);
      return this.questionView(
        await this.foundQuestion(repo, quizId, questionId),
      );
    });
  }
  async deleteQuestion(user: string, quizId: string, id: string) {
    const name = await this.repo.transaction(async (repo) => {
      await this.owned(repo, quizId, user, true);
      const q = await this.foundQuestion(repo, quizId, id);
      await repo.deleteQuestion([id]);
      await repo.compactQuestionPositions([quizId, q.position]);
      await repo.touchQuiz([quizId]);
      return q.image_filename;
    });
    await this.cleanupImage(name);
  }
  async changeImage(
    user: string,
    quizId: string,
    id: string,
    file?: { buffer: Buffer; originalname: string },
  ) {
    let oldName: string | null = null;
    let newName: string | null = null;
    if (file) {
      const kind = validateImage(
        file.buffer,
        file.originalname,
        this.config.imageMaxBytes,
      );
      newName = `${randomUUID()}.${kind.extension}`;
    }
    try {
      const result = await this.repo.transaction(async (repo) => {
        await this.owned(repo, quizId, user, true);
        const q = await this.foundQuestion(repo, quizId, id);
        oldName = q.image_filename;
        if (file && newName)
          await this.images.put(
            newName,
            file.buffer,
            validateImage(
              file.buffer,
              file.originalname,
              this.config.imageMaxBytes,
            ).type,
          );
        const updated = (await repo.updateQuestionImage([id, newName]))[0];
        return this.questionView(updated);
      });
      await this.cleanupImage(oldName);
      return result;
    } catch (error) {
      if (newName && !(await this.repo.imageReferenced(newName)))
        await this.images.remove(newName);
      throw error;
    }
  }
  private async cleanupImage(name: string | null) {
    if (name && !(await this.repo.imageReferenced(name)))
      await this.images.remove(name);
  }
  async listSessions(user: string) {
    return Promise.all(
      (await this.repo.listHostedSessions([user])).map((s) =>
        this.sessionView(s),
      ),
    );
  }
  async getSession(code: string) {
    return this.sessionView(await this.room(this.repo, code));
  }
  private async room(
    repo: Repository,
    code: string,
    lock = false,
  ): Promise<Row> {
    const s = await repo.session(code, lock);
    if (!s)
      throw new Problem(
        404,
        "ROOM_NOT_FOUND",
        "No existe una sala con ese codigo.",
      );
    return s;
  }
  async createSession(user: string, input: SessionInput) {
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        return await this.repo.transaction(async (repo) => {
          const quiz = await this.owned(repo, input.quizId, user, true);
          const questions = await repo.questions(quiz.id);
          if (!questions.length)
            throw new Problem(
              409,
              "QUIZ_EMPTY",
              "El cuestionario no tiene preguntas.",
            );
          const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
          const code = Array.from(
            { length: 6 },
            () => alphabet[randomInt(alphabet.length)],
          ).join("");
          // Avoid reusing historical codes: REST results identify a room exclusively by code.
          if (await repo.session(code))
            throw Object.assign(new Error("Colision"), { code: "23505" });
          const s = (
            await repo.insertSession([
              code,
              quiz.id,
              quiz.title,
              user,
              input.questionTimeSeconds ?? this.config.questionTime,
            ])
          )[0];
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await repo.insertSnapshotQuestion([
              s.id,
              i,
              q.statement,
              q.correct_answer,
              q.image_filename,
            ]);
          }
          return this.sessionView(s, repo);
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "23505") throw error;
      }
    }
    throw new Problem(
      500,
      "INTERNAL_ERROR",
      "No se pudo generar un codigo de sala.",
    );
  }
  async joinSession(user: Identity, code: string, input: JoinInput) {
    return this.repo.transaction(async (repo) => {
      const s = await this.room(repo, code, true);
      const existing = (await repo.participants(s.id)).find(
        (p) => p.user_id === user.id,
      );
      if (existing) return this.participantView(existing);
      if (s.status !== "waiting")
        throw new Problem(
          409,
          "ROOM_CLOSED",
          "La sala ya no admite nuevos participantes.",
        );
      const p = (
        await repo.insertParticipant([
          s.id,
          user.id,
          input.displayName ?? user.name,
        ])
      )[0];
      return this.participantView(p);
    });
  }
  private async accessible(user: string, code: string) {
    const s = await this.room(this.repo, code);
    const participants = await this.repo.participants(s.id);
    if (s.host_id !== user && !participants.some((p) => p.user_id === user))
      throw new Problem(403, "FORBIDDEN", "No perteneces a esta sala.");
    return { s, participants };
  }
  async participants(user: string, code: string) {
    return (await this.accessible(user, code)).participants.map((p) =>
      this.participantView(p),
    );
  }
  async results(user: string, code: string) {
    const { s } = await this.accessible(user, code);
    if (s.status !== "finished")
      throw new Problem(
        409,
        "ROOM_NOT_FINISHED",
        "La sala aun no ha terminado.",
      );
    const ranking = await this.repo.readRanking([s.id]);
    return {
      sessionId: s.id,
      code: s.code,
      quizTitle: s.quiz_title,
      finishedAt: s.finished_at,
      totalQuestions: Number(
        (await this.repo.countSnapshotQuestions([s.id]))[0].count,
      ),
      ranking: ranking.map((r) => ({
        position: r.position,
        participantId: r.participant_id,
        displayName: r.display_name,
        score: r.score,
        correctAnswers: r.correct_answers,
      })),
    };
  }
}
