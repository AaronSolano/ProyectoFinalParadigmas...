import { MigrationInterface, QueryRunner } from "typeorm";

/** Tiempo de avance automático por sala, elegido por quien la crea (0 lo desactiva). */
export class SessionAutoAdvance1794780008000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE sessions ADD COLUMN auto_advance_seconds integer NOT NULL DEFAULT 5
        CHECK(auto_advance_seconds BETWEEN 0 AND 60);
    `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query("ALTER TABLE sessions DROP COLUMN auto_advance_seconds");
  }
}
