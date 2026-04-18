/**
 * VERCEL SERVERLESS API HANDLER
 * ─────────────────────────────
 * Entry point for ALL /api/* requests on Vercel.
 *
 * ARCHITECTURE:
 * - Vercel routes /api/* requests here (see vercel.json).
 * - We initialise a Fastify app on first (cold) request and cache it.
 * - The Fastify instance is re-used for subsequent warm invocations.
 *
 * WHY A STATIC TOP-LEVEL IMPORT:
 * The backend uses ESM ("type":"module"). A dynamic `import()` inside a
 * CommonJS file causes an ERR_REQUIRE_ESM error at runtime on Vercel.
 * Using a static top-level import lets Vercel's esbuild bundler resolve and
 * inline the backend code correctly at build time.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../backend/api/src/create-app.js";

// Cached Node.js http handler — reused across warm Vercel invocations
let handler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

/**
 * Initialise the Fastify app once and cache the raw Node.js http handler.
 */
async function getHandler(): Promise<(req: IncomingMessage, res: ServerResponse) => void> {
  if (handler) return handler;

  const app = await createApp({ logger: true });
  await app.ready();

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
  try {
    const h = await getHandler();
    h(req, res);
  } catch (err) {
    console.error("[vercel-handler] Unhandled error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error", message: String(err) }));
  }
}
