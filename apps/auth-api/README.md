# auth-api — aporte Codex, fase 2

Servicio NestJS independiente. Las reglas de contraseña y los puertos viven en `domain`, los casos de uso en `application`, los adaptadores PostgreSQL/Argon2/JWT en `data` y HTTP en `presentation`.

## Desarrollo

Desde esta carpeta: `npm install --workspaces=false`, `npm run build`, `npm run lint`, `npm test`. Desde un monorepo instalado también se pueden ejecutar los scripts con `-w @profelink/auth-api`. La instalación del monorepo y su lockfile los integra el orquestador.

Configurar `AUTH_DATABASE_URL`, `DATABASE_SSL` (`true` exige un certificado válido), `AUTH_PORT` (3001), `JWT_ISSUER` (`auth-api`), `JWT_AUDIENCE` (`kahoot-api`), `JWT_EXPIRES_IN` (`1h`), `CORS_ORIGINS` (orígenes separados por coma). Las variables se leen del entorno del proceso; cargar `.env` mediante el entorno de despliegue o `node --env-file=... dist/main.js`.

`npm run keys:generate` imprime claves RSA PEM escapadas para configurar **JWT_PRIVATE_KEY**, **JWT_PUBLIC_KEY** y **JWT_KEY_ID**. Guardarlas fuera del repositorio. Las tres son obligatorias; se rechazan claves menores de 2048 bits, pares distintos y tiempos de expiración inválidos. El antiguo `JWT_SECRET` no se usa.

Con PostgreSQL disponible, ejecutar `npm run migration:run` y después `npm start`. No se usa sincronización automática ni se aplican migraciones al iniciar cada réplica. `npm run migration:revert` revierte la última migración (destructivo: elimina la tabla de perfiles).

HTTP: `/api/v1/health`, `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`. JWKS se publica exclusivamente en `/.well-known/jwks.json`. Scalar: `/docs`. OpenAPI generado: `/docs/openapi-json`.

## Verificación

`npm test` cubre dominio, registro/login HTTP, JWT y JWKS independiente de la BD, validación, errores uniformes, documentación y exportación OTLP. Para activar la suite PostgreSQL se exige `AUTH_TEST_DATABASE_URL` apuntando a una **base de pruebas dedicada**: aplica migraciones, crea perfiles de prueba y verifica carrera de correo duplicado y persistencia al reconstruir servicio/conexión. No usar una base de producción.

Ejemplo PowerShell: `$env:AUTH_TEST_DATABASE_URL='postgresql://postgres:password@localhost:55431/auth_test'; npm test`.

`OTEL_EXPORTER_OTLP_ENDPOINT` activa trazas y métricas HTTP OTLP (`/v1/traces`, `/v1/metrics`) con nombre de servicio `auth-api`. Sin endpoint no se inicia exportador. Un colector temporalmente desconectado no impide servir HTTP. No se registran contraseñas, tokens ni correos en atributos de telemetría.

Las tareas verificadas se informan al orquestador: este paquete no modifica los artefactos OpenSpec ni los contratos compartidos.

## Datos de demostración (fase 6)

Después de las migraciones ejecutar `npm run seed` (código compilado: `npm run seed:production`). Configurar `DEMO_PASSWORD` explícitamente, con letras, números y al menos 8 caracteres. Opcionales: `DEMO_PROFILE_ID` (por defecto `00000000-0000-4000-8000-000000000001`), `DEMO_EMAIL` (`docente.demo@example.com`), `DEMO_DISPLAY_NAME` (`Docente demo`). El seed de kahoot debe usar el mismo `DEMO_PROFILE_ID` para el propietario del cuestionario de demostración.

La segunda ejecución conserva identidad y hash originales; no reinicia contraseñas. Un correo o UUID ocupado por otra identidad produce un error claro. No se necesitan claves JWT para ejecutar migraciones o seed. El arranque Compose lo coordina infraestructura invocando migraciones y seed antes de `npm start`.
