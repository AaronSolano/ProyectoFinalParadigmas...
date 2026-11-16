# Kahoot API — aporte Codex, fase 3

API NestJS con TypeScript estricto, PostgreSQL y migraciones TypeORM. Implementa el contrato REST de `packages/contracts/openapi/kahoot-api.yaml`. El canal Socket.IO de fase 4 implementa los contratos de `packages/contracts/events/`.

## Ejecutar

Desde esta carpeta: `npm install --workspaces=false`, `npm run migration:run`, `npm run build`, `npm start`. En el monorepo usar los scripts del workspace `@profelink/kahoot-api` una vez actualizado el lockfile por el orquestador.

Variables requeridas: `KAHOOT_DATABASE_URL`, `AUTH_BASE_URL` (raíz del host de auth) y `PUBLIC_API_URL` (raíz pública de esta API). Opcionales: `KAHOOT_PORT=3002`, `DATABASE_SSL=false`, `JWT_ISSUER=auth-api`, `JWT_AUDIENCE=kahoot-api`, `CORS_ORIGINS=http://localhost:5173`, `QUESTION_TIME_SECONDS=20`, `IMAGE_STORAGE=disk`, `IMAGE_STORAGE_PATH=./data/images`, `IMAGE_MAX_BYTES=2097152`.

Con `IMAGE_STORAGE=supabase` se requieren `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`; `SUPABASE_BUCKET` tiene valor predeterminado `question-images`. El bucket debe existir. Las claves nunca se guardan en el repositorio.

Salud: `/api/v1/health`. Documentación Scalar: `/docs`. El JWT RS256 se valida por JWKS, incluyendo emisor, audiencia, expiración e identidad, sin consultar la base de autenticación.

## Verificación

`npm run lint` y `npm run build` comprueban TypeScript. `npm test` ejecuta pruebas de almacenamiento y reglas. Para las pruebas HTTP con PostgreSQL real, definir `TEST_DATABASE_URL` apuntando **a una base exclusiva de pruebas**: la suite aplica migraciones y vacía las tablas de esa base entre casos. No usar una base con datos reales. La suite arranca su propio servidor JWKS y firma tokens efímeros.

Las pruebas cubren permisos, validación de JWT, CRUD y reordenamiento, instantáneas inmutables, ingreso concurrente e idempotente, aislamiento, confidencialidad, carga y borrado de imágenes, y validación de respuestas HTTP contra esquemas del contrato. Supabase se prueba contra un servidor HTTP local que verifica su protocolo de almacenamiento; la conexión a un proyecto Supabase real requiere configuración externa.

## Decisiones de persistencia

El borrado de un cuestionario es lógico para mantener el `quizId` de salas e historial; sus preguntas se eliminan. Las imágenes de snapshots se conservan aunque el creador las quite del cuestionario. El título también se copia al crear una sala. Las posiciones de preguntas son base 1 y las del snapshot base 0.

La generación evita reutilizar códigos históricos: las consultas de resultados solo identifican una sala por código. La base conserva el índice único de códigos activos previsto en el modelo. El estado y los resultados se leen exclusivamente de PostgreSQL.

El orquestador debe actualizar el lockfile raíz y el seguimiento OpenSpec, que están fuera de la propiedad de Codex. No se han cambiado contratos ni archivos de infraestructura.

## Auditoria de dependencias

NestJS 11.2.10, Swagger 11.4.8 y Scalar 1.2.37 eliminan las alertas altas de las dependencias HTTP y documentacion anteriores. Auditoria de produccion: 0 altas/criticas, 3 moderadas propagadas por TypeORM, glob y minimatch. La aplicacion registra migraciones por clase y no acepta patrones glob del cliente; las rutas vulnerables de expansion no forman parte del flujo HTTP. Corregir esas transitivas requiere una actualizacion mayor de TypeORM y debe verificarse por separado. El arbol completo ademas contiene 7 alertas bajas de herramientas de pruebas.

## Seed de demostración (fase 6)

Ejecutar `npm run seed` después del seed de auth. `DEMO_PROFILE_ID` debe coincidir con el perfil de auth; por defecto es `00000000-0000-4000-8000-000000000001`. El script aplica migraciones y crea cinco preguntas Verdadero/Falso en español, con dos diagramas originales PNG de 640×360 (menos de 100 KB cada uno). Admite ejecuciones repetidas o concurrentes sin duplicar ni sobrescribir las ediciones del usuario. No consulta la base de autenticación. La integración con Compose queda a cargo de infraestructura.

