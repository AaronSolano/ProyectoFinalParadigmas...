# syntax=docker/dockerfile:1
# Imagen de la web: compila con Vite y sirve el resultado con nginx (sin privilegios).
# Se construye SIN URLs de API: nginx reenvia /api/v1 y /socket.io al backend, de modo que
# la misma imagen funciona en cualquier host o IP.
#   docker build -f infra/docker/web.Dockerfile -t profelink-web .
ARG NODE_IMAGE=node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee

FROM ${NODE_IMAGE} AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/auth-api/package.json apps/auth-api/package.json
COPY apps/kahoot-api/package.json apps/kahoot-api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --workspaces --include-workspace-root
COPY apps/web apps/web
# Mostrar el boton "simular reconexion" solo si se pide (demostracion en clase).
ARG VITE_ENABLE_DEBUG_CONTROLS=false
ENV VITE_AUTH_API_URL="" \
    VITE_KAHOOT_API_URL="" \
    VITE_ENABLE_DEBUG_CONTROLS=${VITE_ENABLE_DEBUG_CONTROLS}
RUN npm run build -w @profelink/web

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY infra/docker/web-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=6 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
