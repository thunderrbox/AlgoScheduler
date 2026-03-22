/** BACKEND — liveness probe for load balancers / sanity checks. */
import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/health",
    {
      schema: {
        tags: ["health"],
        summary: "Health check",
        response: {
          200: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              service: { type: "string" },
            },
          },
        },
      },
    },
    async () => ({ ok: true, service: "scee-api" }),
  );
}
