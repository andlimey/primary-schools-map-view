# --- Stage 1: build the frontend ---
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build

# --- Stage 2: python runtime ---
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY src/ ./src/
RUN uv sync --frozen --no-dev

COPY data/schools.sqlite3 ./data/schools.sqlite3
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 8000
CMD [".venv/bin/schools-map-api"]
