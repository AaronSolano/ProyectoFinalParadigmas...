import { DomainError, PasswordHasher, Profiles, Tokens, publicProfile, validatePassword } from '../domain/profile';
export class AuthService {
  private dummyHash?: Promise<string>;
  constructor(private readonly profiles: Profiles, private readonly passwords: PasswordHasher, private readonly tokens: Tokens) {}
  async register(email: string, password: string, displayName: string) {
    validatePassword(password);
    const name = displayName.trim();
    if (name.length < 2 || name.length > 40) throw new DomainError('VALIDATION_ERROR', 'Nombre visible inválido.');
    const profile = await this.profiles.create(email.toLowerCase(), name, await this.passwords.hash(password));
    return this.response(profile);
  }
  async login(email: string, password: string) {
    const profile = await this.profiles.findByEmail(email.toLowerCase());
    this.dummyHash ??= this.passwords.hash('DummyPassword2026');
    const valid = await this.passwords.verify(profile?.passwordHash ?? await this.dummyHash, password);
    if (!profile || !valid) throw new DomainError('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
    return this.response(profile);
  }
  async me(token: string) {
    let id: string;
    try { id = this.tokens.verify(token); } catch { throw new DomainError('UNAUTHORIZED', 'Token de acceso ausente, inválido o expirado.'); }
    const profile = await this.profiles.findById(id);
    if (!profile) throw new DomainError('UNAUTHORIZED', 'Token de acceso ausente, inválido o expirado.');
    return publicProfile(profile);
  }
  private response(profile: Parameters<typeof publicProfile>[0]) {
    const safe = publicProfile(profile);
    return { accessToken: this.tokens.sign(safe), tokenType: 'Bearer' as const, expiresIn: this.tokens.expiresIn, profile: safe };
  }
}
