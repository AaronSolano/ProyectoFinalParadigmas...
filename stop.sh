#!/usr/bin/env bash
# Detiene ProfeLink Kahoot.
#   ./stop.sh            Detiene y elimina los contenedores; CONSERVA los datos (perfiles, cuestionarios, imagenes, resultados)
#   ./stop.sh --purge    Ademas BORRA los volumenes: se pierden todos los datos
set -euo pipefail
cd "$(dirname "$0")"

PURGE=0
for arg in "$@"; do
  case "$arg" in
    --purge) PURGE=1 ;;
    -h|--help) sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opcion desconocida: $arg (use --help)" >&2; exit 2 ;;
  esac
done

# Sin .env Compose no puede interpolar las variables obligatorias; para detener basta cualquier valor.
if [ ! -f .env ]; then
  export POSTGRES_PASSWORD=x DEMO_PASSWORD=x GRAFANA_ADMIN_PASSWORD=x
fi

COMPOSE=(docker compose -f compose.yaml --profile observability --profile seed)
if [ "$PURGE" = 1 ]; then
  printf 'Esto borrara TODOS los datos (base de datos, imagenes, claves). Escriba "borrar" para continuar: '
  read -r answer
  [ "$answer" = "borrar" ] || { echo "Cancelado."; exit 1; }
  "${COMPOSE[@]}" down -v --remove-orphans
  echo "Contenedores y datos eliminados."
else
  "${COMPOSE[@]}" down --remove-orphans
  echo "Contenedores detenidos. Los datos se conservan; ./start.sh los recupera."
fi
