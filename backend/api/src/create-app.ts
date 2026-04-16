/**
 * BACKEND — Fastify application factory
 * --------------------------------------
 * This file is the "heart" of the API. It:
 * 1. Initializes the Fastify instance.
 * 2. Configures CORS (Cross-Origin Resource Sharing) for security.
 * 3. Sets up JWT (JSON Web Tokens) for authentication.
 * 4. Registers OpenAPI/Swagger UI for interactive documentation.
 * 5. Mounts all business logic routes under the "/api" prefix.
 */
import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./env.js";
import { registerSwagger } from "./plugins/swagger.js";
import { registerApiRoutes } from "./app.js";

export type CreateAppOptions = {
  /** Enables/disables the Fastify logger (stdout) */
  logger?: boolean;
};

export async function createApp(
  opts: CreateAppOptions = {},
): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({ logger: opts.logger ?? false });

  // CORS Configuration: Controls which domains can talk to this API.
  // In production, we pull this from the CORS_ORIGIN env var.
  const origins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  await app.register(cors, {
    origin: origins,
    credentials: true,
  });

  // JWT Configuration: Used to sign and verify user sessions.
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });

  // Register Swagger (OpenAPI) documentation at /api/docs
  await registerSwagger(app);

  // Register all feature routes (auth, problems, submissions, etc.)
  await app.register(registerApiRoutes, { prefix: "/api" });

  /**
   * Global Error Handler: Ensures all errors return a standard JSON shape 
   * instead of leaking stack traces or raw server messages.
   */
  app.setErrorHandler((err: FastifyError, req, reply) => {
    req.log.error(err);
    reply.status(err.statusCode ?? 500).send({
      error: err.message ?? "Internal Server Error",
    });
  });

  return app;
}

