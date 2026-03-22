/**
 * BACKEND — Fastify application factory
 * --------------------------------------
 * Registers CORS, JWT, OpenAPI/Swagger UI, and all REST routes under /api.
 * Used by index.ts (live server) and generate-openapi.ts (export openapi.json).
 */
import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./env.js";
import { registerSwagger } from "./plugins/swagger.js";
import { registerApiRoutes } from "./app.js";

export type CreateAppOptions = {
  /** Default false so OpenAPI generation stays quiet. */
  logger?: boolean;
};

export async function createApp(
  opts: CreateAppOptions = {},
): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({ logger: opts.logger ?? false });

  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });

  await registerSwagger(app);
  await app.register(registerApiRoutes, { prefix: "/api" });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    req.log.error(err);
    reply.status(err.statusCode ?? 500).send({
      error: err.message ?? "Internal Server Error",
    });
  });

  return app;
}
