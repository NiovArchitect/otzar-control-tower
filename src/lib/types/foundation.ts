// FILE: foundation.ts
// PURPOSE: TypeScript contracts for every Foundation API response
//          and request shape the Control Tower consumes. Single
//          source of truth. When Foundation evolves an endpoint, the
//          type updates here and the build breaks at every stale
//          call site -- the architectural mirror of Foundation's
//          @niov/database type re-exports.
// CONNECTS TO: src/lib/api.ts (the only HTTP surface), every screen
//              that reads server data via TanStack Query.

// ════════════════════════════════════════════════════════════════
// AUTH (Section 12A)
// ════════════════════════════════════════════════════════════════

// WHAT: Foundation's POST /auth/login response shape (success arm).
// Mirror: AuthService.LoginResult in apps/api/src/services/auth.service.ts.
export interface LoginResponse {
  ok: true;
  token: string;
  session_id: string;
  expires_at: string;
  allowed_operations: string[];
  clearance_ceiling: number;
}

// WHAT: Foundation's POST /auth/login failure shape.
export interface LoginFailure {
  ok: false;
  code: "INVALID_CREDENTIALS" | "SUSPENDED";
  message: string;
}

// WHAT: GET /platform/health response shape.
export interface PlatformHealth {
  ok: true;
  version: string;
  timestamp: string;
  database: "connected" | "disconnected" | "unknown";
}

// WHAT: Generic Foundation 4xx/5xx body shape.
export interface FoundationError {
  ok: false;
  code: string;
  message?: string;
}

// ════════════════════════════════════════════════════════════════
// 12B.1 -- ENUMS (mirror Foundation Prisma enums + literal unions)
// ════════════════════════════════════════════════════════════════

// WHAT: Mirror of Foundation's `enum EntityType` (6 values) from
//       packages/database/prisma/schema.prisma.
// WHY: Customer-facing display labels live in
//      src/lib/labels/entity-types.ts. Never hardcode an
//      EntityType literal in UI -- always go through the label map.
export type EntityType =
  | "PERSON"
  | "COMPANY"
  | "AI_AGENT"
  | "DEVICE"
  | "APPLICATION"
  | "GOVERNMENT";

// WHAT: Mirror of Foundation's `enum EntityStatus` (3 values).
export type EntityStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

// WHAT: Mirror of Foundation's `enum WalletType` (3 values).
// WHY: Foundation has no AI_AGENT wallet type -- AI agents get
//      `wallet_type: "PERSONAL"`. The customer-facing
//      "AI Teammate wallet" is derived from (walletType, entityType)
//      in WalletProvenanceBadge.
export type WalletType = "PERSONAL" | "ENTERPRISE" | "DEVICE";

// WHAT: Mirror of Foundation's `enum CapsuleType` (20 values).
// WHY: Section 11A added 11 to the original 9. Customer-facing
//      display labels in src/lib/labels/capsule-types.ts.
export type CapsuleType =
  | "FOUNDATIONAL"
  | "PREFERENCE"
  | "RELATIONSHIP"
  | "DOMAIN_KNOWLEDGE"
  | "BEHAVIORAL_PATTERN"
  | "IDENTITY"
  | "DEVICE_DATA"
  | "SESSION_LEARNING"
  | "COMPLIANCE_RECORD"
  | "CONVERSATION_LEARNING"
  | "TASK_LEARNING"
  | "WORK_PATTERN"
  | "COMMUNICATION_PREF"
  | "DECISION_STYLE"
  | "COMMITMENT"
  | "BLOCKER"
  | "RISK"
  | "HANDOFF"
  | "DECISION"
  | "CORRECTION";

// WHAT: Mirror of Foundation's `enum AccessScope` (3 values).
// WHY: This is the "how MUCH" axis -- how much of a capsule a
//      grantee can see. Used by Permission.access_scope and by
//      HiveMembership.contribution_scope/access_scope.
export type AccessScope = "METADATA_ONLY" | "SUMMARY" | "FULL";

// WHAT: Client-side superset of AccessScope used by the permissions
//       matrix.
// WHY: Q1 (12B.1): the matrix needs a fourth state -- "no
//      Permission row exists for this entity x capsule_type cell".
//      Foundation has no NONE value in its enum (absence of
//      Permission row IS the NONE state). The frontend models this
//      explicitly so MatrixCell can render a neutral cell for NONE.
export type PermissionLevel = "NONE" | AccessScope;

// WHAT: Mirror of Foundation's `enum DurationType` (6 values).
export type DurationType =
  | "TEMPORARY"
  | "SHORT_TERM"
  | "LONG_TERM"
  | "PERMANENT"
  | "SESSION_ONLY"
  | "NONE";

// WHAT: Mirror of Foundation's `enum PermissionStatus`.
export type PermissionStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

// WHAT: Mirror of Foundation's AuditEventType union from
//       packages/database/src/queries/audit.ts:23-58 (30 literals).
// WHY: Section 11D added CONVERSATION_STARTED + CONVERSATION_CLOSED.
//      Customer-facing display labels live in src/lib/audit/event-types.ts.
//      Audit-aware UI keys off these literals; renaming requires
//      a Foundation change.
export type AuditEventType =
  | "ENTITY_REGISTERED"
  | "ENTITY_SUSPENDED"
  | "ENTITY_REACTIVATED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "SESSION_CREATED"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "CAPSULE_CREATED"
  | "CAPSULE_METADATA_READ"
  | "CAPSULE_CONTENT_READ"
  | "CAPSULE_UPDATED"
  | "CAPSULE_DELETED"
  | "PERMISSION_CREATED"
  | "PERMISSION_REVOKED"
  | "PERMISSION_EXPIRED"
  | "DATA_MONETIZED"
  | "HIVE_CREATED"
  | "HIVE_MEMBER_ADDED"
  | "HIVE_MEMBER_REMOVED"
  | "HIVE_INTELLIGENCE_READ"
  | "HIVE_AGGREGATE_BUILT"
  | "COMPLIANCE_CHECK_PASSED"
  | "COMPLIANCE_CHECK_FAILED"
  | "ANOMALY_DETECTED"
  | "ADMIN_ACTION"
  | "NEGOTIATE"
  | "CONVERSATION_STARTED"
  | "CONVERSATION_CLOSED";

// WHAT: Mirror of Foundation's AuditOutcome enum.
export type AuditOutcome = "SUCCESS" | "FAILURE" | "DENIED";

// WHAT: Twin autonomy_level value set.
// WHY: Emphasis 2 (12B.1): Foundation stores autonomy_level as a
//      String column (NOT a Prisma enum). Validation is enforced at
//      the route level via TWIN_AUTONOMY_VALUES set in
//      apps/api/src/routes/org.routes.ts. The frontend mirrors as a
//      literal union for type safety, but it's a runtime promise --
//      not a database guarantee. Treat any value not in this union
//      as a Foundation contract drift; surface in PR review.
export type TwinAutonomyLevel =
  | "APPROVAL_REQUIRED"
  | "EXECUTIVE_OVERRIDE"
  | "OBSERVE_ONLY";

// ════════════════════════════════════════════════════════════════
// 12B.1 -- MODELS (mirror Foundation Prisma rows)
// ════════════════════════════════════════════════════════════════

