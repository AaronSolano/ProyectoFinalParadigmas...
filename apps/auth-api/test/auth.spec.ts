import { createPublicKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JwtService } from '@nestjs/jwt';
import { OpenAPIObject, OperationObject } from '@nestjs/swagger';
import request from 'supertest';
import { parse } from 'yaml';
import { createApp } from '../src/app';
import { AuthService } from '../src/application/auth-service';
import { ArgonPasswords, RsaTokens } from '../src/data/credentials';
import { validatePassword } from '../src/domain/profile';
import { settings } from '../src/config/settings';
import { MemoryProfiles, testSettings } from './helpers';
const config = testSettings();
describe('domain and configuration',()=>{
  test.each(['short1','onlyletters','123456789','a1'.repeat(65)])('rejects weak password %s', password=>expect(()=>validatePassword(password)).toThrow());
  test('accepts strong password',()=>expect(()=>validatePassword('Secure123')).not.toThrow());
  test('rejects missing keys',()=>expect(()=>settings({})).toThrow('JWT_PRIVATE_KEY'));
  test('register rejects duplicate case insensitive email and never stores plaintext',async()=>{
    const repo = new MemoryProfiles(), passwords = new ArgonPasswords();
    const service = new AuthService(repo,passwords,new RsaTokens(config));
    const first = await service.register('ANA@example.com','Password123','Ana');
    const stored = await repo.findByEmail('ana@example.com');
    expect(stored?.passwordHash).not.toBe('Password123'); expect(await passwords.verify(stored!.passwordHash,'Password123')).toBe(true);
    expect(first.profile).not.toHaveProperty('passwordHash');
    await expect(service.register('ana@example.com','Password123','Ana')).rejects.toMatchObject({code:'EMAIL_TAKEN'});
    await expect(service.register('new@example.com','weak','Ana')).rejects.toMatchObject({code:'VALIDATION_ERROR'});
  });
});
describe('HTTP authentication and contract',()=>{
  let built: Awaited<ReturnType<typeof createApp>>;
  beforeAll(async()=>{ built = await createApp(config,new MemoryProfiles()); await built.app.init(); });
  afterAll(async()=>{await built.app.close();});
  test('health, registration, login, profile and independent public-key verification',async()=>{
    const server=built.app.getHttpServer();
    await request(server).get('/api/v1/health').expect(200);
    const registration=await request(server).post('/api/v1/auth/register').send({email:'ana@example.com',password:'Password123',displayName:'Ana'}).expect(201);
    expect(registration.body.profile).not.toHaveProperty('passwordHash');
    const jwks = await request(server).get('/.well-known/jwks.json').expect(200);
    expect(jwks.body.keys[0]).not.toHaveProperty('d');
    const key=createPublicKey({key:jwks.body.keys[0],format:'jwk'}).export({type:'spki',format:'pem'}).toString();
    const payload=new JwtService().verify(registration.body.accessToken,{publicKey:key,algorithms:['RS256'],issuer:'auth-api',audience:'kahoot-api'});
    expect(payload).toMatchObject({sub:registration.body.profile.id,name:'Ana',email:'ana@example.com'});
    expect(payload.exp-payload.iat).toBe(3600);
    await request(server).get('/api/v1/auth/me').set('Authorization',`Bearer ${registration.body.accessToken}`).expect(200,registration.body.profile);
    await request(server).post('/api/v1/auth/login').send({email:'ANA@example.com',password:'Password123'}).expect(200);
    await request(server).post('/api/v1/auth/register').send({email:'ANA@example.com',password:'Password123',displayName:'Ana'}).expect(409);
    const wrong=await request(server).post('/api/v1/auth/login').send({email:'ana@example.com',password:'wrong'}).expect(401);
    const absent=await request(server).post('/api/v1/auth/login').send({email:'missing@example.com',password:'wrong'}).expect(401);
    expect(wrong.body).toEqual(absent.body);
    for(const change of [{aud:'wrong',expiresIn:60},{aud:'kahoot-api',expiresIn:-1},{aud:'kahoot-api'}]) {
      const token=new JwtService().sign({sub:payload.sub},{privateKey:config.privateKey,algorithm:'RS256',issuer:config.issuer,audience:change.aud,...(change.expiresIn===undefined?{}:{expiresIn:change.expiresIn})});
      await request(server).get('/api/v1/auth/me').set('Authorization',`Bearer ${token}`).expect(401);
    }
    await request(server).get('/api/v1/auth/me').expect(401);
    await request(server).get('/api/v1/.well-known/jwks.json').expect(404);
  });
  test.each([{email:'not-email',password:'Password123',displayName:'Ana'},{email:'a@example.com',password:'weak',displayName:'Ana'},{email:'a@example.com',password:'Password123',displayName:'  '},{email:'a@example.com',password:'Password123',displayName:'Ana',admin:true}])('rejects invalid payload',async body=>{const res=await request(built.app.getHttpServer()).post('/api/v1/auth/register').send(body).expect(400); expect(res.body.code).toBe('VALIDATION_ERROR');});
  test('generated OpenAPI matches contract routes, methods, statuses and JWKS root override',async()=>{
    const contract=parse(readFileSync(resolve(__dirname,'../../../packages/contracts/openapi/auth-api.yaml'),'utf8')) as OpenAPIObject;
    expect(Object.keys(built.document.paths).sort()).toEqual(Object.keys(contract.paths).sort());
    for(const [path,item] of Object.entries(contract.paths)) for(const method of Object.keys(item)) {
      const operation=(built.document.paths[path] as Record<string, OperationObject>)[method]; expect(operation).toBeDefined();
      expect(Object.keys(operation.responses).sort()).toEqual(Object.keys((item as Record<string, OperationObject>)[method].responses).sort());
    }
    expect(built.document.paths['/.well-known/jwks.json'].get!.servers).toEqual([{url:'/'}]);
    await request(built.app.getHttpServer()).get('/docs').expect(200);
    await request(built.app.getHttpServer()).get('/docs/openapi-json').expect(200);
  });
});
