// FILE: api.ts
// PURPOSE: The single HTTP surface to the Foundation backend.
//          Architectural mirror of Foundation's @niov/database write
//          surface: every screen reads via TanStack Query + a
//          method on `api.*`. No fetch() outside this file. No
//          axios. If a future maintainer reaches for raw HTTP in a
//          component, that's a code-review block.
// CONNECTS TO: src/lib/stores/auth.ts (token + 401-logout
//              callback), src/lib/types/foundation.ts (response
//              shapes), every TanStack Query hook in src/hooks +
//              page-level data loaders.
//
// CONTRACT (the four invariants):
// 1. Every response is normalized to ApiResult<T> -- callers never
//    see a thrown fetch error.
// 2. Authorization: Bearer <token> attached automatically when a
//    token is present.
// 3. 401 responses trigger the configured onUnauthorized callback
//    (wired to auth-store logout in the factory).
// 4. GET requests retry once on network failure (DNS / connection
//    refused). 4xx and 5xx are NOT retried -- those are real
//    application states the caller needs to see.

import type {
  LoginResponse,
  LoginFailure,
  PlatformHealth,
  OrgAnalytics,
  FoundationError,
} from "./types/foundation";

// WHAT: Discriminated-union result every api.* method returns.
// INPUT: Used as a return type.
// OUTPUT: None.
// WHY: Callers branch on `.ok` -- never need try/catch for transport
//      errors. Status code surfaces for HTTP-aware UIs (413 budget,
//      451 compliance, 503 LLM unavailable, etc.).
export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; code: string; message: string; status: number };

interface ApiClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized: () => void;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  retries?: number;
}

// WHAT: The HTTP client class. Instantiated once via the factory
//        below; tests can construct their own for isolation.
// INPUT: Base URL, token getter, 401 handler.
// OUTPUT: A class with grouped method namespaces (auth.*, platform.*,
//         org.*).
// WHY: Constructor injection keeps tests cleanly composable -- no
//      module-level singleton state to reset between tests.
export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  private async request<T>(
    path: string,
    opts: RequestOptions = {},
  ): Promise<ApiResult<T>> {
    const method = opts.method ?? "GET";
    const url = this.options.baseUrl.replace(/\/$/, "") + path;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = this.options.getToken();
    if (token !== null && token.length > 0) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const init: RequestInit = {
      method,
      headers,
      body:
        opts.body !== undefined && opts.body !== null
          ? JSON.stringify(opts.body)
          : null,
    };

    // GET-only network-failure retry. 4xx/5xx are NOT retried --
    // those are real application states the caller must see.
    const maxRetries =
      method === "GET" ? (opts.retries ?? 1) : (opts.retries ?? 0);
    let lastNetworkError: unknown = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, init);

        if (response.status === 401) {
          this.options.onUnauthorized();
          return {
            ok: false,
            code: "SESSION_INVALID",
            message: "Authentication required",
            status: 401,
          };
        }

        // Parse body once. Some Foundation routes return JSON on
        // success and JSON on failure; some routes return empty
        // bodies (e.g., 204). Handle both.
        let parsed: unknown = null;
        const text = await response.text();
        if (text.length > 0) {
          try {
            parsed = JSON.parse(text);
          } catch {
            return {
              ok: false,
              code: "MALFORMED_RESPONSE",
              message: `Non-JSON response from ${path}`,
              status: response.status,
            };
          }
        }

        if (response.ok) {
          return {
            ok: true,
            data: parsed as T,
            status: response.status,
          };
        }

        const errBody = (parsed as Partial<FoundationError>) ?? {};
        return {
          ok: false,
          code: typeof errBody.code === "string" ? errBody.code : "API_ERROR",
          message:
            typeof errBody.message === "string"
              ? errBody.message
              : `Request failed with status ${response.status}`,
          status: response.status,
        };
      } catch (err) {
        lastNetworkError = err;
        // Continue to next retry iteration if any remain.
      }
    }
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message:
        lastNetworkError instanceof Error
          ? lastNetworkError.message
          : "Unknown network error",
      status: 0,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // auth.*
  // ──────────────────────────────────────────────────────────────
  auth = {
    login: (
      email: string,
      password: string,
      requested_operations: string[] = ["read", "write", "share", "admin_org"],
    ): Promise<ApiResult<LoginResponse | LoginFailure>> =>
      this.request<LoginResponse | LoginFailure>("/auth/login", {
        method: "POST",
        body: { email, password, requested_operations },
      }),

    logout: (): Promise<ApiResult<{ ok: true }>> =>
      this.request<{ ok: true }>("/auth/logout", { method: "POST" }),
  };

  // ──────────────────────────────────────────────────────────────
  // platform.*
  // ──────────────────────────────────────────────────────────────
  platform = {
    health: (): Promise<ApiResult<PlatformHealth>> =>
      this.request<PlatformHealth>("/health"),
  };

  // ──────────────────────────────────────────────────────────────
  // org.*
  // ──────────────────────────────────────────────────────────────
  org = {
    analytics: (): Promise<ApiResult<OrgAnalytics>> =>
      this.request<OrgAnalytics>("/org/analytics"),
  };
}

// WHAT: The default api singleton. Wired with the auth store at
//        construction time so every request automatically attaches
//        Bearer + every 401 triggers logout.
// INPUT: None at use-site -- factory pulls from auth store + env.
// OUTPUT: An ApiClient instance.
// WHY: One singleton across the app keeps the contract uniform.
//      Tests construct their own ApiClient with mock callbacks.
import { useAuthStore } from "./stores/auth";

const baseUrl =
  import.meta.env.VITE_FOUNDATION_API_URL ?? "http://localhost:3000/api/v1";

export const api: ApiClient = new ApiClient({
  baseUrl,
  getToken: (): string | null => useAuthStore.getState().token,
  onUnauthorized: (): void => useAuthStore.getState().logout(),
});
