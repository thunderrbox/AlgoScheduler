/** BACKEND — OpenAPI spec + Swagger UI at /api/docs . */
import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "../env.js";

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Smart Code Evaluation & Feedback Engine API",
        description:
          "MVP API: auth, problems, submissions. Judge runs asynchronously via BullMQ workers.",
        version: "0.0.1",
      },
      servers: [
        {
          url: `http://localhost:${env.API_PORT}`,
          description: "Local (paths include /api prefix)",
        },
      ],
      tags: [
        { name: "health", description: "Liveness" },
        { name: "auth", description: "JWT access + refresh" },
        { name: "problems", description: "Problem catalog" },
        { name: "submissions", description: "Submit code & poll results" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/api/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
}
