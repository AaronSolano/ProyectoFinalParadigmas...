import { randomUUID } from 'node:crypto';
import { createDataSource } from '../src/data/data-source';
import { seedDemoProfile } from '../src/data/seed';
import { ArgonPasswords } from '../src/data/credentials';
const suite = process.env.AUTH_TEST_DATABASE_URL ? describe : describe.skip;
suite('idempotent demo profile in PostgreSQL', () => {
  test('two runs keep one identity and its original password hash; conflicting identity is rejected', async () => {
    const db = await createDataSource(
      process.env.AUTH_TEST_DATABASE_URL!,
    ).initialize();
    try {
      await db.runMigrations();
      const env = {
        DEMO_PROFILE_ID: randomUUID(),
        DEMO_EMAIL: `demo${Date.now()}@example.com`,
        DEMO_PASSWORD: 'DemoPassword2026',
      };
      const first = await seedDemoProfile(db, env);
      const before = await db.query('SELECT * FROM profiles WHERE id=$1', [
        first.id,
      ]);
      await seedDemoProfile(db, env);
      const after = await db.query('SELECT * FROM profiles WHERE id=$1', [
        first.id,
      ]);
      expect(after).toEqual(before);
      expect(
        await new ArgonPasswords().verify(
          after[0].password_hash,
          env.DEMO_PASSWORD,
        ),
      ).toBe(true);
      await expect(
        seedDemoProfile(db, { ...env, DEMO_PROFILE_ID: randomUUID() }),
      ).rejects.toThrow('conflicto');
      await expect(
        seedDemoProfile(db, { ...env, DEMO_PASSWORD: '' }),
      ).rejects.toThrow('DEMO_PASSWORD');
    } finally {
      await db.destroy();
    }
  });
});
