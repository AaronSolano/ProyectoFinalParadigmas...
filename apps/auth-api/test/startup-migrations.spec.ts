import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { testSettings } from './helpers';
import { settings } from '../src/config/settings';
import { startServer } from '../src/main';
import { createDataSource } from '../src/data/data-source';
import { runStartupMigrations } from '../src/data/startup-migrations';
test('RUN_MIGRATIONS es true por defecto y solo acepta true/false', () => {
  const config = testSettings();
  const env = {
    JWT_PRIVATE_KEY: config.privateKey,
    JWT_PUBLIC_KEY: config.publicKey,
    JWT_KEY_ID: config.keyId,
    AUTH_DATABASE_URL: config.databaseUrl,
  };
  expect(config.runMigrations).toBe(true);
  expect(settings({ ...env, RUN_MIGRATIONS: 'false' }).runMigrations).toBe(
    false,
  );
  expect(() => settings({ ...env, RUN_MIGRATIONS: 'no' })).toThrow(
    'RUN_MIGRATIONS',
  );
});
const suite = process.env.AUTH_TEST_DATABASE_URL ? describe : describe.skip;
suite('migraciones de auth al arrancar con PostgreSQL real', () => {
  let admin: DataSource, url: string;
  const name = `auth_start_${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    admin = new DataSource({
      type: 'postgres',
      url: process.env.AUTH_TEST_DATABASE_URL,
    });
    await admin.initialize();
    await admin.query(`CREATE DATABASE "${name}"`);
    const parsed = new URL(process.env.AUTH_TEST_DATABASE_URL!);
    parsed.pathname = `/${name}`;
    url = parsed.toString();
  });
  afterAll(async () => {
    if (admin?.isInitialized) {
      try {
        await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      } finally {
        await admin.destroy();
      }
    }
  });
  test('dos arranques simultáneos migran una base vacía antes de escuchar', async () => {
    const config = { ...testSettings(), databaseUrl: url, port: 0 };
    const db = await createDataSource(url).initialize();
    try {
      await runStartupMigrations(db, false);
      expect(
        (await db.query("SELECT to_regclass('profiles') AS name"))[0].name,
      ).toBeNull();
    } finally {
      await db.destroy();
    }
    const servers = await Promise.allSettled([
      startServer(config),
      startServer(config),
    ]);
    try {
      expect(servers.every((s) => s.status === 'fulfilled')).toBe(true);
      for (const result of servers)
        if (result.status === 'fulfilled') {
          const { app, db } = result.value;
          expect(
            (await db.query('SELECT name FROM migrations')).map(
              (r: { name: string }) => r.name,
            ),
          ).toEqual(['Profiles1794780000000']);
          expect(
            (
              await fetch(
                `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1/health`,
              )
            ).status,
          ).toBe(200);
        }
    } finally {
      await Promise.all(
        servers.map((s) =>
          s.status === 'fulfilled' ? s.value.close() : Promise.resolve(),
        ),
      );
    }
    const external = await startServer({ ...config, runMigrations: false });
    await external.close();
  });
});
