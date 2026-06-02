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
  EntityUpdateResponse,
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
  // My Twin + Conversations metadata (read-only)
  MyTwinResponse,
  ConversationListResponse,
  ConversationListParams,
  ConversationDetailResponse,
  ConversationCorrectionsResponse,
  // Employee Approvals -- /escalations/* product surface
  EscalationListResponse,
  EscalationResponse,
  EscalationResolveRequest,
  // Section 5 Agent Playground -- Wave 4/5/6/7/8/9 (ADR-0077)
  CreateScenarioInput,
  CreateScenarioSuccess,
  ListScenariosSuccess,
  GetScenarioSuccess,
  UpdateScenarioInput,
  UpdateScenarioSuccess,
  ArchiveScenarioSuccess,
  GenerateCandidatesInput,
  GenerateCandidatesSuccess,
  CompareOutcomesInput,
  CompareOutcomesSuccess,
  RecommendBestPathInput,
  RecommendBestPathSuccess,
  ProposeGovernedTransitionInput,
  ProposeGovernedTransitionSuccess,
  SimulateInput,
  SimulationSuccess,
  // Section 2 Action Runtime read surface (ADR-0057 §9 + §10)
  ActionDetailResponse,
  // Section 7 Full Audit Viewer (Foundation Wave 1+ per ADR-0071)
  ListAuditEventsInput,
  ListAuditEventsSuccess,
  GetAuditEventSuccess,
  AuditViewScope,
  VerifyChainInput,
  VerifyChainView,
  AuditExportFormat,
  ExportAuditEventsInput,
  ExportAuditEventsSuccess,
  // Section 9 — Compliance frameworks + live posture (LIVE in
  // Foundation per ComplianceService)
  ListComplianceFrameworksSuccess,
  GetComplianceStateSuccess,
} from "./types/foundation";
import type {
  ListConnectorBindingsSuccess,
  GetConnectorBindingSuccess,
  RegisterConnectorBindingInput,
  RegisterConnectorBindingSuccess,
  UpdateConnectorBindingInput,
  UpdateConnectorBindingSuccess,
  DeleteConnectorBindingSuccess,
} from "./connectors/types";

