/**
 * VERCEL SERVERLESS — /api/problems/:slug (nested paths)
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../../backend/api/src/create-app.js";

let handler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

async function getHandler() {
  if (handler) return handler;
  const app = await createApp({ logger: true });
  await app.ready();
  handler = (req: IncomingMessage, res: ServerResponse) => {
    app.server.emit("request", req, res);
  };
  return handler;
}

export default async function (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const h = await getHandler();
    h(req, res);
  } catch (err) {
    console.error("[vercel-problems-handler] Unhandled error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Internal Server Error", message: String(err) }),
    );
  }
}
