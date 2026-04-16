/**
 * FRONTEND — HTTP helper
 * ----------------------
 * This utility wraps the native `fetch` API to handle:
 * 1. Automatic inclusion of the Bearer Token (JWT).
 * 2. Parsing of JSON responses and error handling.
 * 3. Token Refresh Logic: If the API returns 401 (Unauthorized), this helper
 *    attempts to use the long-lived 'refreshToken' to get a new 'accessToken'
 *    and retries the original request seamlessly.
 */

// Use environment variable for the base API URL, falling back to "/api" 
// which is proxied by Vite during development.
const base = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Interface for the refresh token response.
 */
interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Core API fetch wrapper.
 * @param path - The endpoint path (e.g., "/problems").
 * @param init - standard fetch options plus a 'json' shorthand for body.
 */
export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers);

  // Set Content-Type if we're sending JSON
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  // Inject Bearer token from localStorage for authenticated routes
  const token = localStorage.getItem("accessToken");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Execute the request
  let res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });

  // --- START TOKEN REFRESH LOGIC ---
  if (res.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");
    
    // Only attempt refresh if we actually have a refresh token
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${base}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data: RefreshResponse = await refreshRes.json();
          
          // Store the new pair of tokens
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);

          // Update the header and retry the original request EXACTLY ONCE
          headers.set("Authorization", `Bearer ${data.accessToken}`);
          res = await fetch(`${base}${path}`, {
            ...init,
            headers,
            body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
          });
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }
    }
  }
  // --- END TOKEN REFRESH LOGIC ---

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  // Throw structured error if response is not OK (2xx)
  if (!res.ok) {
    throw new Error(data?.error ?? res.statusText);
  }

  return data as T;
}

