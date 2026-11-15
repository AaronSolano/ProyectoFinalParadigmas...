# Brief para Codex — Ajustes a las Fases 2 y 3 (antes de la Fase 4)

> Autocontenido. Los PR de `auth-api` y `kahoot-api` ya están en `main` y pasaron la revisión: compilan, pasan sus pruebas (incluso contra PostgreSQL real) y cumplen el contrato. Estos ajustes **no cambian el comportamiento público**; mejoran la arquitectura, la legibilidad y cierran huecos menores. La Fase 4 (juego en vivo) se construye encima, así que conviene hacerlos primero.

## Reglas
- Ramas desde `main` actualizado, **dos PR por separado**:
  1. `feat/ajustes-arquitectura-codex` → secciones **A, B y C**.
  2. `feat/ajustes-funcionales-codex` → secciones **D, E y F**.
- Solo `apps/auth-api/**` y `apps/kahoot-api/**`. **No** modifiques `packages/contracts`, `openspec/`, `docs/`, `infra/`, `.env.example` ni `package-lock.json` raíz (si agregas dependencias de desarrollo, avísalo en el PR; el orquestador regenera el lockfile con `npm install`).
- El contrato (`packages/contracts`) manda: rutas, códigos y formas de respuesta no cambian. Las pruebas existentes deben seguir pasando; el verificador de contrato también.
- Pruebas con PostgreSQL real: `AUTH_TEST_DATABASE_URL` y `TEST_DATABASE_URL` apuntando a bases desechables.
- Commits pequeños. Una refactorización de formato (Prettier) va en **su propio commit** para que el diff de lógica sea revisable.

---

## PR 1 — Arquitectura y legibilidad

### A. `kahoot-api`: separar dominio, aplicación y datos
**Problema:** `application/service.ts` depende de la clase concreta `Repository` y de filas crudas `Row` (snake_case) de la capa de datos; en `domain/` solo hay `inputs.ts` y `problem.ts`. No hay entidades ni puertos. Esto viola la regla *presentación → aplicación → dominio ← datos* y dificulta probar sin base de datos.

**Qué hacer:**
1. **Entidades de dominio tipadas** en `src/domain/` (TypeScript puro, sin Nest/TypeORM/express/socket.io): `Quiz`, `Question`, `Session` (con `status: 'waiting' | 'in_progress' | 'finished'`), `SessionQuestion`, `Participant`. Campos en camelCase como en el contrato. Las reglas que ya existen (propiedad del cuestionario `requireOwner`, estados de la sala, validación del código) viven aquí.
2. **Puertos (interfaces)** en `src/domain/ports/` o `src/application/ports/`: `QuizRepository`, `SessionRepository`, `ImageStorage` (ya existe, muévelo al puerto) y `Clock`. Cada uno expone métodos de negocio (`findOwnedQuiz(id)`, `createSessionWithSnapshot(...)`, `findByCode(code)`, ...), **no SQL ni `Row`**.
3. **Adaptadores** en `src/data/`: implementaciones PostgreSQL que reciben `Row` y devuelven entidades de dominio (mapeo snake_case → camelCase **solo aquí**). `Repository` actual se reparte entre ellos; mantén `transaction()` como una abstracción (p. ej. `UnitOfWork`) que no filtre `QueryRunner` a la aplicación.
4. **`KahootService` → casos de uso** en `src/application/` que dependen de los **puertos** inyectados (tokens de inyección o `provide: 'QuizRepository'`), devuelven entidades de dominio, y no conocen filas, SQL ni la configuración HTTP (`publicUrl`).
5. **Presentación** convierte entidades a las formas del contrato (`quizView`, `questionView`, `sessionView`, `imageUrl` con `PUBLIC_API_URL`) con mappers en `src/presentation/`.
6. **Pruebas unitarias del caso de uso con repositorios en memoria** (fakes) que demuestren que se prueban permisos, `QUIZ_EMPTY`, `ROOM_CLOSED`, join idempotente y snapshot **sin base de datos**. Las pruebas de integración existentes se mantienen.
7. **Regla de dependencias automatizada:** agrega una verificación en `npm run lint` (por ejemplo ESLint `no-restricted-imports`/`import/no-restricted-paths`, o `dependency-cruiser`) que falle si: `domain` importa de `application|data|presentation|@nestjs|typeorm|express|socket.io`; `application` importa de `data|presentation|typeorm`; `presentation` importa de `data`. Incluye una prueba o ejemplo que demuestre que falla ante una violación.

