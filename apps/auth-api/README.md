# auth-api — aporte Codex, fase 2

Servicio NestJS independiente. Las reglas de contraseña y los puertos viven en `domain`, los casos de uso en `application`, los adaptadores PostgreSQL/Argon2/JWT en `data` y HTTP en `presentation`.

## Desarrollo

Desde esta carpeta: `npm install --workspaces=false`, `npm run build`, `npm run lint`, `npm test`. Desde un monorepo instalado también se pueden ejecutar los scripts con `-w @profelink/auth-api`. La instalación del monorepo y su lockfile los integra el orquestador.

Configurar `AUTH_DATABASE_URL`, `DATABASE_SSL` (`true` exige un certificado válido), `AUTH_PORT` (3001), `JWT_ISSUER` (`auth-api`), `JWT_AUDIENCE` (`kahoot-api`), `JWT_EXPIRES_IN` (`1h`), `CORS_ORIGINS` (orígenes separados por coma). Las variables se leen del entorno del proceso; cargar `.env` mediante el entorno de despliegue o `node --env-file=... dist/main.js`.

`npm run keys:generate` imprime claves RSA PEM escapadas para configurar **JWT_PRIVATE_KEY**, **JWT_PUBLIC_KEY** y **JWT_KEY_ID**. Guardarlas fuera del repositorio. Las tres son obligatorias; se rechazan claves menores de 2048 bits, pares distintos y tiempos de expiración inválidos. El antiguo `JWT_SECRET` no se usa.

Con PostgreSQL disponible, ejecutar `npm run migration:run` y después `npm start`. No se usa sincronización automática. Las migraciones al arrancar se controlan con RUN_MIGRATIONS, como se detalla más abajo. `npm run migration:revert` revierte la última migración (destructivo: elimina la tabla de perfiles).

HTTP: `/api/v1/health`, `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`. JWKS se publica exclusivamente en `/.well-known/jwks.json`. Scalar: `/docs`. OpenAPI generado: `/docs/openapi-json`.

## Capas y calidad estática

`AppModule` declara los controladores y proveedores; `createApp(config, profiles)` permite sustituir el repositorio en pruebas sin redefinir el módulo. El controlador público recibe el puerto `Tokens`, incluido `jwks()`, y no conoce el adaptador RSA.

`npm run lint` ejecuta ESLint y TypeScript. ESLint rechaza dependencias de dominio hacia aplicación, datos, presentación o frameworks; aplicación hacia datos, presentación o TypeORM; y presentación hacia datos. `test/architecture.spec.ts` comprueba la regla con el CLI real, incluidos imports de tipos y reexportaciones desde carpetas anidadas. `npm run format` aplica Prettier y `npm run format:check` verifica el formato.

## Verificación

`npm test` cubre dominio, registro/login HTTP, JWT y JWKS independiente de la BD, validación, errores uniformes, documentación y exportación OTLP. Para activar la suite PostgreSQL se exige `AUTH_TEST_DATABASE_URL` apuntando a una **base de pruebas dedicada**: aplica migraciones, crea perfiles de prueba y verifica carrera de correo duplicado y persistencia al reconstruir servicio/conexión. No usar una base de producción.

Ejemplo PowerShell: `$env:AUTH_TEST_DATABASE_URL='postgresql://postgres:password@localhost:55431/auth_test'; npm test`.

`OTEL_EXPORTER_OTLP_ENDPOINT` activa trazas y métricas HTTP OTLP (`/v1/traces`, `/v1/metrics`) con nombre de servicio `auth-api`. Sin endpoint no se inicia exportador. Un colector temporalmente desconectado no impide servir HTTP. No se registran contraseñas, tokens ni correos en atributos de telemetría.

Las tareas verificadas se informan al orquestador: este paquete no modifica los artefactos OpenSpec ni los contratos compartidos.

## Datos de demostración (fase 6)

Después de las migraciones ejecutar `npm run seed` (código compilado: `npm run seed:production`). Configurar `DEMO_PASSWORD` explícitamente, con letras, números y al menos 8 caracteres. Opcionales: `DEMO_PROFILE_ID` (por defecto `00000000-0000-4000-8000-000000000001`), `DEMO_EMAIL` (`docente.demo@example.com`), `DEMO_DISPLAY_NAME` (`Docente demo`). El seed de kahoot debe usar el mismo `DEMO_PROFILE_ID` para el propietario del cuestionario de demostración.

