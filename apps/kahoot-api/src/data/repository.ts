import { DataSource, EntityManager } from "typeorm";
export type Row = Record<string, any>;
/** SQL stays in this adapter; application transactions receive a scoped repository. */
export class Repository {
  constructor(
    private readonly db: DataSource,
    private readonly manager: EntityManager = db.manager,
  ) {}
  transaction<T>(work: (repo: Repository) => Promise<T>): Promise<T> {
    return this.db.transaction((manager) =>
      work(new Repository(this.db, manager)),
    );
  }
  private async query(sql: string, params: unknown[] = []): Promise<Row[]> {
    const result = await this.manager.query(sql, params);
    return Array.isArray(result[0]) && typeof result[1] === "number"
      ? result[0]
      : result;
  }
  async quiz(id: string, lock = false): Promise<Row | undefined> {
    return (
      await this.query(
        `SELECT * FROM quizzes WHERE id=$1 AND deleted_at IS NULL${lock ? " FOR UPDATE" : ""}`,
        [id],
      )
    )[0];
  }
  async question(quizId: string, id: string): Promise<Row | undefined> {
    return (
      await this.query("SELECT * FROM questions WHERE quiz_id=$1 AND id=$2", [
        quizId,
        id,
      ])
    )[0];
  }
  async questions(quizId: string): Promise<Row[]> {
    return this.query(
      "SELECT * FROM questions WHERE quiz_id=$1 ORDER BY position",
      [quizId],
    );
  }
  async session(code: string, lock = false): Promise<Row | undefined> {
    return (
      await this.query(
        `SELECT * FROM sessions WHERE code=$1 ORDER BY (status<>'finished') DESC,created_at DESC LIMIT 1${lock ? " FOR UPDATE" : ""}`,
        [code.toUpperCase()],
      )
    )[0];
  }
  async participants(id: string): Promise<Row[]> {
    return this.query(
      "SELECT * FROM participants WHERE session_id=$1 ORDER BY joined_at,id",
      [id],
    );
  }
  async countQuestions(id: string): Promise<number> {
    return Number(
      (
        await this.query("SELECT count(*) FROM questions WHERE quiz_id=$1", [
          id,
        ])
      )[0].count,
    );
  }
  async imageReferenced(name: string): Promise<boolean> {
    return (
      (
        await this.query(
          "SELECT 1 FROM questions WHERE image_filename=$1 UNION ALL SELECT 1 FROM session_questions WHERE image_filename=$1 LIMIT 1",
          [name],
        )
      ).length > 0
    );
  }

  countSnapshotQuestions(params: unknown[]): Promise<Row[]> {
    return this.query(
      "SELECT count(*) FROM session_questions WHERE session_id=$1",
      params,
    );
  }
  readRanking(params: unknown[]): Promise<Row[]> {
    return this.query(
      "SELECT r.*,p.display_name FROM session_results r JOIN participants p ON p.id=r.participant_id AND p.session_id=r.session_id WHERE r.session_id=$1 ORDER BY r.position,p.id",
      params,
    );
  }
  insertParticipant(params: unknown[]): Promise<Row[]> {
    return this.query(
      "INSERT INTO participants(session_id,user_id,display_name) VALUES($1,$2,$3) RETURNING *",
      params,
    );
  }
  insertSnapshotQuestion(params: unknown[]): Promise<Row[]> {
    return this.query(
      "INSERT INTO session_questions(session_id,position,statement,correct_answer,image_filename) VALUES($1,$2,$3,$4,$5)",
      params,
    );
  }
  insertSession(params: unknown[]): Promise<Row[]> {
    return this.query(
      "INSERT INTO sessions(code,quiz_id,quiz_title,host_id,question_time_seconds) VALUES($1,$2,$3,$4,$5) RETURNING *",
      params,
    );
  }
  listHostedSessions(params: unknown[]): Promise<Row[]> {
    return this.query(
      "SELECT * FROM sessions WHERE host_id=$1 ORDER BY created_at DESC",
      params,
    );
  }
  updateQuestionImage(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE questions SET image_filename=$2,updated_at=now() WHERE id=$1 RETURNING *",
      params,
    );
  }
  touchQuiz(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE quizzes SET updated_at=now() WHERE id=$1",
      params,
    );
  }
  compactQuestionPositions(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE questions SET position=position-1 WHERE quiz_id=$1 AND position>$2",
      params,
    );
  }
  deleteQuestion(params: unknown[]): Promise<Row[]> {
    return this.query("DELETE FROM questions WHERE id=$1", params);
  }
  setQuestionPosition(params: unknown[]): Promise<Row[]> {
    return this.query("UPDATE questions SET position=$2 WHERE id=$1", params);
  }
  insertQuestion(params: unknown[]): Promise<Row[]> {
    return this.query(
      "INSERT INTO questions(id,quiz_id,statement,correct_answer,position) VALUES($1,$2,$3,$4,$5)",
      params,
    );
  }
  updateQuestionContent(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE questions SET statement=$2,correct_answer=$3,updated_at=now() WHERE id=$1",
      params,
    );
  }
  softDeleteQuiz(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE quizzes SET deleted_at=now(),updated_at=now() WHERE id=$1",
      params,
    );
  }
  deleteQuizQuestions(params: unknown[]): Promise<Row[]> {
    return this.query("DELETE FROM questions WHERE quiz_id=$1", params);
  }
  updateQuiz(params: unknown[]): Promise<Row[]> {
    return this.query(
      "UPDATE quizzes SET title=$2,description=$3,updated_at=now() WHERE id=$1 RETURNING *",
      params,
    );
  }
  insertQuiz(params: unknown[]): Promise<Row[]> {
    return this.query(
      "INSERT INTO quizzes(owner_id,title,description) VALUES($1,$2,$3) RETURNING *",
      params,
    );
  }
  listOwnedQuizzes(params: unknown[]): Promise<Row[]> {
    return this.query(
      "SELECT * FROM quizzes WHERE owner_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC",
      params,
    );
  }
}
