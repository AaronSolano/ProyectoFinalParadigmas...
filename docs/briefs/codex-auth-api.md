# Brief para Codex — Fase 2: `auth-api`

> Este brief es autocontenido. Léelo completo antes de escribir código.

## Contexto
Plataforma de evaluaciones en vivo tipo Kahoot (Verdadero/Falso) para ProfeLink, curso EIF400. Monorepo npm con dos APIs independientes (`auth-api`, `kahoot-api`), un frontend React y contratos compartidos. Tú implementas **`apps/auth-api`**: el servicio de autenticación, que corre como API separada con su propia base de datos y emite tokens cuya audiencia es `kahoot-api`.

Lee en este orden:
1. `AGENTS.md` (reglas del equipo y propiedad de carpetas).
2. `openspec/changes/f2-auth/` (`proposal.md`, `design.md`, `specs/identity/auth-service/spec.md`, `tasks.md`).
3. `packages/contracts/openapi/auth-api.yaml` (**contrato obligatorio**).
4. `docs/modelo-datos.md` (tabla `profiles`) y `docs/diagramas/arquitectura.md` (capas).
5. `.env.example` (variables del servicio).

## Rama y carpetas
- Rama: `feat/f2-codex` creada desde `main` actualizado.
- **Solo puedes editar `apps/auth-api/**`.** No modifiques `packages/contracts`, `openspec/`, `docs/`, `infra/` ni otras apps. Si el contrato es insuficiente o contradictorio, **no lo cambies**: descríbelo en el PR y sigue con el contrato vigente.

## Stack fijado (no cambiar)
- NestJS 10+ con TypeScript estricto, Node 20+, npm workspaces (el paquete se llama `@rubymind/auth-api`).
- PostgreSQL con **TypeORM** y **migraciones versionadas** (sin `synchronize` en producción).
- Argon2 para hash de contraseñas (`argon2`); si no compila en Docker, usa `bcrypt` y déjalo anotado en el PR.
- JWT **RS256** con la librería `jose` o `@nestjs/jwt`; claves por variables de entorno (PEM).
- Validación con `class-validator`/`class-transformer`; documentación con `@nestjs/swagger` + Scalar (`@scalar/nestjs-api-reference`).
- Pruebas: Jest + Supertest. Telemetría: OpenTelemetry (`@opentelemetry/sdk-node`, OTLP HTTP).

## Arquitectura interna: N-Capas
```
src/
  presentation/   controladores, DTOs, filtros de error (Problem)
  application/    servicios / casos de uso (registro, login, perfil)
  domain/         entidades y reglas (Profile, políticas de contraseña)
  data/           repositorios, entidades TypeORM, migraciones
  config/         variables de entorno validadas
```
Regla de dependencia: presentación → aplicación → dominio ← datos. El dominio no importa NestJS, TypeORM ni HTTP.

## Contrato a cumplir (resumen; manda el YAML)
Prefijo global `/api/v1`, puerto `AUTH_PORT` (3001).
- `GET /health`
- `POST /auth/register` → 201 `AuthResponse` | 400 | 409 `EMAIL_TAKEN`
- `POST /auth/login` → 200 | 400 | 401 `INVALID_CREDENTIALS` (idéntico para correo inexistente y contraseña errónea)
- `GET /auth/me` (Bearer) → `Profile`
- `GET /.well-known/jwks.json` — **en la raíz del host, fuera de `/api/v1`**; excluirlo del prefijo global.
- JWT: `iss=auth-api`, `aud=kahoot-api` (de `JWT_ISSUER` / `JWT_AUDIENCE`), `sub`=id del perfil, `name`, `email`, `iat`, `exp`. Contraseña: mínimo 8, letras y números. `displayName`: 2–40.
- Errores con forma `Problem {status, code, message, details?}`; códigos: `VALIDATION_ERROR`, `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `UNAUTHORIZED`.

## Variables de entorno
Usa los nombres de `.env.example`: `AUTH_PORT`, `AUTH_DATABASE_URL`, `DATABASE_SSL`, `JWT_EXPIRES_IN`, `JWT_AUDIENCE`, `JWT_ISSUER`, `OTEL_EXPORTER_OTLP_ENDPOINT`. Para RS256 agrega **solo en `apps/auth-api`** y documenta en el PR: `JWT_PRIVATE_KEY` y `JWT_PUBLIC_KEY` (PEM, con `\n` escapados) y `JWT_KEY_ID`. Si faltan, el servicio **no arranca** con un error claro. Incluye un script `npm run keys:generate -w @rubymind/auth-api` que imprima un par de claves para pegar en `.env`. **Nunca versiones claves ni `.env`.**

## Tareas (de `openspec/changes/f2-auth/tasks.md`)
1. Crear el proyecto NestJS en `apps/auth-api` con las capas y verificar que arranca y responde `/health`.
2. Tabla `profiles` con migración (`id uuid`, `email citext unique`, `display_name varchar(40)`, `password_hash`, `created_at`) y verificar que se aplica en PostgreSQL.
3. Registro con validación y hash; pruebas unitarias (correo duplicado, contraseña débil, hash distinto del texto plano).
4. Login con JWT; 401 uniforme.
5. JWKS público; prueba de integración que **valida un token usando solo la clave pública**, sin acceso a la base.
6. OpenAPI/Scalar publicado en `/docs` (o ruta equivalente) y **prueba que compara el documento generado con `packages/contracts/openapi/auth-api.yaml`** (mismas rutas y métodos). Reutiliza `compare()` de `packages/contracts/scripts/verify-contract.mjs` o ejecuta `node packages/contracts/scripts/verify-contract.mjs auth-api <openapi.json>` (falla si hay un endpoint no declarado). Los tipos del contrato están en `@rubymind/contracts/auth-api`.
7. OpenTelemetry: trazas y métricas HTTP al colector (si no hay colector, no debe fallar).

## Definición de terminado
- `npm ci && npm run lint && npm test && npm run build` en la raíz pasan.
- Una instancia local con un PostgreSQL de pruebas responde registro → login → `/auth/me` y `jwks.json`.
- Cobertura de las reglas de dominio (contraseña, unicidad de correo) con pruebas unitarias.
- Sin secretos versionados.

## Entrega
- Commits pequeños y descriptivos. Abre un **PR hacia `main`** titulado `Fase 2: auth-api` con: qué hiciste, cómo probarlo, desviaciones del contrato (si las hay) y lo que quedó pendiente.
- No hagas merge tú mismo; lo revisa el orquestador (Claude Code).
- Marca como hechas (`- [x]`) en `openspec/changes/f2-auth/tasks.md` solo las tareas verificadas; si no puedes editar esa carpeta, lista en el PR qué tareas quedaron verificadas.
