# ProfeLink Kahoot

Evaluaciones en vivo tipo Kahoot para ProfeLink (EIF400 Paradigmas de Programación, II Ciclo 2026). Un docente crea cuestionarios de Verdadero o Falso con imágenes, abre una sala con código y los participantes responden desde su celular o computadora mientras ven el resultado al instante.

## Qué incluye

| Componente | Carpeta | Descripción |
|---|---|---|
| Frontend web | `apps/web` | React + Vite. Español e inglés, funciona en celular y computadora |
| Servicio de autenticación | `apps/auth-api` | NestJS. Registro, login y JWT (RS256). Se despliega por aparte |
| Servicio de actividades | `apps/kahoot-api` | NestJS + Socket.IO. Cuestionarios, salas, partida en vivo y resultados |
| Cliente externo | `apps/external-client` | Página independiente que consulta una sesión y sus resultados por la API |
| Contratos | `packages/contracts` | OpenAPI de las dos APIs y esquemas de los eventos en vivo |
| Infraestructura | `infra/` | Dockerfiles, nginx, PostgreSQL, observabilidad (Grafana, Tempo, Loki, Prometheus) |

La especificación completa, con diagramas de arquitectura y de clases, modelo de datos, API y eventos, está en [docs/especificacion.md](docs/especificacion.md).

## URLs

