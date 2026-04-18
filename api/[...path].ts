/**
 * VERCEL SERVERLESS API HANDLER
 * -----------------------------
 * This is the entry point for ALL `/api/*` requests on Vercel.
 *
 * HOW IT WORKS:
 * 1. Vercel routes any request matching `/api/*` to this file (via vercel.json rewrites).
 * 2. This file creates a Fastify instance (cached across invocations for performance).
 * 3. The Fastify app handles the request using all registered routes (auth, problems, submissions).
 * 4. The response is sent back to the browser.
 *
 * WHY:
 * Vercel runs Node.js in serverless functions. Instead of a persistent server process,
 * each request spins up this function. The Fastify instance is reused across "warm" invocations.
 *
 * IMPORTANT: This file uses CommonJS-style handler because Vercel's @vercel/node expects it.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

// Cache the Fastify app across warm invocations (avoids re-initializing on every request)
let handler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

/**
 * Initialize the Fastify app once, then reuse it for subsequent requests.
 * This is called "cold start" on the first request, then cached.
 */
async function getHandler(): Promise<(req: IncomingMessage, res: ServerResponse) => void> {
  if (handler) return handler;

  // Dynamic import to load the app factory
  const { createApp } = await import("../backend/api/src/create-app.js");
  const app = await createApp({ logger: false });
  await app.ready();

  // Create a raw Node.js handler from the Fastify instance
  handler = (req: IncomingMessage, res: ServerResponse) => {
    app.server.emit("request", req, res);
  };

  return handler;
}

/**
 * Vercel serverless function entry point.
 * Every request to /api/* goes through here.
 */
export default async function (req: IncomingMessage, res: ServerResponse) {
  const h = await getHandler();
  h(req, res);
}
