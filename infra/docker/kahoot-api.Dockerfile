# syntax=docker/dockerfile:1
# Imagen de kahoot-api. Contexto de construccion: raiz del repositorio.
#   docker build -f infra/docker/kahoot-api.Dockerfile -t rubymind-kahoot-api .
ARG NODE_IMAGE=node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee

FROM ${NODE_IMAGE} AS manifests
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/auth-api/package.json apps/auth-api/package.json
COPY apps/kahoot-api/package.json apps/kahoot-api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json

# Compilacion: copia ademas los esquemas y el OpenAPI del contrato dentro de dist.
FROM manifests AS build
RUN npm ci --workspaces --include-workspace-root
COPY apps/kahoot-api/tsconfig.json apps/kahoot-api/tsconfig.json
COPY apps/kahoot-api/src apps/kahoot-api/src
COPY apps/kahoot-api/scripts apps/kahoot-api/scripts
# Los recursos de demostracion se copian a dist/assets durante la compilacion (scripts/copy-schemas.cjs).
COPY apps/kahoot-api/assets apps/kahoot-api/assets
COPY packages/contracts packages/contracts
RUN npm run build -w @profelink/kahoot-api

FROM manifests AS prod-deps
RUN npm ci --omit=dev --omit=optional --omit=peer --workspace=@profelink/kahoot-api

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/kahoot-api/dist apps/kahoot-api/dist
COPY apps/kahoot-api/package.json apps/kahoot-api/package.json
# Imagenes del cuestionario de demostracion (las usa el seed).
COPY apps/kahoot-api/assets apps/kahoot-api/assets
# Directorio de imagenes: un volumen nombrado hereda este propietario.
RUN mkdir -p /data/images && chown -R node:node /data
WORKDIR /repo/apps/kahoot-api
USER node
ENV IMAGE_STORAGE_PATH=/data/images
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3002/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
