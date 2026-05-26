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

import { generateRandomPassword } from "./auth/random-password";
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
  OrgCapsuleListItem,
  Hive,
  SkillPackage,
  AuditEvent,
  AuditEventType,
  OrgHierarchyResponse,
  AITeammateListItem,
  AssignSkillResponse,
  TwinDetailResponse,
  // Employee Otzar MVP -- /otzar/* product surface
  ConversationMessageRequest,
  ConversationMessageResponse,
  ConversationCloseRequest,
  ConversationCloseResponse,
  ObserveRequest,
  ObserveResponse,
  CorrectionRequest,
  CorrectionResponse,
  // Employee Approvals -- /escalations/* product surface
  EscalationListResponse,
  EscalationResponse,
  EscalationResolveRequest,
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
      /** POST /api/v1/org/members -- single create. 12B.0 surfaces audit_event_id.
       *
       *  12B.2: injects a random 32-char placeholder password via
       *  generateRandomPassword() if the caller didn't supply one
       *  (which they shouldn't -- per decision #21, no UI form
       *  collects a password). Foundation requires a non-null
       *  password to mint the row; the invitee's real access path
       *  is Phase3Result.activation_credential, not this value.
       */
      create: (input: MemberInput): Promise<ApiResult<MemberCreateResponse>> =>
        this.request<MemberCreateResponse>("/org/members", {
          method: "POST",
          body: {
            ...input,
            password: input.password ?? generateRandomPassword(),
          },
        }),

      /** POST /api/v1/org/members/bulk -- batch create. Same
       *  random-password injection applied per row. */
      bulk: (
        members: MemberInput[],
      ): Promise<ApiResult<MemberBulkResponse>> =>
        this.request<MemberBulkResponse>("/org/members/bulk", {
          method: "POST",
          body: {
            members: members.map((m) => ({
              ...m,
              password: m.password ?? generateRandomPassword(),
            })),
          },
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
      /** GET /api/v1/org/ai-teammates -- list AI_AGENT entities.
       *
       *  12B.3 (Drift 1): Foundation returns a SLIM row shape
       *  (entity_id, display_name, status, created_at, config) -- NOT
       *  a full Entity. Full Entity surfaced via aiTeammates.get(id)
       *  for the TwinDetailDrawer. List type is
       *  Paginated<AITeammateListItem>; do NOT change to
       *  Paginated<Entity>. */
      list: (params: {
        skip?: number;
        take?: number;
      } = {}): Promise<ApiResult<Paginated<AITeammateListItem>>> =>
        this.request<Paginated<AITeammateListItem>>(
          `/org/ai-teammates${qs(params)}`,
        ),

      /** GET /api/v1/org/ai-teammates/:id -- single twin detail.
       *
       *  Foundation HEAD ee4dafb (12B-FOUNDATION read endpoint).
       *  Returns full Entity + TwinConfig + owner attribution +
       *  hydrated skills. Used by TwinDetailDrawer Overview tab
       *  (entity + twin_config + owner) and Skills tab (skills with
       *  package names). No separate /org/skill-packages fetch needed
       *  in the drawer; the response includes hydrated package per
       *  skill row. Read-only, so no audit_event_id surfaced. */
      get: (id: string): Promise<ApiResult<TwinDetailResponse>> =>
        this.request<TwinDetailResponse>(
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

      /** POST /api/v1/org/ai-teammates/:id/skills -- assign one SkillPackage.
       *
       *  Foundation HEAD ca6e982 (12B-FOUNDATION skills audit) surfaces
       *  audit_event_id on the success arm. Consumed by
       *  TwinDetailDrawer Skills tab's AssignSkillButton
       *  (AuditAwareButton) Stage 4 toast for the clickable audit
       *  chain demo. Failure arms omit audit_event_id per 12B.0
       *  contract. */
      addSkill: (
        id: string,
        package_id: string,
      ): Promise<ApiResult<AssignSkillResponse>> =>
        this.request<AssignSkillResponse>(
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

    capsules: {
      /** GET /api/v1/org/capsules -- ORG-WALLET-ONLY paginated list.
       *
       *  12B.4: powers the Access Control matrix's capsule_type
       *  columns. Foundation handler at apps/api/src/routes/org.routes.ts:838
       *  resolves the caller's org wallet and lists MemoryCapsule rows
       *  scoped to that wallet only -- by design, per the patent's
       *  three-wallet portability boundary. Cross-wallet capsules
       *  (PERSONAL member capsules, AI_AGENT capsules) require a
       *  Foundation extension AND member-consent flow, both tracked
       *  for 12C.0 Foundation batch + 12E Policies. The matrix drops
       *  Permission rows referencing capsule_ids NOT in this response
       *  (see aggregate-matrix.ts).
       *  Returns slim OrgCapsuleListItem rows (10 fields including
       *  relevance_score), not full MemoryCapsule. */
      list: (params: {
        skip?: number;
        take?: number;
      } = {}): Promise<ApiResult<Paginated<OrgCapsuleListItem>>> =>
        this.request<Paginated<OrgCapsuleListItem>>(
          `/org/capsules${qs(params)}`,
        ),
    },

    audit: {
      /** GET /api/v1/org/audit -- paginated audit_events for caller's org.
       *
       *  12B.2 contract drift (decision #23): Foundation's handler
       *  signature only accepts `skip` + `take` -- it silently
       *  ignores `event_type` and `actor_entity_id` query params.
       *  This method still accepts them for forward-compat (12D will
       *  extend Foundation), but callers in 12B.2-12C must filter
       *  client-side after fetch. Pass `take: 50` and slice / filter
       *  in JS until the Foundation extension lands.
       */
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

  // ──────────────────────────────────────────────────────────────
  // otzar.*  (Employee Otzar MVP -- EMPLOYEE-FACING product routes)
  //
  // These are Bearer-validated PRODUCT routes (NOT org-admin, NOT
  // /console/*). Verified capability bindings:
  //   - conversation.message / conversation.close ->
  //     validateSession("read")  (needs can_read_capsules)
  //   - observe / correction -> validateSession("write")
  //     (needs can_write_capsules)
  // None return audit_event_id, so callers use plain mutation UX (no
  // clickable-audit toast). domain/vocabulary is intentionally NOT
  // exposed here -- it is can_admin_org/admin-only.
  // ──────────────────────────────────────────────────────────────
  otzar = {
    conversation: {
      /** POST /api/v1/otzar/conversation/message -- one chat turn with the caller's AI teammate. */
      message: (
        input: ConversationMessageRequest,
      ): Promise<ApiResult<ConversationMessageResponse>> =>
        this.request<ConversationMessageResponse>(
          "/otzar/conversation/message",
          { method: "POST", body: input },
        ),

      /** POST /api/v1/otzar/conversation/close -- end + summarize a conversation to memory. */
      close: (
        input: ConversationCloseRequest,
      ): Promise<ApiResult<ConversationCloseResponse>> =>
        this.request<ConversationCloseResponse>(
          "/otzar/conversation/close",
          { method: "POST", body: input },
        ),
    },

    /** POST /api/v1/otzar/observe -- submit text context for COE extraction. */
    observe: (input: ObserveRequest): Promise<ApiResult<ObserveResponse>> =>
      this.request<ObserveResponse>("/otzar/observe", {
        method: "POST",
        body: input,
      }),

    /** POST /api/v1/otzar/correction -- teach/correct the AI within scoped memory. */
    correction: (
      input: CorrectionRequest,
    ): Promise<ApiResult<CorrectionResponse>> =>
      this.request<CorrectionResponse>("/otzar/correction", {
        method: "POST",
        body: input,
      }),
  };

  // ──────────────────────────────────────────────────────────────
  // escalations.*  (Employee Approvals -- /escalations/* product routes)
  //
  // Bearer product routes (NOT Console). pending/detail require read;
  // approve/reject require write. The two-person rule (caller === source
  // -> 403) is enforced server-side. Responses carry NO audit_event_id
  // -> plain mutation UX. `pending` returns the CALLER'S OWN queue only;
  // there is no org-wide listing endpoint.
  // ──────────────────────────────────────────────────────────────
  escalations = {
    /** GET /api/v1/escalations/pending -- the caller's own PENDING approvals. */
    pending: (
      params: { limit?: number } = {},
    ): Promise<ApiResult<EscalationListResponse>> =>
      this.request<EscalationListResponse>(
        `/escalations/pending${qs(params)}`,
      ),

    /** GET /api/v1/escalations/:id -- one approval request (party-only). */
    detail: (id: string): Promise<ApiResult<EscalationResponse>> =>
      this.request<EscalationResponse>(
        `/escalations/${encodeURIComponent(id)}`,
      ),

    /** POST /api/v1/escalations/:id/approve -- PENDING -> APPROVED. */
    approve: (
      id: string,
      body: EscalationResolveRequest = {},
    ): Promise<ApiResult<EscalationResponse>> =>
      this.request<EscalationResponse>(
        `/escalations/${encodeURIComponent(id)}/approve`,
        { method: "POST", body },
      ),

    /** POST /api/v1/escalations/:id/reject -- PENDING -> REJECTED. */
    reject: (
      id: string,
      body: EscalationResolveRequest = {},
    ): Promise<ApiResult<EscalationResponse>> =>
      this.request<EscalationResponse>(
        `/escalations/${encodeURIComponent(id)}/reject`,
        { method: "POST", body },
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
