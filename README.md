# AlgoScheduler: Smart Code Evaluation Engine

AlgoScheduler is a high-performance, containerized monorepo platform for executing and judging code submissions (similar to LeetCode or Codeforces).

## 🏗 System Architecture

```text
[ Browser ] <---(HTTP/WS)---> [ Nginx Reverse Proxy (Frontend) ]
                                     |
           +-------------------------+-------------------------+
           |                                                   |
    [ React SPA ]                                       [ Fastify API ]
 (Monaco + Vite)                                    (JWT, BullMQ Producer)
                                                               |
                                                               v
 [ Postgres DB ] <--------------------------------------+ [ Redis Queue ]
(Prisma Storage)                                        (BullMQ / Jobs)
                                                               |
                                                               v
 [ Node Worker ] <--------------------------------------+ [ Judge Worker ]
(Stub Judge Logic)                                      (BullMQ Consumer)
```

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Monaco Editor (for a rich IDE experience).
- **Backend**: Fastify (high-performance Node.js framework), Zod (schema validation), BullMQ (distributed job queue).
- **Database**: PostgreSQL with Prisma ORM.
- **Cache/Queue**: Redis.
- **Deployment**: Docker Compose with multi-stage builds and Nginx as a reverse proxy.

## 🚀 One-Click Quick Start (Development)

1. **Environment Setup**:
   ```bash
   cp .env.example .env
   ```
2. **Launch Infrastructure**:
   ```bash
   docker-compose up -d
   ```
3. **Bootstrap Application**:
   ```bash
   npm install      # Installs all deps & generates Prisma client
   npm run db:push  # Syncs schema to Postgres
   npm run db:seed  # Populates problems and test users
   ```
4. **Run All Services**:
   ```bash
   npm run dev
   ```
   - Website: [http://localhost:5173](http://localhost:5173)
   - API Health: [http://localhost:3001/api/health](http://localhost:3001/api/health)
   - OpenAPI Docs: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

## 🚢 Production Deployment

To deploy AlgoScheduler to a live server (VPS):

1. **Prerequisites**: Ensure your server has **Docker** and **Docker Compose** installed.
2. **Clone & Config**:
   ```bash
   git clone <your-repo-url>
   cd AlgoScheduler
   cp .env.example .env
   ```
   *Edit `.env` and set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and your production `DATABASE_URL`.*
3. **Build & Launch**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```
    Your website will be live on port **80**. Nginx handles serving the React files and routing `/api` calls to the containerized Node backend.

## ☁️ Platform as a Service (Vercel + Railway)

If you prefer managed hosting over a VPS:

### 1. Backend & Infrastructure (Railway)
1. Link your GitHub repo to **Railway.app**.
2. Add a **Postgres** and **Redis** service.
3. Deploy the `backend/api` and `backend/worker` as separate services.
4. Set the `DATABASE_URL` and `REDIS_URL` in the Railway environment variables.

### 2. Frontend (Vercel)
1. Link your repo to **Vercel**.
2. Set the **Root Directory** to `frontend`.
3. Set the **Environment Variable**: `VITE_API_BASE_URL` to your Railway API URL (e.g., `https://api.myapp.railway.app`).
4. Vercel will build and host your React app at a custom `.vercel.app` domain.

## 🔌 API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | No | Create a new student account |
| `/api/auth/login` | POST | No | Exchange credentials for JWT tokens |
| `/api/auth/refresh` | POST | Yes | Rotate refresh token for a new session |
| `/api/problems` | GET | No | List all published coding challenges |
| `/api/submissions` | POST | Yes | Submit code for evaluation |
| `/api/submissions/:id`| GET | Yes | Poll for submission status and results |

## 🔑 Default Credentials (After Seeding)

- **Admin User**: `admin@local.dev` / `password123`
- **Student User**: `demo@local.dev` / `password123`

## 📦 Project Structure

- `frontend/`: React application and Monaco integration.
- `backend/api/`: REST server and validation logic.
- `backend/worker/`: Asynchronous judging service.
- `packages/db/`: Prisma schema and shared database client.
- `packages/shared/`: Shared types and constants across the monorepo.

---
*Created with ❤️ for competitive programming enthusiasts.*

