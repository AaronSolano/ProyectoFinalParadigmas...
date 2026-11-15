import { DataSource, EntityManager } from "typeorm";
import { GameStore, GameTransaction } from "../domain/ports/game-store";
import {
  GameError,
  GameSession,
  GameParticipant,
  GameQuestion,
  GameAnswer,
  QuestionClosed,
  RankingEntry,
} from "../domain/game";
export class PostgresGameStore implements GameStore {
  constructor(private readonly db: DataSource) {}
  async transaction<T>(
    code: string,
    work: (tx: GameTransaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (manager) => {
      const [s] = await manager.query(
        `SELECT * FROM sessions WHERE code=$1 ORDER BY (status<>'finished') DESC,created_at DESC LIMIT 1 FOR UPDATE`,
        [code],
      );
      if (!s)
        throw new GameError(
          "ROOM_NOT_FOUND",
          "No existe una sala con ese código.",
        );
      const session: GameSession = {
        id: s.id,
        code: s.code,
        hostId: s.host_id,
        status: s.game_state,
        questionTimeSeconds: s.question_time_seconds,
        currentIndex: s.current_question_index,
        closesAt: s.question_closes_at
          ? new Date(s.question_closes_at).getTime()
          : null,
        lastClosed: s.last_closed,
      };
      return work(new PostgresGameTransaction(manager, session));
    });
  }
  async openSessions() {
    const rows = await this.db.query(
      `SELECT code,question_closes_at FROM sessions WHERE game_state='question_open'`,
    );
    return rows.map((r: any) => ({
      code: r.code,
      closesAt: new Date(r.question_closes_at).getTime(),
    }));
  }
}
class PostgresGameTransaction implements GameTransaction {
  constructor(
    private readonly manager: EntityManager,
    public readonly session: GameSession,
  ) {}
  async participants(): Promise<GameParticipant[]> {
    const rows = await this.manager.query(
      "SELECT * FROM participants WHERE session_id=$1 ORDER BY joined_at,id",
      [this.session.id],
    );
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      displayName: r.display_name,
      score: r.score,
      active: r.active,
    }));
  }
  async questions(): Promise<GameQuestion[]> {
    const rows = await this.manager.query(
      "SELECT * FROM session_questions WHERE session_id=$1 ORDER BY position",
      [this.session.id],
    );
    return rows.map((r: any) => ({
      index: r.position,
      statement: r.statement,
      correctAnswer: r.correct_answer,
      imageFilename: r.image_filename,
    }));
  }
  async answers(index: number): Promise<GameAnswer[]> {
    const rows = await this.manager.query(
      "SELECT * FROM answers WHERE session_id=$1 AND question_index=$2",
      [this.session.id, index],
    );
    return rows.map((r: any) => ({
      participantId: r.participant_id,
      questionIndex: r.question_index,
      answer: r.answer,
    }));
  }
  async join(userId: string, name: string): Promise<GameParticipant> {
    await this.manager.query(
      `INSERT INTO participants(session_id,user_id,display_name) VALUES($1,$2,$3) ON CONFLICT(session_id,user_id) DO UPDATE SET active=true`,
      [this.session.id, userId, name],
    );
    return (await this.participants()).find((p) => p.userId === userId)!;
  }
  async leave(id: string) {
    await this.manager.query(
      "UPDATE participants SET active=false WHERE id=$1 AND session_id=$2",
      [id, this.session.id],
    );
  }
  async insertAnswer(
    id: string,
    index: number,
    answer: boolean,
    receivedAt: number,
  ) {
    const rows = await this.manager.query(
      `INSERT INTO answers(session_id,participant_id,question_index,answer,received_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(session_id,participant_id,question_index) DO NOTHING RETURNING id`,
      [this.session.id, id, index, answer, new Date(receivedAt)],
    );
    return rows.length === 1;
  }
  async open(index: number, closesAt: number, now: number) {
    await this.manager.query(
      `UPDATE sessions SET status='in_progress',game_state='question_open',current_question_index=$2,question_closes_at=$3,last_closed=NULL,started_at=COALESCE(started_at,$4) WHERE id=$1`,
      [this.session.id, index, new Date(closesAt), new Date(now)],
    );
    Object.assign(this.session, {
      status: "question_open",
      currentIndex: index,
      closesAt,
      lastClosed: null,
    });
  }
  async close(result: QuestionClosed) {
    for (const r of result.results) {
      await this.manager.query(
        "UPDATE participants SET score=$3 WHERE session_id=$1 AND id=$2",
        [this.session.id, r.participantId, r.totalScore],
      );
      await this.manager.query(
        "UPDATE answers SET is_correct=$4,points=$5 WHERE session_id=$1 AND participant_id=$2 AND question_index=$3",
        [
          this.session.id,
          r.participantId,
          result.questionIndex,
          r.correct,
          r.pointsAwarded,
        ],
      );
    }
    await this.manager.query(
      `UPDATE sessions SET game_state='question_closed',last_closed=$2::jsonb WHERE id=$1`,
      [this.session.id, JSON.stringify(result)],
    );
    Object.assign(this.session, {
      status: "question_closed",
      lastClosed: result,
    });
  }
  async finish(ranking: RankingEntry[], now: number) {
    for (const r of ranking)
      await this.manager.query(
        `INSERT INTO session_results(session_id,participant_id,position,score,correct_answers) SELECT $1,$2,$3,$4,count(*) FILTER(WHERE is_correct) FROM answers WHERE session_id=$1 AND participant_id=$2`,
        [this.session.id, r.participantId, r.position, r.score],
      );
    await this.manager.query(
      `UPDATE sessions SET status='finished',game_state='finished',question_closes_at=NULL,finished_at=$2 WHERE id=$1`,
      [this.session.id, new Date(now)],
    );
    Object.assign(this.session, { status: "finished", closesAt: null });
  }
}
