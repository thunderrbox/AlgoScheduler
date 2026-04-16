/**
 * OPENAPI GENERATOR (Build Tool)
 * ------------------------------
 * This script is executed during the build process to export our API contract
 * to a standardized JSON file. 
 * 
 * Why:
 * 1. Enables frontend developers to understand the API without reading source code.
 * 2. Allows for automatic SDK generation (if needed).
 * 3. Keeps documentation in sync with actual implementation.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

// Load .env from root for build-time defaults
config({ path: resolve(repoRoot, ".env") });

/**
 * Mock required values for the createApp factory so it can start without 
 * throwing validation errors during the build.
 */
const required = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://scee:scee@localhost:5432/scee?schema=public",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ?? "0".repeat(32),
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ?? "1".repeat(32),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};

for (const [key, value] of Object.entries(required)) {
  process.env[key] = value;
}

const { createApp } = await import("./create-app.js");

// Initialize app, pull the swagger object, and write it to disk
const app = await createApp();
await app.ready();
const spec = app.swagger();
await app.close();

const outDir = resolve(repoRoot, "openapi");
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, "openapi.json");
writeFileSync(outFile, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
console.log(`Successfully Wrote ${outFile}`);

