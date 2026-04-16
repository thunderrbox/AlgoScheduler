/**
 * FRONTEND ENTRY POINT (Browser)
 * ------------------------------
 * This is the entry file for the React application. 
 * 
 * Key Roles:
 * 1. Mounts the React "App" component into the DOM (#root).
 * 2. Initializes Global Styles (index.css).
 * 3. Enables 'StrictMode' to catch potential problems during development.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Critical: Root container not found. Check index.html.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

