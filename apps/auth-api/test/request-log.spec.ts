import request from 'supertest';
import { createApp } from '../src/app';
import { MemoryProfiles, testSettings } from './helpers';

test('HTTP genera JSON sin credenciales, cabeceras, cuerpos ni URLs privadas', async () => {
  const profiles = new MemoryProfiles();
  const { app } = await createApp(testSettings(), profiles);
  await app.init();
  const lines: string[] = [];
  const output = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
  try {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login?token=query-secret')
      .set('Authorization', 'Bearer header-secret')
      .set('X-Request-Id', 'request-id-secret')
      .set('X-Forwarded-For', '203.0.113.123')
      .send({ email: 'private@example.com', password: 'PasswordPrivate123' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/missing/private-name?password=url-secret')
      .expect(404);
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    jest
      .spyOn(profiles, 'findByEmail')
      .mockRejectedValue(new Error('error-secret'));
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'private@example.com', password: 'PasswordPrivate123' })
      .expect(500);
    const rows = lines.map((line) => JSON.parse(line));
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.level)).toEqual([
      'warn',
      'warn',
      'info',
      'error',
    ]);
    expect(rows.map((row) => row.route)).toEqual([
      '/api/v1/auth/login',
      'unmatched',
      '/api/v1/health',
      '/api/v1/auth/login',
    ]);
    expect(new Set(rows.map((row) => row.requestId)).size).toBe(4);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(
        [
          'ts',
          'level',
          'service',
          'method',
          'route',
          'status',
          'duration_ms',
          'requestId',
        ].sort(),
      );
      expect(row.service).toBe('auth-api');
      expect(row.duration_ms).toBeGreaterThanOrEqual(0);
      expect(row.requestId).toMatch(/^[0-9a-f-]{36}$/);
      expect(Number.isNaN(Date.parse(row.ts))).toBe(false);
    }
    expect(lines.join('')).not.toMatch(
      /private@example|PasswordPrivate|header-secret|query-secret|request-id-secret|203\.0\.113|private-name|url-secret|error-secret/,
    );
  } finally {
    output.mockRestore();
    await app.close();
  }
});
