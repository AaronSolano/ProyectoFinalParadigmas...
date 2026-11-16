import { MigrationInterface, QueryRunner } from "typeorm";
import { LIBRARY, LIBRARY_OWNER_ID, stableUuid } from "./library-data";

/** Biblioteca compartida de cuestionarios (cultura general y tecnología), de solo lectura para los docentes. */
export class QuizLibrary1794780005000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE quizzes ADD COLUMN category varchar(40);
      ALTER TABLE quizzes ADD COLUMN is_library boolean NOT NULL DEFAULT false;
      CREATE INDEX quizzes_library_idx ON quizzes(category, title) WHERE is_library AND deleted_at IS NULL;
    `);
    for (const quiz of LIBRARY) {
      const id = stableUuid(`quiz:${quiz.slug}`);
      await q.query(
        "INSERT INTO quizzes(id,owner_id,title,description,category,is_library) VALUES($1,$2,$3,$4,$5,true) ON CONFLICT(id) DO NOTHING",
        [id, LIBRARY_OWNER_ID, quiz.title, quiz.description, quiz.category],
      );
      for (const [index, question] of quiz.questions.entries())
        await q.query(
          "INSERT INTO questions(id,quiz_id,statement,options,correct_option,position) VALUES($1,$2,$3,$4::jsonb,$5,$6) ON CONFLICT(id) DO NOTHING",
          [
            stableUuid(`question:${quiz.slug}:${index}`),
            id,
            question.statement,
            JSON.stringify(question.options),
            question.correctOption,
            index + 1,
          ],
        );
    }
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DELETE FROM quizzes WHERE is_library=true AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.quiz_id=quizzes.id);
      DROP INDEX quizzes_library_idx;
      ALTER TABLE quizzes DROP COLUMN is_library, DROP COLUMN category;
    `);
  }
}