// WHAT: One Entity row.
// WHY: Mirror of `model Entity` in schema.prisma. ISO 8601 strings
//      on the wire; the frontend can wrap in date-fns when needed.
export interface Entity {
  entity_id: string;
  entity_type: EntityType;
  display_name: string;
  email: string | null;
  status: EntityStatus;
  clearance_level: number;
  public_key: string;
  failed_auth_attempts: number;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// WHAT: Profile fields hung off an Entity (1:1).
// WHY: Mirror of `model EntityProfile`. Used for Member detail panel
//      in 12B.2 (display_name + first_name/last_name + job_title).
export interface EntityProfile {
  profile_id: string;
  entity_id: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  username: string | null;
  phone: string | null;
  timezone: string | null;
  bio: string | null;
  avatar_url: string | null;
  updated_at: string;
}

// WHAT: One row in the org's hierarchy graph.
// WHY: Mirror of `model EntityMembership`. Used for hierarchy view
//      in 12B.2 Member detail and the Phase 2 propagation analysis.
export interface EntityMembership {
  membership_id: string;
  parent_id: string;
  child_id: string;
  role_title: string | null;
  department: string | null;
  hierarchy_level: number;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

// WHAT: One Wallet row.
// WHY: Mirror of `model Wallet`. WalletProvenanceBadge derives the
//      customer-facing variant from (walletType, entityType).
export interface Wallet {
  wallet_id: string;
  entity_id: string;
  wallet_type: WalletType;
  niov_can_access_contents: boolean;
  monetization_enabled: boolean;
  total_capsule_count: number;
  created_at: string;
  updated_at: string;
}

// WHAT: One MemoryCapsule row.
// WHY: Mirror of `model MemoryCapsule` (key fields only -- the
//      content/encryption metadata stays on Foundation).
export interface MemoryCapsule {
  capsule_id: string;
  wallet_id: string;
  entity_id: string;
  version: number;
  capsule_type: CapsuleType;
  topic_tags: string[];
  payload_summary: string;
  payload_size_tokens: number;
  storage_tier: "HOT" | "WARM" | "COLD";
  clearance_required: number;
  access_count: number;
  monetization_enabled: boolean;
  created_at: string;
  last_accessed_at: string | null;
  last_updated_at: string;
  expires_at: string | null;
  deleted_at: string | null;
}

// WHAT: Slim row shape returned by GET /api/v1/org/capsules.
// WHY: Foundation route apps/api/src/routes/org.routes.ts:872-883
//      SELECTs exactly these 10 fields -- not the full MemoryCapsule
//      row. Matches the patent's three-wallet portability boundary:
//      /org/capsules is ORG-WALLET-ONLY (entity_id == COMPANY); cross-
//      wallet capsules surface only through Security & Audit (12D).
//      12B.4 Access Control matrix joins these against /org/permissions
//      to compute the (capsule_type, grantee) heatmap; permissions
//      referencing capsule_ids NOT in this slice are dropped (cross-
//      wallet boundary -- see aggregate-matrix.ts JSDoc).
export interface OrgCapsuleListItem {
  capsule_id: string;
  capsule_type: CapsuleType;
  topic_tags: string[];
  relevance_score: number;
  payload_summary: string;
  payload_size_tokens: number;
  clearance_required: number;
  access_count: number;
  created_at: string;
  last_accessed_at: string | null;
}

// WHAT: One Permission row.
// WHY: Mirror of `model Permission`. The matrix UI renders cells
//      from groups of Permission rows (aggregated by bridge_id).
//      Q1 (12B.1) decision: schema-honest 3-tuple
//      (access_scope, can_share_forward, duration_type) -- no
//      synthetic 4-level enum.
export interface Permission {
  permission_id: string;
  bridge_id: string;
  capsule_id: string;
  grantor_entity_id: string;
  grantee_entity_id: string;
  access_scope: AccessScope;
  duration_type: DurationType;
  can_share_forward: boolean;
  monetization_active: boolean;
  status: PermissionStatus;
  valid_from: string;
  expires_at: string | null;
  conditions: Record<string, unknown>;
  created_at: string;
}

// WHAT: One TwinConfig row.
// WHY: Emphasis 3 (12B.1): is_admin_twin AND autonomy_level surface
//      INDEPENDENTLY. createTwin sets them correlated but they can
//      drift via PATCH. EXECUTIVE_OVERRIDE badge keys off
//      is_admin_twin; "Behavior Policy" column keys off
//      autonomy_level. Never conflate.
export interface TwinConfig {
  twin_id: string;
  autonomy_level: TwinAutonomyLevel;
  swarm_enabled: boolean;
  role_template: string | null;
  is_admin_twin: boolean;
  approver_entity_id: string | null;
  updated_at: string;
}

// WHAT: One SkillPackage row.
// WHY: Mirror of `model SkillPackage`. Used by Create Teammate
//      dialog in 12B.3 for the "skill package" picker.
export interface SkillPackage {
  package_id: string;
  name: string;
  category: string;
  description: string;
  capability_flags: string[];
  created_at: string;
}

// WHAT: One TwinSkill join row.
// WHY: Mirror of `model TwinSkill`. Returned by POST
//      /org/ai-teammates/:id/skills when a SkillPackage is assigned.
//      Used by TwinDetailDrawer Skills tab to show assigned skills.
export interface TwinSkill {
  id: string;
  twin_id: string;
  package_id: string;
  assigned_at: string;
}

// WHAT: Success response from POST /org/ai-teammates/:id/skills.
// WHY: Foundation HEAD ca6e982 (skill assignment audit emission) added
//      audit_event_id to the success arm. Consumed by TwinDetailDrawer
//      Skills tab's AssignSkillButton (AuditAwareButton) Stage 4 toast
//      for the clickable audit chain demo. Failure arms (TWIN_NOT_FOUND,
//      SKILL_PACKAGE_NOT_FOUND, INVALID_REQUEST) intentionally omit
//      audit_event_id per 12B.0 contract.
export interface AssignSkillResponse {
  ok: true;
  skill: TwinSkill;
  audit_event_id: string;
}

// WHAT: TwinSkill row hydrated with its SkillPackage.
// WHY: Foundation HEAD ee4dafb GET /org/ai-teammates/:id returns
//      `skills` with `include: { package: true }`, so each row
//      already carries the full SkillPackage. Hydrating up-front
//      eliminates the N+1 fetch the Skills tab would otherwise
//      need against /org/skill-packages to resolve package names.
export interface TwinSkillWithPackage extends TwinSkill {
  package: SkillPackage;
}

// WHAT: Success response from GET /org/ai-teammates/:id.
// WHY: Foundation HEAD ee4dafb GET /org/ai-teammates/:id contract.
//      Powers TwinDetailDrawer Overview + Skills tabs honestly. The
//      hydrated `package` on each skill row eliminates the N+1 fetch
//      that would otherwise be needed against /org/skill-packages.
//      Failure arms (TWIN_NOT_FOUND, TWIN_NOT_IN_ORG) return 404 with
//      no audit_event_id (read endpoints don't surface audit ids per
//      12B.0 contract).
export interface TwinDetailResponse {
  ok: true;
  entity: Entity;
  twin_config: TwinConfig;
  owner_entity_id: string;
  skills: TwinSkillWithPackage[];
}

// WHAT: Slim row shape returned by GET /org/ai-teammates list endpoint.
// WHY: Drift 1 from 12B.3 pre-flight: Foundation's twin list returns
//      a slim shape { entity_id, display_name, status, created_at,
//      config: TwinConfig | null } -- NOT a full Entity. Full Entity
//      surfaced via GET /org/ai-teammates/:id for the detail drawer.
//      The slim shape is what the AI Teammates table renders from.
export interface AITeammateListItem {
  entity_id: string;
  display_name: string;
  status: EntityStatus;
  created_at: string;
  config: TwinConfig | null;
}

// WHAT: One Hive row.
// WHY: Mirror of `model Hive`. Used in AI Teammates Hive Membership
//      column in 12B.3.
export interface Hive {
  hive_id: string;
  hive_name: string;
  hive_type: string;
  governance_terms: Record<string, unknown>;
  aggregate_capsule_id: string | null;
  member_count: number;
  status: string;
  org_entity_id: string | null;
  is_default_enterprise: boolean;
  created_at: string;
  updated_at: string;
}

// WHAT: One HiveMembership row.
// WHY: Mirror of `model HiveMembership`. Joins entity to hive with
//      contribution / access scope details.
export interface HiveMembership {
  membership_id: string;
  hive_id: string;
  entity_id: string;
  capsule_types_contributed: string[];
  contribution_scope: AccessScope;
  capsule_types_accessible: string[];
  access_scope: AccessScope;
  joined_at: string;
  expires_at: string | null;
  status: string;
}

// WHAT: One AuditEvent row.
// WHY: Mirror of `model AuditEvent`. Used by Home Recent Activity
//      feed (12B.2) and Security & Audit screen (12D).
export interface AuditEvent {
  audit_id: string;
  event_type: AuditEventType;
  actor_entity_id: string | null;
  target_entity_id: string | null;
  target_capsule_id: string | null;
  session_id: string | null;
  outcome: AuditOutcome;
  denial_reason: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
}

// ════════════════════════════════════════════════════════════════
// Section 7 — full audit viewer (Foundation Wave 1+ LIVE per
// ADR-0071 + earlier Section 7 waves). The new
// `GET /api/v1/audit/events` + `GET /api/v1/audit/events/:id`
// routes return chain-augmented SAFE projections. Distinct from
// the legacy `/org/audit` shape mirrored in `AuditEvent` above
// (kept verbatim for Home Recent Activity / 12B.2 consumers).
// ════════════════════════════════════════════════════════════════

// WHAT: SAFE projection of one audit event row from the Section 7
//        list endpoint. Mirrors Foundation's `SafeAuditEventView`
//        at `apps/api/src/services/audit/audit-view.service.ts`
//        (~line 115). Adds 5 chain + provenance fields beyond the
//        legacy `AuditEvent` shape.
// WHY: The list view at `/audit/events` needs the chain fields
//        so future hover / drilldown surfaces can render hash
//        lineage. Foundation safe-projects `details` at write-
//        time via `writeAuditEvent`; no raw PII / payload /
//        secret_ref / connector_payload / chain-of-thought ever
//        appears in this shape per ADR-0071 §3 + the no-leak
//        guard at `tests/unit/no-leak-guard.test.ts`.
export interface SafeAuditEventView {
  audit_id: string;
  event_type: AuditEventType;
  actor_entity_id: string | null;
  target_entity_id: string | null;
  target_capsule_id: string | null;
  session_id: string | null;
  outcome: AuditOutcome;
  denial_reason: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
  previous_event_hash: string | null;
  event_hash: string;
  lawful_basis_id: string | null;
  lawful_basis_chain_hash: string | null;
  jurisdiction: string | null;
}

// WHAT: Compact chain reference for prev/next pointers on the
//        detail view. NEVER carries the full neighbour body.
export interface AuditEventChainRef {
  audit_id: string;
  event_hash: string;
  timestamp: string;
}

// WHAT: SAFE projection of a single audit-event detail view from
//        `GET /api/v1/audit/events/:id`. Extends the list view
//        with neighbour chain refs.
export interface SafeAuditEventDetailView extends SafeAuditEventView {
  previous_event: AuditEventChainRef | null;
  next_event: AuditEventChainRef | null;
}

// WHAT: Closed-vocab scope discriminator on the Section 7
//        endpoints. Wave 1 is `self` only at this slice; org /
//        platform / regulator scopes are forward-substrate.
export type AuditViewScope = "self" | "org" | "platform" | "regulator";

// WHAT: List-endpoint response envelope. Pagination is
//        page / page_size / total (NOT cursor) per Foundation
//        routes/audit.routes.ts.
export interface ListAuditEventsSuccess {
  ok: true;
  page: number;
  page_size: number;
  total: number;
  events: readonly SafeAuditEventView[];
}

// WHAT: Detail-endpoint response envelope.
export interface GetAuditEventSuccess {
  ok: true;
  event: SafeAuditEventDetailView;
}

// WHAT: Common failure envelope for the Section 7 reads.
//        Foundation uses enumeration-safe 404 for cross-actor /
//        cross-org / unknown / soft-deleted at the detail
//        endpoint (single code `AUDIT_EVENT_NOT_FOUND`).
export interface AuditViewFailure {
  ok: false;
  code: string;
  message?: string;
  invalid_fields?: readonly string[];
}

// WHAT: Inputs accepted by the list endpoint. All optional;
//        `scope` defaults to `self` server-side. Wave 1 only
//        consumes `self` at the CT register.
export interface ListAuditEventsInput {
  page?: number;
  page_size?: number;
  event_type?: AuditEventType;
  target_entity_id?: string;
  target_capsule_id?: string;
  outcome?: AuditOutcome;
  start_time?: string;
  end_time?: string;
  scope?: AuditViewScope;
}

// ════════════════════════════════════════════════════════════════
// Section 7 — verify-chain (Foundation LIVE since ADR-0071 / PR
// #133). The endpoint walks the caller's audit chain and asserts
// chain-integrity invariants (event_hash recompute + previous-
// event-hash link + canonical-record byte-equivalence). Self-
// scope only at this CT slice; org / platform / regulator scopes
// + lawful_basis_id flow are forward-substrate.
// ════════════════════════════════════════════════════════════════

// WHAT: Closed-vocab failure reasons returned when `verified`
//        is false. Mirrors Foundation `VerifyChainFailureReason`
//        at audit-view.service.ts ~line 383.
export type VerifyChainFailureReason =
  | "CHAIN_HASH_MISMATCH"
  | "PREVIOUS_LINK_MISMATCH"
  | "MISSING_PREVIOUS_EVENT"
  | "CANONICAL_RECORD_DRIFT";

// WHAT: SAFE projection of the verify-chain result. Mirrors
//        Foundation `VerifyChainView` at audit-view.service.ts
//        ~line 389. Carries closed-vocab outcomes + boundary
//        hashes + the canonical 14-field chain algorithm
//        identifier + an honest_note. NEVER carries raw event
//        bodies, raw chain data, raw PII, secret refs.
export interface VerifyChainView {
  ok: true;
  scope: AuditViewScope;
  verified: boolean;
  checked_event_count: number;
  chain_algorithm: "SHA-256/14-field-canonical-record";
  window_start: string | null;
  window_end: string | null;
  first_event_id: string | null;
  last_event_id: string | null;
  first_event_hash: string | null;
  last_event_hash: string | null;
  broken_at_event_id: string | null;
  failure_reason: VerifyChainFailureReason | null;
  lawful_basis_id: string | null;
  evidence_note: string;
  honest_note: string;
}

// WHAT: Inputs accepted by the verify-chain endpoint. All
//        optional except `scope` which defaults to `self`
//        server-side. `lawful_basis_id` is required at
//        Foundation when scope === "regulator"; CT slice
//        does not yet expose regulator scope at the UI tier.
export interface VerifyChainInput {
  scope?: AuditViewScope;
  subject_entity_id?: string;
  lawful_basis_id?: string;
  from?: string;
  to?: string;
  max_events?: number;
}

// ════════════════════════════════════════════════════════════════
// 12B.1 -- REQUEST / RESPONSE SHAPES
// ════════════════════════════════════════════════════════════════

// WHAT: Body for POST /api/v1/org/members from the FRONTEND
//        caller's perspective. Foundation's actual MemberInput
//        requires `password` (non-null) -- but the random-password
//        injection happens inside `api.org.members.create()` before
//        the fetch fires, so frontend callers never pass it.
// WHY: 12B.2 architectural dance per decision #21:
//      - Foundation requires a placeholder password to mint the row.
//      - The invitee's real access path is Phase3Result.activation_credential.
//      - Frontend treats password as optional in this type so no
//        UI form ever includes a password field. The api method
//        injects a random 32-char value via generateRandomPassword()
//        before delegating to the underlying request<T>().
//      Foundation-side MemberInput still requires password; the
//        contract is satisfied by api.org.members.create's injection,
//        not by this type.
export interface MemberInput {
  email: string;
  /** OPTIONAL on the frontend type: api.org.members.create injects
   *  a random placeholder before the fetch. NEVER pass a real
   *  password from a UI form (decision #21). */
  password?: string;
  first_name?: string;
  last_name?: string;
  role_title?: string;
  hierarchy_level?: number;
  is_admin?: boolean;
}

// WHAT: Success response from POST /api/v1/org/members (single).
// WHY: 12B.0 contract -- audit_event_id surfaces the audit_id of
//      the ADMIN_ACTION (action=ORG_MEMBER_ADDED) row.
export interface MemberCreateResponse {
  ok: true;
  entity_id: string;
  email: string | null;
  display_name: string;
  audit_event_id: string;
}

// WHAT: Success response from PATCH /api/v1/org/entities/:id.
// WHY: Foundation now returns { ok, audit_event_id } for the entity
//      status + EntityProfile update (the audit_id of the ADMIN_ACTION
//      action=ORG_ENTITY_UPDATE row). Consuming the REAL id retires the
//      former "pending-foundation-extension" sentinel. The route does
//      not return the Entity body; no caller relies on it.
export interface EntityUpdateResponse {
  ok: true;
  audit_event_id: string;
}

// WHAT: Success response from POST /api/v1/org/members/bulk.
export interface MemberBulkResponse {
  ok: true;
  created_count: number;
  failure_count: number;
  created: Array<{
    entity_id: string;
    email: string | null;
    audit_event_id: string;
  }>;
  failures: Array<{ index: number; error: string }>;
}

// WHAT: One row in Phase 2's propagation_order.
// WHY: Mirror of PropagationEntry in dandelion.service.ts.
export interface PropagationEntry {
  entity_id: string;
  display_name: string;
  hierarchy_level: number;
  is_admin: boolean;
  reason: string;
  status: "PENDING" | "ACTIVATED";
  activated_at: string | null;
}

// WHAT: POST /api/v1/org/onboarding/start response.
// WHY: Mirror of Phase2Result in dandelion.service.ts.
export interface Phase2Result {
  ok: true;
  org_entity_id: string;
  mode: "HIERARCHY" | "INTELLIGENCE";
  total_users: number;
  propagation_order: PropagationEntry[];
}

// WHAT: POST /api/v1/org/onboarding/invite response.
// WHY: Mirror of Phase3Result. 12B.0 added audit_event_id.
export interface Phase3Result {
  ok: true;
  org_entity_id: string;
  entity_id: string;
  twin_id: string;
  hive_membership_id: string | null;
  activation_credential: string;
  audit_event_id: string;
}

// WHAT: POST /api/v1/org/onboarding/{reorder,status} response.
// WHY: Mirror of Phase4Status.
export interface Phase4Status {
  ok: true;
  org_entity_id: string;
  total_users: number;
  onboarded_count: number;
  pending_count: number;
  compound_score: number;
  propagation_order: PropagationEntry[];
}

// WHAT: One grant inside a ShareRequest body.
// WHY: Mirror of capsule_grants[] item in cosmp.routes.ts.
export interface CapsuleGrant {
  capsule_id: string;
  scope: AccessScope;
  duration_type: DurationType;
  can_share_forward?: boolean;
  valid_from?: string;
  expires_at?: string;
  conditions?: Record<string, unknown>;
}

// WHAT: Body for POST /api/v1/cosmp/share.
export interface ShareRequest {
  grantee_entity_id: string;
  capsule_grants: CapsuleGrant[];
  write_reason?: string;
}

// WHAT: Success response from POST /api/v1/cosmp/share.
// WHY: 12B.0 contract -- audit_event_id surfaces PERMISSION_CREATED.
export interface ShareResponse {
  ok: true;
  bridge_id: string;
  permissions_created: string[];
  audit_event_id: string;
}

// WHAT: Success response from DELETE /api/v1/cosmp/share/:bridgeId.
// WHY: 12B.0 contract -- audit_event_id surfaces PERMISSION_REVOKED.
export interface RevokeResponse {
  ok: true;
  bridge_id: string;
  revoked_count: number;
  audit_event_id: string;
}

// WHAT: Body for POST /api/v1/org/ai-teammates.
// WHY: Mirror -- create body is minimal (no name, no
//      skill_package_id, no behavior policy fields). Skills assigned
//      via the separate POST /org/ai-teammates/:id/skills after
//      create.
export interface AITeammateCreateInput {
  owner_entity_id?: string;
  role_title?: string;
  is_admin_invite?: boolean;
}

// WHAT: Success response from POST /api/v1/org/ai-teammates.
// WHY: Mirror of CreateTwinResult (12B.0 added audit_event_id).
export interface AITeammateCreateResponse {
  ok: true;
  entity_id: string;
  twin_config: TwinConfig;
  is_admin_twin: boolean;
  org_permission_bridge_id: string | null;
  owner_permission_bridge_id: string;
  default_hive_membership_id: string | null;
  audit_event_id: string;
}

// WHAT: PATCH /api/v1/org/ai-teammates/:id mutable body shape.
// WHY: Only 4 fields are writable: autonomy_level, swarm_enabled,
//      role_template, approver_entity_id. Foundation rejects
//      anything else with 422 IMMUTABLE_FIELD or INVALID_FIELD.
export interface AITeammateUpdateInput {
  autonomy_level?: TwinAutonomyLevel;
  swarm_enabled?: boolean;
  role_template?: string | null;
  approver_entity_id?: string;
}

// WHAT: Success response from PATCH /api/v1/org/ai-teammates/:id.
export interface AITeammateUpdateResponse {
  ok: true;
  twin_config: TwinConfig;
  audit_event_id: string;
}

// WHAT: Org hierarchy response shape.
// WHY: Returned by GET /api/v1/org/hierarchy. Flat list of all
//      EntityMembership rows for the caller's org.
export interface OrgHierarchyResponse {
  ok: true;
  memberships: EntityMembership[];
}

// WHAT: Generic paginated list response.
// WHY: Most Foundation list endpoints (entities, ai-teammates,
//      hives, permissions, audit) follow this shape.
export interface Paginated<T> {
  ok: true;
  items: T[];
  total: number;
  skip: number;
  take: number;
}

// WHAT: GET /api/v1/org/analytics response shape (extended).
// WHY: 12A used a 4-field subset; 12B.1 extends to the full
//      CompoundingMetrics surface so Home's Intelligence Summary
//      cards (12B.2) can read compound_score, decision_count,
//      pattern_count, vocab_count, completion_rate, etc.
//
//      pending_approvals_count is stub-0 throughout 12B (Foundation
//      TODO Section 14: EscalationRequest table). The badge guard
//      hides it when count === 0.
export interface OrgAnalytics {
  ok: true;
  org_entity_id: string;
  pending_approvals_count: number;
  active_twins: number;
  capsule_count: number;
  compound_score: number;
  decision_count: number;
  pattern_count: number;
  vocab_count: number;
  external_count: number;
  completion_rate: number;
}

// ════════════════════════════════════════════════════════════════
// EMPLOYEE OTZAR MVP -- /otzar/* product surface (Phase 1)
// ════════════════════════════════════════════════════════════════
//
// These mirror the EMPLOYEE-FACING (non-admin) Otzar endpoints, which
// are Bearer-validated product routes -- NOT org-admin routes. Verified
// against niov-foundation:
//   - conversation/message + conversation/close: validateSession("read")
//     -> require can_read_capsules.
//   - observe + correction: validateSession("write")
//     -> require can_write_capsules.
// None of these responses return audit_event_id (they write audit rows
// server-side, but the client never sees the id), so the audit-aware
// 4-stage clickable-audit primitive does NOT apply here -- employee
// actions use plain mutation UX.

// WHAT: Body for POST /api/v1/otzar/conversation/message.
// WHY: Mirror of ConductSessionInput in
//      apps/api/src/services/otzar/otzar.service.ts. conversation_id is
//      omitted on the first turn (the backend mints one) and echoed back
//      on subsequent turns. conversation_history is client-held for
//      Phase 1 -- no durable conversation-list route exists yet.
export interface ConversationMessageRequest {
  message: string;
  conversation_id?: string;
  conversation_history?: string[];
  token_budget?: number;
}

// WHAT: Success response from POST /api/v1/otzar/conversation/message.
// WHY: Mirror of ConductSessionSuccess. `response` is the assistant
//      text; `context_used` + `tokens_consumed` are surfaced for
//      transparency, never as a task/execution claim.
// WHAT: One governed context-provenance entry (ADR-0051, Wave 1). A
//       product-safe projection produced by COE.assembleContext -- NEVER
//       raw content. content_available marks whether the underlying item
//       was readable under the caller's scope. context_id is an opaque
//       reference used only as a render key, never surfaced prominently.
export interface ContextProvenanceItem {
  context_id: string;
  title: string | null;
  source_type: string;
  scope: "PERSONAL" | "ENTERPRISE" | "UNKNOWN";
  content_available: boolean;
  reason: string;
  tokens_used?: number;
  created_at?: string;
}

// WHAT: COE-governed transparency summary for one chat turn (ADR-0051,
//       Wave 1). All fields are pre-sanitized by Foundation: counts +
//       friendly statuses only. access_limited replaces the raw denied-
//       permission count (boolean only). tool_calls is always empty in
//       Wave 1; verification_status is always NOT_ACTIVE.
export interface ChatTransparency {
  context_items_used: number;
  items_skipped_low_relevance: number;
  items_skipped_budget: number;
  access_limited: boolean;
  retrieval_status: "USED" | "NO_MATCHES" | "DEGRADED" | "SKIPPED";
  retrieval_source: "COE_ASSEMBLE_CONTEXT";
  retrieval_reason: string;
  memory_updated: boolean;
  tool_calls: unknown[];
  approval_required: boolean;
  verification_status: "NOT_ACTIVE";
}

// WHAT: Success response from POST /api/v1/otzar/conversation/message.
// WHY: ADR-0051 Wave 1 adds OPTIONAL transparency + context_provenance
//      fields. The original fields are unchanged; the new fields are
//      optional so the UI stays backward-compatible if Foundation omits
//      them.
export interface ConversationMessageResponse {
  ok: true;
  response: string;
  context_used: number;
  tokens_consumed: number;
  conversation_id: string;
  transparency?: ChatTransparency;
  context_provenance?: ContextProvenanceItem[];
}

// WHAT: Body for POST /api/v1/otzar/conversation/close.
export interface ConversationCloseRequest {
  conversation_id: string;
  capsule_ids_used?: string[];
  conversation_history?: string[];
}

// WHAT: Success response from POST /api/v1/otzar/conversation/close.
// WHY: Mirror of CloseConversationSuccess -- closing writes a
//      conversation-summary capsule and returns its id + topics.
export interface ConversationCloseResponse {
  ok: true;
  capsule_id: string;
  conversation_id: string;
  topics: string[];
}

// WHAT: Body for POST /api/v1/otzar/observe.
// WHY: Mirror of ObserveInput. event_type is a free string on the
//      backend; the UI constrains it to a controlled vocabulary.
export interface ObserveRequest {
  content: string;
  event_type: string;
  org_entity_id?: string;
}

// WHAT: Per-category extraction counts on a successful observe.
// WHY: PROVEN backend shape (observation.service.ts ObserveSuccess) is
//      NUMERIC COUNTS, not string arrays. The UI renders counts.
export interface ObserveExtractedSummary {
  decisions: number;
  commitments: number;
  work_patterns: number;
  external_entities: number;
  vocab_growth: number;
}

// WHAT: Success arm of POST /api/v1/otzar/observe (content extracted).
export interface ObserveSuccessResponse {
  ok: true;
  skipped?: false;
  capsule_ids: string[];
  extracted_summary: ObserveExtractedSummary;
}

// WHAT: Skipped arm of POST /api/v1/otzar/observe (duplicate content).
export interface ObserveSkippedResponse {
  ok: true;
  skipped: true;
  reason: "DUPLICATE_CONTENT";
}

// WHAT: Discriminated union over the observe success/skipped arms.
export type ObserveResponse = ObserveSuccessResponse | ObserveSkippedResponse;

// WHAT: Body for POST /api/v1/otzar/correction.
// ADR-0055 Wave 2C adds an OPTIONAL conversation_id. Omitted = backward-
// compatible (capsule persists with conversation_id null). Present + valid
// + caller-owned = the CORRECTION capsule is linked to the conversation
// and surfaces in GET /otzar/conversations/:id/corrections.
export interface CorrectionRequest {
  incorrect_description: string;
  correct_behavior: string;
  target_capsule_id?: string;
  conversation_id?: string;
}

// WHAT: Success response from POST /api/v1/otzar/correction.
export interface CorrectionResponse {
  ok: true;
  correction_capsule_id: string;
}

// ════════════════════════════════════════════════════════════════
// MY CONVERSATIONS -- per-conversation correction signals
// (ADR-0055 Wave 2C)
// ════════════════════════════════════════════════════════════════
//
// GET /api/v1/otzar/conversations/:id/corrections -- safe, self-scoped,
// FLAT response (fields at the top level per ADR-0055 §Decision 5,
// distinct from Wave 2B's nested `{ conversation }` envelope). Carries
// counts + last-seen freshness + locked anti-overclaim notes only.
// NEVER carries raw correction payloads (payload_summary /
// payload_content), target_capsule_id, correction_capsule_id, vectors,
// embeddings, storage_location, content_hash, permission internals,
// bridge IDs, capability flags, drift score, employee score,
// best-practice-learned status, manager-visibility fields, or org-wide
// aggregation. drift_prevention_note + continuity_note are LOCKED at
// the Foundation mapper.

// WHAT: GET /api/v1/otzar/conversations/:id/corrections success response.
export interface ConversationCorrectionsResponse {
  ok: true;
  conversation_id: string;
  corrections_count: number;
  has_corrections: boolean;
  last_correction_at: string | null;
  drift_prevention_note: string;
  continuity_note: string;
}

// ════════════════════════════════════════════════════════════════
// EMPLOYEE OTZAR -- Approvals / Escalations (/escalations/* product)
// ════════════════════════════════════════════════════════════════
//
// Bearer-validated PRODUCT routes (NOT Console, NOT can_admin_niov):
//   - GET  /escalations/pending     -> validateSession("read"); the
//     CALLER'S OWN pending queue (target_entity_id === caller). It is
//     NOT an org-wide queue, and no org-wide listing endpoint exists.
//   - GET  /escalations/:id         -> read; party-only (source/target/
//     resolver), enforced server-side.
//   - POST /escalations/:id/approve -> write; two-person rule: a caller
//     who is the source is rejected 403 server-side.
//   - POST /escalations/:id/reject  -> write; same gate.
// Responses return the raw EscalationRequest scalar row and carry NO
// audit_event_id (audit fires server-side) -> plain mutation UX, never
// the audit-aware clickable-link primitive.

// WHAT: Mirror of Foundation's `enum EscalationType` (7 values).
export type EscalationType =
  | "HUMAN_REVIEW_REQUIRED"
  | "SOVEREIGNTY_VIOLATION"
  | "THRESHOLD_BREACH"
  | "POLICY_CONFLICT"
  | "AUTHORIZATION_FAILURE"
  | "COMPLIANCE_GATE"
  | "DUAL_CONTROL_REQUIRED";

// WHAT: Mirror of Foundation's `enum EscalationStatus` (4 values).
export type EscalationStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

// WHAT: One EscalationRequest scalar row (no relations included).
// WHY: The /escalations/* routes return this shape directly. Entity-id
//      fields + capsule_id are references the UI must NOT surface
//      prominently; the UI renders type/severity/status/description/
//      timestamps. source_entity_id + target_entity_id power the
//      client-side approvability rule (source !== target).
export interface Escalation {
  escalation_id: string;
  source_entity_id: string;
  target_entity_id: string;
  capsule_id?: string | null;
  escalation_type: EscalationType;
  severity: string;
  description: string;
  status: EscalationStatus;
  resolved_by_entity_id?: string | null;
  resolution_metadata?: Record<string, unknown> | null;
  created_at: string;
  resolved_at?: string | null;
  expires_at?: string | null;
}

// WHAT: GET /api/v1/escalations/pending response.
export interface EscalationListResponse {
  ok: true;
  escalations: Escalation[];
}

// WHAT: GET/POST single-escalation response (detail, approve, reject).
export interface EscalationResponse {
  ok: true;
  escalation: Escalation;
}

// WHAT: Optional body for approve/reject. resolution_metadata is free
//       JSON on the backend; the UI sends at most an optional { note }.
export interface EscalationResolveRequest {
  resolution_metadata?: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════
// EMPLOYEE OTZAR -- My Twin + Conversations metadata (read-only)
// ════════════════════════════════════════════════════════════════
//
// Bearer-validated PRODUCT reads (validateSession("read"); NOT admin,
// NOT can_admin_niov). Self-scoped to the caller. The backend enforces
// a product-safe projection -- it never returns role-template body,
// capability flags, permission bridge ids, or memory/capsule/vector
// data. /otzar/conversations is METADATA ONLY (no transcripts/message
// bodies); transcript retrieval is a future, governed capability.

// WHAT: One skill on the caller's twin (product-safe; name + category).
export interface MyTwinSkill {
  name: string;
  category: string;
}

// WHAT: The human approver for the caller's twin, if one is set.
export interface MyTwinApprover {
  entity_id: string;
  display_name: string;
}

// WHAT: The caller's own aligned digital-twin identity (projection).
// WHY: twin_id + role_template are part of the contract but the UI does
//      NOT surface them prominently (raw id / internal template).
export interface MyTwinView {
  twin_id: string;
  display_name: string;
  role_title: string | null;
  autonomy_mode: string;
  swarm_enabled: boolean;
  role_template: string | null;
  is_admin_twin: boolean;
  status: string;
  skills: MyTwinSkill[];
  approver: MyTwinApprover | null;
  created_at: string;
  updated_at: string;
  // ADR-0053 Wave 2A: additive, optional, self-scoped role-scope profile.
  // Existing fields above are unchanged (backward-compatible).
  role_scope_profile?: MyTwinRoleScopeProfile;
}

// ════════════════════════════════════════════════════════════════
// MY TWIN -- role-scope profile (ADR-0053 Wave 2A; additive, self-scoped)
// ════════════════════════════════════════════════════════════════
//
// A product-safe, self-scoped projection mirroring the Foundation
// MyTwinRoleScopeProfile. Friendly labels + counts only -- NEVER raw
// RBAC/ABAC rows, clearance, capability flags, permission envelopes,
// bridge ids, raw memory/capsule/vector data, or AgentTemplate body.
// observation_mode is a fixed anti-surveillance literal.

export interface RoleScopeIdentity {
  twin_id: string;
  display_name: string;
  status: string;
}

export interface RoleScopeRole {
  role_title: string | null;
  job_title: string | null;
  department: string | null;
  hierarchy_level: number | null;
  is_admin_twin: boolean;
}

export interface RoleScopeSummary {
  scope_label: string;
  membership_count: number;
  active_membership_count: number;
  department_count: number;
  has_department_scope: boolean;
  has_multiple_memberships: boolean;
  permission_posture: string;
  approval_posture: string;
}

export interface RoleScopeAssistanceProfile {
  autonomy_mode: string;
  swarm_enabled: boolean;
  role_template_status: "CONFIGURED" | "NOT_CONFIGURED";
  skills_status: "AVAILABLE" | "NOT_CONFIGURED";
  current_assistance_boundaries: string[];
}

export interface RoleScopeGovernance {
  approver_configured: boolean;
  approver: MyTwinApprover | null;
  sensitive_actions_require: "PERMISSION_POLICY_OR_APPROVAL";
  observation_mode: "PERMISSIONED_WORK_CONTEXT_NOT_SURVEILLANCE";
}

export interface RoleScopeContinuity {
  recent_conversation_count: number;
  recent_correction_count: number;
  recent_learning_summary_count: number;
  alignment_signals_available: boolean;
}

export interface MyTwinRoleScopeProfile {
  identity: RoleScopeIdentity;
  role: RoleScopeRole;
  scope_summary: RoleScopeSummary;
  assistance_profile: RoleScopeAssistanceProfile;
  governance: RoleScopeGovernance;
  continuity: RoleScopeContinuity;
}

// WHAT: GET /api/v1/otzar/my-twin success response.
export interface MyTwinResponse {
  ok: true;
  twin: MyTwinView;
  has_multiple_twins: boolean;
  twin_count: number;
}

// WHAT: Conversation status filter / item status (product enum).
export type ConversationStatus = "ACTIVE" | "CLOSED";

// WHAT: One conversation-session metadata row (NO transcript / bodies).
export interface ConversationListItem {
  conversation_id: string;
  twin_id: string;
  source_type: string;
  status: string;
  message_count: number;
  started_at: string;
  closed_at: string | null;
}

// WHAT: GET /api/v1/otzar/conversations success response (paginated).
export interface ConversationListResponse {
  ok: true;
  items: ConversationListItem[];
  total: number;
  has_more: boolean;
}

// WHAT: Query params for the conversations metadata feed.
export interface ConversationListParams {
  skip?: number;
  take?: number;
  status?: ConversationStatus;
}

// ════════════════════════════════════════════════════════════════
// MY CONVERSATIONS -- single look-back detail (ADR-0054 Wave 2B)
// ════════════════════════════════════════════════════════════════
//
// GET /api/v1/otzar/conversations/:id -- a SAFE, self-scoped look-back
// projection: metadata + an optional close SUMMARY + topics only. It
// never returns transcripts, message bodies, raw context, vectors, or
// capsule internals. transparency_available is always false (live
// transparency is surfaced during answers, not stored as history).
// summary_capsule_id is part of the contract but the UI does NOT render
// it (raw id).

// WHAT: Whether a close summary is available for the conversation.
export type ConversationDetailAvailability =
  | "SUMMARY_AVAILABLE"
  | "NO_SUMMARY_YET"
  | "ACTIVE_NOT_CLOSED";

// WHAT: One conversation look-back detail (safe projection).
export interface ConversationDetail {
  conversation_id: string;
  twin_id: string;
  source_type: string;
  status: string;
  started_at: string;
  closed_at: string | null;
  message_count: number;
  summary: string | null;
  topics: string[];
  summary_available: boolean;
  summary_capsule_id: string | null;
  detail_availability: ConversationDetailAvailability;
  transparency_available: false;
  continuity_note: string;
}

// WHAT: GET /api/v1/otzar/conversations/:id success response.
export interface ConversationDetailResponse {
  ok: true;
  conversation: ConversationDetail;
}

// ════════════════════════════════════════════════════════════════
// Section 5 Agent Playground — Wave 4 / 5 / 6 / 7 / 8 / 9
// Type mirrors of Foundation success interfaces consumed by the
// `/agent-playground` cockpit per ADR-0077. Closed-vocab unions
// preserved verbatim from Foundation's public service interfaces;
// never reshape divergently. Bidirectional citations: ADR-0072
// (Wave 5 candidates), ADR-0073 (Wave 6 outcome comparison),
// ADR-0074 (Wave 7 best-path), ADR-0075 (Wave 8 governed
// transition), ADR-0076 (Wave 9 multi-agent simulation),
// ADR-0077 (Wave 10 Control Tower consumer contract).
// ════════════════════════════════════════════════════════════════

// ─── Wave 4: PlaygroundScenario ───────────────────────────────────

export type PlaygroundScenarioStatus =
  | "DRAFT"
  | "READY"
  | "IN_REVIEW"
  | "ARCHIVED";

export interface PlaygroundScenario {
  scenario_id: string;
  owner_entity_id: string;
  org_entity_id: string | null;
  title: string;
  description: string | null;
  goal_summary: string | null;
  status: PlaygroundScenarioStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateScenarioInput {
  title: string;
  description?: string;
  goal_summary?: string;
  status?: PlaygroundScenarioStatus;
}

export interface UpdateScenarioInput {
  title?: string;
  description?: string;
  goal_summary?: string;
  status?: PlaygroundScenarioStatus;
}

export interface CreateScenarioSuccess {
  ok: true;
  scenario: PlaygroundScenario;
  audit_event_id: string;
}

export interface ListScenariosSuccess {
  ok: true;
  scenarios: readonly PlaygroundScenario[];
}

export interface GetScenarioSuccess {
  ok: true;
  scenario: PlaygroundScenario;
}

export interface UpdateScenarioSuccess {
  ok: true;
  scenario: PlaygroundScenario;
  audit_event_id: string;
}

export interface ArchiveScenarioSuccess {
  ok: true;
  scenario: PlaygroundScenario;
  audit_event_id: string;
}

// ─── Wave 5: PlaygroundCandidateView ──────────────────────────────

export type PlaygroundCandidateType =
  | "STATUS_QUO"
  | "LOW_RISK_INCREMENTAL"
  | "SPEED_OPTIMIZED"
  | "COST_OPTIMIZED"
  | "COMPLIANCE_FIRST"
  | "CUSTOMER_IMPACT_FIRST"
  | "OPERATIONAL_RESILIENCE"
  | "HUMAN_REVIEW_REQUIRED"
  | "DO_NOT_PROCEED";

export type PlaygroundConfidenceLabel =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INSUFFICIENT_DATA";

export type PlaygroundGovernanceFinding =
  | "POLICY_REVIEW_REQUIRED"
  | "DUAL_CONTROL_REQUIRED"
  | "COMPLIANCE_REVIEW_RECOMMENDED"
  | "LEGAL_REVIEW_RECOMMENDED"
  | "HUMAN_REVIEW_REQUIRED"
  | "PRIVILEGED_ENDPOINT"
  | "ESCALATION_LIKELY"
  | "BREAK_GLASS_INVOCATION_BLOCKED_AT_PLAYGROUND"
  | "CROSS_ORG_BOUNDARY_BLOCKED"
  | "AI_AGENT_CEILING_ENGAGED"
  | "NO_NOTABLE_FINDING";

export type PlaygroundTransitionHint =
  | "NO_ACTION"
  | "MAY_PROPOSE_ACTION_LATER"
  | "REQUIRES_APPROVAL_CHAIN"
  | "REQUIRES_POLICY_REVIEW"
  | "REQUIRES_CONNECTOR_CAPABILITY"
  | "REQUIRES_HUMAN_DECISION"
  | "BLOCKED";

export interface PlaygroundCandidateView {
  candidate_key: string;
  candidate_type: PlaygroundCandidateType;
  candidate_title: string;
  candidate_summary: string;
  assumptions: readonly string[];
  required_inputs: readonly string[];
  expected_benefits: readonly string[];
  known_risks: readonly string[];
  dependencies: readonly string[];
  governance_findings: readonly PlaygroundGovernanceFinding[];
  required_approvals: readonly string[];
  evidence_refs: readonly string[];
  blocked_by_policy: boolean;
  action_runtime_transition_hint: PlaygroundTransitionHint;
  confidence_label: PlaygroundConfidenceLabel;
  honest_note: string;
}

export interface GenerateCandidatesInput {
  candidate_types?: readonly PlaygroundCandidateType[];
  max_candidates?: number;
  generation_mode?: "DETERMINISTIC_TEMPLATE";
}

export interface GenerateCandidatesSuccess {
  ok: true;
  scenario_id: string;
  candidates: readonly PlaygroundCandidateView[];
  generated_at: string;
  audit_event_id: string;
}

// ─── Wave 6: PlaygroundOutcomeComparison ──────────────────────────

export type PlaygroundComparisonMode =
  | "DETERMINISTIC_RUBRIC"
  | "CANDIDATE_FIELD_PROJECTION";

export type PlaygroundOutcomeDimension =
  | "GOVERNANCE_ALIGNMENT"
  | "POLICY_REVIEW_BURDEN"
  | "LEGAL_COMPLIANCE_REVIEW_NEED"
  | "EXECUTION_COMPLEXITY"
  | "OPERATIONAL_RISK"
  | "RESILIENCE_IMPACT"
  | "REVERSIBILITY"
  | "CUSTOMER_IMPACT"
  | "TIMING_TO_VALUE"
  | "COST_PROFILE"
  | "DATA_SCOPE_READINESS"
  | "CONNECTOR_READINESS";

export type PlaygroundDimensionRating =
  | "FAVORABLE"
  | "MIXED"
  | "UNFAVORABLE"
  | "INSUFFICIENT_DATA";

export interface PlaygroundDimensionEntry {
  dimension: PlaygroundOutcomeDimension;
  rating: PlaygroundDimensionRating;
}

export type PlaygroundRiskFinding =
  | "POLICY_VIOLATION_POSSIBLE"
  | "COMPLIANCE_GAP_POSSIBLE"
  | "LEGAL_EXPOSURE_POSSIBLE"
  | "DATA_SCOPE_AMBIGUITY"
  | "CROSS_ORG_LEAK_POSSIBLE"
  | "CONNECTOR_RELIABILITY_RISK"
  | "OPERATIONAL_OUTAGE_RISK"
  | "REVERSIBILITY_RISK"
  | "ESCALATION_LIKELY"
  | "HUMAN_REVIEWER_UNAVAILABLE"
  | "INSUFFICIENT_DATA_RISK"
  | "NO_NOTABLE_RISK";

export type PlaygroundDependencyFinding =
  | "POLICY_APPROVAL_REQUIRED"
  | "DUAL_CONTROL_APPROVER_REQUIRED"
  | "BREAK_GLASS_GRANT_REQUIRED"
  | "CONNECTOR_CAPABILITY_REQUIRED"
  | "MEMBERSHIP_GRANT_REQUIRED"
  | "DATA_RETENTION_GRANT_REQUIRED"
  | "REGULATOR_LAWFUL_BASIS_REQUIRED"
  | "JURISDICTIONAL_SCOPE_CHECK_REQUIRED"
  | "EXTERNAL_TEAM_HANDOFF_REQUIRED"
  | "ANALYTICS_AGGREGATE_AVAILABILITY_REQUIRED"
  | "AUDIT_TRAIL_CAPACITY_VERIFIED"
  | "NO_BLOCKING_DEPENDENCY_IDENTIFIED";

export type PlaygroundRequiredReview =
  | "POLICY_OWNER_REVIEW"
  | "DUAL_CONTROL_REVIEW"
  | "COMPLIANCE_REVIEW"
  | "LEGAL_REVIEW"
  | "HUMAN_OWNER_REVIEW"
  | "CONNECTOR_ADMIN_REVIEW"
  | "ESCALATION_REVIEW"
  | "REGULATOR_REVIEW"
  | "NO_ADDITIONAL_REVIEW_IDENTIFIED";

export interface PlaygroundComparisonMatrixItem {
  candidate_key: string;
  candidate_type: PlaygroundCandidateType;
  candidate_title: string;
  comparison_summary: string;
  outcome_dimensions: readonly PlaygroundDimensionEntry[];
  risk_findings: readonly PlaygroundRiskFinding[];
  dependency_findings: readonly PlaygroundDependencyFinding[];
  required_reviews: readonly PlaygroundRequiredReview[];
  governance_findings: readonly PlaygroundGovernanceFinding[];
  blocked_by_policy: boolean;
  action_runtime_transition_hint: PlaygroundTransitionHint;
  confidence_label: PlaygroundConfidenceLabel;
  honest_note: string;
}

export interface PlaygroundTradeoffSummary {
  fewest_blocking_findings: readonly string[];
  strongest_governance_alignment: readonly string[];
  lowest_review_burden: readonly string[];
  strongest_resilience: readonly string[];
}

export interface CompareOutcomesInput {
  candidate_types?: readonly PlaygroundCandidateType[];
  max_candidates?: number;
  comparison_mode?: PlaygroundComparisonMode;
}

export interface CompareOutcomesSuccess {
  ok: true;
  scenario_id: string;
  compared_at: string;
  comparison_mode: PlaygroundComparisonMode;
  candidate_count: number;
  comparison_matrix: readonly PlaygroundComparisonMatrixItem[];
  tradeoff_summary: PlaygroundTradeoffSummary;
  blocked_candidates_count: number;
  review_required_count: number;
  honest_note: string;
  audit_event_id: string;
}

// ─── Wave 7: PlaygroundBestPathRecommendation ─────────────────────

export type PlaygroundRecommendationMode =
  | "DETERMINISTIC_POLICY_FIRST"
  | "DETERMINISTIC_GOVERNANCE_FIRST"
  | "DETERMINISTIC_RESILIENCE_FIRST"
  | "DETERMINISTIC_HUMAN_REVIEW_FIRST";

export type PlaygroundRecommendationReason =
  | "FEWEST_BLOCKING_FINDINGS"
  | "STRONGEST_GOVERNANCE_ALIGNMENT"
  | "LOWEST_REVIEW_BURDEN"
  | "STRONGEST_RESILIENCE_POSTURE"
  | "LOWEST_EXECUTION_COMPLEXITY"
  | "HIGHEST_DATA_SCOPE_READINESS"
  | "HIGHEST_CONNECTOR_READINESS"
  | "CLEAREST_HUMAN_REVIEW_PATH"
  | "SAFEST_INCREMENTAL_PATH"
  | "DO_NOT_PROCEED_SELECTED_FOR_SAFETY"
  | "INSUFFICIENT_DATA_RECOMMENDS_HUMAN_REVIEW";

export type PlaygroundActionTransitionReadiness =
  | "NOT_READY"
  | "MAY_PROPOSE_ACTION_LATER"
  | "REQUIRES_HUMAN_DECISION"
  | "REQUIRES_POLICY_REVIEW"
  | "REQUIRES_APPROVAL_CHAIN"
  | "REQUIRES_LEGAL_OR_COMPLIANCE_REVIEW"
  | "REQUIRES_CONNECTOR_CAPABILITY"
  | "BLOCKED";

export type PlaygroundReasonNotRecommended =
  | "MORE_BLOCKING_FINDINGS"
  | "MORE_REQUIRED_REVIEWS"
  | "LOWER_GOVERNANCE_ALIGNMENT"
  | "HIGHER_OPERATIONAL_RISK"
  | "LOWER_DATA_SCOPE_READINESS"
  | "LOWER_CONNECTOR_READINESS"
  | "LESS_RESILIENT"
  | "LESS_REVERSIBLE"
  | "INSUFFICIENT_DATA"
  | "NOT_SELECTED_THIS_ROUND";

export interface PlaygroundAlternativeConsidered {
  candidate_key: string;
  candidate_type: PlaygroundCandidateType;
  candidate_title: string;
  reason_not_recommended: PlaygroundReasonNotRecommended;
  blocking_findings: readonly (
    | PlaygroundRiskFinding
    | PlaygroundDependencyFinding
  )[];
  review_findings: readonly PlaygroundRequiredReview[];
  confidence_label: PlaygroundConfidenceLabel;
}

export interface RecommendBestPathInput {
  candidate_types?: readonly PlaygroundCandidateType[];
  max_candidates?: number;
  comparison_mode?: PlaygroundComparisonMode;
  recommendation_mode?: PlaygroundRecommendationMode;
}

// ════════════════════════════════════════════════════════════════
// ADR-0078 Stage 2 — approved-source projection of safe
// conversation_context_signals[] (Foundation PR #157 `45c0de6`
// 2026-06-01). The sidecar lives on Wave 7
// RecommendBestPathSuccess top-level (per ADR-0078 §8) and on
// Wave 9 PlaygroundEnterpriseDecisionPosture (per ADR-0078 §9
// — scenario-wide single sidecar; NOT per-branch — preserves
// ADR-0076 §11 budgets). related_transcript_ref is OMITTED at
// Stage 2 (no Layer 1 ingest yet). Bounded ≤ 8 per ADR-0078
// §8 line 1129. Every emitted signal carries the 15 §2 base
// fields + 8 §6C.12 additive fields exhaustively. ADR-0079 §27
// enforcement applied by construction at the Foundation
// projection service register — NON_WORK_PERSONAL /
// SENSITIVE_PERSONAL / UNKNOWN_REQUIRES_REVIEW /
// UNKNOWN_BUSINESS_PURPOSE / BLOCKED_FROM_AGENT_PLAYGROUND /
// REQUIRES_HUMAN_REVIEW can never appear on the wire.
// ════════════════════════════════════════════════════════════════

// ADR-0078 §3.1 signal_type (17 closed-vocab values).
export type ConversationContextSignalType =
  | "PRIOR_COMMITMENT_IDENTIFIED"
  | "STAKEHOLDER_CONCERN_IDENTIFIED"
  | "APPROVAL_DEPENDENCY_IDENTIFIED"
  | "CONFLICTING_DIRECTION_IDENTIFIED"
  | "MISSING_STAKEHOLDER_INPUT"
  | "MEETING_CONTEXT_SUPPORTS_PATH"
  | "HUMAN_OBJECTION_REQUIRES_REVIEW"
  | "DECISION_OWNER_UNCLEAR"
  | "ACTION_ITEM_DEPENDENCY_IDENTIFIED"
  | "RISK_RAISED_BY_STAKEHOLDER"
  | "DEADLINE_OR_TIMING_CONSTRAINT_IDENTIFIED"
  | "CUSTOMER_OR_CLIENT_IMPACT_RAISED"
  | "POLICY_OR_COMPLIANCE_CONCERN_RAISED"
  | "SECURITY_OR_DATA_SCOPE_CONCERN_RAISED"
  | "PRIOR_DECISION_REFERENCED"
  | "UNRESOLVED_QUESTION_IDENTIFIED"
  | "CONTEXT_INSUFFICIENT_FOR_RECOMMENDATION";

// ADR-0078 §3.2 signal_confidence_label (4 values).
export type SignalConfidenceLabel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "INSUFFICIENT_DATA";

// ADR-0078 §3.3 signal_source_type (8 values; only 4 LIVE at
// Stage 2 — CORRECTION_SIGNAL / ACTION_HISTORY / HIVE_CONTEXT
// preserved-enum-zero-output / MANUAL_USER_INPUT).
export type SignalSourceType =
  | "MEETING_SUMMARY"
  | "APPROVED_NOTE"
  | "GOVERNED_LISTENER_OUTPUT"
  | "CORRECTION_SIGNAL"
  | "ACTION_HISTORY"
  | "HIVE_CONTEXT"
  | "MANUAL_USER_INPUT"
  | "IMPORTED_APPROVED_RECORD";

// ADR-0078 §3.4 signal_scope (6 values).
export type SignalScope =
  | "SELF_ONLY"
  | "SAME_ORG"
  | "HIVE_SCOPED"
  | "PROJECT_SCOPED"
  | "ACTION_SCOPED"
  | "COMPLIANCE_REVIEW_SCOPED";

// ADR-0078 §3.6 evidence_label (13 values).
export type EvidenceLabel =
  | "HUMAN_COMMITMENT"
  | "HUMAN_CONCERN"
  | "HUMAN_OBJECTION"
  | "APPROVAL_NEED"
  | "MISSING_CONTEXT"
  | "PRIOR_DECISION"
  | "TIMING_CONSTRAINT"
  | "CUSTOMER_IMPACT"
  | "POLICY_CONCERN"
  | "SECURITY_CONCERN"
  | "DATA_SCOPE_CONCERN"
  | "CONFLICTING_CONTEXT"
  | "INSUFFICIENT_CONTEXT";

// ADR-0078 §3.7 retention_class (5 values).
export type RetentionClass =
  | "EPHEMERAL_REVIEW_ONLY"
  | "SCENARIO_CONTEXT_RETAINED"
  | "ACTION_CONTEXT_RETAINED"
  | "AUDIT_SAFE_METADATA_ONLY"
  | "DEPERSONALIZED_IMPROVEMENT_SIGNAL";

// ADR-0078 §6C.6 business_purpose_label (11 values).
// UNKNOWN_BUSINESS_PURPOSE never appears on the wire (filtered
// by Foundation projection service per ADR-0079 §27); CT MUST
// still type-permit it so the closed-vocab projection stays
// stable across the wire.
export type BusinessPurposeLabel =
  | "PROJECT_CONTEXT"
  | "CLIENT_OR_CUSTOMER_WORK"
  | "ACTION_RELATED"
  | "APPROVAL_RELATED"
  | "COMPLIANCE_REVIEW"
  | "LEGAL_HOLD"
  | "INCIDENT_REVIEW"
  | "HIVE_OR_TEAM_COORDINATION"
  | "SALES_OR_ACCOUNT_WORK"
  | "SUPPORT_CASE"
  | "UNKNOWN_BUSINESS_PURPOSE";

// ADR-0078 §6C.9.a conversation_relevance_class (5 values).
// NON_WORK_PERSONAL / SENSITIVE_PERSONAL / UNKNOWN_REQUIRES_REVIEW
// can never appear on the wire (filtered by Foundation per
// ADR-0079 §27); type-permitted for vocab stability.
export type ConversationRelevanceClass =
  | "WORK_RELEVANT"
  | "MIXED_WORK_PERSONAL"
  | "NON_WORK_PERSONAL"
  | "SENSITIVE_PERSONAL"
  | "UNKNOWN_REQUIRES_REVIEW";

// ADR-0078 §6C.9.b capture_eligibility (7 values).
export type CaptureEligibility =
  | "CAPTURE_ALLOWED"
  | "CAPTURE_ALLOWED_WITH_REDACTION"
  | "CAPTURE_BLOCKED_PERSONAL"
  | "CAPTURE_BLOCKED_POLICY"
  | "CAPTURE_BLOCKED_NO_BUSINESS_PURPOSE"
  | "CAPTURE_REQUIRES_REVIEW"
  | "CAPTURE_REQUIRED_BY_LEGAL_HOLD";

// ADR-0078 §6C.9.c agent_playground_use (5 values).
// BLOCKED_FROM_AGENT_PLAYGROUND / REQUIRES_HUMAN_REVIEW /
// LEGAL_COMPLIANCE_ONLY can never appear on the wire at Stage 2;
// type-permitted for vocab stability.
export type AgentPlaygroundUse =
  | "ALLOWED_FOR_SIGNALS"
  | "ALLOWED_AFTER_REDACTION"
  | "BLOCKED_FROM_AGENT_PLAYGROUND"
  | "REQUIRES_HUMAN_REVIEW"
  | "LEGAL_COMPLIANCE_ONLY";

// ADR-0078 §6C.10 scope_binding_type (9 values; MUST never be
// null at the wire per ADR-0079 §27).
export type ScopeBindingType =
  | "SCENARIO_SCOPED"
  | "PROJECT_SCOPED"
  | "MATTER_SCOPED"
  | "CLIENT_SCOPED"
  | "ACTION_SCOPED"
  | "HIVE_SCOPED"
  | "ORG_SCOPED"
  | "LEGAL_HOLD_SCOPED"
  | "COMPLIANCE_REVIEW_SCOPED";

// ADR-0078 §2 + §6C.12 — canonical Stage 2 signal shape. 15
// base + 8 additive = 23 fields. related_transcript_ref OMITTED
// at Stage 2 per §7 line 1088 (no Layer 1 ingest yet).
export interface ConversationContextSignal {
  readonly signal_type: ConversationContextSignalType;
  readonly signal_confidence_label: SignalConfidenceLabel;
  readonly signal_source_type: SignalSourceType;
  readonly signal_scope: SignalScope;
  readonly related_scenario_id?: string;
  readonly related_candidate_key?: string;
  readonly related_branch_id?: string;
  readonly related_action_id?: string;
  readonly detected_at: string;
  readonly evidence_label: EvidenceLabel;
  readonly safe_summary: string;
  readonly requires_human_review: boolean;
  readonly retention_class: RetentionClass;
  readonly honest_note: string;
  readonly conversation_relevance_class: ConversationRelevanceClass;
  readonly capture_eligibility: CaptureEligibility;
  readonly agent_playground_use: AgentPlaygroundUse;
  readonly redaction_applied: boolean;
  readonly business_purpose_label: BusinessPurposeLabel;
  readonly scope_binding_type: ScopeBindingType;
  readonly review_required: boolean;
  readonly personal_content_suppressed: boolean;
}

export interface RecommendBestPathSuccess {
  ok: true;
  scenario_id: string;
  recommended_at: string;
  recommendation_mode: PlaygroundRecommendationMode;
  recommended_candidate_key: string;
  recommended_candidate_type: PlaygroundCandidateType;
  recommended_candidate_title: string;
  recommendation_summary: string;
  recommendation_reasons: readonly PlaygroundRecommendationReason[];
  evidence_refs: readonly string[];
  governance_findings: readonly PlaygroundGovernanceFinding[];
  required_reviews: readonly PlaygroundRequiredReview[];
  risk_findings: readonly PlaygroundRiskFinding[];
  dependency_findings: readonly PlaygroundDependencyFinding[];
  blocked_by_policy: boolean;
  action_runtime_transition_hint: PlaygroundTransitionHint;
  action_transition_readiness: PlaygroundActionTransitionReadiness;
  alternatives_considered: readonly PlaygroundAlternativeConsidered[];
  not_recommended_reasons: readonly PlaygroundReasonNotRecommended[];
  confidence_label: PlaygroundConfidenceLabel;
  human_decision_required: boolean;
  honest_note: string;
  audit_event_id: string;
  // ADR-0078 Stage 2 additive sidecar (Foundation PR #157
  // `45c0de6` 2026-06-01). Always present; empty array when no
  // approved-source signals exist; bounded ≤ 8.
  conversation_context_signals: readonly ConversationContextSignal[];
}

// ─── Wave 8: PlaygroundGovernedTransition ─────────────────────────

export type PlaygroundTransitionOutcome =
  | "ACTION_PROPOSED"
  | "NO_ACTION_PROPOSED";

export type PlaygroundReasonNotProposed =
  | "STATUS_QUO_NOT_TRANSITIONABLE"
  | "DO_NOT_PROCEED_BLOCKED"
  | "BLOCKED_BY_POLICY_OR_GOVERNANCE"
  | "BLOCKED_BY_ACTION_RUNTIME_TRANSITION_HINT";

export interface ProposeGovernedTransitionInput {
  caller_confirmation: true;
  idempotency_key: string;
  intended_action_type?: "SEND_INTERNAL_NOTIFICATION";
  candidate_types?: readonly PlaygroundCandidateType[];
  max_candidates?: number;
  comparison_mode?: PlaygroundComparisonMode;
  recommendation_mode?: PlaygroundRecommendationMode;
}

export interface ProposeGovernedTransitionSuccess {
  ok: true;
  scenario_id: string;
  transitioned_at: string;
  transition_outcome: PlaygroundTransitionOutcome;
  recommended_candidate_key: string;
  recommended_candidate_type: PlaygroundCandidateType;
  recommendation_summary: string;
  action_id?: string;
  action_status?: string;
  action_type?: string;
  action_risk_tier?: string;
  action_decision?: string;
  escalation_id?: string | null;
  reason_not_proposed?: PlaygroundReasonNotProposed;
  required_approvals: readonly string[];
  required_reviews: readonly string[];
  human_decision_required: boolean;
  honest_note: string;
  playground_audit_event_id: string;
  action_audit_event_id?: string;
}

// ─── Wave 9: PlaygroundSimulation ─────────────────────────────────

export type PlaygroundOrchestrationMode =
  | "DETERMINISTIC_BRANCH_ENUMERATION"
  | "DETERMINISTIC_CONSTRAINT_VARIATION"
  | "DETERMINISTIC_GOVERNANCE_SCOPE_VARIATION";

// vNext closed vocab per ADR-0076 §4.2 + §5.2 Amendment 1.
// LIVE in Foundation Wave 9 since PR #152 `7593e6f`
// 2026-05-31 under
// `[FOUNDER-SECTION-5-WAVE-9-VNEXT-IMPLEMENTATION-AUTH]`.
// v1 vocab (BASELINE / POLICY_FIRST_BRANCH /
// OPERATIONS_AGENT / etc.) was the LIVE runtime through PR
// #151 `401fdee` and is now retired by clean replacement.
export type PlaygroundBranchDefinition =
  | "RECOMMENDED_PATH"
  | "LOW_RISK_PATH"
  | "COMPLIANCE_FIRST_PATH"
  | "RESILIENCE_FIRST_PATH"
  | "HUMAN_REVIEW_PATH"
  | "DO_NOT_PROCEED_PATH";

export type PlaygroundAgentRole =
  | "OWNER_OPERATOR"
  | "POLICY_REVIEWER"
  | "COMPLIANCE_REVIEWER"
  | "SECURITY_REVIEWER"
  | "DATA_GOVERNANCE_REVIEWER"
  | "CONNECTOR_ADMIN"
  | "ACTION_APPROVER"
  | "CUSTOMER_OR_STAKEHOLDER_ADVOCATE"
  | "OPERATIONS_LEAD"
  | "RESILIENCE_REVIEWER";

export type PlaygroundAssumedConstraint =
  | "OWNER_COSMP_SCOPE_ONLY"
  | "SAME_ORG_ONLY"
  | "NO_EXTERNAL_PROVIDERS"
  | "NO_CONNECTOR_INVOCATION"
  | "NO_RAW_MEMORY_ACCESS"
  | "NO_AUTONOMOUS_EXECUTION"
  | "WAVE_8_TRANSITION_REQUIRED_BEFORE_ACTION"
  | "HUMAN_REVIEW_BEFORE_FINAL_DECISION"
  | "LEGAL_COMPLIANCE_REVIEW_WHERE_APPLICABLE"
  | "BLOCKED_CANDIDATES_NEVER_TRANSITIONABLE";

export type PlaygroundExpectedOutcome =
  | "WAVE_7_RECOMMENDATION_PRODUCED"
  | "WAVE_7_RECOMMENDATION_BLOCKED"
  | "WAVE_7_RECOMMENDATION_REQUIRES_HUMAN_DECISION"
  | "WAVE_8_TRANSITION_POSSIBLE_AFTER_REVIEW"
  | "WAVE_8_TRANSITION_DECLINED_BY_POLICY"
  | "INSUFFICIENT_DATA_REQUIRES_REVIEW"
  | "COMPLIANCE_REVIEW_RECOMMENDED"
  | "OPERATIONAL_RESILIENCE_FAVORABLE";

export type PlaygroundGovernanceConflict =
  | "BRANCH_RECOMMENDS_DIFFERENT_CANDIDATE_TYPE"
  | "BRANCH_BLOCKED_BY_POLICY"
  | "BRANCH_REQUIRES_DUAL_CONTROL"
  | "BRANCH_REQUIRES_LEGAL_REVIEW"
  | "BRANCH_REQUIRES_COMPLIANCE_REVIEW"
  | "BRANCH_INSUFFICIENT_DATA"
  | "BRANCH_HUMAN_DECISION_REQUIRED"
  | "BRANCH_ACTION_RUNTIME_REQUIRED"
  | "BRANCH_NO_TRANSITION_POSSIBLE"
  | "NO_NOTABLE_CONFLICT";

export type PlaygroundUnresolvedQuestion =
  | "WHICH_CANDIDATE_TYPE_TO_RECOMMEND"
  | "WHETHER_TO_PROCEED_GIVEN_INSUFFICIENT_DATA"
  | "WHETHER_GOVERNANCE_REVIEW_IS_SUFFICIENT"
  | "WHETHER_LEGAL_REVIEW_IS_REQUIRED"
  | "WHETHER_DUAL_CONTROL_IS_REQUIRED"
  | "WHETHER_TO_BLOCK_OR_PROCEED"
  | "WHETHER_HUMAN_REVIEWER_IS_AVAILABLE"
  | "NO_UNRESOLVED_QUESTIONS_IDENTIFIED";

export type PlaygroundNextReviewLabel =
  | "HUMAN_GOVERNANCE_REVIEW"
  | "POLICY_OWNER_REVIEW"
  | "COMPLIANCE_REVIEW"
  | "LEGAL_REVIEW"
  | "OPERATIONAL_RESILIENCE_REVIEW"
  | "DATA_GOVERNANCE_REVIEW"
  | "RERUN_WITH_DIFFERENT_RECOMMENDATION_MODE"
  | "NO_FURTHER_REVIEW_IDENTIFIED";

export type PlaygroundEvidencePosture =
  | "HIERARCHY_SUPPORTS_PATH"
  | "POLICY_SUPPORTS_PATH"
  | "PRIOR_ACTION_HISTORY_SUPPORTS_PATH"
  | "CONVERSATION_CONTEXT_SUPPORTS_PATH"
  | "ANALYTICS_SUPPORTS_PATH"
  | "CONNECTOR_READINESS_SUPPORTS_PATH"
  | "AUDIT_HISTORY_SUPPORTS_PATH"
  | "COMPLIANCE_REVIEW_REQUIRED"
  | "LEGAL_REVIEW_REQUIRED"
  | "INSUFFICIENT_CONTEXT"
  | "CONFLICTING_SIGNALS"
  | "AUTHORITY_CHAIN_UNCLEAR";

export type PlaygroundBlockerBeforeAction =
  | "POLICY_BLOCKS_ACTION"
  | "MISSING_COMPLIANCE_REVIEW"
  | "MISSING_LEGAL_REVIEW"
  | "MISSING_DUAL_CONTROL_APPROVAL"
  | "MISSING_HUMAN_DECISION"
  | "INSUFFICIENT_DATA"
  | "CONNECTOR_UNAVAILABLE"
  | "AUTHORITY_CHAIN_UNCLEAR"
  | "NO_TRANSITION_POSSIBLE"
  | "NO_KNOWN_BLOCKER";

export type PlaygroundSafeNextStep =
  | "PROCEED_TO_HUMAN_REVIEW"
  | "REQUEST_MISSING_CONTEXT"
  | "REQUEST_APPROVAL_CHAIN"
  | "REQUEST_COMPLIANCE_REVIEW"
  | "REQUEST_LEGAL_REVIEW"
  | "PROPOSE_GOVERNED_ACTION"
  | "DO_NOT_PROCEED";

export interface PlaygroundSimulationBranch {
  branch_id: string;
  branch_definition: PlaygroundBranchDefinition;
  agent_role: PlaygroundAgentRole;
  assumed_constraints: readonly PlaygroundAssumedConstraint[];
  expected_outcomes: readonly PlaygroundExpectedOutcome[];
  governance_conflicts: readonly PlaygroundGovernanceConflict[];
  branch_summary: string;
  branch_recommended_candidate_key: string;
  branch_recommended_candidate_type: PlaygroundCandidateType;
  confidence_label: PlaygroundConfidenceLabel;
}

export interface PlaygroundConvergenceSummary {
  candidate_keys_agreed_upon: readonly string[];
  governance_findings_all_branches_share: readonly PlaygroundGovernanceFinding[];
  required_reviews_all_branches_share: readonly PlaygroundRequiredReview[];
}

export interface PlaygroundDisagreementSummary {
  candidate_types_diverged: readonly PlaygroundCandidateType[];
  recommendation_modes_diverged: readonly PlaygroundRecommendationMode[];
  unresolved_branches: readonly string[];
}

export interface PlaygroundRecommendedNextReview {
  next_review_label: PlaygroundNextReviewLabel;
  rationale_summary: string;
  applies_to_branch_ids: readonly string[];
}

export interface PlaygroundEnterpriseDecisionPosture {
  primary_recommended_branch_id: string;
  primary_recommendation_reasons: readonly PlaygroundRecommendationReason[];
  viable_alternative_branch_ids: readonly string[];
  evidence_posture: readonly PlaygroundEvidencePosture[];
  blockers_before_action: readonly PlaygroundBlockerBeforeAction[];
  safe_next_step: PlaygroundSafeNextStep;
  // ADR-0078 Stage 2 additive sidecar attached at the scenario-
  // wide EnterpriseDecisionPosture per §9 (NOT per-branch —
  // preserves ADR-0076 §11 budgets). Foundation PR #157.
  // Always present; empty array when no approved-source signals
  // exist; bounded ≤ 8.
  conversation_context_signals: readonly ConversationContextSignal[];
}

export interface SimulateInput {
  caller_confirmation: true;
  orchestration_mode?: PlaygroundOrchestrationMode;
  branch_definitions?: readonly PlaygroundBranchDefinition[];
  agent_roles?: readonly PlaygroundAgentRole[];
  candidate_types?: readonly PlaygroundCandidateType[];
  max_branches?: number;
  comparison_mode?: PlaygroundComparisonMode;
  recommendation_mode?: PlaygroundRecommendationMode;
}

export interface SimulationSuccess {
  ok: true;
  scenario_id: string;
  simulated_at: string;
  orchestration_mode: PlaygroundOrchestrationMode;
  branch_count: number;
  branches: readonly PlaygroundSimulationBranch[];
  convergence_summary: PlaygroundConvergenceSummary;
  disagreement_summary: PlaygroundDisagreementSummary;
  unresolved_questions: readonly PlaygroundUnresolvedQuestion[];
  recommended_next_review: PlaygroundRecommendedNextReview;
  enterprise_decision_posture: PlaygroundEnterpriseDecisionPosture;
  human_decision_required: boolean;
  honest_note: string;
  simulation_audit_event_id: string;
}

// ════════════════════════════════════════════════════════════════
// Section 2 Action Runtime — read surface for Wave 10 Agent
// Playground cockpit lifecycle integration per ADR-0057 §9 +
// §10. Foundation route GET /api/v1/actions/:id is LIVE; this
// type mirror reflects its public response shape verbatim.
// SafeActionView per §10 allowlist; SafeActionDetailView adds
// attempt_count + last_result_summary aggregates. Forbidden
// fields (payload_summary / payload_redacted / policy_envelope
// / policy_envelope_hash / source_entity_id / org_entity_id /
// target_entity_id / deleted_at / raw errors / stack traces)
// NEVER appear and MUST NEVER be added to this mirror.
// ════════════════════════════════════════════════════════════════

// WHAT: Section 2 Action lifecycle status enum mirror.
// INPUT: Used as a return type narrowing source.
// OUTPUT: None.
// WHY: Closed-vocab union from Foundation Prisma's ActionStatus.
//      Mirror verbatim per ADR-0057 §9.
export type ActionStatus =
  | "PROPOSED"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT"
  | "EXPIRED";

// WHAT: SAFE Action view returned by Foundation per ADR-0057
//        §10 allowlist.
// INPUT: Used as a return type at api.actions.getAction.
// OUTPUT: None.
// WHY: Constructed-by-allowlist at Foundation; this mirror
//      preserves the contract at the type level so callers
//      cannot reach into forbidden fields.
export interface SafeActionView {
  action_id: string;
  status: ActionStatus;
  action_type: string;
  risk_tier: string;
  requires_approval: boolean;
  escalation_id?: string;
  decision_reason?: string;
  created_at: string;
  updated_at: string;
}

// WHAT: SAFE Action detail view returned by GET
//        /api/v1/actions/:id per ADR-0057 §9. Extends
//        SafeActionView with read-side aggregates.
export interface SafeActionDetailView extends SafeActionView {
  attempt_count: number;
  last_result_summary: string | null;
}

// WHAT: GET /api/v1/actions/:id success response.
// INPUT: Used as a return type at api.actions.getAction.
// OUTPUT: None.
// WHY: Mirrors the route handler's exact response body shape
//      at apps/api/src/routes/actions.routes.ts.
export interface ActionDetailResponse {
  ok: true;
  action: SafeActionDetailView;
}
