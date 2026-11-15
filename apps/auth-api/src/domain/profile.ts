export interface Profile { id: string; email: string; displayName: string; createdAt: Date; }
export interface StoredProfile extends Profile { passwordHash: string; }
export class DomainError extends Error {
  constructor(public readonly code: 'VALIDATION_ERROR' | 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS' | 'UNAUTHORIZED', message: string) { super(message); }
}
export function validatePassword(password: string): void {
  if (!/^(?=.*[A-Za-z])(?=.*[0-9]).{8,128}$/.test(password)) throw new DomainError('VALIDATION_ERROR', 'La contraseña debe tener entre 8 y 128 caracteres, con letras y números.');
}
export function publicProfile(profile: StoredProfile): Profile {
  return { id: profile.id, email: profile.email, displayName: profile.displayName, createdAt: profile.createdAt };
}
export interface Profiles { findByEmail(email: string): Promise<StoredProfile | null>; findById(id: string): Promise<StoredProfile | null>; create(email: string, displayName: string, passwordHash: string): Promise<StoredProfile>; }
export interface PasswordHasher { hash(password: string): Promise<string>; verify(hash: string, password: string): Promise<boolean>; }
export interface Tokens { sign(profile: Profile): string; verify(token: string): string; readonly expiresIn: number; }
