# Project guide — what is frontend, what is backend, what to do

## How to open the website (everything running)

You need **Postgres**, **Redis**, the **backend API**, the **worker**, and the **frontend** running together. The usual way is **one terminal** at the repo root plus Docker.

### Step-by-step (Windows / PowerShell)

1. **Open a terminal** in the project folder: `d:\Project`

2. **Environment file** (once):

   ```powershell
   Copy-Item .env.example .env
   ```

   Edit `.env` if needed; defaults match `docker-compose.yml`.

3. **Start databases** (Postgres + Redis):

   ```powershell
   docker compose up -d
   ```

   Wait until containers are healthy.

4. **Install Node dependencies** (once, or after pulling changes):

   ```powershell
   npm install
   ```

5. **Create tables and demo data** (once, or after schema changes):

   ```powershell
   npm run db:push
   npm run db:seed
   ```

6. **Start backend API + worker + frontend at the same time**:

   ```powershell
   npm run dev
   ```

   You should see **three** labeled streams: `api`, `worker`, `web`.

7. **Open the site in your browser**

   - **Frontend (the website UI):**  
     [http://localhost:5173](http://localhost:5173)

   - **Backend health (JSON):**  
     [http://localhost:3001/api/health](http://localhost:3001/api/health)

   - **API docs (Swagger):**  
     [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

The React app calls `/api/...`. **Vite** (port 5173) **proxies** `/api` to the Fastify server on **3001**, so you normally only open **5173**.

### Run frontend and backend separately (three terminals)

From `d:\Project`:

```powershell
npm run dev -w backend-api
npm run dev -w backend-worker
npm run dev -w frontend
```

All three must be running for the full site (especially **worker** for code submissions).

### If something fails

| Symptom | What to check |
|--------|----------------|
| `ECONNREFUSED` to Postgres | `docker compose up -d`, `DATABASE_URL` in `.env` |
| `ECONNREFUSED` to Redis | Redis container running, `REDIS_URL` in `.env` |
| Login works but submit hangs | **Worker** must be running (`npm run dev` includes it) |
| CORS errors | `WEB_ORIGIN` in `.env` should be `http://localhost:5173` |

---

## Where is the frontend?

| Path | Role |
|------|------|
| `frontend/` | **Frontend** — React + Vite + Monaco editor |
| `frontend/src/main.tsx` | Browser entry: mounts React |
| `frontend/src/App.tsx` | Main UI: login, problems, editor, submit |
| `frontend/src/api.ts` | `fetch` helper → `/api/...` (proxied to backend) |
| `frontend/vite.config.ts` | Dev server + **proxy** `/api` → `3001` |

**What to do here:** UI/UX, pages, Monaco, calling new API routes.

---

## Where is the backend?

| Path | Role |
|------|------|
| `backend/api/` | **HTTP API** — Fastify (REST + OpenAPI) |
| `backend/api/src/index.ts` | **Starts the server** — port 3001 |
| `backend/api/src/create-app.ts` | Builds the Fastify app (CORS, JWT, Swagger, routes) |
| `backend/api/src/app.ts` | Registers route modules |
| `backend/api/src/routes/*.ts` | **Endpoints:** auth, problems, submissions |
| `backend/api/src/queue/judge-queue.ts` | Enqueues judge jobs to Redis (BullMQ) |
| `backend/api/src/env.ts` | Environment variables |

**What to do here:** New routes, validation, auth, rate limits.

---

## Worker (backend, not HTTP)

| Path | Role |
|------|------|
| `backend/worker/` | **Background worker** — consumes judge jobs from Redis |
| `backend/worker/src/index.ts` | BullMQ worker entry |
| `backend/worker/src/judge/stub-judge.ts` | **Replace** with Docker/sandbox execution |

**What to do here:** Run user code safely, compare output to tests.

---

## Shared packages (API + worker)

| Path | Role |
|------|------|
| `packages/db/` | **Prisma** — schema + client |
| `packages/db/prisma/schema.prisma` | Tables |
| `packages/shared/` | Queue name + Zod request schemas |

---

## Root / infra

| Path | Role |
|------|------|
| `package.json` | Workspaces: `frontend`, `backend/*`, `packages/*` |
| `docker-compose.yml` | Postgres + Redis |
| `.env` | Secrets (not committed) |
| `openapi/openapi.json` | API contract (regenerated on `backend-api` build) |

### Main `npm` scripts

| Command | What runs |
|---------|-----------|
| `npm run dev` | **backend-api + backend-worker + frontend** together |
| `npm install` | Installs all workspaces; postinstall builds shared + db packages |
| `npm run db:push` / `db:seed` | Database setup |
| `npm run openapi` | Regenerates `openapi/openapi.json` |
| `npm run build` | Production build of all workspaces |

---

## Typical “Submit” flow

1. **Browser** (`frontend/…/App.tsx`) → `POST /api/submissions`
2. **backend/api** writes DB row, pushes Redis job
3. **backend/worker** runs judge, updates DB
4. **Browser** polls `GET /api/submissions/:id` until `completed`

Redis + worker are required for submissions to finish.
