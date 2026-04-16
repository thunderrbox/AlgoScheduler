/**
 * HEALTH CHECK
 * ------------
 * A simple endpoint used by load balancers and deployment platforms (like Railway)
 * to verify that the API server is up and responsive.
 */
import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "Check API health",
        response: {
          200: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              status: { type: "string" },
            },
          },
        },
      },
    },
    async () => ({ ok: true, status: "healthy" }),
  );
}

