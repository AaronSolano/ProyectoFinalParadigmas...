# Brief para Codex: conexión a Supabase (TLS y una sola base para las dos APIs)

Carpetas: `apps/auth-api` y `apps/kahoot-api`. Rama sugerida: `feat/supabase-codex`. Sin cambios en `packages/contracts`.

## Por qué
Al probar el pooler de Supabase (`aws-0-us-east-1.pooler.supabase.com:5432`) con `ssl: { rejectUnauthorized: true }` falla con `SELF_SIGNED_CERT_IN_CHAIN`: la CA de Supabase no está en el almacén de Node. Además, Supabase da **una sola base `postgres`**, y las dos APIs hoy crean tablas en `public` con la misma tabla `migrations` de TypeORM (y ambas con timestamps `1794780000000`), así que la segunda en arrancar no correría sus migraciones.

## Qué hacer
1. **TLS verificado con CA propia.** Nueva variable opcional `DATABASE_SSL_CA` (contenido PEM del certificado raíz de Supabase). Si `DATABASE_SSL=true` y hay CA, usar `ssl: { ca, rejectUnauthorized: true }`. Sin CA se mantiene el comportamiento actual. No agregar un modo que desactive la verificación.
2. **Esquema por servicio.** Nueva variable `DATABASE_SCHEMA` (por defecto `public`, para que Compose siga igual). Con otro valor: crear el esquema si no existe, usarlo como `schema` de TypeORM, dejar la tabla de migraciones dentro de ese esquema y garantizar que el SQL crudo de las migraciones y las consultas resuelvan en él (por ejemplo fijando `search_path` en cada conexión nueva del pool, sin depender de `options` en el arranque, que el pooler puede ignorar). Usar `auth` en auth-api y `kahoot` en kahoot-api.
3. Aplicar lo mismo en los scripts de seed (`dist/data/seed.js`, `dist/seed.js`).
4. Documentar ambas variables en `.env.example`/README de cada app (avísame si necesitas que yo toque `.env.example` y `compose.yaml`; son mías).

## Hecho cuando
- Pruebas unitarias de la construcción del `DataSource` (CA y esquema).
- Prueba de integración con PostgreSQL real: las dos apps migran en la misma base con `DATABASE_SCHEMA=auth` y `kahoot` sin chocar, y con `public` todo funciona como hoy.
- `npm run lint`, `npm test` y `npm run build` de ambas apps en verde. Tareas marcadas en un cambio OpenSpec nuevo si corresponde.
