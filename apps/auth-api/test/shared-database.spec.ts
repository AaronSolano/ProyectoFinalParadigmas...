import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DataSource } from 'typeorm';
import { createDataSource } from '../src/data/data-source';
import { runStartupMigrations as migrateAuth } from '../src/data/startup-migrations';
import { PostgresProfiles } from '../src/data/profiles';
import { database } from '../../kahoot-api/src/data/database';
import { loadConfig } from '../../kahoot-api/src/config/config';
import { runStartupMigrations as migrateKahoot } from '../../kahoot-api/src/data/startup-migrations';

const suite = process.env.AUTH_TEST_DATABASE_URL ? describe : describe.skip;
suite('dos APIs en una sola base con esquemas aislados', () => {
  let admin: DataSource, auth: DataSource, kahoot: DataSource, url: string;
  let images: string;
  const name = `shared_${randomUUID().replaceAll('-', '')}`;
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
    images = await mkdtemp(join(tmpdir(), 'shared-schema-'));
  });
  afterAll(async () => {
    await Promise.all([
      auth?.isInitialized ? auth.destroy() : undefined,
      kahoot?.isInitialized ? kahoot.destroy() : undefined,
    ]);
    if (images) await rm(images, { recursive: true, force: true });
    if (admin?.isInitialized) {
      try {
        await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      } finally {
        await admin.destroy();
      }
    }
  });
  test('migraciones simultáneas, conexiones nuevas y ambos scripts de seed respetan el esquema', async () => {
    // Supabase can already have citext installed in its extensions schema.
    const setup = await new DataSource({ type: 'postgres', url }).initialize();
    try {
      await setup.query(
        'CREATE SCHEMA extensions; CREATE EXTENSION citext WITH SCHEMA extensions',
      );
    } finally {
      await setup.destroy();
    }
    const authOptions = createDataSource(url, false, undefined, 'auth').options;
    auth = new DataSource({
      ...authOptions,
      extra: { ...authOptions.extra, maxUses: 1 },
    });
    const config = loadConfig({
      KAHOOT_DATABASE_URL: url,
      AUTH_BASE_URL: 'http://localhost:3001',
      PUBLIC_API_URL: 'http://localhost:3002',
      DATABASE_SCHEMA: 'kahoot',
    });
    const kahootOptions = database(config).options;
    kahoot = new DataSource({
      ...kahootOptions,
      extra: { ...kahootOptions.extra, maxUses: 1 },
    });
    await Promise.all([auth.initialize(), kahoot.initialize()]);
    await Promise.all([migrateAuth(auth), migrateKahoot(kahoot)]);
    expect(
      (await auth.query('SELECT name FROM migrations')).map(
        (r: { name: string }) => r.name,
      ),
    ).toEqual(['Profiles1794780000000']);
    expect(
      (
        await kahoot.query('SELECT name FROM migrations ORDER BY timestamp')
      ).map((r: { name: string }) => r.name),
    ).toEqual([
      'InitialKahoot1794780000000',
      'DemoSeedHistory1794780001000',
      'LiveGame1794780002000',
      'SpeedScoring1794780003000',
      'MultipleChoice1794780004000',
      'QuizLibrary1794780005000',
      'QuestionExplanation1794780006000',
      'LibraryExplanations1794780007000',
      'SessionAutoAdvance1794780008000',
    ]);
    expect(
      (await auth.query("SELECT to_regclass('public.migrations') AS name"))[0]
        .name,
    ).toBeNull();
    for (const [db, schema] of [
      [auth, 'auth'],
      [kahoot, 'kahoot'],
    ] as const) {
      const runners = Array.from({ length: 3 }, () => db.createQueryRunner());
      try {
        const states = await Promise.all(
          runners.map(async (runner) => {
            await runner.connect();
            return (
              await runner.query(
                'SELECT current_schema() AS schema, pg_backend_pid() AS pid',
              )
            )[0];
          }),
        );
        expect(states.map((s: { schema: string }) => s.schema)).toEqual([
          schema,
          schema,
          schema,
        ]);
        expect(new Set(states.map((s: { pid: number }) => s.pid)).size).toBe(3);
      } finally {
        await Promise.all(runners.map((runner) => runner.release()));
      }
    }
    const env = {
      ...process.env,
      DATABASE_SSL: 'false',
      AUTH_DATABASE_URL: url,
      KAHOOT_DATABASE_URL: url,
      AUTH_BASE_URL: 'http://localhost:3001',
      PUBLIC_API_URL: 'http://localhost:3002',
      IMAGE_STORAGE_PATH: images,
      DEMO_PASSWORD: 'DemoPassword2026',
    };
    const loader = require.resolve('tsx/cli');
    const authSeed = join(__dirname, '../src/data/seed.ts');
    const kahootSeed = join(__dirname, '../../kahoot-api/src/seed.ts');
    for (let i = 0; i < 2; i++) {
      execFileSync(process.execPath, [loader, authSeed], {
        env: { ...env, DATABASE_SCHEMA: 'auth' },
        stdio: 'pipe',
      });
      execFileSync(process.execPath, [loader, kahootSeed], {
        env: { ...env, DATABASE_SCHEMA: 'kahoot' },
        stdio: 'pipe',
      });
    }
    expect((await auth.query('SELECT count(*) FROM profiles'))[0].count).toBe(
      '1',
    );
    expect(
      (
        await kahoot.query('SELECT count(*) FROM quizzes WHERE NOT is_library')
      )[0].count,
    ).toBe('1');
    expect(
      (
        await kahoot.query(
          'SELECT count(*) FROM questions q JOIN quizzes z ON z.id=q.quiz_id WHERE NOT z.is_library',
        )
      )[0].count,
    ).toBe('5');
    expect(
      await new PostgresProfiles(auth).findByEmail('DOCENTE.DEMO@EXAMPLE.COM'),
    ).not.toBeNull();
    expect(
      (await auth.query("SELECT to_regclass('public.profiles') AS name"))[0]
        .name,
    ).toBeNull();
    expect(
      (await kahoot.query("SELECT to_regclass('public.quizzes') AS name"))[0]
        .name,
    ).toBeNull();
    await Promise.all([migrateAuth(auth), migrateKahoot(kahoot)]);
  });
});
