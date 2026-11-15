# syntax=docker/dockerfile:1
# Imagen de auth-api. Contexto de construccion: raiz del repositorio.
#   docker build -f infra/docker/auth-api.Dockerfile -t profelink-auth-api .
ARG NODE_IMAGE=node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee

# Manifiestos: permiten cachear la instalacion de dependencias.
FROM ${NODE_IMAGE} AS manifests
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/auth-api/package.json apps/auth-api/package.json
COPY apps/kahoot-api/package.json apps/kahoot-api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json

# Compilacion con todas las dependencias.
FROM manifests AS build
RUN npm ci --workspaces --include-workspace-root
COPY apps/auth-api/tsconfig.json apps/auth-api/tsconfig.json
COPY apps/auth-api/src apps/auth-api/src
RUN npm run build -w @profelink/auth-api

# Solo dependencias de produccion.
FROM manifests AS prod-deps
RUN npm ci --omit=dev --omit=optional --omit=peer --workspace=@profelink/auth-api

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/auth-api/dist apps/auth-api/dist
COPY apps/auth-api/package.json apps/auth-api/package.json
COPY infra/docker/auth-entrypoint.cjs apps/auth-api/entrypoint.cjs
# Directorio de claves JWT: un volumen nombrado hereda este propietario.
RUN mkdir -p /keys && chown node:node /keys
WORKDIR /repo/apps/auth-api
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "entrypoint.cjs"]
