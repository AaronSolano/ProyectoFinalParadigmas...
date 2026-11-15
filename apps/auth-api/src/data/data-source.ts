import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ProfileEntity } from './profiles';
import { Profiles1794780000000 } from './migrations/1794780000000-Profiles';
export function createDataSource(url: string, ssl = false) {
  return new DataSource({
    type: 'postgres',
    url,
    ssl: ssl ? { rejectUnauthorized: true } : false,
    entities: [ProfileEntity],
    migrations: [Profiles1794780000000],
    synchronize: false,
  });
}
export default createDataSource(
  process.env.AUTH_DATABASE_URL ?? 'postgresql://localhost/auth',
  process.env.DATABASE_SSL === 'true',
);
