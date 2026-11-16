import { MigrationInterface, QueryRunner } from "typeorm";

/** Explicación opcional de la respuesta; se muestra al cerrar la pregunta solo si existe. */
export class QuestionExplanation1794780006000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE questions ADD COLUMN explanation varchar(300) CHECK(explanation IS NULL OR length(trim(explanation)) > 0);
      ALTER TABLE session_questions ADD COLUMN explanation varchar(300);
      -- Las instantáneas de preguntas ya cerradas (state_sync) reciben los campos nuevos como null.
      UPDATE sessions SET last_closed = last_closed || '{"explanation":null,"nextQuestionAt":null}'::jsonb
        WHERE last_closed IS NOT NULL AND NOT (last_closed ? 'explanation');
    `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      UPDATE sessions SET last_closed = last_closed - 'explanation' - 'nextQuestionAt' WHERE last_closed IS NOT NULL;
      ALTER TABLE session_questions DROP COLUMN explanation;
      ALTER TABLE questions DROP COLUMN explanation;
    `);
  }
}
