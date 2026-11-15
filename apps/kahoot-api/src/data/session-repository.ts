import { SqlAdapter, Row } from "./sql-adapter";
import { SessionRepository, DuplicateRoomCode } from "../domain/ports";
import { Quiz, Question } from "../domain/entities";
import { sessionFromRow, participantFromRow, rankingFromRow } from "./mappers";
export class PostgresSessionRepository
  extends SqlAdapter
  implements SessionRepository
{
  private async session(row: Row) {
    return sessionFromRow(row, (await this.rawParticipants(row.id)).length);
  }
  async findByCode(code: string, lock = false) {
    const row = await this.rawSession(code, lock);
    return row ? this.session(row) : undefined;
  }
  async listHosted(id: string) {
    return Promise.all(
      (await this.rawListHostedSessions([id])).map((r) => this.session(r)),
    );
  }
  async participants(id: string) {
    return (await this.rawParticipants(id)).map(participantFromRow);
  }
  async createWithSnapshot(
    code: string,
    quiz: Quiz,
    hostId: string,
    seconds: number,
    questions: Question[],
  ) {
    try {
      const row = (
        await this.rawInsertSession([
          code,
          quiz.id,
          quiz.title,
          hostId,
          seconds,
        ])
      )[0];
      for (const [position, q] of questions.entries())
        await this.rawInsertSnapshotQuestion([
          row.id,
          position,
          q.statement,
          q.correctAnswer,
          q.imageFilename,
        ]);
      return this.session(row);
    } catch (error) {
      if ((error as { code?: string }).code === "23505")
        throw new DuplicateRoomCode();
      throw error;
    }
  }
  async addParticipant(sessionId: string, userId: string, name: string) {
    return participantFromRow(
      (await this.rawInsertParticipant([sessionId, userId, name]))[0],
    );
  }
  async countSnapshotQuestions(id: string) {
    return Number((await this.rawCountSnapshotQuestions([id]))[0].count);
  }
  async ranking(id: string) {
    return (await this.rawReadRanking([id])).map(rankingFromRow);
  }

  private async rawSession(
    code: string,
    lock = false,
  ): Promise<Row | undefined> {
    return (
      await this.query(
        `SELECT * FROM sessions WHERE code=$1 ORDER BY (status<>'finished') DESC,created_at DESC LIMIT 1${lock ? " FOR UPDATE" : ""}`,
        [code.toUpperCase()],
      )
    )[0];
  }
  private async rawParticipants(id: string): Promise<Row[]> {
    return this.query(
      "SELECT * FROM participants WHERE session_id=$1 ORDER BY joined_at,id",
      [id],
    );
  }
  private rawCountSnapshotQuestions(params: unknown[]): Promise<Row[]> {
    return this.query(
      "SELECT count(*) FROM session_questions WHERE session_id=$1",
      params,
    );
  }
  private rawReadRanking(params: unknown[]): Promise<Row[]> {
    return this.query(
      "SELECT r.*,p.display_name FROM session_results r JOIN participants p ON p.id=r.participant_id AND p.session_id=r.session_id WHERE r.session_id=$1 ORDER BY r.position,p.id",
      params,
    );
  }
  private rawInsertParticipant(params: unknown[]): Promise<Row[]> {
    return this.query(
      "INSERT INTO participants(session_id,user_id,display_name) VALUES($1,$2,$3) RETURNING *",
      params,
    );
  }
  private rawInsertSnapshotQuestion(params: unknown[]): Promise<Row[]> {
    return this.query(
      "INSERT INTO session_questions(session_id,position,statement,correct_answer,image_filename) VALUES($1,$2,$3,$4,$5)",
      params,
    );
  }
  private rawInsertSession(params: unknown[]): Promise<Row[]> {
    return this.query(
      "INSERT INTO sessions(code,quiz_id,quiz_title,host_id,question_time_seconds) VALUES($1,$2,$3,$4,$5) RETURNING *",
      params,
    );
  }
  private rawListHostedSessions(params: unknown[]): Promise<Row[]> {
    return this.query(
      "SELECT * FROM sessions WHERE host_id=$1 ORDER BY created_at DESC",
      params,
    );
  }
}
