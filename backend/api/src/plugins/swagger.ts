/**
 * SWAGGER / OPENAPI PLUGIN
 * ------------------------
 * This plugin automatically generates and serves interactive API documentation.
 * 
 * Key Features:
 * 1. Introspection: Fastify scans all route schemas and builds an OpenAPI 3.0 spec.
 * 2. Swagger UI: Serves a beautiful interactive dashboard at '/api/docs' for 
 *    developers to test endpoints without external tools.
 */
import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "../env.js";

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  // 1. Definition phase: Configure the internal OpenAPI documentation object
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Smart Code Evaluation Engine (SCEE) API",
        description:
          "High-performance REST API for managing users, code challenges, and judging submissions.",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://localhost:${env.API_PORT}`,
          description: "Local Development Server",
        },
      ],
      tags: [
        { name: "auth", description: "Identity and session management (JWT)" },
        { name: "problems", description: "Public coding challenge catalog" },
        { name: "submissions", description: "Async judge queue and results" },
        { name: "system", description: "Health checks and metadata" },
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

  // 2. UI phase: Serve the documentation dashboard to the browser
  await app.register(swaggerUi, {
    routePrefix: "/api/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
}

