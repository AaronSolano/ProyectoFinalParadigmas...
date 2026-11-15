import { SqlAdapter, Row } from './sql-adapter';
import { QuizRepository } from '../domain/ports';
import { QuizInput, QuestionInput } from '../domain/inputs';
import { quizFromRow, questionFromRow } from './mappers';
export class PostgresQuizRepository extends SqlAdapter implements QuizRepository {
 private async quiz(row: Row) { return quizFromRow(row, await this.rawCountQuestions(row.id)); }
 async findById(id: string, lock = false) { const row = await this.rawQuiz(id,lock); return row ? this.quiz(row) : undefined; }
 async findQuestion(quizId: string,id: string) { const row = await this.rawQuestion(quizId,id); return row ? questionFromRow(row) : undefined; }
 async listQuestions(id: string) { return (await this.rawQuestions(id)).map(questionFromRow); }
 async listOwned(ownerId: string) { return Promise.all((await this.rawListOwnedQuizzes([ownerId])).map(r=>this.quiz(r))); }
 async create(ownerId: string,input: QuizInput) { return this.quiz((await this.rawInsertQuiz([ownerId,input.title,input.description ?? '']))[0]); }
 async update(id: string,input: QuizInput) { return this.quiz((await this.rawUpdateQuiz([id,input.title,input.description ?? '']))[0]); }
 async remove(id: string) { await this.rawDeleteQuizQuestions([id]); await this.rawSoftDeleteQuiz([id]); }
 async createQuestion(id: string,quizId: string,input: QuestionInput,position: number) { await this.rawInsertQuestion([id,quizId,input.statement,input.correctAnswer,position]); }
 async updateQuestion(id: string,input: QuestionInput) { await this.rawUpdateQuestionContent([id,input.statement,input.correctAnswer]); }
 async setQuestionPosition(id: string,position: number) { await this.rawSetQuestionPosition([id,position]); }
 async removeQuestion(id: string,quizId: string,position: number) { await this.rawDeleteQuestion([id]); await this.rawCompactQuestionPositions([quizId,position]); }
 async touch(id: string,at: Date) { await this.rawTouchQuiz([id,at]); }
 async setImage(id: string,name: string | null) { return questionFromRow((await this.rawUpdateQuestionImage([id,name]))[0]); }
 imageReferenced(name: string) { return this.rawImageReferenced(name); }

  private async rawQuiz(id: string, lock = false): Promise<Row | undefined> {
    return (
      await this.query(
        `SELECT * FROM quizzes WHERE id=$1 AND deleted_at IS NULL${lock ? " FOR UPDATE" : ""}`,
        [id],
      )
    )[0];
  }
  private async rawQuestion(quizId: string, id: string): Promise<Row | undefined> {
    return (
      await this.query("SELECT * FROM questions WHERE quiz_id=$1 AND id=$2", [
        quizId,
        id,
      ])
    )[0];
  }
  private async rawQuestions(quizId: string): Promise<Row[]> {
    return this.query(
      "SELECT * FROM questions WHERE quiz_id=$1 ORDER BY position",
      [quizId],
    );
  }
  private async rawCountQuestions(id: string): Promise<number> {
    return Number(
      (
        await this.query("SELECT count(*) FROM questions WHERE quiz_id=$1", [
          id,
        ])
      )[0].count,
    );
  }
  private async rawImageReferenced(name: string): Promise<boolean> {
    return (
      (
        await this.query(
          "SELECT 1 FROM questions WHERE image_filename=$1 UNION ALL SELECT 1 FROM session_questions WHERE image_filename=$1 LIMIT 1",
          [name],
        )
      ).length > 0
    );
  }

  private rawUpdateQuestionImage(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE questions SET image_filename=$2,updated_at=now() WHERE id=$1 RETURNING *",
      params,
    );
  }
  private rawTouchQuiz(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE quizzes SET updated_at=$2 WHERE id=$1",
      params,
    );
  }
  private rawCompactQuestionPositions(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE questions SET position=position-1 WHERE quiz_id=$1 AND position>$2",
      params,
    );
  }
  private rawDeleteQuestion(params: unknown[]): Promise<Row[]> {
    return this.query("DELETE FROM questions WHERE id=$1", params);
  }
  private rawSetQuestionPosition(params: unknown[]): Promise<Row[]> {
    return this.query("UPDATE questions SET position=$2 WHERE id=$1", params);
  }
  private rawInsertQuestion(params: unknown[]): Promise<Row[]> {
    return this.query(
      "INSERT INTO questions(id,quiz_id,statement,correct_answer,position) VALUES($1,$2,$3,$4,$5)",
      params,
    );
  }
  private rawUpdateQuestionContent(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE questions SET statement=$2,correct_answer=$3,updated_at=now() WHERE id=$1",
      params,
    );
  }
  private rawSoftDeleteQuiz(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE quizzes SET deleted_at=now(),updated_at=now() WHERE id=$1",
      params,
    );
  }
  private rawDeleteQuizQuestions(params: unknown[]): Promise<Row[]> {
    return this.query("DELETE FROM questions WHERE quiz_id=$1", params);
  }
  private rawUpdateQuiz(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE quizzes SET title=$2,description=$3,updated_at=now() WHERE id=$1 RETURNING *",
      params,
    );
  }
  private rawInsertQuiz(params: unknown[]): Promise<Row[]> {
    return this.query(
      "INSERT INTO quizzes(owner_id,title,description) VALUES($1,$2,$3) RETURNING *",
      params,
    );
  }
  private rawListOwnedQuizzes(params: unknown[]): Promise<Row[]> {
    return this.query(
      "SELECT * FROM quizzes WHERE owner_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC",
      params,
    );
  }}
