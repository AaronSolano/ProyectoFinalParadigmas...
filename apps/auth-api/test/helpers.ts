import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { settings } from '../src/config/settings';
import { DomainError, Profiles, StoredProfile } from '../src/domain/profile';
export function testSettings() {
  const keys = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  return settings({
    JWT_PRIVATE_KEY: keys.privateKey,
    JWT_PUBLIC_KEY: keys.publicKey,
    JWT_KEY_ID: 'test-key',
    AUTH_DATABASE_URL: 'postgresql://localhost/auth',
  });
}
export class MemoryProfiles implements Profiles {
  readonly entries = new Map<string, StoredProfile>();
  async findByEmail(email: string) {
    return (
      [...this.entries.values()].find(
        (profile) => profile.email.toLowerCase() === email.toLowerCase(),
      ) ?? null
    );
  }
  async findById(id: string) {
    return this.entries.get(id) ?? null;
  }
  async create(email: string, displayName: string, passwordHash: string) {
    if (await this.findByEmail(email))
      throw new DomainError(
        'EMAIL_TAKEN',
        'Ya existe un perfil registrado con ese correo.',
      );
    const profile = {
      id: randomUUID(),
      email,
      displayName,
      passwordHash,
      createdAt: new Date(),
    };
    this.entries.set(profile.id, profile);
    return profile;
  }
}
