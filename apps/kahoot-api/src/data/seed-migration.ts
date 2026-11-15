import { MigrationInterface, QueryRunner } from "typeorm";

export class DemoSeedHistory1794780001000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE demo_seed_versions (
      name text PRIMARY KEY,
      version integer NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE demo_seed_versions");
  }
}
