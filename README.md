# Smart Code Evaluation & Feedback Engine (monorepo scaffold)

Stack: **React (Vite) + Monaco**, **Fastify + OpenAPI**, **Prisma + PostgreSQL**, **BullMQ + Redis**, **Node worker** with a **stub judge** (replace with Docker-backed execution).

## Prerequisites

- Node.js 20+
- Docker (for Postgres + Redis)

## How to open the website (frontend + backend)

1. Complete **Quick start** below (Docker, `npm install`, `db:push`, `db:seed`).
2. From the repo root run:

   ```bash
   npm run dev
   ```

3. In your browser open **http://localhost:5173** — that is the React frontend.
4. Keep that terminal open: it runs **three** processes — **api** (`backend/api` on port 3001), **worker** (`backend/worker` + Redis), and **web** (`frontend` / Vite on 5173). Submissions need the worker.

**Sanity checks:** [http://localhost:3001/api/health](http://localhost:3001/api/health) should return JSON. API docs: [http://localhost:3001/api/docs](http://localhost:3001/api/docs).

**Folder map and troubleshooting:** see [PROJECT_GUIDE.md](./PROJECT_GUIDE.md).

---

## Quick start

1. Copy environment file:

   ```bash
   copy .env.example .env
   ```

   (On macOS/Linux: `cp .env.example .env`)

2. Start databases:

   ```bash
   docker compose up -d
   ```

3. Install dependencies (generates Prisma client and builds `@scee/shared` + `@scee/db`):

   ```bash
   npm install
   ```

4. Apply schema and seed demo data:

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Run API, worker, and web together:

   ```bash
   npm run dev
   ```

- Web: [http://localhost:5173](http://localhost:5173)
- API health: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- OpenAPI UI: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

## OpenAPI (checked-in contract)

- **File:** [`openapi/openapi.json`](openapi/openapi.json) — OpenAPI 3.0 spec for all `/api/*` routes (commit this when routes change).
- **Regenerate:** `npm run openapi` (root) or `npm run build -w backend-api` (runs at the end of the API build). No Postgres/Redis required for generation; the BullMQ queue is created only when a submission is enqueued.

## Seeded accounts

| Email             | Password      |
|-------------------|---------------|
| `demo@local.dev`  | `password123` |
| `admin@local.dev` | `password123` |

## Folder layout (frontend vs backend)

| Path | Role |
|------|------|
| **`frontend/`** | **Frontend** — React + Vite + Monaco; dev server proxies `/api` → `3001` |
| **`backend/api/`** | **Backend (HTTP)** — Fastify REST, JWT, BullMQ producer |
| **`backend/worker/`** | **Backend (jobs)** — BullMQ consumer + stub judge |
| `packages/db` | Prisma schema + client (used by backend) |
| `packages/shared` | Shared Zod + queue name (used by backend) |
| `openapi/` | Generated `openapi.json` |

**Run frontend + backend together:** from repo root, `npm run dev` (starts all three). See [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) for separate terminals.

## Next implementation steps

1. Replace `runStubJudge` with a Docker runner (network-off, memory/CPU/pids limits, wall-clock timeout).
2. Add real stdout vs `expectedOutput` comparison and checker scripts.
3. Add `@fastify/rate-limit` (Redis) on `/auth/login` and `/submissions`.
4. Add GitHub Actions: `lint`, `test`, `docker compose` integration smoke.

## Migrations (optional)

For migration history instead of `db:push`:

```bash
cd packages/db
npx prisma migrate dev --name init
```
