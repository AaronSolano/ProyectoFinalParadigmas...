import { MigrationInterface, QueryRunner } from "typeorm";

/** Las preguntas pasan de Verdadero/Falso a 2-4 opciones; V/F queda como pregunta de 2 opciones. */
export class MultipleChoice1794780004000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE questions ADD COLUMN options jsonb NOT NULL DEFAULT '["Verdadero","Falso"]'::jsonb;
      ALTER TABLE questions ADD COLUMN correct_option integer NOT NULL DEFAULT 0;
      UPDATE questions SET correct_option = CASE WHEN correct_answer THEN 0 ELSE 1 END;
      ALTER TABLE questions DROP COLUMN correct_answer;
      ALTER TABLE questions ALTER COLUMN options DROP DEFAULT, ALTER COLUMN correct_option DROP DEFAULT;
      ALTER TABLE questions ADD CONSTRAINT questions_options_check CHECK(
        jsonb_typeof(options)='array' AND jsonb_array_length(options) BETWEEN 2 AND 4
        AND correct_option >= 0 AND correct_option < jsonb_array_length(options));

      ALTER TABLE session_questions ADD COLUMN options jsonb NOT NULL DEFAULT '["Verdadero","Falso"]'::jsonb;
      ALTER TABLE session_questions ADD COLUMN correct_option integer NOT NULL DEFAULT 0;
      UPDATE session_questions SET correct_option = CASE WHEN correct_answer THEN 0 ELSE 1 END;
      ALTER TABLE session_questions DROP COLUMN correct_answer;
      ALTER TABLE session_questions ALTER COLUMN options DROP DEFAULT, ALTER COLUMN correct_option DROP DEFAULT;
      ALTER TABLE session_questions ADD CONSTRAINT session_questions_options_check CHECK(
        jsonb_typeof(options)='array' AND jsonb_array_length(options) BETWEEN 2 AND 4
        AND correct_option >= 0 AND correct_option < jsonb_array_length(options));

      ALTER TABLE answers ADD COLUMN option_index integer;
      UPDATE answers SET option_index = CASE WHEN answer THEN 0 ELSE 1 END;
      ALTER TABLE answers ALTER COLUMN option_index SET NOT NULL;
      ALTER TABLE answers ADD CONSTRAINT answers_option_check CHECK(option_index BETWEEN 0 AND 3);
      ALTER TABLE answers DROP COLUMN answer;

      -- Instantáneas guardadas de preguntas cerradas (state_sync): correctAnswer -> correctOption.
      UPDATE sessions SET last_closed = (last_closed - 'correctAnswer') ||
        jsonb_build_object('correctOption', CASE WHEN (last_closed->>'correctAnswer')::boolean THEN 0 ELSE 1 END)
        WHERE last_closed IS NOT NULL AND last_closed ? 'correctAnswer';
    `);
  }
  /** Reversión con pérdida: solo se conserva si la opción correcta era la primera (Verdadero). */
  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE questions ADD COLUMN correct_answer boolean;
      UPDATE questions SET correct_answer = (correct_option = 0);
      ALTER TABLE questions ALTER COLUMN correct_answer SET NOT NULL;
      ALTER TABLE questions DROP CONSTRAINT questions_options_check, DROP COLUMN options, DROP COLUMN correct_option;
      ALTER TABLE session_questions ADD COLUMN correct_answer boolean;
      UPDATE session_questions SET correct_answer = (correct_option = 0);
      ALTER TABLE session_questions ALTER COLUMN correct_answer SET NOT NULL;
      ALTER TABLE session_questions DROP CONSTRAINT session_questions_options_check, DROP COLUMN options, DROP COLUMN correct_option;
      ALTER TABLE answers ADD COLUMN answer boolean;
      UPDATE answers SET answer = (option_index = 0);
      ALTER TABLE answers ALTER COLUMN answer SET NOT NULL;
      ALTER TABLE answers DROP CONSTRAINT answers_option_check, DROP COLUMN option_index;
      UPDATE sessions SET last_closed = (last_closed - 'correctOption') ||
        jsonb_build_object('correctAnswer', ((last_closed->>'correctOption')::integer = 0))
        WHERE last_closed IS NOT NULL AND last_closed ? 'correctOption';
    `);
  }
}