La segunda ejecución conserva identidad y hash originales; no reinicia contraseñas. Un correo o UUID ocupado por otra identidad produce un error claro. No se necesitan claves JWT para ejecutar migraciones o seed. El arranque Compose lo coordina infraestructura invocando migraciones y seed antes de `npm start`.

## Registros estructurados

Cada solicitud HTTP emite una línea JSON a stdout, sin requerir OpenTelemetry ni un colector. Se registra al terminar la respuesta; una conexión cerrada antes de completarla se registra una sola vez con estado 499. No se serializan cuerpos, cabeceras, cookies, errores, URLs ni consultas. No se registran correos, contraseñas, tokens, IP ni nombres de participantes.

| Campo | Contenido |
| --- | --- |
| `ts` | Instante UTC en formato ISO 8601 |
| `level` | `info` para <400, `warn` para 4xx, `error` para 5xx |
| `service` | Nombre fijo de la API |
| `method` | Método HTTP conocido; `OTHER` para otros |
| `route` | Plantilla de Express (por ejemplo `/api/v1/auth/login`); `unmatched` si no hay ruta, incluso en middleware de documentación |
| `status` | Estado HTTP; 499 si el cliente interrumpe la respuesta |
| `duration_ms` | Tiempo transcurrido desde la entrada hasta terminar o cerrar la respuesta, en milisegundos |
| `requestId` | UUID nuevo generado por el servidor por solicitud; no se copia de cabeceras del cliente |
## Migraciones al arrancar

`RUN_MIGRATIONS` vale `true` por defecto. Antes de escuchar HTTP se aplican las migraciones pendientes bajo un bloqueo asesor de PostgreSQL, incluida la creación de la tabla de migraciones; dos instancias pueden arrancar simultáneamente sobre una base vacía. Usa `RUN_MIGRATIONS=false` si el despliegue ejecuta las migraciones por separado. Las claves JWT se proporcionan mediante la configuración del despliegue.

## PostgreSQL compartido y TLS (Supabase)

| Variable | Valor y comportamiento |
| --- | --- |
| `DATABASE_SSL_CA` | Opcional: contenido PEM de la CA raíz, con saltos reales o `\n` escapados. Con `DATABASE_SSL=true` se pasa junto con `rejectUnauthorized: true`; sin CA se conserva la validación del almacén de confianza de Node. Con TLS desactivado se ignora. |
| `DATABASE_SCHEMA` | `public` por defecto. Para compartir la base `postgres`, configurar `auth` en esta API. Acepta identificadores de hasta 63 caracteres (letras, dígitos y `_`, sin dígito inicial ni prefijo `pg_`). |

El esquema se crea si falta, serializando esa creación entre instancias, y la tabla de migraciones de TypeORM vive dentro de él. Cada conexión nueva del pool espera la configuración SQL de `search_path` antes de usarse; no se envían opciones de arranque al pooler. La búsqueda comienza por el esquema del servicio e incluye `public` y `extensions` para resolver tipos de extensiones existentes como `citext`. El usuario de la base necesita permisos para crear el esquema si falta y ejecutar las migraciones. Usar el pooler en modo sesión (puerto 5432 del brief).

La configuración se aplica al servidor, al CLI de migraciones y a los seeds, incluidos los compilados. No se trasladan datos antiguos de `public`: cambiar `DATABASE_SCHEMA` selecciona otro espacio. Los parámetros TLS de la URL (`sslmode`, `sslrootcert`, `sslcert`, `sslkey`, `sslpassword`, `ssl`) se retiran para que no sustituyan `DATABASE_SSL` y `DATABASE_SSL_CA`. No se ofrece una opción para desactivar la verificación del certificado manteniendo TLS.

El despliegue debe pasar `DATABASE_SCHEMA` por separado a cada servicio (`auth`/`kahoot`) y la CA a ambas APIs. La configuración raíz de `.env.example` y Compose corresponde al orquestador.
