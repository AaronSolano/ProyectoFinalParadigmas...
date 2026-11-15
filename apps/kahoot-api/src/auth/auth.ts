import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { Config } from "../config/config";
import { Problem } from "../domain/problem";
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
    try {
      const header = req.headers.authorization;
      if (typeof header !== "string" || !/^Bearer \S+$/.test(header))
        throw new Error();
      const { payload } = await jwtVerify(header.slice(7), this.keys, {
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
      req.identity = { id: payload.sub, name: payload.name };
      return true;
    } catch {
      throw new Problem(
        401,
        "UNAUTHORIZED",
        "Token de acceso ausente o invalido.",
      );
    }
  }
}
