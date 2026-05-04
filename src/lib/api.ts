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
  // 12B.1 -- types extension
  Entity,
  EntityType,
  MemberInput,
  MemberCreateResponse,
  MemberBulkResponse,
  Phase2Result,
  Phase3Result,
  Phase4Status,
  PropagationEntry,
  AITeammateCreateInput,
  AITeammateCreateResponse,
  AITeammateUpdateInput,
  AITeammateUpdateResponse,
  ShareRequest,
  ShareResponse,
  RevokeResponse,
  Paginated,
  Permission,
  Hive,
  SkillPackage,
  AuditEvent,
  AuditEventType,
  OrgHierarchyResponse,
  TwinConfig,
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
  // org.*  (12A: analytics; 12B.1: full org-identity surface)
  // ──────────────────────────────────────────────────────────────
  org = {
    /** GET /api/v1/org/analytics -- compound score + counts. */
    analytics: (): Promise<ApiResult<OrgAnalytics>> =>
      this.request<OrgAnalytics>("/org/analytics"),

    entities: {
      /** GET /api/v1/org/entities -- paginated PERSON+AI_AGENT children. */
      list: (params: {
        skip?: number;
        take?: number;
        type?: EntityType;
      } = {}): Promise<ApiResult<Paginated<Entity>>> =>
        this.request<Paginated<Entity>>(
          `/org/entities${qs(params)}`,
        ),

      /** GET /api/v1/org/entities/:id -- single entity detail. */
      get: (id: string): Promise<ApiResult<Entity>> =>
        this.request<Entity>(`/org/entities/${encodeURIComponent(id)}`),

      /** PATCH /api/v1/org/entities/:id -- status + EntityProfile fields. */
      update: (
        id: string,
        patch: Partial<Pick<Entity, "status">> & Record<string, unknown>,
      ): Promise<ApiResult<Entity>> =>
        this.request<Entity>(`/org/entities/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: patch,
        }),
    },

    members: {
      /** POST /api/v1/org/members -- single create. 12B.0 surfaces audit_event_id. */
      create: (input: MemberInput): Promise<ApiResult<MemberCreateResponse>> =>
        this.request<MemberCreateResponse>("/org/members", {
          method: "POST",
          body: input,
        }),

      /** POST /api/v1/org/members/bulk -- batch create. */
      bulk: (
        members: MemberInput[],
      ): Promise<ApiResult<MemberBulkResponse>> =>
        this.request<MemberBulkResponse>("/org/members/bulk", {
          method: "POST",
          body: { members },
        }),
    },

    hierarchy: {
      /** GET /api/v1/org/hierarchy -- flat EntityMembership list. */
      get: (): Promise<ApiResult<OrgHierarchyResponse>> =>
        this.request<OrgHierarchyResponse>("/org/hierarchy"),
    },

    onboarding: {
      /** POST /api/v1/org/onboarding/start -- Phase 2 analyze. */
      start: (): Promise<ApiResult<Phase2Result>> =>
        this.request<Phase2Result>("/org/onboarding/start", { method: "POST" }),

      /** POST /api/v1/org/onboarding/invite -- Phase 3 commit. 12B.0 audit_event_id. */
      invite: (entity_id: string): Promise<ApiResult<Phase3Result>> =>
        this.request<Phase3Result>("/org/onboarding/invite", {
          method: "POST",
          body: { entity_id },
        }),

      /** POST /api/v1/org/onboarding/reorder -- Phase 4 reorder propagation queue. */
      reorder: (
        propagation_order: PropagationEntry[],
      ): Promise<ApiResult<Phase4Status>> =>
        this.request<Phase4Status>("/org/onboarding/reorder", {
          method: "POST",
          body: { propagation_order },
        }),

      /** GET /api/v1/org/onboarding/status -- Phase 4 status read. */
      status: (): Promise<ApiResult<Phase4Status>> =>
        this.request<Phase4Status>("/org/onboarding/status"),
    },

    aiTeammates: {
      /** GET /api/v1/org/ai-teammates -- list AI_AGENT entities. */
      list: (params: {
        skip?: number;
        take?: number;
      } = {}): Promise<ApiResult<Paginated<Entity>>> =>
        this.request<Paginated<Entity>>(
          `/org/ai-teammates${qs(params)}`,
        ),

      /** GET /api/v1/org/ai-teammates/:id -- single twin detail. */
      get: (
        id: string,
      ): Promise<ApiResult<Entity & { twin_config: TwinConfig }>> =>
        this.request<Entity & { twin_config: TwinConfig }>(
          `/org/ai-teammates/${encodeURIComponent(id)}`,
        ),

      /** POST /api/v1/org/ai-teammates -- thin wrapper around createTwin. 12B.0 audit_event_id. */
      create: (
        input: AITeammateCreateInput,
      ): Promise<ApiResult<AITeammateCreateResponse>> =>
        this.request<AITeammateCreateResponse>("/org/ai-teammates", {
          method: "POST",
          body: input,
        }),

      /** PATCH /api/v1/org/ai-teammates/:id -- mutable: autonomy_level, swarm_enabled, role_template, approver_entity_id. 12B.0 audit_event_id. */
      update: (
        id: string,
        patch: AITeammateUpdateInput,
      ): Promise<ApiResult<AITeammateUpdateResponse>> =>
        this.request<AITeammateUpdateResponse>(
          `/org/ai-teammates/${encodeURIComponent(id)}`,
          { method: "PATCH", body: patch },
        ),

      /** GET /api/v1/org/ai-teammates/:id/stats -- placeholder stats endpoint. */
      getStats: (id: string): Promise<ApiResult<Record<string, unknown>>> =>
        this.request<Record<string, unknown>>(
          `/org/ai-teammates/${encodeURIComponent(id)}/stats`,
        ),

      /** POST /api/v1/org/ai-teammates/:id/skills -- assign one SkillPackage. */
      addSkill: (
        id: string,
        package_id: string,
      ): Promise<ApiResult<{ ok: true; assigned: true }>> =>
        this.request<{ ok: true; assigned: true }>(
          `/org/ai-teammates/${encodeURIComponent(id)}/skills`,
          { method: "POST", body: { package_id } },
        ),
    },

    skillPackages: {
      /** GET /api/v1/org/skill-packages -- global list, no org scope. */
      list: (): Promise<ApiResult<{ ok: true; items: SkillPackage[] }>> =>
        this.request<{ ok: true; items: SkillPackage[] }>(
          "/org/skill-packages",
        ),
    },

    hives: {
      /** GET /api/v1/org/hives -- Hive rows scoped to caller's org. */
      list: (params: {
        skip?: number;
        take?: number;
      } = {}): Promise<ApiResult<Paginated<Hive>>> =>
        this.request<Paginated<Hive>>(`/org/hives${qs(params)}`),
    },

    permissions: {
      /** GET /api/v1/org/permissions -- paginated Permission rows in org scope. */
      list: (params: {
        skip?: number;
        take?: number;
      } = {}): Promise<ApiResult<Paginated<Permission>>> =>
        this.request<Paginated<Permission>>(
          `/org/permissions${qs(params)}`,
        ),
    },

    audit: {
      /** GET /api/v1/org/audit -- paginated audit_events for caller's org. */
      list: (params: {
        skip?: number;
        take?: number;
        event_type?: AuditEventType;
        actor_entity_id?: string;
      } = {}): Promise<ApiResult<Paginated<AuditEvent>>> =>
        this.request<Paginated<AuditEvent>>(`/org/audit${qs(params)}`),
    },
  };

  // ──────────────────────────────────────────────────────────────
  // cosmp.*  (12B.1: grant + revoke; bridge-aware per CONTEXT.md)
  // ──────────────────────────────────────────────────────────────
  cosmp = {
    /** POST /api/v1/cosmp/share -- grant permission(s) under one bridge. 12B.0 audit_event_id. */
    share: (input: ShareRequest): Promise<ApiResult<ShareResponse>> =>
      this.request<ShareResponse>("/cosmp/share", {
        method: "POST",
        body: input,
      }),

    /** DELETE /api/v1/cosmp/share/:bridgeId -- revoke every permission in the bridge. 12B.0 audit_event_id. */
    revoke: (bridgeId: string): Promise<ApiResult<RevokeResponse>> =>
      this.request<RevokeResponse>(
        `/cosmp/share/${encodeURIComponent(bridgeId)}`,
        { method: "DELETE" },
      ),
  };
}

// WHAT: Build a query string from a partial params object.
// INPUT: An object whose values are string | number | undefined.
// OUTPUT: A query-string suffix beginning with "?" if any params were
//         set, or "" otherwise.
// WHY: Several 12B.1 list methods take optional pagination + filter
//      params. Centralized helper avoids ad-hoc string concatenation
//      at every call site.
function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return "";
  const usp = new URLSearchParams();
  for (const [k, v] of entries) {
    usp.set(k, String(v));
  }
  return `?${usp.toString()}`;
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
