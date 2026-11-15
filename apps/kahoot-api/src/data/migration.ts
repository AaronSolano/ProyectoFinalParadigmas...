import { MigrationInterface, QueryRunner } from "typeorm";
export class InitialKahoot1794780000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
    CREATE TABLE quizzes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, title varchar(120) NOT NULL CHECK(length(trim(title))>0), description text NOT NULL DEFAULT '' CHECK(length(description)<=500), deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX quizzes_owner_idx ON quizzes(owner_id, created_at DESC);
    CREATE TABLE questions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE, statement text NOT NULL CHECK(length(trim(statement)) BETWEEN 1 AND 500), correct_answer boolean NOT NULL, image_filename varchar(255), position integer NOT NULL CHECK(position>=1), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(quiz_id,position) DEFERRABLE INITIALLY DEFERRED);
    CREATE TABLE sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code char(6) NOT NULL CHECK(code ~ '^[2-9A-HJ-NP-Z]{6}$'), quiz_id uuid NOT NULL REFERENCES quizzes(id), quiz_title varchar(120) NOT NULL, host_id uuid NOT NULL, status varchar(16) NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','in_progress','finished')), question_time_seconds integer NOT NULL CHECK(question_time_seconds BETWEEN 5 AND 120), current_question_index integer, question_closes_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, finished_at timestamptz, CHECK(status <> 'waiting' OR current_question_index IS NULL), CHECK(question_closes_at IS NULL OR status='in_progress'));
    CREATE UNIQUE INDEX sessions_code_active_uk ON sessions(code) WHERE status <> 'finished';
    CREATE INDEX sessions_host_idx ON sessions(host_id,created_at DESC);
    CREATE INDEX sessions_quiz_idx ON sessions(quiz_id);
    CREATE TABLE session_questions (session_id uuid REFERENCES sessions(id) ON DELETE CASCADE, position integer NOT NULL CHECK(position>=0), statement text NOT NULL, correct_answer boolean NOT NULL, image_filename varchar(255), PRIMARY KEY(session_id,position));
    CREATE TABLE participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, user_id uuid NOT NULL, display_name varchar(40) NOT NULL, score integer NOT NULL DEFAULT 0 CHECK(score>=0), joined_at timestamptz NOT NULL DEFAULT now(), UNIQUE(session_id,user_id), UNIQUE(id,session_id));
    CREATE INDEX participants_session_score_idx ON participants(session_id,score DESC);
    CREATE TABLE session_results (session_id uuid NOT NULL REFERENCES sessions(id), participant_id uuid NOT NULL, position integer NOT NULL CHECK(position>=1), score integer NOT NULL CHECK(score>=0), correct_answers integer NOT NULL CHECK(correct_answers>=0), PRIMARY KEY(session_id,participant_id), FOREIGN KEY(participant_id,session_id) REFERENCES participants(id,session_id));
  `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      "DROP TABLE session_results, participants, session_questions, sessions, questions, quizzes",
    );
  }
}
