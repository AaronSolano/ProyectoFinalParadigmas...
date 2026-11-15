#!/usr/bin/env bash
# Inicia ProfeLink Kahoot con Docker Compose. Requisitos: Git, Docker y Docker Compose v2.
#
#   ./start.sh                       Construye las imagenes en esta maquina y las inicia
#   ./start.sh --images              Usa las imagenes publicadas en Docker Hub (no construye)
#   ./start.sh --observability       Agrega Grafana, Prometheus, Tempo, Loki y el Collector
#   ./start.sh --lan                 Publica la URL con la IP de esta maquina (jugar desde otros dispositivos)
#   ./start.sh --public-url URL      Usa una URL concreta (por ejemplo http://192.168.1.20:8080)
#   ./start.sh --debug-controls      Muestra el boton "simular reconexion" (demostracion; reconstruye la web)
#
# La primera vez crea .env desde .env.example y genera las contrasenas que falten.
set -euo pipefail
cd "$(dirname "$0")"

MODE="build"
OBSERVABILITY=0
PUBLIC_URL_ARG=""
LAN=0
DEBUG=0
while [ $# -gt 0 ]; do
  case "$1" in
    --images) MODE="images" ;;
    --build) MODE="build" ;;
    --observability) OBSERVABILITY=1 ;;
    --lan) LAN=1 ;;
    --debug-controls) DEBUG=1 ;;
    --public-url) shift; PUBLIC_URL_ARG="${1:-}" ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opcion desconocida: $1 (use --help)" >&2; exit 2 ;;
  esac
  shift
done

command -v docker >/dev/null 2>&1 || { echo "Docker no esta instalado o no esta en el PATH." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Se necesita Docker Compose v2 (docker compose)." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "El servicio de Docker no esta en ejecucion." >&2; exit 1; }

random_hex() { head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

get_env() { grep -E "^$1=" .env | head -n 1 | cut -d= -f2- || true; }

set_env() { # set_env CLAVE VALOR  (agrega la clave si no existe)
  local key="$1" value="$2" tmp
  tmp="$(mktemp)"
  if grep -qE "^${key}=" .env; then
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="} $1==k{print k"="v; next} {print}' .env > "$tmp"
  else
    cat .env > "$tmp"; printf '%s=%s\n' "$key" "$value" >> "$tmp"
  fi
  cat "$tmp" > .env; rm -f "$tmp"
}

# Cada copia del repositorio usa su propio proyecto de Compose (profelink-<carpeta>), de modo que dos copias
# en la misma maquina no se pisan los contenedores, los volumenes ni las imagenes.
slug() { printf '%s' "$1" | tr 'A-Z' 'a-z' | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//'; }
PROJECT_DEFAULT="profelink-$(slug "$(basename "$PWD")")"
PROJECT_DEFAULT="${PROJECT_DEFAULT%-}"
volume_exists() { [ -n "$(docker volume ls -q --filter "name=^$1$")" ]; }

if [ ! -f .env ]; then
  if volume_exists "${PROJECT_DEFAULT}_pgdata"; then
    echo "Existen datos de una ejecucion anterior de este proyecto (volumen ${PROJECT_DEFAULT}_pgdata) pero falta el archivo .env." >&2
    echo "Sin el .env original la contrasena de la base de datos no coincide. Opciones:" >&2
    echo "  - Restaurar el .env anterior, o" >&2
    echo "  - Borrar los datos anteriores con ./stop.sh --purge y volver a ejecutar ./start.sh" >&2
    exit 1
  fi
  cp .env.example .env
  echo "Se creo .env desde .env.example"
fi

# Nunca se comparte el proyecto con otra copia: sin nombre en .env se usa siempre profelink-<carpeta>.
[ -n "$(get_env COMPOSE_PROJECT_NAME)" ] || set_env COMPOSE_PROJECT_NAME "$PROJECT_DEFAULT"
export COMPOSE_PROJECT_NAME="$(get_env COMPOSE_PROJECT_NAME)"

[ "$(get_env POSTGRES_PASSWORD)" = "cambiar_esto" ] || [ -z "$(get_env POSTGRES_PASSWORD)" ] && set_env POSTGRES_PASSWORD "$(random_hex)"
[ "$(get_env GRAFANA_ADMIN_PASSWORD)" = "cambiar_esto" ] || [ -z "$(get_env GRAFANA_ADMIN_PASSWORD)" ] && set_env GRAFANA_ADMIN_PASSWORD "$(random_hex)"
[ -n "$(get_env DEMO_PASSWORD)" ] || set_env DEMO_PASSWORD "Demo$(random_hex)"

if [ "$LAN" = 1 ]; then
  ip="$( (hostname -I 2>/dev/null || ipconfig getifaddr en0 2>/dev/null || true) | awk '{print $1}')"
  [ -n "$ip" ] || { echo "No se pudo detectar la IP; use --public-url http://IP:PUERTO" >&2; exit 1; }
  PUBLIC_URL_ARG="http://${ip}:$(get_env WEB_PORT)"
fi
[ -z "$PUBLIC_URL_ARG" ] || set_env PUBLIC_URL "$PUBLIC_URL_ARG"
[ "$DEBUG" = 0 ] || set_env VITE_ENABLE_DEBUG_CONTROLS true

COMPOSE=(docker compose -f compose.yaml)
UP_ARGS=(up -d --wait)
if [ "$MODE" = "build" ]; then
  COMPOSE+=(-f compose.build.yaml)
  UP_ARGS+=(--build)
fi
if [ "$OBSERVABILITY" = 1 ]; then
  set_env OTEL_EXPORTER_OTLP_ENDPOINT "http://otel-collector:4318"
  COMPOSE+=(--profile observability)
else
  set_env OTEL_EXPORTER_OTLP_ENDPOINT ""
fi

if [ "$MODE" = "images" ]; then
  echo "Descargando imagenes de Docker Hub..."
  "${COMPOSE[@]}" pull
fi

echo "Iniciando (la primera vez tarda unos minutos)..."
"${COMPOSE[@]}" "${UP_ARGS[@]}"

echo "Cargando datos de demostracion (idempotente)..."
"${COMPOSE[@]}" run --rm seed-auth
"${COMPOSE[@]}" run --rm seed-kahoot

echo
echo "ProfeLink Kahoot esta en marcha."
echo "  Proyecto Compose: ${COMPOSE_PROJECT_NAME}"
echo "  Aplicacion:      $(get_env PUBLIC_URL)"
echo "  Usuario demo:    $(get_env DEMO_EMAIL)"
echo "  Contrasena demo: $(get_env DEMO_PASSWORD)   (guardada en .env)"
echo "  API de auth:     http://localhost:$(get_env AUTH_PORT)/docs     (solo en esta maquina)"
echo "  API de kahoot:   http://localhost:$(get_env KAHOOT_PORT)/docs   (solo en esta maquina)"
if [ "$OBSERVABILITY" = 1 ]; then
  echo "  Grafana:         http://localhost:$(get_env GRAFANA_PORT)  (usuario $(get_env GRAFANA_ADMIN_USER), contrasena en .env)"
fi
echo "Detener: ./stop.sh   |   Detener y borrar datos: ./stop.sh --purge"
