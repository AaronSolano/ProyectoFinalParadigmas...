# Kahoot API — aporte Codex, fase 3

API NestJS con TypeScript estricto, PostgreSQL y migraciones TypeORM. Implementa el contrato REST de `packages/contracts/openapi/kahoot-api.yaml`. El juego Socket.IO corresponde a la fase 4.

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