| Qué | URL |
|---|---|
| Aplicación desplegada (Vercel) | <https://profelink-kahoot.vercel.app> |
| auth-api (Render), documentación | <https://profelink-auth-api.onrender.com/docs> |
| kahoot-api (Render), documentación | <https://profelink-kahoot-api.onrender.com/docs> |
| Cliente externo desplegado | <https://profelink-cliente-externo.vercel.app> |
| Imágenes en Docker Hub | [`aaronsc04/profelink-auth-api`](https://hub.docker.com/r/aaronsc04/profelink-auth-api), [`aaronsc04/profelink-kahoot-api`](https://hub.docker.com/r/aaronsc04/profelink-kahoot-api), [`aaronsc04/profelink-web`](https://hub.docker.com/r/aaronsc04/profelink-web) |

Las APIs de Render usan el plan gratuito: tras 15 minutos sin uso se duermen y la primera petición tarda cerca de un minuto. Abre la aplicación unos minutos antes de una demostración.

En local (con Docker): aplicación en <http://localhost:8080>, documentación Scalar de la autenticación en <http://localhost:3001/docs> y de las actividades en <http://localhost:3002/docs>, Grafana (opcional) en <http://localhost:3000>.

## Requisitos previos

- Git, Docker y Docker Compose v2. No hace falta Node ni .NET para ejecutar la solución.
- Descargas iniciales: imágenes de PostgreSQL (`postgres:17-alpine`), Node y nginx para construir, y las del equipo si usas `--images`. Con observabilidad se suman Grafana, Prometheus, Tempo, Loki, Alloy y OpenTelemetry Collector (unos cientos de MB).
- Para desarrollar o correr pruebas fuera de Docker: Node 22 y `npm install` en la raíz (monorepo con workspaces).

## Inicio

```bash
git clone <url-del-repositorio>
cd <carpeta>
./start.sh              # Linux, macOS o Git Bash
```

```powershell
.\start.ps1             # Windows PowerShell
```

El script crea `.env` desde `.env.example`, genera las contraseñas que falten, construye las imágenes, inicia todo, carga los datos de demostración e imprime las direcciones y las credenciales del usuario demo. Para ver o cambiar la configuración revisa [`.env.example`](.env.example); `.env` nunca se versiona.

| Opción (Bash / PowerShell) | Efecto |
|---|---|
| `--images` / `-Images` | Usa las imágenes de Docker Hub en lugar de construirlas |
| `--lan` / `-Lan` | Usa la IP de la máquina como URL pública, para jugar desde celulares de la misma red |
| `--public-url URL` / `-PublicUrl URL` | Usa una URL concreta |
| `--observability` / `-Observability` | Agrega Grafana, Prometheus, Tempo, Loki y el Collector |
| `--debug-controls` / `-DebugControls` | Muestra el botón "simular reconexión" para la demostración |

Detalles de puertos, volúmenes y varias copias en la misma máquina: [infra/README.md](infra/README.md).

### Base local o Supabase

Por defecto todo usa el PostgreSQL local de Compose. Para probar las APIs locales contra Supabase (opcional): copia `.env.supabase.example` a `.env.supabase`, completa los valores y ejecuta

```bash
docker compose --env-file .env --env-file .env.supabase -f compose.yaml -f compose.supabase.yaml up -d --no-deps auth-api kahoot-api web
```

`.env.supabase` no se versiona. Este modo requiere las variables `DATABASE_SSL_CA` y `DATABASE_SCHEMA` en las APIs (ver [docs/briefs/codex-supabase-ssl-esquema.md](docs/briefs/codex-supabase-ssl-esquema.md)).

## Detención

```bash
./stop.sh               # detiene y conserva los datos
./stop.sh --purge       # detiene y BORRA los datos (pide confirmación)
```

En PowerShell: `.\stop.ps1` y `.\stop.ps1 -Purge`.

## Cuentas y datos de prueba

El script carga un usuario docente y el cuestionario **"Programación y paradigmas"** (5 preguntas, 2 con imagen). Las credenciales se generan al iniciar y se imprimen en pantalla:

- Correo: el valor de `DEMO_EMAIL` en `.env` (por defecto `docente.demo@example.com`).
- Contraseña: el valor de `DEMO_PASSWORD` en `.env`.

Los participantes se registran desde la propia aplicación con cualquier correo.

## Cómo demostrar el juego

1. Abre la aplicación (en local <http://localhost:8080>; para celulares inicia con `--lan`).
2. Inicia sesión con el usuario demo, o crea un cuestionario nuevo con varias preguntas y al menos una imagen.
3. Crea una sala con ese cuestionario. Aparece un **código de seis caracteres**.
4. En otros dispositivos regístrate o inicia sesión, elige unirte e ingresa el código. El anfitrión ve quiénes entran.
5. El anfitrión inicia la partida. Cada pregunta se muestra con su imagen y dos botones, Verdadero y Falso, con cuenta regresiva.
6. Al cerrarse la pregunta (por tiempo o por el anfitrión) se revela la respuesta correcta y el resultado. El anfitrión avanza a la siguiente.
7. Al terminar se muestra la clasificación y los resultados quedan guardados.
8. **Reconexión:** en un participante apaga la red o recarga la página durante la pregunta. Al volver regresa a la misma sala con su puntaje, sin duplicarse. Con `--debug-controls` hay un botón que lo simula.

## Cómo demostrar el cliente adicional

El cliente externo es una página independiente: no importa código de las APIs ni toca la base de datos; solo usa los contratos HTTP publicados.

```bash
# 1. Permitir su origen en las APIs: agregar a .env y volver a iniciar
CORS_ORIGINS=http://localhost:8080,http://localhost:5174

# 2. Iniciar el cliente (Node 22)
npm install
npm start -w @profelink/external-client      # http://localhost:5174
```

Abre <http://localhost:5174>, inicia sesión con la cuenta demo, escribe el código de una sesión terminada y consulta su clasificación. La configuración (URL de las APIs, correo, código por defecto) se cambia con variables `EXTERNAL_*` o en `apps/external-client/config.json`; la contraseña solo se escribe en el formulario. Más detalle en [apps/external-client/README.md](apps/external-client/README.md).

## Pruebas

```bash
npm run lint            # todas las apps y los contratos
npm test                # unitarias y de componentes
npm run build
npm run spec:validate   # valida las especificaciones OpenSpec
```

- Las pruebas de integración de las APIs usan PostgreSQL real si defines `AUTH_TEST_DATABASE_URL` y `TEST_DATABASE_URL`; sin ellas se omiten.
- Pruebas e2e con Playwright contra la solución en Compose: `npm run test:e2e:pw -w @profelink/web` (con `./start.sh` ya en marcha).
- Prueba de carga y evidencia de participantes simultáneos: [apps/kahoot-api/LOAD-VERIFICATION.md](apps/kahoot-api/LOAD-VERIFICATION.md).

## Estructura del repositorio y forma de trabajo

```
apps/        web, auth-api, kahoot-api, external-client
packages/    contracts (OpenAPI y eventos en vivo)
infra/       Dockerfiles, nginx, PostgreSQL, observabilidad
docs/        especificación, diagramas, modelo de datos y briefs
openspec/    especificaciones y cambios por fase (los archivados están en openspec/changes/archive)
```

Los contratos se definen primero en `packages/contracts` y manda la regla de que el servidor es la única fuente de tiempo y de estado de la partida. Las reglas de trabajo del equipo están en [AGENTS.md](AGENTS.md).

## Aportes de cada integrante

_Pendiente: el equipo completa esta tabla con el aporte identificable de cada integrante._

| Integrante | Aporte |
|---|---|
| | |
