import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { Config } from "../config/config";
import { Problem } from "../domain/problem";
import { Identity } from "../domain/entities";
export { Identity } from "../domain/entities";
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly keys;
  constructor(@Inject("CONFIG") private readonly config: Config) {
    this.keys = createRemoteJWKSet(
      new URL("/.well-known/jwks.json", config.authUrl),
      { timeoutDuration: 5000, cooldownDuration: 1000 },
    );
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization;
    if (typeof header !== "string" || !/^Bearer \S+$/.test(header))
      throw new Problem(
        401,
        "UNAUTHORIZED",
        "Token de acceso ausente o invalido.",
      );
    req.identity = await this.authenticate(header.slice(7));
    return true;
  }
  async authenticate(token: string): Promise<Identity> {
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ["RS256"],
        requiredClaims: ["sub", "exp", "iat"],
      });
      if (
        !payload.sub ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          payload.sub,
        ) ||
        typeof payload.name !== "string" ||
        payload.name.length < 1 ||
        payload.name.length > 40
      )
        throw new Error();
      return {
        id: payload.sub,
        name: payload.name,
        guest: payload.guest === true,
      };
    } catch {
      throw new Problem(
        401,
        "UNAUTHORIZED",
        "Token de acceso ausente o invalido.",
      );
    }
  }
}
/** Acciones solo para cuentas registradas (crear cuestionarios, abrir salas, biblioteca): rechaza invitados. */
@Injectable()
export class AccountGuard extends AuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const req = context.switchToHttp().getRequest();
    if (req.identity?.guest)
      throw new Problem(
        403,
        "FORBIDDEN",
        "Inicia sesión con una cuenta para crear cuestionarios o abrir salas.",
      );
    return true;
  }
}