### Actualización e idempotencia del seed

La migración `DemoSeedHistory` registra la versión del seed para distinguir una instalación nueva de una eliminación voluntaria. En una base nueva se crean las cinco preguntas con IDs deterministas. Una instalación anterior con la demo de una pregunta conserva esa pregunta y el título, incluso editados, y agrega las cuatro nuevas; el comando avisa de la actualización. Si la primera pregunta anterior ya fue borrada, se respeta esa eliminación y se avisa (quedan cuatro preguntas). Después de registrar la versión, cualquier pregunta ausente se informa y no se recrea. Un cuestionario eliminado tampoco se restaura. El seed no modifica preguntas existentes, sus imágenes ni sus fechas.

Los archivos `assets/demo/decision.png` y `assets/demo/pila.png` son ilustraciones propias generadas por `scripts/generate-demo-images.py` (Python + Pillow, solo para regeneración). Deben acompañar al directorio `dist` en el despliegue; se leen desde la raíz de esta app tanto con `tsx` como desde el código compilado. Se suben mediante `ImageStorage`. La contraseña sigue perteneciendo al seed de auth y llega exclusivamente por `DEMO_PASSWORD`.

## Telemetría e imágenes

`OTEL_EXPORTER_OTLP_ENDPOINT` habilita trazas y métricas HTTP por OTLP HTTP con nombre `kahoot-api`. Sin variable el servicio no exporta. Un colector no disponible no bloquea el arranque ni las respuestas; los exportadores tienen un timeout de dos segundos. Las pruebas verifican exportación y arranque con endpoint ausente o inaccesible.

`IMAGE_MAX_BYTES` configura el límite de Multer y de validación (entre 1 y 2097152 bytes, máximo del contrato). El formato se reconoce por contenido PNG/JPEG/WebP, sin exigir extensión al nombre del cliente. Las imágenes públicas incorporan caché inmutable de un año, `Cross-Origin-Resource-Policy: cross-origin` y `nosniff`.

Las suites se ejecutan en procesos separados para aislar los proveedores globales OpenTelemetry y el cargador ESM de Scalar. El lockfile raíz requiere regeneración del orquestador por las nuevas dependencias OpenTelemetry.

## Juego en vivo — aporte Codex, fase 4

El namespace `/game` valida `auth: { token }` por JWKS y usa `session:<code>` para aislar partidas. Los seis comandos y diez eventos de salida conservan los esquemas canónicos; Ajv también valida las entradas en ejecución. `CORS_ORIGINS` se aplica a HTTP y Socket.IO.

Las reglas puras están en `src/domain/game.ts`; los casos de uso, colas por sala y temporizadores en `src/application/game-service.ts`; el puerto de persistencia en `src/domain/ports/game-store.ts`; PostgreSQL en `src/data/game-store.ts`; el gateway NestJS en `src/presentation/game-gateway.ts`. La aplicación no importa Socket.IO. El anfitrión entra como anfitrión sin crear un participante; puede participar si antes ingresa por REST.

Al arrancar, `main.ts` aplica las migraciones antes de recuperar partidas y escuchar conexiones. `RUN_MIGRATIONS=true` es el valor predeterminado; usar `false` si las aplica un proceso externo. La ejecución mantiene un bloqueo asesor de PostgreSQL en la misma conexión que las migraciones para serializar arranques simultáneos, incluida la creación de la tabla de historial. La migración incremental agrega `answers`, `sessions.game_state`, el cierre persistido y el estado de participación. Conserva el estado REST `in_progress`, distinguiendo internamente `question_open` y `question_closed`. El plazo se conserva en PostgreSQL durante el cierre para reconstruir la última pregunta; `state_sync.closesAt` es `null` al cerrar. Los eventos publicados se validan contra los esquemas vigentes de packages/contracts.

`npm run build` copia los JSON Schemas canónicos a `dist/schemas` y el OpenAPI a `dist/openapi`. El código compilado carga primero estos archivos empaquetados. La lectura desde `packages/contracts` solo está permitida en desarrollo o pruebas; en producción un bundle incompleto falla al arrancar. Para desplegar, conservar el directorio `dist` completo junto con las dependencias y los assets de demostración.

