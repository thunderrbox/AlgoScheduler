/**
 * BACKEND — route registration
 * -----------------------------
 * Wires feature routes into Fastify. Add new route files here when you add endpoints.
 */
import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { problemRoutes } from "./routes/problems.js";
import { submissionRoutes } from "./routes/submissions.js";

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(problemRoutes);
  await app.register(submissionRoutes);
}
