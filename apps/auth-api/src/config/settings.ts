import { createPrivateKey, createPublicKey } from 'node:crypto';
export interface Settings { port: number; databaseUrl: string; ssl: boolean; privateKey: string; publicKey: string; keyId: string; issuer: string; audience: string; expiresIn: number; corsOrigins: string[]; }
export function settings(env: NodeJS.ProcessEnv = process.env): Settings {
  const required = (name: string) => { const value = env[name]; if (!value) throw new Error(`Falta variable ${name}`); return value; };
  const privateKey = required('JWT_PRIVATE_KEY').replace(/\\n/g, '\n');
  const publicKey = required('JWT_PUBLIC_KEY').replace(/\\n/g, '\n');
  const privateObject = createPrivateKey(privateKey), publicObject = createPublicKey(publicKey);
  if (privateObject.asymmetricKeyType !== 'rsa' || (privateObject.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error('JWT_PRIVATE_KEY debe ser RSA de al menos 2048 bits');
  if (createPublicKey(privateObject).export({ type: 'spki', format: 'pem' }) !== publicObject.export({ type: 'spki', format: 'pem' })) throw new Error('Las claves JWT no coinciden');
  const ttl = /^(\d+)(s|m|h|d)?$/.exec(env.JWT_EXPIRES_IN ?? '1h');
  if (!ttl) throw new Error('JWT_EXPIRES_IN inválido');
  const expiresIn = Number(ttl[1]) * ({s:1,m:60,h:3600,d:86400}[ttl[2] ?? 's']!);
  if (!Number.isSafeInteger(expiresIn) || expiresIn < 1) throw new Error('JWT_EXPIRES_IN inválido');
  const port = Number(env.AUTH_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('AUTH_PORT inválido');
  if (env.DATABASE_SSL && !['true', 'false'].includes(env.DATABASE_SSL)) throw new Error('DATABASE_SSL inválido');
  const databaseUrl = required('AUTH_DATABASE_URL');
  if (!['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol)) throw new Error('AUTH_DATABASE_URL debe ser PostgreSQL');
  return { port, databaseUrl, ssl: env.DATABASE_SSL === 'true', privateKey, publicKey, keyId: required('JWT_KEY_ID'), issuer: env.JWT_ISSUER ?? 'auth-api', audience: env.JWT_AUDIENCE ?? 'kahoot-api', expiresIn, corsOrigins: (env.CORS_ORIGINS ?? '').split(',').filter(Boolean) };
}
