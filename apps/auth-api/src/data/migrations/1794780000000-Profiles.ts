import { MigrationInterface, QueryRunner } from 'typeorm';
export class Profiles1794780000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS citext');
    await queryRunner.query(
      `CREATE TABLE profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email citext NOT NULL UNIQUE, display_name varchar(40) NOT NULL CHECK (char_length(trim(display_name)) >= 2), password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE profiles');
  }
}
