import { createPublicKey } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PasswordHasher, Profile, Tokens } from '../domain/profile';
import { Settings } from '../config/settings';
export class ArgonPasswords implements PasswordHasher {
  hash(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }
  verify(hash: string, password: string) {
    return argon2.verify(hash, password);
  }
}
export class RsaTokens implements Tokens {
  readonly expiresIn: number;
  readonly guestExpiresIn: number;
  private readonly jwt = new JwtService();
  constructor(private readonly config: Settings) {
    this.expiresIn = config.expiresIn;
    this.guestExpiresIn = config.guestExpiresIn;
  }
  /** Invitado: identidad efímera sin cuenta ni correo; no se guarda en la base de datos. */
  signGuest(id: string, displayName: string) {
    return this.jwt.sign(
      { sub: id, name: displayName, guest: true },
      {
        privateKey: this.config.privateKey,
        algorithm: 'RS256',
        keyid: this.config.keyId,
        issuer: this.config.issuer,
        audience: this.config.audience,
        expiresIn: this.guestExpiresIn,
      },
    );
  }
  sign(profile: Profile) {
    return this.jwt.sign(
      { sub: profile.id, name: profile.displayName, email: profile.email },
      {
        privateKey: this.config.privateKey,
        algorithm: 'RS256',
        keyid: this.config.keyId,
        issuer: this.config.issuer,
        audience: this.config.audience,
        expiresIn: this.expiresIn,
      },
    );
  }
  verify(token: string) {
    const payload = this.jwt.verify<{
      guest?: boolean;
      sub?: string;
      exp?: number;
      iat?: number;
    }>(token, {
      publicKey: this.config.publicKey,
      algorithms: ['RS256'],
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
    if (payload.guest === true) throw new Error('Guest has no profile');
    if (!Number.isFinite(payload.exp) || !Number.isFinite(payload.iat))
      throw new Error('Invalid lifetime');
    if (
      !payload.sub ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        payload.sub,
      )
    )
      throw new Error('Invalid subject');
    return payload.sub;
  }
  jwks() {
    return {
      keys: [
        {
          ...createPublicKey(this.config.publicKey).export({ format: 'jwk' }),
          use: 'sig',
          alg: 'RS256',
          kid: this.config.keyId,
        },
      ],
    };
  }
}