### B. `auth-api`: mismos principios, más ligero
- `PublicController` importa `RsaTokens` desde `data/`: expón `jwks()` en el puerto `Tokens` (domain) y haz que el controlador dependa del puerto.
- Saca `AppModule` de dentro de `createApp()` a `src/app.module.ts` (módulo Nest normal con providers declarados), manteniendo `createApp(config, profiles)` para las pruebas.
- Aplica la **misma regla de dependencias automatizada** del punto A.7.

### C. Legibilidad y calidad estática (ambas apps)
- Agrega **ESLint (typescript-eslint) y Prettier** con configuración en cada app (o una compartida si cabe en tu carpeta). `npm run lint` = `eslint . && tsc --noEmit`. Agrega `npm run format` y `format:check`.
- **Una sentencia por línea**, funciones cortas, nombres claros; evita cadenas de decoradores y objetos de varios cientos de caracteres en una sola línea. Divide archivos largos (p. ej. controladores por recurso).
- Formatea todo con Prettier en un commit aparte (`style: formatear con Prettier`).
- Mantén comentarios solo donde expliquen un *por qué* no obvio.

**Terminado cuando:** `npm run lint`, `npm test` (con y sin PostgreSQL) y `npm run build` pasan; la regla de dependencias falla ante una violación de prueba; las pruebas de contrato siguen verdes; el diff de lógica es revisable por separado del de formato.

---

## PR 2 — Mejoras funcionales

### D. OpenTelemetry en `kahoot-api`
Igual que `auth-api` (`telemetry.ts` + middleware HTTP): trazas y métricas HTTP por OTLP HTTP a `OTEL_EXPORTER_OTLP_ENDPOINT`; si no hay colector, **no debe fallar ni bloquear el arranque**. Nombre de servicio `kahoot-api`. Prueba equivalente a `telemetry.spec.ts`. (La telemetría del gateway en vivo se agrega en la Fase 4.)

### E. Imágenes
1. El límite de subida de multer sale de `IMAGE_MAX_BYTES` (hoy está fijo en 2 MiB). Superarlo devuelve 413 `IMAGE_TOO_LARGE` con el formato `Problem` del contrato. Prueba con un límite pequeño por configuración.
2. **Validar el formato por el contenido** (magic bytes) y **no exigir** que la extensión del nombre del cliente coincida: un archivo PNG llamado `blob` o `foto` debe aceptarse; el nombre guardado usa la extensión derivada del contenido. Sigue rechazando contenido que no sea PNG/JPEG/WebP con 415. Actualiza las pruebas.
3. `GET /api/v1/images/:filename`: agrega `Cache-Control: public, max-age=31536000, immutable` (los nombres son UUID inmutables) y `Cross-Origin-Resource-Policy: cross-origin` (la web en otro dominio las muestra). Conserva `X-Content-Type-Options: nosniff`. Prueba de cabeceras.

### F. Seed de demostración útil para la defensa
Hoy el cuestionario demo tiene **1 pregunta** y una imagen PNG de **1×1 píxel**. La demostración exige varias preguntas y una imagen visible.
- Cuestionario demo con **5 preguntas** Verdadero/Falso (mezcla de verdaderas y falsas) sobre un tema neutro (p. ej. programación/paradigmas), en español.
- **Al menos 2 preguntas con imagen real y visible** (p. ej. 640×360, ligera, < 100 KB cada una), guardadas como archivos pequeños en `apps/kahoot-api/assets/demo/` (generados por ti o dibujados con código; sin derechos de autor ajenos) y subidas por el seed mediante `ImageStorage`.
- IDs fijos y deterministas por pregunta; **idempotente por pregunta**: reejecutar el seed no duplica ni sobrescribe ediciones del usuario, y si falta una pregunta (p. ej. fue borrada) no la recrea sin avisar — documenta el comportamiento elegido.
- `DEMO_PROFILE_ID` sigue compartido con `auth-api`. La contraseña demo viene **solo del entorno** (`DEMO_PASSWORD`); nada de credenciales en el repositorio.
- Prueba del seed con PostgreSQL: 5 preguntas, 2 imágenes accesibles por `GET /images/...` y segunda ejecución sin cambios.

**Terminado cuando:** `npm run lint`, `npm test` (con PostgreSQL), `npm run build` pasan; el seed corre dos veces seguidas sin duplicar; las imágenes demo se ven al abrirlas por URL.

---

## Entrega
- Cada PR hacia `main` con: qué hiciste, cómo probarlo, y **cualquier desviación del contrato** (no debería haberla).
- Márcalos como **listos para revisión** (no borrador); no los fusiones tú.
- Después de fusionados, el orquestador marcará las tareas de `f3-nucleo-kahoot` y preparará el brief de la Fase 4.
