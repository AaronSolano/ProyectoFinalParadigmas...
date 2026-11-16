import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createApp } from '../src/app';
import { AuthService } from '../src/application/auth-service';
import { ArgonPasswords, RsaTokens } from '../src/data/credentials';
import { MemoryProfiles, testSettings } from './helpers';
import { settings } from '../src/config/settings';

const config = testSettings();
describe('invitados efímeros', () => {
  test('no consulta ni escribe perfiles, genera UUID distintos, firma RS256 y dura 6h', () => {
    const repo = new MemoryProfiles();
    const create = jest.spyOn(repo, 'create');
    const find = jest.spyOn(repo, 'findById');
    const service = new AuthService(
      repo,
      new ArgonPasswords(),
      new RsaTokens(config),
    );
    const first = service.guest('  Mapache  ');
    expect(first.guest.displayName).toBe('Mapache');
    expect(first.guest.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(service.guest('Mapache').guest.id).not.toBe(first.guest.id);
    expect(first.expiresIn).toBe(21600);
    const claims = new JwtService().verify(first.accessToken, {
      publicKey: config.publicKey,
      algorithms: ['RS256'],
      issuer: config.issuer,
      audience: config.audience,
    });
    expect(claims).toMatchObject({
      sub: first.guest.id,
      name: 'Mapache',
      guest: true,
    });
    expect(claims).not.toHaveProperty('email');
    expect(claims.exp - claims.iat).toBe(21600);
    expect(create).not.toHaveBeenCalled();
    expect(find).not.toHaveBeenCalled();
    expect(repo.entries.size).toBe(0);
  });
  test('duración configurable y validada', () => {
    const env = {
      JWT_PRIVATE_KEY: config.privateKey,
      JWT_PUBLIC_KEY: config.publicKey,
      JWT_KEY_ID: config.keyId,
      AUTH_DATABASE_URL: config.databaseUrl,
    };
    expect(
      settings({ ...env, JWT_GUEST_EXPIRES_IN: '30m' }).guestExpiresIn,
    ).toBe(1800);
    for (const invalid of ['0', '-1h', 'bad', '999999999999999999999999d'])
      expect(() => settings({ ...env, JWT_GUEST_EXPIRES_IN: invalid })).toThrow(
        'JWT_GUEST_EXPIRES_IN',
      );
  });
  test('HTTP valida apodo y rechaza /me sin consultar la base', async () => {
    const repo = new MemoryProfiles();
    const find = jest.spyOn(repo, 'findById');
    const built = await createApp(config, repo);
    await built.app.init();
    try {
      const api = request(built.app.getHttpServer());
      const res = await api
        .post('/api/v1/auth/guest')
        .send({ displayName: '  Ruby  ' })
        .expect(201);
      expect(res.body.guest.displayName).toBe('Ruby');
      await api
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(401);
      expect(find).not.toHaveBeenCalled();
      for (const body of [
        {},
        { displayName: '' },
        { displayName: '  ' },
        { displayName: 'a' },
        { displayName: 'a'.repeat(41) },
        { displayName: 5 },
        { displayName: 'Ruby', admin: true },
      ]) {
        const invalid = await api
          .post('/api/v1/auth/guest')
          .send(body)
          .expect(400);
        expect(invalid.body.code).toBe('VALIDATION_ERROR');
      }
      expect(repo.entries.size).toBe(0);
    } finally {
      await built.app.close();
    }
  });
});
