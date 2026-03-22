/**
 * BACKEND — HTTP API server entry (`backend/api`)
 * ------------------------------------------------
 * Run: npm run dev -w backend-api  (or `npm run dev` from repo root).
 * Listens on API_PORT (default 3001). Routes under /api/* .
 */
import { env } from "./env.js";
import { createApp } from "./create-app.js";

async function main(): Promise<void> {
  const app = await createApp({ logger: true });
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
  app.log.info(`API http://${env.API_HOST}:${env.API_PORT}/api/health`);
  app.log.info(`OpenAPI UI http://${env.API_HOST}:${env.API_PORT}/api/docs`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
