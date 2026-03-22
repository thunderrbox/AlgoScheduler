/**
 * BACKEND — dev/build tool (not a server)
 * ----------------------------------------
 * Writes OpenAPI 3 spec to repo root: openapi/openapi.json .
 * Run after build: node dist/generate-openapi.js (see package.json "openapi" script).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

config({ path: resolve(repoRoot, ".env") });

const required = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://scee:scee@localhost:5432/scee?schema=public",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ?? "0".repeat(32),
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ?? "1".repeat(32),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};

for (const [key, value] of Object.entries(required)) {
  process.env[key] = value;
}

const { createApp } = await import("./create-app.js");

const app = await createApp();
await app.ready();
const spec = app.swagger();
await app.close();

const outDir = resolve(repoRoot, "openapi");
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, "openapi.json");
writeFileSync(outFile, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
console.log(`Wrote ${outFile}`);
