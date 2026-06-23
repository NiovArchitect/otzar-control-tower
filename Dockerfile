# Control Tower — Vite + React SPA served by nginx.
#
# Build:
#   docker build -t niov/control-tower:dev .
#
# Run:
#   docker run --rm -p 8080:80 niov/control-tower:dev
#   # open http://localhost:8080
#
# The Vite bundle is built with VITE_FOUNDATION_API_URL baked in at build time
# (the canonical var the app source reads; see src/lib/api.ts + .env.example).
# In production this is overridden via a build-time --build-arg, e.g.
#   docker build --build-arg VITE_FOUNDATION_API_URL=https://api.example.com/api/v1 .
# (Vite SPAs cannot read env vars at runtime in the browser, so the API origin
# must be baked at build time.)

# --- Stage 1: build --------------------------------------------------------
FROM node:22.11-bookworm-slim AS build

ARG VITE_FOUNDATION_API_URL=http://localhost:3000/api/v1
ENV VITE_FOUNDATION_API_URL=${VITE_FOUNDATION_API_URL}

WORKDIR /app

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src

RUN npm run build

# --- Stage 2: nginx --------------------------------------------------------
FROM nginx:1.27-bookworm-slim AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback so client-side routes resolve to index.html.
RUN printf '%s\n' \
  'server {' \
  '  listen 80 default_server;' \
  '  listen [::]:80 default_server;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location / { try_files $uri /index.html; }' \
  '  location /healthz { return 200 "ok"; }' \
  '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/healthz || exit 1
