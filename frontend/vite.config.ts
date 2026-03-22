/**
 * FRONTEND build tool config (Vite)
 * ---------------------------------
 * `npm run dev -w frontend` (or `npm run dev` from repo root) starts port 5173.
 * The proxy sends browser requests to /api/* to the BACKEND (Fastify on 3001) so you avoid CORS during dev.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});