`LIVE_MAX_EVENTS_PER_SECOND=20` limita los eventos entrantes por socket en una ventana deslizante de un segundo, antes de validar payloads o acceder a la base. El exceso se descarta y tres excesos consecutivos desconectan solo ese socket. Los eventos no reconocidos también consumen presupuesto. No se agregan eventos ni códigos de error al contrato y los demás sockets de la sala siguen funcionando.

Cada comando bloquea la fila de sesión dentro de una transacción. La restricción única y `ON CONFLICT DO NOTHING` impiden respuestas duplicadas. Se puntúa al cerrar; estado, respuestas puntuadas y puntajes se confirman juntos. Los eventos se publican después del commit. Al finalizar se guarda la clasificación en la misma transacción que marca la sesión terminada. Al reiniciar, los plazos vencidos se cierran y los restantes se reprograman. Una falla temporal del temporizador se reintenta cada segundo. Se requiere una sola instancia del servicio, como establece el diseño.

El ingreso REST también avisa al lobby; el posterior ingreso Socket.IO no duplica el aviso ni el participante. Una desconexión de red no elimina participación. `session:leave` oculta al participante del lobby, conservando identidad, respuestas y resultados; salir de una pestaña mantiene las otras pestañas conectadas.

### Verificación local

Desde `apps/kahoot-api`, instalar con `npm install --workspaces=false` y ejecutar:

```powershell
$env:TEST_DATABASE_URL='postgresql://usuario:clave@localhost:5432/kahoot_test'
npm run lint
npm run build
npm test
```

