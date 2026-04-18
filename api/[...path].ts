/**
 * VERCEL SERVERLESS API HANDLER
 * -----------------------------
 * Entry point for ALL `/api/*` requests on Vercel.
 *
 * HOW IT WORKS:
 * 1. Vercel routes any request matching `/api/*` to this file (see vercel.json).
 * 2. This file initialises a Fastify app on first request (cold start) and
 *    caches it in memory for subsequent warm invocations.
 * 3. The Fastify app handles the request using all registered routes.
 *
 * WHY THE DIST PATH:
 * `build:vercel` compiles TypeScript → `backend/api/dist/`.
 * We import the *compiled JS* at runtime, not the raw TypeScript source.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

// Cached Fastify handler — reused across warm Vercel invocations
let handler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

/**
 * Initialise the Fastify app once, then cache the Node.js http handler.
 * On "cold start" (first request) this takes a few hundred milliseconds.
 * On subsequent "warm" requests it returns instantly.
 */
async function getHandler(): Promise<(req: IncomingMessage, res: ServerResponse) => void> {
  if (handler) return handler;

  // Import the compiled JS output of `backend/api/src/create-app.ts`
  // (compiled by `npm run build -w backend-api` during `build:vercel`)
  const { createApp } = await import("../backend/api/dist/create-app.js");
  const app = await createApp({ logger: false });
  await app.ready();

  // Wrap the Fastify instance as a raw Node.js http handler
  handler = (req: IncomingMessage, res: ServerResponse) => {
    app.server.emit("request", req, res);
  };

  return handler;
}

/**
 * Vercel serverless function entry point.
 * Every GET/POST/etc. to /api/* is routed here by vercel.json.
 */
export default async function (req: IncomingMessage, res: ServerResponse) {
  const h = await getHandler();
  h(req, res);
}
