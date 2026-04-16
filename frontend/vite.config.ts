/**
 * FRONTEND build tool config (Vite)
 * ---------------------------------
 * This file configures the Vite development server and build process.
 * 
 * Key Features:
 * 1. React Plugin: Enables JSX support and Fast Refresh.
 * 2. Dev Proxy: Routes all browser requests starting with "/api" to the 
 *    backend server (port 3001). This solves CORS issues during local development.
 * 3. Env Configuration: Picks up variables from the monorepo root .env file.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  // Point to the monorepo root for .env files
  envDir: resolve(__dirname, ".."),
  server: {
    port: 5173,
    proxy: {
      // Directs frontend calls (e.g. fetch('/api/problems')) to the Node server.
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Output directly to dist/ (default)
    outDir: "dist",
    // Ensure separate files for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "@monaco-editor/react"],
        },
      },
    },
  },
});

