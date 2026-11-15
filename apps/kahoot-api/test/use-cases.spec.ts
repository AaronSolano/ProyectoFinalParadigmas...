import { QuizUseCases } from "../src/application/quiz-use-cases";
import { SessionUseCases } from "../src/application/session-use-cases";
import {
  QuizRepository,
  SessionRepository,
  Repositories,
  UnitOfWork,
  IdGenerator,
  ImageStorage,
} from "../src/domain/ports";
import {
  Quiz,
  Question,
  Session,
  Participant,
  SessionQuestion,
} from "../src/domain/entities";
const now = new Date("2026-01-01T00:00:00Z");
class MemoryQuizzes implements QuizRepository {
  quizzes = new Map<string, Quiz>();
  questions = new Map<string, Question>();
  async findById(id: string) {
    return this.quizzes.get(id);
  }
  async findQuestion(quizId: string, id: string) {
    const q = this.questions.get(id);
    return q?.quizId === quizId ? q : undefined;
  }
  async listQuestions(id: string) {
    return [...this.questions.values()]
      .filter((q) => q.quizId === id)
      .sort((a, b) => a.position - b.position);
  }
  async listOwned(id: string) {
    return [...this.quizzes.values()].filter((q) => q.ownerId === id);
  }
  async create(
    ownerId: string,
    input: { title: string; description?: string },
  ) {
    const q = {
      id: "quiz",
      ownerId,
      title: input.title,
      description: input.description ?? "",
      createdAt: now,
      updatedAt: now,
      questionCount: 0,
    };
    this.quizzes.set(q.id, q);
    return q;
  }
  async update(id: string, input: { title: string; description?: string }) {
    const q = this.quizzes.get(id)!;
    Object.assign(q, input);
    return q;
  }
  async remove(id: string) {
    this.quizzes.delete(id);
    for (const q of await this.listQuestions(id)) this.questions.delete(q.id);
  }
  async createQuestion(
    id: string,
    quizId: string,
    input: { statement: string; correctAnswer: boolean },
    position: number,
  ) {
    this.questions.set(id, {
      id,
      quizId,
      ...input,
      position,
      imageFilename: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  async updateQuestion(
    id: string,
    input: { statement: string; correctAnswer: boolean },
  ) {
    Object.assign(this.questions.get(id)!, input);
  }
  async setQuestionPosition(id: string, position: number) {
    this.questions.get(id)!.position = position;
  }
  async removeQuestion(id: string, quizId: string, position: number) {
    this.questions.delete(id);
    for (const q of await this.listQuestions(quizId))
      if (q.position > position) q.position--;
  }
  async touch(id: string, at: Date) {
    this.quizzes.get(id)!.updatedAt = at;
  }
  async setImage(id: string, name: string | null) {
    const q = this.questions.get(id)!;
    q.imageFilename = name;
    return q;
  }
  async imageReferenced(name: string) {
    return [...this.questions.values()].some((q) => q.imageFilename === name);
  }
}
class MemorySessions implements SessionRepository {
  rooms = new Map<string, Session>();
  people: Participant[] = [];
  snapshots: SessionQuestion[] = [];
  async findByCode(code: string) {
    return this.rooms.get(code);
  }
  async listHosted(id: string) {
    return [...this.rooms.values()].filter((s) => s.hostId === id);
  }
  async participants(id: string) {
    return this.people.filter((p) => p.sessionId === id);
  }
  async createWithSnapshot(
    code: string,
    quiz: Quiz,
    hostId: string,
    seconds: number,
    questions: Question[],
  ) {
    const s: Session = {
      id: code,
      code,
      quizId: quiz.id,
      quizTitle: quiz.title,
      hostId,
      status: "waiting",
      questionTimeSeconds: seconds,
      participantCount: 0,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
    };
    this.rooms.set(code, s);
    this.snapshots.push(
      ...questions.map((q, position) => ({
        sessionId: s.id,
        position,
        statement: q.statement,
        correctAnswer: q.correctAnswer,
        imageFilename: q.imageFilename,
      })),
    );
    return s;
  }
  async addParticipant(sessionId: string, userId: string, displayName: string) {
    const p = {
      id: userId,
      sessionId,
      userId,
      displayName,
      joinedAt: now,
      score: 0,
    };
    this.people.push(p);
    return p;
  }
  async countSnapshotQuestions(id: string) {
    return this.snapshots.filter((q) => q.sessionId === id).length;
  }
  async ranking() {
    return [];
  }
}
function setup() {
  const quizzes = new MemoryQuizzes(),
    sessions = new MemorySessions();
  const repositories: Repositories = { quizzes, sessions };
  const work: UnitOfWork = { transaction: (fn) => fn(repositories) };
  let next = 0;
  const ids: IdGenerator = {
    uuid: () => `question-${++next}`,
    roomCode: () => "ABC234",
  };
  const images: ImageStorage = {
    put: async () => {},
    get: async () => Buffer.alloc(0),
    remove: async () => {},
  };
  return {
    quizzes,
    sessions,
    quiz: new QuizUseCases(
      quizzes,
      work,
      images,
      { now: () => now },
      ids,
      2097152,
    ),
    session: new SessionUseCases(sessions, work, ids, 20),
  };
}
describe("casos de uso con puertos en memoria, sin PostgreSQL", () => {
  it("impide editar o crear salas de cuestionarios ajenos", async () => {
    const c = setup();
    await c.quiz.createQuiz("owner", { title: "Prueba" });
    await expect(
      c.quiz.updateQuiz("intruder", "quiz", { title: "Hack" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      c.session.createSession("intruder", { quizId: "quiz" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(c.quizzes.quizzes.get("quiz")!.title).toBe("Prueba");
  });
  it("rechaza QUIZ_EMPTY", async () => {
    const c = setup();
    await c.quiz.createQuiz("owner", { title: "Prueba" });
    await expect(
      c.session.createSession("owner", { quizId: "quiz" }),
    ).rejects.toMatchObject({ code: "QUIZ_EMPTY" });
    expect(c.sessions.rooms.size).toBe(0);
  });
  it("snapshot no cambia con ediciones posteriores", async () => {
    const c = setup();
    await c.quiz.createQuiz("owner", { title: "Prueba" });
    const q = await c.quiz.saveQuestion("owner", "quiz", {
      statement: "Original",
      correctAnswer: true,
    });
    await c.session.createSession("owner", { quizId: "quiz" });
    await c.quiz.saveQuestion(
      "owner",
      "quiz",
      { statement: "Editada", correctAnswer: false },
      q.id,
    );
    expect(c.sessions.snapshots[0]).toMatchObject({
      statement: "Original",
      correctAnswer: true,
      position: 0,
    });
    expect(c.quizzes.quizzes.get("quiz")!.updatedAt).toBe(now);
  });
  it("join idempotente incluso tras cerrar y ROOM_CLOSED para un usuario nuevo", async () => {
    const c = setup();
    await c.quiz.createQuiz("owner", { title: "Prueba" });
    await c.quiz.saveQuestion("owner", "quiz", {
      statement: "Original",
      correctAnswer: true,
    });
    const room = await c.session.createSession("owner", { quizId: "quiz" });
    const user = { id: "user", name: "Nombre" };
    const first = await c.session.joinSession(user, "abc234", {});
    room.status = "finished";
    expect(
      await c.session.joinSession(user, room.code, { displayName: "Otro" }),
    ).toBe(first);
    expect(c.sessions.people).toHaveLength(1);
    await expect(
      c.session.joinSession({ id: "new", name: "Nuevo" }, room.code, {}),
    ).rejects.toMatchObject({ code: "ROOM_CLOSED" });
  });
  it("codigo invalido no llega al repositorio", async () => {
    const c = setup();
    const spy = jest.spyOn(c.sessions, "findByCode");
    await expect(c.session.getSession("../bad")).rejects.toMatchObject({
      code: "ROOM_NOT_FOUND",
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
