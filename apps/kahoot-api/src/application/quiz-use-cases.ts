import {
  QuizRepository,
  UnitOfWork,
  ImageStorage,
  Clock,
  IdGenerator,
} from "../domain/ports";
import { QuizInput, QuestionInput } from "../domain/inputs";
import { requireOwner, Problem } from "../domain/problem";
import { validateImage } from "../domain/images";
export async function ownedQuiz(
  repo: QuizRepository,
  id: string,
  user: string,
  lock = false,
) {
  const quiz = await repo.findById(id, lock);
  if (!quiz) throw new Problem(404, "NOT_FOUND", "Cuestionario no encontrado.");
  requireOwner(user, quiz.ownerId);
  return quiz;
}
/** Un cuestionario se puede usar (por ejemplo, abrir una sala) si es propio o de la biblioteca compartida. */
export async function usableQuiz(
  repo: QuizRepository,
  id: string,
  user: string,
  lock = false,
) {
  const quiz = await repo.findById(id, lock);
  if (!quiz) throw new Problem(404, "NOT_FOUND", "Cuestionario no encontrado.");
  if (!quiz.isLibrary) requireOwner(user, quiz.ownerId);
  return quiz;
}
async function libraryQuiz(repo: QuizRepository, id: string) {
  const quiz = await repo.findById(id);
  if (!quiz || !quiz.isLibrary)
    throw new Problem(404, "NOT_FOUND", "Cuestionario no encontrado en la biblioteca.");
  return quiz;
}
function validateOptions(input: QuestionInput) {
  if (input.correctOption >= input.options.length)
    throw new Problem(
      400,
      "VALIDATION_ERROR",
      "La opción correcta debe ser una de las opciones.",
    );
  const unique = new Set(input.options.map((o) => o.trim().toLowerCase()));
  if (unique.size !== input.options.length)
    throw new Problem(400, "VALIDATION_ERROR", "Las opciones no pueden repetirse.");
}
async function question(repo: QuizRepository, quizId: string, id: string) {
  const found = await repo.findQuestion(quizId, id);
  if (!found) throw new Problem(404, "NOT_FOUND", "Pregunta no encontrada.");
  return found;
}
export class QuizUseCases {
  constructor(
    private readonly quizzes: QuizRepository,
    private readonly work: UnitOfWork,
    private readonly images: ImageStorage,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly imageMaxBytes: number,
  ) {}
  listQuizzes(user: string) {
    return this.quizzes.listOwned(user);
  }
  listLibrary() {
    return this.quizzes.listLibrary();
  }
  async libraryQuestions(id: string) {
    await libraryQuiz(this.quizzes, id);
    return this.quizzes.listQuestions(id);
  }
  copyFromLibrary(user: string, id: string) {
    return this.work.transaction(async ({ quizzes }) => {
      const source = await libraryQuiz(quizzes, id);
      return quizzes.copyQuiz(user, source, () => this.ids.uuid());
    });
  }
  getQuiz(user: string, id: string) {
    return ownedQuiz(this.quizzes, id, user);
  }
  createQuiz(user: string, input: QuizInput) {
    return this.quizzes.create(user, input);
  }
  updateQuiz(user: string, id: string, input: QuizInput) {
    return this.work.transaction(async ({ quizzes }) => {
      await ownedQuiz(quizzes, id, user, true);
      return quizzes.update(id, input);
    });
  }
  async deleteQuiz(user: string, id: string) {
    const names = await this.work.transaction(async ({ quizzes }) => {
      await ownedQuiz(quizzes, id, user, true);
      const names = (await quizzes.listQuestions(id)).map(
        (q) => q.imageFilename,
      );
      await quizzes.remove(id);
      return names;
    });
    for (const name of names) await this.cleanupImage(name);
  }
  async listQuestions(user: string, quizId: string) {
    await ownedQuiz(this.quizzes, quizId, user);
    return this.quizzes.listQuestions(quizId);
  }
  async getQuestion(user: string, quizId: string, id: string) {
    await ownedQuiz(this.quizzes, quizId, user);
    return question(this.quizzes, quizId, id);
  }
  saveQuestion(
    user: string,
    quizId: string,
    input: QuestionInput,
    id?: string,
  ) {
    validateOptions(input);
    return this.work.transaction(async ({ quizzes }) => {
      await ownedQuiz(quizzes, quizId, user, true);
      const rows = await quizzes.listQuestions(quizId);
      const previous = id ? await question(quizzes, quizId, id) : undefined;
      const remaining = rows.filter((q) => q.id !== id).map((q) => q.id);
      const position =
        input.position ?? previous?.position ?? remaining.length + 1;
      if (position < 1 || position > remaining.length + 1)
        throw new Problem(
          400,
          "VALIDATION_ERROR",
          "Posicion fuera del cuestionario.",
        );
      const questionId = id ?? this.ids.uuid();
      remaining.splice(position - 1, 0, questionId);
      if (id) await quizzes.updateQuestion(id, input);
      else await quizzes.createQuestion(questionId, quizId, input, position);
      for (const [index, key] of remaining.entries())
        await quizzes.setQuestionPosition(key, index + 1);
      await quizzes.touch(quizId, this.clock.now());
      return question(quizzes, quizId, questionId);
    });
  }
  async deleteQuestion(user: string, quizId: string, id: string) {
    const name = await this.work.transaction(async ({ quizzes }) => {
      await ownedQuiz(quizzes, quizId, user, true);
      const q = await question(quizzes, quizId, id);
      await quizzes.removeQuestion(id, quizId, q.position);
      await quizzes.touch(quizId, this.clock.now());
      return q.imageFilename;
    });
    await this.cleanupImage(name);
  }
  async changeImage(
    user: string,
    quizId: string,
    id: string,
    file?: { buffer: Buffer; originalname: string },
  ) {
    const kind = file
      ? validateImage(file.buffer, file.originalname, this.imageMaxBytes)
      : undefined;
    const newName = kind ? `${this.ids.uuid()}.${kind.extension}` : null;
    let oldName: string | null = null;
    try {
      const result = await this.work.transaction(async ({ quizzes }) => {
        await ownedQuiz(quizzes, quizId, user, true);
        const q = await question(quizzes, quizId, id);
        oldName = q.imageFilename;
        if (file && newName && kind)
          await this.images.put(newName, file.buffer, kind.type);
        return quizzes.setImage(id, newName);
      });
      await this.cleanupImage(oldName);
      return result;
    } catch (error) {
      if (newName && !(await this.quizzes.imageReferenced(newName)))
        await this.images.remove(newName);
      throw error;
    }
  }
  private async cleanupImage(name: string | null) {
    if (name && !(await this.quizzes.imageReferenced(name)))
      await this.images.remove(name);
  }
}
