import { MigrationInterface, QueryRunner } from "typeorm";

export class SpeedScoring1794780003000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE sessions ADD COLUMN question_opened_at timestamptz;
      UPDATE sessions SET question_opened_at = question_closes_at - question_time_seconds * interval '1 second'
        WHERE question_closes_at IS NOT NULL;
      ALTER TABLE participants ADD COLUMN streak integer NOT NULL DEFAULT 0 CHECK(streak >= 0);
      ALTER TABLE answers DROP CONSTRAINT answers_points_check;
      ALTER TABLE answers ADD CONSTRAINT answers_points_check CHECK(points >= 0 AND points <= 1000);
      -- Keep historical points unchanged while upgrading saved state_sync snapshots.
      UPDATE sessions s SET last_closed = jsonb_set(s.last_closed, '{results}', COALESCE((
        SELECT jsonb_agg(r || jsonb_build_object(
          'streak', 0,
          'elapsedMs', CASE WHEN a.id IS NULL OR s.question_opened_at IS NULL THEN NULL ELSE
            greatest(0, least(s.question_time_seconds * 1000,
              extract(epoch FROM (a.received_at - s.question_opened_at)) * 1000))::integer END
        ) ORDER BY ordinal)
        FROM jsonb_array_elements(s.last_closed->'results') WITH ORDINALITY AS result(r, ordinal)
        LEFT JOIN answers a ON a.session_id=s.id AND a.participant_id=(r->>'participantId')::uuid
          AND a.question_index=(s.last_closed->>'questionIndex')::integer
      ), '[]'::jsonb)) WHERE s.last_closed IS NOT NULL;
    `);
  }
  async down(q: QueryRunner): Promise<void> {
    // Reject rollback if new scores exist rather than silently discarding points.
    await q.query(`
      ALTER TABLE answers DROP CONSTRAINT answers_points_check;
      ALTER TABLE answers ADD CONSTRAINT answers_points_check CHECK(points IN (0,1));
      UPDATE sessions s SET last_closed = jsonb_set(s.last_closed, '{results}', COALESCE((
        SELECT jsonb_agg(r - 'elapsedMs' - 'streak' ORDER BY ordinal)
        FROM jsonb_array_elements(s.last_closed->'results') WITH ORDINALITY AS result(r, ordinal)
      ), '[]'::jsonb)) WHERE s.last_closed IS NOT NULL;
      ALTER TABLE participants DROP COLUMN streak;
      ALTER TABLE sessions DROP COLUMN question_opened_at;
    `);
  }
}