Configurar una base PostgreSQL dedicada. Las suites truncan datos: nunca configurar una base con datos reales. La prueba de arranque crea y elimina una base temporal; el usuario de pruebas necesita permiso `CREATEDB`. Sin `TEST_DATABASE_URL`, las integraciones PostgreSQL quedan omitidas. El runner ejecuta cada suite en un proceso separado para aislar ESM/Scalar y los proveedores globales de OpenTelemetry. La infraestructura de pruebas pertenece a la rama F7 (PR #19); la infraestructura final corresponde a F6.

Las pruebas adicionales de revisión están en `packaged-app.spec.ts` (app compilada sin `packages/`), `startup-migrations.spec.ts` (base vacía, desactivación y arranque concurrente) y `live-event-budget.spec.ts`/`live.spec.ts` (presupuesto e inundación aislada).

Verificación de los ajustes del PR #18: `npm run lint`, `npm run build` y `npm test` aprobados con PostgreSQL real. **61 pruebas aprobadas: las 56 anteriores y 5 nuevas**, sin suites PostgreSQL omitidas. La app compilada arranca desde un directorio temporal sin `packages/`; dos arranques concurrentes crean las tablas en una base vacía antes de escuchar; un emisor que inunda la sala es desconectado y otro participante completa su respuesta y puntaje normalmente.

Resultado del 15 de noviembre de 2026: **56 pruebas aprobadas** con PostgreSQL real, incluida una partida completa con dos salas, imagen, respuestas correctas/incorrectas/ausentes, empates, permisos, esquemas, reconexión, primeras respuestas concurrentes y reinicios antes/después del plazo. También se verificaron por separado las **30 pruebas de auth-api**, con `AUTH_TEST_DATABASE_URL` en una base dedicada. Lint y compilación de ambas APIs aprobados. CI omitido por instrucción del usuario.

Las 12 tareas de F4 quedan verificadas por las suites `game-domain.spec.ts` (1.1–1.3), `live.spec.ts` (2.1–4.2, 5.1) y las integraciones REST existentes. Por solicitud expresa del usuario, el cambio está archivado en `openspec/changes/archive/2026-11-15-f4-tiempo-real/`, con sus dos especificaciones sincronizadas y el plan actualizado. El archivo documenta el trabajo realizado; revisión y merge del PR siguen pendientes. El orquestador debe actualizar el lockfile raíz para las nuevas dependencias.

### OpenTelemetry

`OTEL_EXPORTER_OTLP_ENDPOINT` activa la exportación HTTP OTLP de trazas y métricas con `service.name=kahoot-api`. Se exportan `http.server.requests`, `http.server.duration`, `game.connections.active`, `game.events` y `game.event.duration`. Las etiquetas usan rutas y nombres de eventos; no incluyen códigos de sala, tokens, correos, nombres ni respuestas. Sin endpoint se usan los proveedores sin exportador. Las pruebas `telemetry.spec.ts` y `game-telemetry.spec.ts` comprueban exportación real contra un receptor HTTP local y ausencia de datos sensibles. La configuración de Collector y Grafana pertenece a infraestructura.

## Carga reproducible — aporte Codex, fase 7

`scripts/load.mjs` usa clientes Socket.IO simulados con perfiles registrados por la API real. Valida los eventos contra los esquemas, el puntaje y los resultados persistidos. Aumenta la concurrencia por pasos, mide percentiles de respuesta y cierre y se detiene con salida 1 si supera los umbrales. Emite un informe JSON con el hardware y el máximo verificado. Crea cuentas, cuestionario y salas de prueba; usar un entorno dedicado.

Los cuatro archivos de infraestructura de pruebas pertenecen exclusivamente a F7: `test/Dockerfile`, `test/compose.yaml`, `test/init-dbs.sql` y `test/start-auth.cjs`. El Dockerfile usa una imagen fijada por digest y `npm ci` con el lockfile raíz. La construcción y ejecución quedaron verificadas sobre `main` en `299d463`, con el lockfile regenerado en el PR #22 y sin modificarlo aquí. Si los manifiestos dejan de coincidir, `npm ci` rechaza la construcción. La infraestructura final permanece a cargo de F6.

Desde `apps/kahoot-api`, con dependencias de desarrollo instaladas:

```powershell
docker compose -p profelink-f7 -f test/compose.yaml --profile load up -d --build --wait
$env:AUTH_BASE_URL='http://127.0.0.1:55435'
$env:KAHOOT_BASE_URL='http://127.0.0.1:55436'
$env:LOAD_STEPS='5,10,25'
npm run load
docker compose -p profelink-f7 -f test/compose.yaml --profile load down
```

Configurar `LOAD_TIMEOUT_MS` (15000), `LOAD_MAX_P95_MS` (1000) y `LOAD_MAX_ERROR_RATE` (0.01) para ajustar los criterios. El Compose de pruebas utiliza bases e imágenes desechables y claves RSA efímeras; no es el despliegue de infraestructura. El informe verificado y sus límites están en [LOAD-VERIFICATION.md](./LOAD-VERIFICATION.md).

## Métricas para paneles de juego — Codex, F6

Todas usan el servicio `kahoot-api`. Los atributos nuevos tienen valores de una lista cerrada; no contienen códigos de sala, IDs, nombres ni tokens. Una sesión se considera activa desde `session:start` hasta finalizar, incluido el intervalo entre preguntas. Al arrancar, el valor se recupera desde PostgreSQL, tanto para preguntas abiertas como cerradas.

| Nombre OTel                    | Tipo          | Unidad      | Atributos                                                                |
| ------------------------------ | ------------- | ----------- | ------------------------------------------------------------------------ |
| `game.sessions.active`         | Gauge         | `{session}` | Ninguno                                                                  |
| `game.answers`                 | Counter       | `{answer}`  | `outcome`: `accepted`/`rejected`; `reason`: lista cerrada indicada abajo |
| `game.question.close.duration` | Histogram     | `s`         | Ninguno                                                                  |
| `game.live.rate_limited`       | Counter       | `{socket}`  | Ninguno                                                                  |
| `game.connections.active`      | UpDownCounter | `1`         | Ninguno                                                                  |
| `game.events`                  | Counter       | `1`         | `game.event`, `game.outcome`                                             |
| `game.event.duration`          | Histogram     | `s`         | `game.event`, `game.outcome`                                             |

`game.answers` cuenta respuestas aceptadas/rechazadas y errores de comandos `answer:submit`. Las aceptadas usan `reason=none`. Las rechazadas usan `already_answered`, `late`, `closed`, `not_in_session`, `invalid_state`, `invalid_payload`, `room_not_found`, `internal_error` u `other` para cualquier razón no reconocida. Los paquetes descartados por el límite de flujo no cuentan como respuestas procesadas.

`game.question.close.duration` mide desde `closesAt` hasta que el servidor publica `question:closed`, después del commit, incluyendo espera en la cola y persistencia. Un cierre manual anterior al plazo se registra como 0, nunca negativo. No mide el tiempo de recepción en cada navegador. `game.live.rate_limited` cuenta una vez cada socket desconectado por exceso repetido; no cuenta cada paquete descartado.

Pruebas: `game-telemetry.spec.ts` verifica exportación OTLP real, valores, unidades y atributos; `game-metrics.spec.ts` verifica recuperación, inicio/fin y medición después de publicar; `live.spec.ts` verifica el contador al desconectar un emisor que inunda la sala y el conteo de respuestas de otro participante.

## Registros estructurados

Cada solicitud HTTP emite una línea JSON a stdout, sin requerir OpenTelemetry ni un colector. Se registra al terminar la respuesta; una conexión cerrada antes de completarla se registra una sola vez con estado 499. No se serializan cuerpos, cabeceras, cookies, errores, URLs ni consultas. No se registran correos, contraseñas, tokens, IP ni nombres de participantes.

| Campo | Contenido |
| --- | --- |
| `ts` | Instante UTC en formato ISO 8601 |
| `level` | `info` para <400, `warn` para 4xx, `error` para 5xx |
| `service` | Nombre fijo de la API |
| `method` | Método HTTP conocido; `OTHER` para otros |
| `route` | Plantilla de Express (por ejemplo `/api/v1/quizzes/:quizId`); `unmatched` si no hay ruta, incluso en middleware de documentación |
| `status` | Estado HTTP; 499 si el cliente interrumpe la respuesta |
| `duration_ms` | Tiempo transcurrido desde la entrada hasta terminar o cerrar la respuesta, en milisegundos |
| `requestId` | UUID nuevo generado por el servidor por solicitud; no se copia de cabeceras del cliente |

El canal `/game` emite una línea por evento entrante procesado (también si falla la validación) y por paquete descartado por el control de flujo. Los eventos desconocidos se registran como `unknown`, sin conservar su nombre original. Son registros del procesamiento en el servidor, no una confirmación de recepción en el cliente. No contienen código de sala, ids, contenido de respuestas ni mensajes de error.

| Campo del canal en vivo | Contenido |
| --- | --- |
| `ts` | Instante UTC ISO 8601 |
| `level` | `info` para `ok`/`ignored`; `warn` para los demás resultados |
| `service` | `kahoot-api` |
| `event` | `session:join`, `session:leave`, `session:start`, `question:next`, `question:close`, `answer:submit` o `unknown` |
| `outcome` | `ok`, `rejected`, `error`, `rate_limited` o `ignored` |
## Assets del seed compilado

El build copia los assets de demostración a dist/assets. El seed compilado usa ese directorio si existe y conserva la ruta del repositorio como respaldo para desarrollo.

## Puntaje por velocidad y rachas

El servidor guarda `question_opened_at` al abrir cada pregunta y `received_at` al recibir la respuesta, antes de esperar en la cola de la sala. Al cerrar, calcula `elapsedMs` entre ambas marcas, acotado a `0..durationSeconds*1000` (`null` sin respuesta). Un acierto antes de 500 ms otorga 1000 puntos; desde 500 ms se aplica `round((1 - elapsedMs / durationMs / 2) * 1000)`, con mínimo 500 al llegar al plazo. Fallo o ausencia otorgan 0. La racha aumenta por acierto y vuelve a 0 por fallo o ausencia, sin bonificación de puntos.

`question:opened` y `state_sync.currentQuestion` incluyen `openedAt` y `durationSeconds`. Cada resultado de `question:closed` incluye `elapsedMs`, `streak`, `pointsAwarded` y `totalScore`. La racha y la apertura sobreviven en PostgreSQL; el cierre también se guarda para reconstruir `state_sync.lastClosed` tras reconectar o reiniciar. No se agregan campos al comando `answer:submit`: tiempos y puntos enviados por el cliente se rechazan por el esquema estricto.

La migración `SpeedScoring1794780003000` conserva los puntos históricos de 0/1, inicializa las rachas existentes en 0 y permite puntos de 0 a 1000. Deduce la apertura de preguntas anteriores a partir del plazo y la duración; completa los cierres guardados con los campos del nuevo contrato. En partidas históricas terminadas sin marca de apertura recuperable, el tiempo de respuesta queda en `null`. El rollback rechaza una base con puntos mayores que 1 para evitar pérdida de datos.

Verificación: `game-domain.spec.ts` cubre la fórmula y la racha puras; `live.spec.ts` cubre velocidades distintas, límites, rechazo de tiempos enviados por clientes, rachas, PostgreSQL, reconexión, reinicio y clasificación final; `speed-migration.spec.ts` verifica la actualización desde datos anteriores. El script de carga valida la fórmula nueva y compara los resultados REST con los del cierre. Los informes de capacidad anteriores documentan la versión evaluada entonces; no certifican la capacidad de esta nueva escala.
