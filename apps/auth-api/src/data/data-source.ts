import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ProfileEntity } from './profiles';
import { Profiles1794780000000 } from './migrations/1794780000000-Profiles';
import { connectionOptions, connectionUrl } from './connection-options';
export function createDataSource(
  url: string,
  ssl = false,
  ca?: string,
  schema = 'public',
) {
  return new DataSource({
    type: 'postgres',
    url: connectionUrl(url),
    ...connectionOptions(ssl, ca, schema),
    entities: [ProfileEntity],
    migrations: [Profiles1794780000000],
    synchronize: false,
  });
}
export default createDataSource(
  process.env.AUTH_DATABASE_URL ?? 'postgresql://localhost/auth',
  process.env.DATABASE_SSL === 'true',
  process.env.DATABASE_SSL_CA,
  process.env.DATABASE_SCHEMA,
);
