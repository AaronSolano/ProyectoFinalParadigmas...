import { DataSource, EntityManager } from "typeorm";
import { UnitOfWork, Repositories } from "../domain/ports";
import { PostgresQuizRepository } from "./quiz-repository";
import { PostgresSessionRepository } from "./session-repository";
export function repositories(
  db: DataSource,
  manager: EntityManager = db.manager,
): Repositories {
  return {
    quizzes: new PostgresQuizRepository(db, manager),
    sessions: new PostgresSessionRepository(db, manager),
  };
}
export class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly db: DataSource) {}
  transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    return this.db.transaction((manager) =>
      work(repositories(this.db, manager)),
    );
  }
}
