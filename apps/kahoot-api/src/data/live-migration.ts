import { MigrationInterface, QueryRunner } from "typeorm";
export class LiveGame1794780002000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE sessions ADD COLUMN game_state varchar(16) NOT NULL DEFAULT 'waiting'
        CHECK(game_state IN ('waiting','question_open','question_closed','finished'));
      UPDATE sessions SET game_state=CASE WHEN status='finished' THEN 'finished' WHEN status='in_progress' AND question_closes_at IS NOT NULL THEN 'question_open' WHEN status='in_progress' THEN 'question_closed' ELSE 'waiting' END;
      ALTER TABLE sessions ADD COLUMN last_closed jsonb;
      ALTER TABLE participants ADD COLUMN active boolean NOT NULL DEFAULT true;
      CREATE TABLE answers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        participant_id uuid NOT NULL, question_index integer NOT NULL CHECK(question_index>=0), answer boolean NOT NULL,
        received_at timestamptz NOT NULL, is_correct boolean NOT NULL DEFAULT false, points integer NOT NULL DEFAULT 0 CHECK(points IN (0,1)),
        UNIQUE(session_id,participant_id,question_index),
        FOREIGN KEY(participant_id,session_id) REFERENCES participants(id,session_id),
        FOREIGN KEY(session_id,question_index) REFERENCES session_questions(session_id,position)
      );
      CREATE INDEX answers_session_question_idx ON answers(session_id,question_index);
      CREATE INDEX answers_participant_idx ON answers(participant_id);
      CREATE INDEX sessions_open_question_idx ON sessions(question_closes_at) WHERE game_state='question_open';
    `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DROP TABLE answers; DROP INDEX sessions_open_question_idx; ALTER TABLE participants DROP COLUMN active; ALTER TABLE sessions DROP COLUMN last_closed, DROP COLUMN game_state;`,
    );
  }
}
