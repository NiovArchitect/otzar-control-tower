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
  CalendarContextResponse,
  DandelionMemoryCandidateResponse,
  ConnectorAdaptersResponse,
  OAuthStatusResponse,
  OAuthStartResponse,
  ZoomRecordingsResponse,
  CalendarFreeBusyResponse,
  CalendarEventProposalBody,
  AuthorityContextResponse,
  RuntimeCapabilitiesResponse,
  WorkLedgerCreateResponse,
  WorkLedgerListResponse,
  HandoffReadinessResponse,
  DandelionOnboardingResponse,
  DandelionOrgGrowthResponse,
  ContextHealthResponse,
  MyDayIntelligenceResponse,
  ObserveAttachWorkspaceResponse,
  ObserveCaptureSourceType,
  ObserveCapturesListResponse,
  ObserveExtractResponse,
  ObserveOCRProvider,
  ObserveProvidersResponse,
  CommsExtractResponse,
  NotificationListResponse,
  NotificationReadResponse,
  NotificationReplyResponse,
  ConversationListResponse,
  ConversationListParams,
  ConversationDetailResponse,
  ConversationCorrectionsResponse,
  // EDX-4 TwinAuthorityGrant types
  CreateAuthorityGrantRequest,
  AuthorityGrantCreateResponse,
  AuthorityGrantListResponse,
  AuthorityGrantRevokeResponse,
  // EDX-5 TwinCorrectionMemory types
  CreateCorrectionRequest,
  CorrectionCreateResponse,
  CorrectionListResponse,
  CorrectionRevokeResponse,
  // EDX-6 TwinCollaborationRequest types
  CreateCollaborationRequestBody,
  CollaborationCreateResponse,
  CollaborationListResponse,
  CollaborationTransitionResponse,
  // Phase 1 WorkProject types
  CreateWorkProjectRequest,
  WorkProjectCreateResponse,
  WorkProjectListResponse,
  WorkProjectMembersResponse,
  WorkProjectMemberSafeView,
  WorkProjectMemberRole,
  // Phase 2 OrgCollaborationPolicy types
  OrgCollaborationPolicyListResponse,
  OrgCollaborationPolicyUpsertResponse,
  UpsertOrgCollaborationPolicyRequest,
  // Phase 5/6 connector + MCP rails types
  ConnectorProvidersListResponse,
  ConnectorScopeGrantListResponse,
  ConnectorScopeGrantResponse,
  CreateConnectorScopeGrantRequest,
  McpServerConnectionListResponse,
  McpServerConnectionResponse,
  CreateMcpServerConnectionRequest,
  McpToolPolicyListResponse,
  McpToolPolicyResponse,
  CreateMcpToolPolicyRequest,
  // Phase 3 voice-ready
  VoiceIntentRequest,
  VoiceIntentResponse,
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
  ActionListResponse,
  SafeActionView,
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
  // Phase 1221 — Collaboration Workspace + External Collaborator
  CollaborationWorkspaceCreateResponse,
  CollaborationWorkspaceListResponse,
  CollaborationWorkspaceDetailResponse,
  CollaborationMembershipResponse,
  CollaborationWorkspaceActionsResponse,
  ImportCommsOutputResponse,
  ConfirmCommitmentResponse,
  WorkspaceVisibility,
  WorkspaceSourceType,
  MembershipType,
  MembershipAccessLevel,
  ExternalRelationshipType,
  ExternalRiskLevel,
  WorkspaceExternalAccessLevel,
  TrackExternalCollaboratorResponse,
  ListExternalCollaboratorsResponse,
  UpdateExternalContextResponse,
  InviteExternalCollaboratorResponse,
  ListExternalCommitmentsResponse,
  CreateExternalFollowupResponse,
  // Phase 1222 — MeetingCapture
  MeetingCaptureProvider,
  MeetingParticipantConsentState,
  MeetingCaptureReceiveResponse,
  MeetingCaptureListResponse,
  MeetingCaptureDetailResponse,
  MeetingCaptureAttachResponse,
  MeetingParticipantConsentUpdateResponse,
  // Phase 1228
  GetMyDMWResponse,
  ListOrgDMWResponse,
  GetDMWByIdResponse,
  ListDMWAuditResponse,
  // Phase 1229
  ListCapsulesResponse,
  RevokeCapsuleResponse,
  GetCOSMPAuditResponse,
  // Phase 1230
  GetOnboardingChecklistResponse,
  // Phase 1223
  STTProviderType,
  AudioCaptureMode,
  ListSTTProvidersResponse,
  ReceiveAudioResponse,
  ListAudioCapturesResponse,
  GetAudioCaptureDetailResponse,
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

    /** GET /api/v1/otzar/my-twin/context-health -- closed-vocab
     *  projection of the L0_IDENTITY block Foundation prepends to
     *  the LLM prompt. Self-scoped; never raw memory / transcripts /
     *  cross-user data. Returns identity + READY|PARTIAL|UNCONFIGURED
     *  status. Phase 1205. */
    contextHealth: (): Promise<ApiResult<ContextHealthResponse>> =>
      this.request<ContextHealthResponse>("/otzar/my-twin/context-health"),

    /** Phase 1234 — GET /api/v1/otzar/my-day/intelligence. The calm
     *  ambient daily ranking: Foundation gathers the caller's SAFE
     *  scoped signals and ranks them through the Python intelligence
     *  runtime (or the honest fixture fallback). */
    myDayIntelligence: (): Promise<ApiResult<MyDayIntelligenceResponse>> =>
      this.request<MyDayIntelligenceResponse>("/otzar/my-day/intelligence"),

    /** Phase 1244 — connector adapter status + setup guidance. */
    connectorAdapters: (): Promise<ApiResult<ConnectorAdaptersResponse>> =>
      this.request<ConnectorAdaptersResponse>("/connectors/adapters"),

    /** Phase 1261 — Priority C OAuth connection status (admin). */
    oauthStatus: (): Promise<ApiResult<OAuthStatusResponse>> =>
      this.request<OAuthStatusResponse>("/connectors/oauth/status"),

    /** Phase 1261 — begin the OAuth consent flow; the returned
     *  authorize_url opens in the system browser. */
    oauthStart: (slug: string): Promise<ApiResult<OAuthStartResponse>> =>
      this.request<OAuthStartResponse>(`/connectors/oauth/${slug}/start`, {
        method: "POST",
        body: {},
      }),

    /** Phase 1261 — live verification probe (the only path to
     *  the Verified status). */
    oauthVerify: (slug: string): Promise<ApiResult<{ ok: true; status: string }>> =>
      this.request<{ ok: true; status: string }>(
        `/connectors/oauth/${slug}/verify`,
        { method: "POST", body: {} },
      ),

    /** Phase 1261 — revoke + wipe the stored connection. */
    oauthRevoke: (slug: string): Promise<ApiResult<{ ok: true }>> =>
      this.request<{ ok: true }>(`/connectors/oauth/${slug}/revoke`, {
        method: "POST",
        body: {},
      }),

    /** Phase 1242 — enterprise handoff readiness aggregate. */
    productionReadiness: (): Promise<ApiResult<HandoffReadinessResponse>> =>
      this.request<HandoffReadinessResponse>("/otzar/production-readiness"),

    /** Phase 1237 — Dandelion org growth + voice-first onboarding. */
    dandelionOrgGrowth: (): Promise<ApiResult<DandelionOrgGrowthResponse>> =>
      this.request<DandelionOrgGrowthResponse>("/otzar/dandelion/org-growth"),

    dandelionOnboarding: (): Promise<ApiResult<DandelionOnboardingResponse>> =>
      this.request<DandelionOnboardingResponse>("/otzar/dandelion/onboarding"),

    dandelionMemoryCandidate: (input: {
      preferred_name?: string;
      pronunciation?: string;
      communication_preference?: string;
      quiet_preference?: string;
      remember_text?: string;
    }): Promise<ApiResult<DandelionMemoryCandidateResponse>> =>
      this.request<DandelionMemoryCandidateResponse>(
        "/otzar/dandelion/onboarding/memory-candidates",
        { method: "POST", body: input },
      ),

    /** Phase 1236 — calendar-aware quiet mode context. */
    calendarContext: (): Promise<ApiResult<CalendarContextResponse>> =>
      this.request<CalendarContextResponse>("/otzar/calendar/context"),

    /** Phase 1227 — governed Observe ("Let Otzar read this"). */
    observeProviders: (): Promise<ApiResult<ObserveProvidersResponse>> =>
      this.request<ObserveProvidersResponse>("/otzar/observe/providers"),

    observeExtract: (input: {
      provider: ObserveOCRProvider;
      source_type: ObserveCaptureSourceType;
      title?: string;
      plain_text?: string;
    }): Promise<ApiResult<ObserveExtractResponse>> =>
      this.request<ObserveExtractResponse>("/otzar/observe/extract", {
        method: "POST",
        body: input,
      }),

    observeCaptures: (): Promise<ApiResult<ObserveCapturesListResponse>> =>
      this.request<ObserveCapturesListResponse>("/otzar/observe/captures"),

    observeAttachWorkspace: (
      observeCaptureId: string,
      workspaceId: string,
    ): Promise<ApiResult<ObserveAttachWorkspaceResponse>> =>
      this.request<ObserveAttachWorkspaceResponse>(
        `/otzar/observe/${observeCaptureId}/attach-workspace`,
        {
          method: "POST",
          body: { workspace_id: workspaceId },
        },
      ),

    /** Phase 1213 — POST /api/v1/otzar/comms/extract. Given the
     *  assembled captured conversation text, return Foundation's
     *  structured extraction (summary / decisions / commitments /
     *  suggested governed-Action follow-ups). The CT consumer then
     *  renders each suggested action via the existing
     *  ProposedActionCard so the operator can Send via the same
     *  Phase 1208 path. */
    commsExtract: (input: {
      captured_text: string;
      force_mode?: "DEMO_SCRIPTED" | "LLM" | "LOCAL_FALLBACK";
    }): Promise<ApiResult<CommsExtractResponse>> =>
      this.request<CommsExtractResponse>("/otzar/comms/extract", {
        method: "POST",
        body: input,
      }),

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

    // ────────────────────────────────────────────────────────────
    // Phase EDX-4 TwinAuthorityGrant routes (PR Foundation #270).
    // ────────────────────────────────────────────────────────────
    authorityGrants: {
      /** POST /api/v1/otzar/my-twin/authority-grants — create a grant. */
      create: (
        body: CreateAuthorityGrantRequest,
      ): Promise<ApiResult<AuthorityGrantCreateResponse>> =>
        this.request<AuthorityGrantCreateResponse>(
          "/otzar/my-twin/authority-grants",
          { method: "POST", body },
        ),
      /** GET /api/v1/otzar/my-twin/authority-grants — self-scoped list. */
      list: (
        params: { state?: string; take?: number } = {},
      ): Promise<ApiResult<AuthorityGrantListResponse>> =>
        this.request<AuthorityGrantListResponse>(
          `/otzar/my-twin/authority-grants${qs(params)}`,
        ),
      /** POST /api/v1/otzar/my-twin/authority-grants/:id/revoke. */
      revoke: (
        grantId: string,
      ): Promise<ApiResult<AuthorityGrantRevokeResponse>> =>
        this.request<AuthorityGrantRevokeResponse>(
          `/otzar/my-twin/authority-grants/${encodeURIComponent(grantId)}/revoke`,
          { method: "POST" },
        ),
    },

    // ────────────────────────────────────────────────────────────
    // Phase EDX-5 TwinCorrectionMemory routes (PR Foundation #274).
    // ────────────────────────────────────────────────────────────
    correctionMemory: {
      create: (
        body: CreateCorrectionRequest,
      ): Promise<ApiResult<CorrectionCreateResponse>> =>
        this.request<CorrectionCreateResponse>(
          "/otzar/my-twin/corrections",
          { method: "POST", body },
        ),
      list: (
        params: {
          state?: string;
          correction_type?: string;
          scope_type?: string;
          take?: number;
        } = {},
      ): Promise<ApiResult<CorrectionListResponse>> =>
        this.request<CorrectionListResponse>(
          `/otzar/my-twin/corrections${qs(params)}`,
        ),
      revoke: (
        correctionId: string,
      ): Promise<ApiResult<CorrectionRevokeResponse>> =>
        this.request<CorrectionRevokeResponse>(
          `/otzar/my-twin/corrections/${encodeURIComponent(correctionId)}/revoke`,
          { method: "POST" },
        ),
    },

    // ────────────────────────────────────────────────────────────
    // Phase EDX-6 TwinCollaborationRequest routes (PR Foundation #277).
    // ────────────────────────────────────────────────────────────
    collaboration: {
      create: (
        body: CreateCollaborationRequestBody,
      ): Promise<ApiResult<CollaborationCreateResponse>> =>
        this.request<CollaborationCreateResponse>(
          "/otzar/my-twin/collaboration-requests",
          { method: "POST", body },
        ),
      inbound: (
        params: { state?: string; take?: number } = {},
      ): Promise<ApiResult<CollaborationListResponse>> =>
        this.request<CollaborationListResponse>(
          `/otzar/my-twin/collaboration-requests/inbound${qs(params)}`,
        ),
      outbound: (
        params: { state?: string; take?: number } = {},
      ): Promise<ApiResult<CollaborationListResponse>> =>
        this.request<CollaborationListResponse>(
          `/otzar/my-twin/collaboration-requests/outbound${qs(params)}`,
        ),
      accept: (id: string): Promise<ApiResult<CollaborationTransitionResponse>> =>
        this.request<CollaborationTransitionResponse>(
          `/otzar/my-twin/collaboration-requests/${encodeURIComponent(id)}/accept`,
          { method: "POST" },
        ),
      reject: (id: string): Promise<ApiResult<CollaborationTransitionResponse>> =>
        this.request<CollaborationTransitionResponse>(
          `/otzar/my-twin/collaboration-requests/${encodeURIComponent(id)}/reject`,
          { method: "POST" },
        ),
      cancel: (id: string): Promise<ApiResult<CollaborationTransitionResponse>> =>
        this.request<CollaborationTransitionResponse>(
          `/otzar/my-twin/collaboration-requests/${encodeURIComponent(id)}/cancel`,
          { method: "POST" },
        ),
      complete: (
        id: string,
      ): Promise<ApiResult<CollaborationTransitionResponse>> =>
        this.request<CollaborationTransitionResponse>(
          `/otzar/my-twin/collaboration-requests/${encodeURIComponent(id)}/complete`,
          { method: "POST" },
        ),
    },

    // ────────────────────────────────────────────────────────────
    // Phase 1 WorkProject routes (PR Foundation #281).
    // ────────────────────────────────────────────────────────────
    workProjects: {
      create: (
        body: CreateWorkProjectRequest,
      ): Promise<ApiResult<WorkProjectCreateResponse>> =>
        this.request<WorkProjectCreateResponse>("/otzar/work-projects", {
          method: "POST",
          body,
        }),
      list: (
        params: { state?: string; take?: number } = {},
      ): Promise<ApiResult<WorkProjectListResponse>> =>
        this.request<WorkProjectListResponse>(
          `/otzar/work-projects${qs(params)}`,
        ),
      archive: (
        projectId: string,
      ): Promise<ApiResult<WorkProjectCreateResponse>> =>
        this.request<WorkProjectCreateResponse>(
          `/otzar/work-projects/${encodeURIComponent(projectId)}/archive`,
          { method: "POST" },
        ),
      addMember: (
        projectId: string,
        body: { entity_id: string; role?: WorkProjectMemberRole },
      ): Promise<ApiResult<{ ok: true; member: WorkProjectMemberSafeView }>> =>
        this.request<{ ok: true; member: WorkProjectMemberSafeView }>(
          `/otzar/work-projects/${encodeURIComponent(projectId)}/members`,
          { method: "POST", body },
        ),
      members: (
        projectId: string,
      ): Promise<ApiResult<WorkProjectMembersResponse>> =>
        this.request<WorkProjectMembersResponse>(
          `/otzar/work-projects/${encodeURIComponent(projectId)}/members`,
        ),
    },

    // ────────────────────────────────────────────────────────────
    // Phase 3 voice-ready route (PR Foundation #287).
    // ────────────────────────────────────────────────────────────
    voiceIntents: {
      create: (
        body: VoiceIntentRequest,
      ): Promise<ApiResult<VoiceIntentResponse>> =>
        this.request<VoiceIntentResponse>(
          "/otzar/my-twin/voice-intents",
          { method: "POST", body },
        ),
    },

    // Phase 1264 — desktop voice input. The Tauri WKWebView has no Web
    // Speech API; the desktop app records audio with MediaRecorder and
    // POSTs it here for real provider transcription (OpenAI Whisper).
    // Audio is never stored server-side; the transcript then rides the
    // SAME governed chat path as typed input.
    voice: {
      transcribe: (body: {
        audio_base64: string;
        mime_type: string;
      }): Promise<
        ApiResult<{ ok: true; transcript: string; provider: string }>
      > =>
        this.request<{ ok: true; transcript: string; provider: string }>(
          "/otzar/voice/transcribe",
          { method: "POST", body },
        ),
    },
  };

  // ──────────────────────────────────────────────────────────────
  // notifications.* (Phase 1210 -- self-scoped inbox + mark-read).
  // GET /api/v1/notifications + PUT /api/v1/notifications/:id/read.
  // ──────────────────────────────────────────────────────────────
  notifications = {
    /** GET /api/v1/notifications -- caller's own inbox. Self-scoped
     *  at Foundation tier. Optional unread_only and pagination. */
    list: (
      params: { unread_only?: boolean; page?: number; page_size?: number } = {},
    ): Promise<ApiResult<NotificationListResponse>> => {
      const query: Record<string, string> = {};
      if (params.unread_only === true) query.unread_only = "true";
      if (params.page !== undefined) query.page = String(params.page);
      if (params.page_size !== undefined)
        query.page_size = String(params.page_size);
      return this.request<NotificationListResponse>(
        `/notifications${qs(query)}`,
      );
    },

    /** PUT /api/v1/notifications/:id/read -- mark one as read.
     *  Idempotent at Foundation tier. */
    markRead: (
      notificationId: string,
    ): Promise<ApiResult<NotificationReadResponse>> =>
      this.request<NotificationReadResponse>(
        `/notifications/${encodeURIComponent(notificationId)}/read`,
        { method: "PUT" },
      ),

    /** Phase 1215 -- POST /api/v1/notifications/:id/reply.
     *  Recipient-side governed reply mediator. Foundation looks up
     *  the row server-side and routes through the existing
     *  createActionForCaller pipeline. The recipient never sees the
     *  original sender's entity_id (SafeNotificationView excludes
     *  source_entity_id by design). */
    reply: (
      notificationId: string,
      body_summary: string,
      idempotency_key: string,
    ): Promise<ApiResult<NotificationReplyResponse>> =>
      this.request<NotificationReplyResponse>(
        `/notifications/${encodeURIComponent(notificationId)}/reply`,
        {
          method: "POST",
          body: { body_summary, idempotency_key },
        },
      ),
  };

  // ──────────────────────────────────────────────────────────────
  // connectorData.* (Phase 1270) — read-only bridges that turn a
  // verified OAuth connection into live data the Work OS can act on.
  // Both are READ-ONLY; neither creates/sends/mutates provider data.
  // The backend SAFE-projects (no recording download URLs, no event
  // titles) and audits every read as CONNECTOR_DATA_READ.
  // ──────────────────────────────────────────────────────────────
  connectorData = {
    /** GET /api/v1/zoom/recordings — the org's Zoom cloud recordings.
     *  SAFE projection only (topic/when/duration/file-types). */
    zoomRecordings: (
      params: { from?: string; to?: string; page_size?: number } = {},
    ): Promise<ApiResult<ZoomRecordingsResponse>> => {
      const query: Record<string, string> = {};
      if (params.from !== undefined) query.from = params.from;
      if (params.to !== undefined) query.to = params.to;
      if (params.page_size !== undefined)
        query.page_size = String(params.page_size);
      return this.request<ZoomRecordingsResponse>(
        `/zoom/recordings${qs(query)}`,
      );
    },

    /** POST /api/v1/calendar/freebusy — busy intervals for a window.
     *  time_min/time_max are RFC3339. Never returns event titles. */
    calendarFreeBusy: (body: {
      time_min: string;
      time_max: string;
      calendar_id?: string;
    }): Promise<ApiResult<CalendarFreeBusyResponse>> =>
      this.request<CalendarFreeBusyResponse>("/calendar/freebusy", {
        method: "POST",
        body,
      }),

    /** POST /api/v1/calendar/events/create — Phase 1272 GATED create.
     *  Never auto-creates: returns { ok:false, code } with a precise
     *  gate blocker (EVENT_WRITE_SCOPE_MISSING / NEEDS_SELECTED_TIME /
     *  …) until every gate passes AND an event-write scope is granted.
     *  No event is created and no invite sent while gated. */
    calendarEventCreate: (
      body: CalendarEventProposalBody,
    ): Promise<ApiResult<{ ok: true; status: "CREATED" }>> =>
      this.request<{ ok: true; status: "CREATED" }>(
        "/calendar/events/create",
        { method: "POST", body },
      ),
  };

  // ──────────────────────────────────────────────────────────────
  // workOs.* (Phase 1273) — authority context (hierarchy/RBAC/ABAC).
  // Resolves a target in the caller's org and returns the authority
  // context + per-action policy decisions. The source of truth for
  // "what can Otzar do now" lives in the backend; the UI displays it.
  // ──────────────────────────────────────────────────────────────
  workOs = {
    /** POST /api/v1/work-os/authority-context — resolve target + policy. */
    authorityContext: (body: {
      target_name?: string;
      actions?: string[];
    }): Promise<ApiResult<AuthorityContextResponse>> =>
      this.request<AuthorityContextResponse>("/work-os/authority-context", {
        method: "POST",
        body,
      }),

    /** POST /api/v1/work-os/ledger — persist a durable work object. */
    createLedgerEntry: (
      body: Record<string, unknown>,
    ): Promise<ApiResult<WorkLedgerCreateResponse>> =>
      this.request<WorkLedgerCreateResponse>("/work-os/ledger", {
        method: "POST",
        body,
      }),

    /** GET /api/v1/work-os/my-work — the caller's durable work items. */
    myWork: (): Promise<ApiResult<WorkLedgerListResponse>> =>
      this.request<WorkLedgerListResponse>("/work-os/my-work"),

    /** GET /api/v1/work-os/blind-spots — attention-needing items. */
    blindSpots: (): Promise<ApiResult<WorkLedgerListResponse>> =>
      this.request<WorkLedgerListResponse>("/work-os/blind-spots"),

    /** GET /api/v1/work-os/team-work — manager/admin team view; 403 with
     *  TEAM_SCOPE_NOT_CONFIGURED when the caller lacks team authority. */
    teamWork: (): Promise<ApiResult<WorkLedgerListResponse>> =>
      this.request<WorkLedgerListResponse>("/work-os/team-work"),
  };

  // ──────────────────────────────────────────────────────────────
  // system.* (Phase 1277) — honest polyglot runtime fabric status.
  // ──────────────────────────────────────────────────────────────
  system = {
    /** GET /api/v1/system/runtime-capabilities — TS/Python/BEAM/desktop
     *  runtime truth (env KEY NAMES only; NOT_CONFIGURED never faked). */
    runtimeCapabilities: (): Promise<ApiResult<RuntimeCapabilitiesResponse>> =>
      this.request<RuntimeCapabilitiesResponse>("/system/runtime-capabilities"),
  };

  // ──────────────────────────────────────────────────────────────
  // Phase 2 — admin OrgCollaborationPolicy namespace (PR Foundation #286).
  // can_admin_org-gated; admins manage their OWN org's policy.
  // ──────────────────────────────────────────────────────────────
  orgCollaborationPolicy = {
    list: (): Promise<ApiResult<OrgCollaborationPolicyListResponse>> =>
      this.request<OrgCollaborationPolicyListResponse>(
        "/orgs/me/collaboration-policy",
      ),
    upsert: (
      body: UpsertOrgCollaborationPolicyRequest,
    ): Promise<ApiResult<OrgCollaborationPolicyUpsertResponse>> =>
      this.request<OrgCollaborationPolicyUpsertResponse>(
        "/orgs/me/collaboration-policy",
        { method: "POST", body },
      ),
  };

  // ──────────────────────────────────────────────────────────────
  // connectorRails.*  (admin connector + MCP rails per Foundation
  // PR #296 substrate + PR #298 routes). can_admin_org-gated; only
  // surfaces inside /admin/connector-rails.
  // ──────────────────────────────────────────────────────────────
  connectorRails = {
    listProviders: (): Promise<ApiResult<ConnectorProvidersListResponse>> =>
      this.request<ConnectorProvidersListResponse>(
        "/orgs/me/connector-providers",
      ),

    listScopeGrants: (params: {
      connection_id?: string;
    } = {}): Promise<ApiResult<ConnectorScopeGrantListResponse>> =>
      this.request<ConnectorScopeGrantListResponse>(
        `/orgs/me/connector-scope-grants${qs(params)}`,
      ),

    createScopeGrant: (
      body: CreateConnectorScopeGrantRequest,
    ): Promise<ApiResult<ConnectorScopeGrantResponse>> =>
      this.request<ConnectorScopeGrantResponse>(
        "/orgs/me/connector-scope-grants",
        { method: "POST", body },
      ),

    revokeScopeGrant: (
      grantId: string,
    ): Promise<ApiResult<ConnectorScopeGrantResponse>> =>
      this.request<ConnectorScopeGrantResponse>(
        `/orgs/me/connector-scope-grants/${encodeURIComponent(grantId)}`,
        { method: "DELETE" },
      ),

    listMcpConnections: (): Promise<
      ApiResult<McpServerConnectionListResponse>
    > =>
      this.request<McpServerConnectionListResponse>(
        "/orgs/me/mcp-server-connections",
      ),

    createMcpConnection: (
      body: CreateMcpServerConnectionRequest,
    ): Promise<ApiResult<McpServerConnectionResponse>> =>
      this.request<McpServerConnectionResponse>(
        "/orgs/me/mcp-server-connections",
        { method: "POST", body },
      ),

    revokeMcpConnection: (
      mcpConnectionId: string,
    ): Promise<ApiResult<McpServerConnectionResponse>> =>
      this.request<McpServerConnectionResponse>(
        `/orgs/me/mcp-server-connections/${encodeURIComponent(mcpConnectionId)}`,
        { method: "DELETE" },
      ),

    listMcpPolicies: (params: {
      mcp_connection_id?: string;
    } = {}): Promise<ApiResult<McpToolPolicyListResponse>> =>
      this.request<McpToolPolicyListResponse>(
        `/orgs/me/mcp-tool-policies${qs(params)}`,
      ),

    createMcpPolicy: (
      body: CreateMcpToolPolicyRequest,
    ): Promise<ApiResult<McpToolPolicyResponse>> =>
      this.request<McpToolPolicyResponse>(
        "/orgs/me/mcp-tool-policies",
        { method: "POST", body },
      ),

    revokeMcpPolicy: (
      policyId: string,
    ): Promise<ApiResult<McpToolPolicyResponse>> =>
      this.request<McpToolPolicyResponse>(
        `/orgs/me/mcp-tool-policies/${encodeURIComponent(policyId)}`,
        { method: "DELETE" },
      ),
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

    /** Phase 1211 -- GET /api/v1/actions list. Self-scoped at
     *  Foundation tier. Optional status / risk_tier / action_type
     *  filters; standard pagination. */
    list: (
      params: {
        status?: string;
        risk_tier?: string;
        action_type?: string;
        page?: number;
        page_size?: number;
      } = {},
    ): Promise<ApiResult<ActionListResponse>> => {
      const query: Record<string, string> = {};
      if (params.status !== undefined) query.status = params.status;
      if (params.risk_tier !== undefined) query.risk_tier = params.risk_tier;
      if (params.action_type !== undefined)
        query.action_type = params.action_type;
      if (params.page !== undefined) query.page = String(params.page);
      if (params.page_size !== undefined)
        query.page_size = String(params.page_size);
      return this.request<ActionListResponse>(`/actions${qs(query)}`);
    },

    /**
     * POST /api/v1/actions -- create-time substrate per ADR-0057 §9
     * Option E. This CT consumer is bounded to action_type
     * "INVOKE_CONNECTOR" only — the INVOKE_CONNECTOR CT surface
     * lets admins test-invoke a registered ConnectorBinding
     * against the LIVE Section 4 connector runtime. ALL other
     * action types remain Foundation-internal (Section 2 retains
     * full execution authority per ADR-0077 §8.4); this method
     * narrows to the read-first invocation use case so the
     * cockpit's READ-ONLY framing per Wave 10 stays intact.
     *
     * The Foundation route returns SafeActionView at status 201
     * on create (per ADR-0057 §10 allowlist); the CT page then
     * polls api.actions.getAction(action_id) until terminal
     * (SUCCEEDED / FAILED / CANCELLED / TIMED_OUT) and renders
     * last_result_summary (already SAFE-projected at the
     * Foundation execute-tier).
     */
    createInvokeConnector: (input: {
      binding_id: string;
      operation: string;
      fixture_key?: string;
      idempotency_key: string;
      payload_summary: string;
    }): Promise<ApiResult<{ ok: true; action: SafeActionView }>> => {
      const invocation_payload: Record<string, unknown> = {
        operation: input.operation,
      };
      if (input.fixture_key !== undefined && input.fixture_key.length > 0) {
        invocation_payload.fixture_key = input.fixture_key;
      }
      return this.request<{ ok: true; action: SafeActionView }>("/actions", {
        method: "POST",
        body: {
          action_type: "INVOKE_CONNECTOR",
          idempotency_key: input.idempotency_key,
          payload_summary: input.payload_summary,
          payload_redacted: {
            binding_id: input.binding_id,
            invocation_payload,
          },
        },
        retries: 0,
      });
    },

    /**
     * Phase 1208 -- POST /api/v1/actions with action_type
     * SEND_INTERNAL_NOTIFICATION. The CT inline approval card
     * (ProposedActionCard) calls this when the operator clicks
     * "Send". The Action row enters the existing ADR-0057
     * pipeline (ACTION_PROPOSED audit -> policy evaluator ->
     * AUTO_APPROVE or NEEDS_APPROVAL -> executor creates a
     * recipient Notification row on APPROVED).
     */
    sendInternalNotification: (input: {
      recipient_entity_id: string;
      draft_text: string;
      idempotency_key: string;
      payload_summary: string;
      notification_class?: string;
    }): Promise<ApiResult<{ ok: true; action: SafeActionView }>> =>
      this.request<{ ok: true; action: SafeActionView }>("/actions", {
        method: "POST",
        body: {
          action_type: "SEND_INTERNAL_NOTIFICATION",
          idempotency_key: input.idempotency_key,
          payload_summary: input.payload_summary,
          payload_redacted: {
            recipient_entity_id: input.recipient_entity_id,
            // ADR-0057 action-payload-validators.ts requires both
            // notification_class (short label) and body_summary
            // (the actual draft text).
            notification_class:
              input.notification_class ?? "OTZAR_INTERNAL_NOTE",
            body_summary: input.draft_text,
          },
        },
        retries: 0,
      }),
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

  // ──────────────────────────────────────────────────────────────
  // Phase 1221 — collaborationWorkspaces.* (+ external).
  // Roster-aware persistent workspace surface; never leaks raw
  // transcripts or memory internals; never sends external
  // notifications without explicit policy + approval.
  // ──────────────────────────────────────────────────────────────
  collaborationWorkspaces = {
    list: (): Promise<ApiResult<CollaborationWorkspaceListResponse>> =>
      this.request<CollaborationWorkspaceListResponse>(
        "/otzar/collaboration/workspaces",
      ),

    create: (input: {
      title: string;
      description?: string;
      visibility?: WorkspaceVisibility;
      source_type?: WorkspaceSourceType;
      source_conversation_id?: string;
      initial_members?: Array<{
        member_entity_id: string;
        role_label: string;
        responsibility_summary?: string;
        member_type?: MembershipType;
        access_level?: MembershipAccessLevel;
      }>;
    }): Promise<ApiResult<CollaborationWorkspaceCreateResponse>> =>
      this.request<CollaborationWorkspaceCreateResponse>(
        "/otzar/collaboration/workspaces",
        { method: "POST", body: input },
      ),

    detail: (
      workspaceId: string,
    ): Promise<ApiResult<CollaborationWorkspaceDetailResponse>> =>
      this.request<CollaborationWorkspaceDetailResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}`,
      ),

    addMember: (
      workspaceId: string,
      input: {
        member_entity_id: string;
        role_label: string;
        responsibility_summary?: string;
        member_type?: MembershipType;
        access_level?: MembershipAccessLevel;
      },
    ): Promise<ApiResult<CollaborationMembershipResponse>> =>
      this.request<CollaborationMembershipResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/members`,
        { method: "POST", body: input },
      ),

    importCommsOutput: (
      workspaceId: string,
      input: {
        summary?: string;
        decisions: string[];
        commitments: Array<{ text: string; source_excerpt: string }>;
        source_conversation_id?: string;
      },
    ): Promise<ApiResult<ImportCommsOutputResponse>> =>
      this.request<ImportCommsOutputResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/import-comms-output`,
        { method: "POST", body: input },
      ),

    confirmCommitment: (
      workspaceId: string,
      commitmentId: string,
      input: { draft_text?: string } = {},
    ): Promise<ApiResult<ConfirmCommitmentResponse>> =>
      this.request<ConfirmCommitmentResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/commitments/${encodeURIComponent(commitmentId)}/confirm`,
        { method: "POST", body: input },
      ),

    listActions: (
      workspaceId: string,
    ): Promise<ApiResult<CollaborationWorkspaceActionsResponse>> =>
      this.request<CollaborationWorkspaceActionsResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/actions`,
      ),

    // External Collaborator addendum.
    trackExternal: (
      workspaceId: string,
      input: {
        display_name: string;
        email?: string;
        company_name?: string;
        relationship_type?: ExternalRelationshipType;
        internal_owner_entity_id?: string;
        purpose_summary?: string;
        goals_summary?: string;
        needs_from_us?: string;
        we_need_from_them?: string;
        risk_level?: ExternalRiskLevel;
        access_level?: WorkspaceExternalAccessLevel;
        project_role?: string;
      },
    ): Promise<ApiResult<TrackExternalCollaboratorResponse>> =>
      this.request<TrackExternalCollaboratorResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/external-collaborators`,
        { method: "POST", body: input },
      ),

    listExternal: (
      workspaceId: string,
    ): Promise<ApiResult<ListExternalCollaboratorsResponse>> =>
      this.request<ListExternalCollaboratorsResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/external-collaborators`,
      ),

    updateExternalContext: (
      workspaceId: string,
      externalId: string,
      input: {
        purpose_summary?: string;
        goals_summary?: string;
        needs_from_us?: string;
        we_need_from_them?: string;
        internal_owner_entity_id?: string;
        risk_level?: ExternalRiskLevel;
        project_role?: string;
        allowed_context_policy?: string;
      },
    ): Promise<ApiResult<UpdateExternalContextResponse>> =>
      this.request<UpdateExternalContextResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/external-collaborators/${encodeURIComponent(externalId)}/context`,
        { method: "PUT", body: input },
      ),

    inviteExternal: (
      workspaceId: string,
      externalId: string,
      input: { access_level?: WorkspaceExternalAccessLevel } = {},
    ): Promise<ApiResult<InviteExternalCollaboratorResponse>> =>
      this.request<InviteExternalCollaboratorResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/external-collaborators/${encodeURIComponent(externalId)}/invite`,
        { method: "POST", body: input },
      ),

    revokeExternal: (
      workspaceId: string,
      externalId: string,
    ): Promise<ApiResult<{ ok: true }>> =>
      this.request<{ ok: true }>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/external-collaborators/${encodeURIComponent(externalId)}/revoke`,
        { method: "POST", body: {} },
      ),

    listExternalCommitments: (
      workspaceId: string,
    ): Promise<ApiResult<ListExternalCommitmentsResponse>> =>
      this.request<ListExternalCommitmentsResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/external-commitments`,
      ),

    createExternalFollowup: (
      workspaceId: string,
      externalCommitmentId: string,
      input: { internal_owner_entity_id?: string; draft_text?: string } = {},
    ): Promise<ApiResult<CreateExternalFollowupResponse>> =>
      this.request<CreateExternalFollowupResponse>(
        `/otzar/collaboration/workspaces/${encodeURIComponent(workspaceId)}/external-commitments/${encodeURIComponent(externalCommitmentId)}/create-follow-up`,
        { method: "POST", body: input },
      ),
  };

  // ──────────────────────────────────────────────────────────────
  // Phase 1222 — meetingCaptures.*
  // Provider-agnostic Google Meet / Zoom / Teams / manual / API
  // ingest with per-participant consent enforcement.
  // ──────────────────────────────────────────────────────────────
  meetingCaptures = {
    receive: (input: {
      provider?: MeetingCaptureProvider;
      provider_meeting_id?: string;
      title: string;
      scheduled_start?: string;
      scheduled_end?: string;
      recorded_start?: string;
      recorded_end?: string;
      summary?: string;
      transcript?: string;
      participants: Array<{
        display_name: string;
        email?: string;
        participant_entity_id?: string;
        external_collaborator_id?: string;
        consent_state?: MeetingParticipantConsentState;
        consent_source?: string;
      }>;
      workspace_id?: string;
    }): Promise<ApiResult<MeetingCaptureReceiveResponse>> =>
      this.request<MeetingCaptureReceiveResponse>(
        "/otzar/meeting-captures",
        { method: "POST", body: input },
      ),

    list: (
      params: { workspace_id?: string } = {},
    ): Promise<ApiResult<MeetingCaptureListResponse>> => {
      const query: Record<string, string> = {};
      if (params.workspace_id !== undefined)
        query.workspace_id = params.workspace_id;
      return this.request<MeetingCaptureListResponse>(
        `/otzar/meeting-captures${qs(query)}`,
      );
    },

    detail: (
      meetingCaptureId: string,
    ): Promise<ApiResult<MeetingCaptureDetailResponse>> =>
      this.request<MeetingCaptureDetailResponse>(
        `/otzar/meeting-captures/${encodeURIComponent(meetingCaptureId)}`,
      ),

    attach: (
      meetingCaptureId: string,
      input: {
        workspace_id: string;
        decisions?: string[];
        commitments?: Array<{ text: string; source_excerpt: string }>;
      },
    ): Promise<ApiResult<MeetingCaptureAttachResponse>> =>
      this.request<MeetingCaptureAttachResponse>(
        `/otzar/meeting-captures/${encodeURIComponent(meetingCaptureId)}/attach`,
        { method: "POST", body: input },
      ),

    updateParticipantConsent: (
      participantId: string,
      input: {
        consent_state: MeetingParticipantConsentState;
        consent_source?: string;
      },
    ): Promise<ApiResult<MeetingParticipantConsentUpdateResponse>> =>
      this.request<MeetingParticipantConsentUpdateResponse>(
        `/otzar/meeting-captures/participants/${encodeURIComponent(participantId)}/consent`,
        { method: "PUT", body: input },
      ),
  };

  // ──────────────────────────────────────────────────────────────
  // Phase 1228 — DMW Registry
  // ──────────────────────────────────────────────────────────────
  dmwRegistry = {
    me: (): Promise<ApiResult<GetMyDMWResponse>> =>
      this.request<GetMyDMWResponse>("/dmw/me"),
    org: (): Promise<ApiResult<ListOrgDMWResponse>> =>
      this.request<ListOrgDMWResponse>("/dmw/org"),
    detail: (
      dmwId: string,
    ): Promise<ApiResult<GetDMWByIdResponse>> =>
      this.request<GetDMWByIdResponse>(
        `/dmw/${encodeURIComponent(dmwId)}`,
      ),
    createDelegation: (
      dmwId: string,
      input: {
        team_entity_id: string;
        capability_scope: string[];
        supervision_required?: boolean;
        valid_until?: string;
      },
    ): Promise<
      ApiResult<{
        ok: true;
        delegation_id: string;
        status: "ACTIVE";
        capability_scope: string[];
        valid_until: string | null;
      }>
    > =>
      this.request<{
        ok: true;
        delegation_id: string;
        status: "ACTIVE";
        capability_scope: string[];
        valid_until: string | null;
      }>(
        `/dmw/${encodeURIComponent(dmwId)}/delegations`,
        { method: "POST", body: input },
      ),
    revokeDelegation: (
      delegationId: string,
    ): Promise<ApiResult<{ ok: true; delegation_id: string; revoked_at: string }>> =>
      this.request<{ ok: true; delegation_id: string; revoked_at: string }>(
        `/dmw/delegations/${encodeURIComponent(delegationId)}/revoke`,
        { method: "POST", body: {} },
      ),
    audit: (
      dmwId: string,
    ): Promise<ApiResult<ListDMWAuditResponse>> =>
      this.request<ListDMWAuditResponse>(
        `/dmw/${encodeURIComponent(dmwId)}/audit`,
      ),
  };

  // ──────────────────────────────────────────────────────────────
  // Phase 1229 — COSMP capsule management
  // ──────────────────────────────────────────────────────────────
  cosmpCapsules = {
    list: (
      params: {
        capsule_type?: string;
        include_revoked?: boolean;
        take?: number;
        skip?: number;
      } = {},
    ): Promise<ApiResult<ListCapsulesResponse>> => {
      const query: Record<string, string> = {};
      if (params.capsule_type !== undefined) query.capsule_type = params.capsule_type;
      if (params.include_revoked === true) query.include_revoked = "true";
      if (params.take !== undefined) query.take = String(params.take);
      if (params.skip !== undefined) query.skip = String(params.skip);
      return this.request<ListCapsulesResponse>(`/cosmp/capsules${qs(query)}`);
    },
    revoke: (
      capsuleId: string,
      input: { reason?: string } = {},
    ): Promise<ApiResult<RevokeCapsuleResponse>> =>
      this.request<RevokeCapsuleResponse>(
        `/cosmp/capsules/${encodeURIComponent(capsuleId)}/revoke`,
        { method: "POST", body: input },
      ),
    audit: (
      params: { take?: number } = {},
    ): Promise<ApiResult<GetCOSMPAuditResponse>> => {
      const query: Record<string, string> = {};
      if (params.take !== undefined) query.take = String(params.take);
      return this.request<GetCOSMPAuditResponse>(`/cosmp/audit${qs(query)}`);
    },
  };

  // ──────────────────────────────────────────────────────────────
  // Phase 1230 — Onboarding checklist
  // ──────────────────────────────────────────────────────────────
  onboarding = {
    checklist: (): Promise<ApiResult<GetOnboardingChecklistResponse>> =>
      this.request<GetOnboardingChecklistResponse>("/onboarding/checklist"),
    completeStep: (
      stepId: string,
    ): Promise<ApiResult<GetOnboardingChecklistResponse>> =>
      this.request<GetOnboardingChecklistResponse>(
        `/onboarding/steps/${encodeURIComponent(stepId)}/complete`,
        { method: "POST", body: {} },
      ),
    setMode: (
      mode: "DEMO" | "PRODUCTION",
    ): Promise<ApiResult<GetOnboardingChecklistResponse>> =>
      this.request<GetOnboardingChecklistResponse>(
        "/onboarding/mode",
        { method: "PUT", body: { mode } },
      ),
  };

  // ──────────────────────────────────────────────────────────────
  // Phase 1223 — voiceCaptures.*
  // STT pipeline with 4 modes (LIVE_MIC / AUDIO_FILE_UPLOAD /
  // DEMO_AUDIO_SAMPLE / LOCAL_FALLBACK) and 4+ providers.
  // ──────────────────────────────────────────────────────────────
  voiceCaptures = {
    providers: (): Promise<ApiResult<ListSTTProvidersResponse>> =>
      this.request<ListSTTProvidersResponse>("/otzar/voice-captures/providers"),
    receive: (input: {
      provider?: STTProviderType;
      mode?: AudioCaptureMode;
      storage_ref?: string;
      title?: string;
      pre_transcribed_segments?: Array<{
        speaker_label?: string | null;
        start_ms: number;
        end_ms: number;
        text: string;
        confidence?: number | null;
        is_final?: boolean;
      }>;
      meeting_capture_id?: string;
      workspace_id?: string;
      handoff_to_meeting_capture?: boolean;
      participants?: Array<{
        display_name: string;
        email?: string;
        participant_entity_id?: string;
        consent_state?:
          | "CONSENTED"
          | "NOT_CONSENTED"
          | "PENDING"
          | "EXTERNAL_TRACKED";
        consent_source?: string;
      }>;
    }): Promise<ApiResult<ReceiveAudioResponse>> =>
      this.request<ReceiveAudioResponse>("/otzar/voice-captures", {
        method: "POST",
        body: input,
      }),
    list: (): Promise<ApiResult<ListAudioCapturesResponse>> =>
      this.request<ListAudioCapturesResponse>("/otzar/voice-captures"),
    detail: (
      audioCaptureId: string,
    ): Promise<ApiResult<GetAudioCaptureDetailResponse>> =>
      this.request<GetAudioCaptureDetailResponse>(
        `/otzar/voice-captures/${encodeURIComponent(audioCaptureId)}`,
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
