/**
 * FRONTEND build tool config (Vite)
 * ---------------------------------
 * This file configures the Vite development server and production build.
 *
 * DEPLOYMENT MODEL:
 * - LOCAL DEV:  Vite proxy forwards /api → http://127.0.0.1:3001 (backend on same machine)
 * - PRODUCTION: Frontend on Vercel, backend on Railway. The env var VITE_API_BASE_URL
 *               is set in Vercel dashboard to point to the Railway API URL.
 *
 * Key Features:
 * 1. React Plugin: Enables JSX support and Fast Refresh (HMR).
 * 2. Dev Proxy: Routes /api requests to local backend (solves CORS in dev).
 * 3. Env Config: Picks up VITE_* variables from the monorepo root .env file.
 * 4. Code Splitting: Vendor chunk for React + Monaco for better caching.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],

  // Serve assets from root path (required for Vercel SPA deployment)
  base: "/",

  // Point to the monorepo root for .env files (VITE_API_BASE_URL lives there)
  envDir: resolve(__dirname, ".."),

  server: {
    port: 5173,
    proxy: {
      // LOCAL DEV ONLY: Forwards frontend API calls to the local Fastify server.
      // In production (Vercel), VITE_API_BASE_URL handles this instead.
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },

  build: {
    // Output directory — Vercel reads this via vercel.json "outputDirectory"
    outDir: "dist",

    // Code splitting for better browser caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Large vendor libs get their own chunk (cached separately)
          vendor: ["react", "react-dom", "@monaco-editor/react"],
        },
      },
    },
  },
});

