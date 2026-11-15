import { DataSource, EntityManager } from "typeorm";
export type Row = Record<string, any>;
export class SqlAdapter {
  constructor(
    protected readonly db: DataSource,
    protected readonly manager: EntityManager = db.manager,
  ) {}
  protected async query(sql: string, params: unknown[] = []): Promise<Row[]> {
    const result = await this.manager.query(sql, params);
    return Array.isArray(result[0]) && typeof result[1] === "number"
      ? result[0]
      : result;
  }
}
