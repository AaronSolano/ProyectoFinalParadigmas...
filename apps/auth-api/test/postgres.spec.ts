import { DataSource } from 'typeorm';
import request from 'supertest';
import { createDataSource } from '../src/data/data-source';
import { PostgresProfiles } from '../src/data/profiles';
import { createApp } from '../src/app';
import { testSettings } from './helpers';
const suite=process.env.AUTH_TEST_DATABASE_URL ? describe : describe.skip;
suite('PostgreSQL migration and persistent auth (dedicated disposable database)',()=>{
  let db: DataSource, built: Awaited<ReturnType<typeof createApp>>;
  const config=testSettings();
  beforeAll(async()=>{
    db=await createDataSource(process.env.AUTH_TEST_DATABASE_URL!).initialize();
    await db.runMigrations(); expect(await db.runMigrations()).toHaveLength(0);
    built=await createApp(config,new PostgresProfiles(db)); await built.app.init();
  });
  afterAll(async()=>{await built?.app.close(); if(db?.isInitialized) await db.destroy();});
  test('concurrent case-insensitive duplicate registration creates exactly one row and login survives restart',async()=>{
    const email=`race${Date.now()}@example.com`;
    const results=await Promise.all([email,email.toUpperCase()].map(value=>request(built.app.getHttpServer()).post('/api/v1/auth/register').send({email:value,password:'Password123',displayName:'Ana'})));
    expect(results.map(r=>r.status).sort()).toEqual([201,409]);
    const rows=await db.query('SELECT password_hash FROM profiles WHERE email=$1',[email]); expect(rows).toHaveLength(1); expect(rows[0].password_hash).toMatch(/^\$argon2id\$/);
    await built.app.close(); await db.destroy();
    db=await createDataSource(process.env.AUTH_TEST_DATABASE_URL!).initialize(); built=await createApp(config,new PostgresProfiles(db)); await built.app.init();
    await request(built.app.getHttpServer()).post('/api/v1/auth/login').send({email,password:'Password123'}).expect(200);
  });
});