import type {
  CtActivationResult,
  CtTeamActivationInput,
  CtBusinessActivationInput,
  CtEnterpriseActivationInput,
} from "./dandelion-activation/types";
import type {
  CtVoiceIntentSubmitInput,
  CtVoiceIntentSubmitResult,
} from "./voice/types";

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
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
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

      /** PATCH /api/v1/org/entities/:id -- status + EntityProfile fields.
       *  Foundation returns { ok, audit_event_id } (ADMIN_ACTION
       *  action=ORG_ENTITY_UPDATE); callers surface the REAL audit id. */
      update: (
        id: string,
        patch: Partial<Pick<Entity, "status">> & Record<string, unknown>,
      ): Promise<ApiResult<EntityUpdateResponse>> =>
        this.request<EntityUpdateResponse>(
          `/org/entities/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: patch,
          },
        ),
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

    /** GET /api/v1/otzar/my-twin -- the caller's OWN aligned twin identity (read).
     *  Self-scoped; product-safe projection (no template body / capability
     *  flags / bridge ids / memory). 404 TWIN_NOT_FOUND when none assigned. */
    myTwin: (): Promise<ApiResult<MyTwinResponse>> =>
      this.request<MyTwinResponse>("/otzar/my-twin"),

    /** GET /api/v1/otzar/conversations -- the caller's OWN conversation
     *  session METADATA (read). No transcripts / message bodies. Optional
     *  status filter (ACTIVE|CLOSED) + skip/take pagination. */
    conversations: {
      list: (
        params: ConversationListParams = {},
      ): Promise<ApiResult<ConversationListResponse>> =>
        this.request<ConversationListResponse>(
          `/otzar/conversations${qs({
            skip: params.skip,
            take: params.take,
            status: params.status,
          })}`,
        ),
      /** GET /api/v1/otzar/conversations/:id -- one self-scoped look-back
       *  detail (metadata + optional close SUMMARY + topics). No
       *  transcripts / message bodies / raw context. summary_capsule_id is
       *  in the contract but the UI does NOT render it. */
      detail: (
        conversationId: string,
      ): Promise<ApiResult<ConversationDetailResponse>> =>
        this.request<ConversationDetailResponse>(
          `/otzar/conversations/${encodeURIComponent(conversationId)}`,
        ),
      /** GET /api/v1/otzar/conversations/:id/corrections -- safe,
       *  self-scoped per-conversation correction signals (ADR-0055 Wave
       *  2C). FLAT response (fields at top level, NOT nested under
       *  `conversation`). Counts + last-seen freshness + locked notes
       *  only; never raw correction payloads / target_capsule_id /
       *  correction_capsule_id / drift score / employee score / manager
       *  visibility. */
      corrections: (
        conversationId: string,
      ): Promise<ApiResult<ConversationCorrectionsResponse>> =>
        this.request<ConversationCorrectionsResponse>(
          `/otzar/conversations/${encodeURIComponent(conversationId)}/corrections`,
        ),
    },
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

  // ──────────────────────────────────────────────────────────────
  // Section 9 — compliance.* (Foundation ComplianceService LIVE
  // per CAR Sub-box 7 + ADR-0061 alignment). Read-only at this
  // CT slice — mutations (compliance check) are intentionally
  // not exposed.
  // ──────────────────────────────────────────────────────────────
  compliance = {
    /** GET /api/v1/compliance/frameworks -- canonical catalog. */
    listFrameworks: (): Promise<
      ApiResult<ListComplianceFrameworksSuccess>
    > =>
      this.request<ListComplianceFrameworksSuccess>(
        "/compliance/frameworks",
      ),

    /** GET /api/v1/compliance/state -- caller-org live posture. */
    getState: (): Promise<ApiResult<GetComplianceStateSuccess>> =>
      this.request<GetComplianceStateSuccess>("/compliance/state"),
  };

  // ──────────────────────────────────────────────────────────────
  // actions.*  (Section 2 Action Runtime READ surface for Wave 10
  // Agent Playground cockpit lifecycle integration per ADR-0057 §9.
  //
  // GET /api/v1/actions/:id is the canonical read surface; bearer
  // + "read" scope; self-scope OR can_admin_org-over-same-org at
  // the service tier; enumeration-safe 404 ACTION_NOT_FOUND for
  // unknown / cross-org / soft-deleted. Returns SafeActionDetailView
  // per ADR-0057 §10 allowlist — payload_summary / payload_redacted
  // / policy_envelope / source_entity_id / org_entity_id /
  // target_entity_id / deleted_at / raw errors / stack traces are
  // NEVER in the response by Foundation's construction-by-allowlist
  // projection.
  //
  // This namespace is READ-ONLY. It NEVER executes / approves /
  // cancels / retries Actions; Section 2 retains all execution
  // authority. The Wave 10 cockpit uses it solely to honestly
  // distinguish the three-state lifecycle (simulation / proposed /
  // executed) per ADR-0077 §8.4 execution-boundary honesty.
  // ──────────────────────────────────────────────────────────────
  actions = {
    /** GET /api/v1/actions/:id -- safe Action lifecycle detail. */
    getAction: (
      actionId: string,
    ): Promise<ApiResult<ActionDetailResponse>> =>
      this.request<ActionDetailResponse>(
        `/actions/${encodeURIComponent(actionId)}`,
      ),
  };

  // ──────────────────────────────────────────────────────────────
  // playground.*  (Section 5 Agent Playground -- Wave 10 consumer
  // experience per ADR-0077; consumes the 6 Foundation Agent
  // Playground routes verbatim:
  //   Wave 4: scenarios CRUD
  //   Wave 5: candidates
  //   Wave 6: outcome comparisons
  //   Wave 7: best-path recommendations
  //   Wave 8: governed transitions (creates Section 2 Action rows)
  //   Wave 9: multi-agent simulation orchestration
  // Wave 10 NEVER bypasses Wave 8 / Section 2 -- there is no
  // execution method; Section 2 retains all execution authority
  // per ADR-0057. POST methods do NOT auto-retry (Wave 8
  // idempotency_key handles dedup; Wave 5/6/7/9 are computed-on-
  // read but auto-retry would still risk duplicate audit emission,
  // so the UI surfaces explicit retry instead).
  // ──────────────────────────────────────────────────────────────
  playground = {
    /** GET /api/v1/playground/scenarios -- owner-scoped list. */
    listScenarios: (): Promise<ApiResult<ListScenariosSuccess>> =>
      this.request<ListScenariosSuccess>("/playground/scenarios"),

    /** POST /api/v1/playground/scenarios -- create scenario. */
    createScenario: (
      body: CreateScenarioInput,
    ): Promise<ApiResult<CreateScenarioSuccess>> =>
      this.request<CreateScenarioSuccess>("/playground/scenarios", {
        method: "POST",
        body,
        retries: 0,
      }),

    /** GET /api/v1/playground/scenarios/:id -- single scenario. */
    getScenario: (id: string): Promise<ApiResult<GetScenarioSuccess>> =>
      this.request<GetScenarioSuccess>(
        `/playground/scenarios/${encodeURIComponent(id)}`,
      ),

    /** PUT /api/v1/playground/scenarios/:id -- update safe fields. */
    updateScenario: (
      id: string,
      body: UpdateScenarioInput,
    ): Promise<ApiResult<UpdateScenarioSuccess>> =>
      this.request<UpdateScenarioSuccess>(
        `/playground/scenarios/${encodeURIComponent(id)}`,
        { method: "PUT", body, retries: 0 },
      ),

    /** DELETE /api/v1/playground/scenarios/:id -- soft-archive. */
    archiveScenario: (
      id: string,
    ): Promise<ApiResult<ArchiveScenarioSuccess>> =>
      this.request<ArchiveScenarioSuccess>(
        `/playground/scenarios/${encodeURIComponent(id)}`,
        { method: "DELETE", retries: 0 },
      ),

    /** POST /api/v1/playground/scenarios/:id/candidates -- Wave 5. */
    generateCandidates: (
      id: string,
      body: GenerateCandidatesInput = {},
    ): Promise<ApiResult<GenerateCandidatesSuccess>> =>
      this.request<GenerateCandidatesSuccess>(
        `/playground/scenarios/${encodeURIComponent(id)}/candidates`,
        { method: "POST", body, retries: 0 },
      ),

    /** POST /api/v1/playground/scenarios/:id/outcome-comparisons -- Wave 6. */
    compareOutcomes: (
      id: string,
      body: CompareOutcomesInput = {},
    ): Promise<ApiResult<CompareOutcomesSuccess>> =>
      this.request<CompareOutcomesSuccess>(
        `/playground/scenarios/${encodeURIComponent(id)}/outcome-comparisons`,
        { method: "POST", body, retries: 0 },
      ),

    /** POST /api/v1/playground/scenarios/:id/best-path-recommendations -- Wave 7. */
    recommendBestPath: (
      id: string,
      body: RecommendBestPathInput = {},
    ): Promise<ApiResult<RecommendBestPathSuccess>> =>
      this.request<RecommendBestPathSuccess>(
        `/playground/scenarios/${encodeURIComponent(id)}/best-path-recommendations`,
        { method: "POST", body, retries: 0 },
      ),

    /** POST /api/v1/playground/scenarios/:id/governed-transitions -- Wave 8.
     *
     * REQUIRES explicit caller_confirmation: true AND a fresh
     * idempotency_key per submit attempt. Returns a Section 2
     * Action in PROPOSED status only -- Wave 10 NEVER executes;
     * Section 2 retains all execution authority per ADR-0057.
     */
    proposeGovernedTransition: (
      id: string,
      body: ProposeGovernedTransitionInput,
    ): Promise<ApiResult<ProposeGovernedTransitionSuccess>> =>
      this.request<ProposeGovernedTransitionSuccess>(
        `/playground/scenarios/${encodeURIComponent(id)}/governed-transitions`,
        { method: "POST", body, retries: 0 },
      ),

    /** POST /api/v1/playground/scenarios/:id/simulations -- Wave 9.
     *
     * Multi-agent simulation orchestration over (branch_definition
     * × agent_role) combinations capped at 24. Branches are
     * independent Wave 7 sub-invocations projected through closed-
     * vocab agent_role lenses -- NEVER agent-to-agent message-
     * passing, NEVER raw chain-of-thought, NEVER LLM personas.
     */
    runSimulation: (
      id: string,
      body: SimulateInput,
    ): Promise<ApiResult<SimulationSuccess>> =>
      this.request<SimulationSuccess>(
        `/playground/scenarios/${encodeURIComponent(id)}/simulations`,
        { method: "POST", body, retries: 0 },
      ),
  };

  // ──────────────────────────────────────────────────────────────
  // Section 7 — full audit viewer namespace. Consumes Foundation
  // routes LIVE since ADR-0071 + earlier Section 7 waves:
  //   GET /api/v1/audit/events[?page&page_size&event_type&...&scope]
  //   GET /api/v1/audit/events/:id[?scope]
  // CT D2 wires the self-scope reads only at this slice; org /
  // platform / regulator scopes + export (NDJSON/CSV) +
  // verify-chain panel are forward-substrate and consume the
  // already-LIVE Foundation routes from separate CT slices.
  // GETs auto-retry per the request defaults (idempotent).
  // ──────────────────────────────────────────────────────────────
  audit = {
    /** GET /api/v1/audit/events -- paginated SAFE audit list. */
    list: (
      input: ListAuditEventsInput = {},
    ): Promise<ApiResult<ListAuditEventsSuccess>> => {
      const query = qs({
        page: input.page,
        page_size: input.page_size,
        event_type: input.event_type,
        target_entity_id: input.target_entity_id,
        target_capsule_id: input.target_capsule_id,
        outcome: input.outcome,
        start_time: input.start_time,
        end_time: input.end_time,
        scope: input.scope,
      });
      return this.request<ListAuditEventsSuccess>(`/audit/events${query}`);
    },

    /** GET /api/v1/audit/events/:id -- single audit detail with prev/next chain refs. */
    detail: (
      id: string,
      scope?: AuditViewScope,
    ): Promise<ApiResult<GetAuditEventSuccess>> => {
      const query = qs({ scope });
      return this.request<GetAuditEventSuccess>(
        `/audit/events/${encodeURIComponent(id)}${query}`,
      );
    },

    /**
     * GET /api/v1/audit/verify-chain — chain-integrity check.
     * Self-scope only at this CT slice (regulator scope requires
     * lawful_basis_id flow which is forward-substrate).
     */
    verifyChain: (
      input: VerifyChainInput = {},
    ): Promise<ApiResult<VerifyChainView>> => {
      const query = qs({
        scope: input.scope,
        subject_entity_id: input.subject_entity_id,
        lawful_basis_id: input.lawful_basis_id,
        from: input.from,
        to: input.to,
        max_events: input.max_events,
      });
      return this.request<VerifyChainView>(`/audit/verify-chain${query}`);
    },

    /**
     * GET /api/v1/audit/events/export — bounded NDJSON / CSV
     * export of the same SafeAuditEventView projection the list
     * endpoint returns. Bypasses the JSON-parsing `request`
     * helper because the response body is raw NDJSON / CSV
     * text, not JSON. Self-scope only at this CT slice.
     * Metadata is parsed from the `x-audit-*` response headers.
     */
    export: async (
      input: ExportAuditEventsInput = {},
    ): Promise<ApiResult<ExportAuditEventsSuccess>> => {
      const query = qs({
        format: input.format,
        scope: input.scope,
        event_type: input.event_type,
        target_entity_id: input.target_entity_id,
        target_capsule_id: input.target_capsule_id,
        outcome: input.outcome,
        start_time: input.start_time,
        end_time: input.end_time,
        max_rows: input.max_rows,
      });
      const url =
        this.options.baseUrl.replace(/\/$/, "") +
        `/audit/events/export${query}`;
      const headers: Record<string, string> = {};
      const token = this.options.getToken();
      if (token !== null && token.length > 0) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      try {
        const response = await fetch(url, { method: "GET", headers });
        if (response.status === 401) {
          this.options.onUnauthorized();
          return {
            ok: false,
            code: "SESSION_INVALID",
            message: "Authentication required",
            status: 401,
          };
        }
        const text = await response.text();
        if (!response.ok) {
          // Foundation returns JSON for 4xx / 5xx on the export
          // route per audit.routes.ts. Parse defensively.
          let parsed: { code?: unknown; message?: unknown } = {};
          try {
            parsed = JSON.parse(text) as typeof parsed;
          } catch {
            // empty / non-JSON body — fall through.
          }
          return {
            ok: false,
            code:
              typeof parsed.code === "string"
                ? parsed.code
                : "EXPORT_FAILED",
            message:
              typeof parsed.message === "string"
                ? parsed.message
                : `Export failed (status ${response.status})`,
            status: response.status,
          };
        }
        const rowCountHeader = response.headers.get("x-audit-row-count");
        const truncatedHeader = response.headers.get("x-audit-truncated");
        const scopeHeader = response.headers.get("x-audit-scope");
        const formatHeader = response.headers.get("x-audit-format");
        const rowCount = rowCountHeader === null ? 0 : Number(rowCountHeader);
        const truncated = truncatedHeader === "true";
        const scope: AuditViewScope =
          scopeHeader === "org" ||
          scopeHeader === "platform" ||
          scopeHeader === "regulator"
            ? scopeHeader
            : "self";
        const format: AuditExportFormat =
          formatHeader === "csv" ? "csv" : "ndjson";
        return {
          ok: true,
          data: {
            format,
            scope,
            row_count: Number.isFinite(rowCount) ? rowCount : 0,
            truncated,
            body: text,
          },
          status: response.status,
        };
      } catch (err) {
        return {
          ok: false,
          code: "NETWORK_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Network error during audit export",
          status: 0,
        };
      }
    },
  };

  // ──────────────────────────────────────────────────────────────
  // connectors.*  (Section 4 ConnectorBinding admin surface per
  // PR #185 — C2 Slack read-first runtime is LIVE at Foundation.
  // This namespace consumes the 5 LIVE admin routes:
  //
  //   POST   /api/v1/org/connectors        — register
  //   GET    /api/v1/org/connectors        — list
  //   GET    /api/v1/org/connectors/:id    — single
  //   PATCH  /api/v1/org/connectors/:id    — update/enable/disable
  //   DELETE /api/v1/org/connectors/:id    — soft-delete (RULE 10)
  //
  // can_admin_org-gated at the Foundation route tier via the
  // requireAdminCapability preHandler. ConnectorBindingView at the
  // Foundation tier is construction-by-allowlist: secret_ref carries
  // the env-var NAME (e.g. "SLACK_BOT_TOKEN_PROD"), never the
  // resolved env-var VALUE; resolved values stay inside the
  // provider implementation (e.g. SlackReadProvider). This CT
  // namespace inherits that invariant by passing the view through
  // unchanged; the admin page never attempts to display or decode
  // the resolved value.
  // ──────────────────────────────────────────────────────────────
  connectors = {
    /** GET /api/v1/org/connectors -- list bindings (optionally filter by enabled). */
    list: (
      enabled?: boolean,
    ): Promise<ApiResult<ListConnectorBindingsSuccess>> =>
      this.request<ListConnectorBindingsSuccess>(
        enabled === undefined
          ? "/org/connectors"
          : `/org/connectors?enabled=${enabled ? "true" : "false"}`,
      ),

    /** GET /api/v1/org/connectors/:id -- single binding view. */
    get: (
      bindingId: string,
    ): Promise<ApiResult<GetConnectorBindingSuccess>> =>
      this.request<GetConnectorBindingSuccess>(
        `/org/connectors/${encodeURIComponent(bindingId)}`,
      ),

    /** POST /api/v1/org/connectors -- register a new binding. */
    register: (
      body: RegisterConnectorBindingInput,
    ): Promise<ApiResult<RegisterConnectorBindingSuccess>> =>
      this.request<RegisterConnectorBindingSuccess>("/org/connectors", {
        method: "POST",
        body,
        retries: 0,
      }),

    /** PATCH /api/v1/org/connectors/:id -- update + enable/disable. */
    update: (
      bindingId: string,
      body: UpdateConnectorBindingInput,
    ): Promise<ApiResult<UpdateConnectorBindingSuccess>> =>
      this.request<UpdateConnectorBindingSuccess>(
        `/org/connectors/${encodeURIComponent(bindingId)}`,
        { method: "PATCH", body, retries: 0 },
      ),

    /** DELETE /api/v1/org/connectors/:id -- soft-delete (RULE 10). */
    delete: (
      bindingId: string,
    ): Promise<ApiResult<DeleteConnectorBindingSuccess>> =>
      this.request<DeleteConnectorBindingSuccess>(
        `/org/connectors/${encodeURIComponent(bindingId)}`,
        { method: "DELETE", retries: 0 },
      ),
  };

  // ──────────────────────────────────────────────────────────────
  // dandelionActivation.*  (Section 4 / Dandelion Stage F — D6
  // starter-pilot activation runtime per Foundation PR #196). This
  // namespace consumes the single LIVE route:
  //
  //   POST   /api/v1/org/dandelion/activate
  //
  // can_admin_org-gated at the Foundation route tier. The route
  // walks the docs/dandelion-activation/starter-pilot-activation.json
  // catalog (6 steps) and emits one ADMIN_ACTION audit event per
  // step. The response carries the per-step audit_event_id list
  // (the activation lineage) + the final activation_audit_event_id.
  // The CT page renders this lineage as a 6-step timeline with the
  // customer-admin labels from src/lib/dandelion-activation/labels.ts;
  // no audit row content is fetched here (the page links into the
  // existing audit viewer for that).
  // ──────────────────────────────────────────────────────────────
  dandelionActivation = {
    /**
     * POST /api/v1/org/dandelion/activate — run the starter-pilot
     * ActivationPlan for the caller's org. The Foundation route
     * returns the discriminated ActivationResult shape verbatim;
     * the request adapter normalizes both ok:true and ok:false
     * branches into the ApiResult envelope so the UI branches on
     * `.ok` first then on the nested `result.ok`.
     *
     * Note: the route returns 4xx/5xx (with body `{ ok: false, ... }`)
     * for auth + catalog failures. The CT request() helper surfaces
     * the body as `{ ok: false }` ApiResult, so the consumer should
     * inspect `result.data` only when `result.ok === true`.
     */
    activateStarterPilot: (): Promise<ApiResult<CtActivationResult>> =>
      this.request<CtActivationResult>("/org/dandelion/activate", {
        method: "POST",
        body: {},
        retries: 0,
      }),

    /**
     * POST /api/v1/org/dandelion/activate/team — run the team-
     * archetype ActivationPlan (8 steps) for the caller's org.
     * Step 5 registers a real SLACK_READ ConnectorBinding via the
     * existing C2 OPERATING substrate. The admin supplies
     * slack_display_name + slack_secret_ref env-var-NAME (the
     * resolved env-var VALUE never crosses the API boundary;
     * admins must NEVER paste a raw bot token in slack_secret_ref).
     */
    activateTeam: (
      input: CtTeamActivationInput,
    ): Promise<ApiResult<CtActivationResult>> =>
      this.request<CtActivationResult>("/org/dandelion/activate/team", {
        method: "POST",
        body: input,
        retries: 0,
      }),

    /**
     * POST /api/v1/org/dandelion/activate/business — run the
     * business-archetype ActivationPlan (11 steps) for the caller's
     * org. Step 6 registers a real SLACK_READ ConnectorBinding +
     * step 7 registers a real GOOGLE_WORKSPACE_READ ConnectorBinding
     * via the existing C2 + C3 substrates. Step 5 (delegated
     * authority) + step 9 (advanced audit tier) emit audit-only at
     * this slice. Both env-var NAMEs only; resolved env-var VALUEs
     * NEVER cross the API boundary (admins must NEVER paste a raw
     * xoxb-* bot token or ya29.* OAuth access token in the
     * secret_ref fields).
     */
    activateBusiness: (
      input: CtBusinessActivationInput,
    ): Promise<ApiResult<CtActivationResult>> =>
      this.request<CtActivationResult>("/org/dandelion/activate/business", {
        method: "POST",
        body: input,
        retries: 0,
      }),

    /**
     * POST /api/v1/org/dandelion/activate/enterprise — run the
     * enterprise-archetype ActivationPlan (14 steps) for the
     * caller's org. Steps 8 + 9 register real SLACK_READ +
     * GOOGLE_WORKSPACE_READ ConnectorBindings via the existing
     * C2 + C3 substrates. Steps 5 + 6 + 7 + 12 emit audit-only
     * at this slice (underlying tables forward-substrate). Steps
     * 10 + 11 emit DUAL-CONTROL audit literals truthfully
     * recording catalog design-intent; actual dual-control
     * approval flow per ADR-0026 is forward-substrate.
     */
    activateEnterprise: (
      input: CtEnterpriseActivationInput,
    ): Promise<ApiResult<CtActivationResult>> =>
      this.request<CtActivationResult>("/org/dandelion/activate/enterprise", {
        method: "POST",
        body: input,
        retries: 0,
      }),
  };

  // ──────────────────────────────────────────────────────────────
  // voice.*  (ADR-0085 §8 VF.4 — voice-first runtime). The single
  // route this namespace consumes:
  //
  //   POST   /api/v1/voice/intents
  //
  // Bearer-auth-gated at the Foundation route tier. The route
  // accepts a typed transcript + source surface + risk tier and
  // returns the SAFE envelope projection (per Foundation
  // apps/api/src/routes/voice.routes.ts VF.4a). The CT page
  // renders the typed transcript locally (the operator typed
  // it) — the Foundation response only confirms construction +
  // audit. Privacy invariant: this namespace + the Foundation
  // route never carry transcript_text, raw audio, Bearer
  // headers, or any caller identifier in the response.
  // ──────────────────────────────────────────────────────────────
  voice = {
    /**
     * POST /api/v1/voice/intents — submit a voice intent envelope.
     * The Foundation route constructs the envelope + emits the
     * VOICE_INTENT_RECEIVED audit event before delivery (RULE 4).
     * Risk-tier discrimination per ADR-0085 §3:
     *   LOW    → confirmation NOT_NEEDED + approval NONE
     *   MEDIUM → confirmation PENDING + approval NONE
     *   HIGH   → confirmation PENDING + approval PENDING
     */
    submitIntent: (
      input: CtVoiceIntentSubmitInput,
    ): Promise<ApiResult<CtVoiceIntentSubmitResult>> =>
      this.request<CtVoiceIntentSubmitResult>("/voice/intents", {
        method: "POST",
        body: input,
        retries: 0,
      }),
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
