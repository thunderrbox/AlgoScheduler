/**
 * BACKEND — environment variables
 * ---------------------------------
 * Loads repo-root `.env` and validates with Zod. Used by API.
 * This ensures all required configuration is present before the app starts.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
// Look for .env in the monorepo root (3 levels up from backend/api/src)
config({ path: resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  /** development | production | test */
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  /** PostgreSQL connection string (required — use Neon.tech free tier for Vercel) */
  DATABASE_URL: z.string().min(1),
  
  /** 
   * Redis connection URL for BullMQ jobs.
   * OPTIONAL: When empty, the API runs the judge INLINE (no worker needed).
   * This is the mode used on Vercel where persistent workers aren't possible.
   */
  REDIS_URL: z.string().optional().default(""),
  
  /** Secret for signing Access JWTs (short-lived) */
  JWT_ACCESS_SECRET: z.string().min(32),
  
  /** Secret for signing Refresh JWTs (long-lived) */
  JWT_REFRESH_SECRET: z.string().min(32),
  
  /** Host to bind the Fastify server to */
  API_HOST: z.string().default("0.0.0.0"),
  
  /** Port the Fastify server will listen on */
  API_PORT: z.coerce.number().default(3001),
  
  /** 
   * Allowed CORS origins (comma separated).
   * In containerized production, Nginx usually handles the proxy so this is matched against your domain.
   */
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);

