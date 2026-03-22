/**
 * FRONTEND ENTRY (browser)
 * ------------------------
 * Vite loads this file first. It mounts the React app into <div id="root"> in index.html.
 * Folder: `frontend/` at repo root. Dev: http://localhost:5173 — `/api` → proxied to backend :3001 (vite.config.ts).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
