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
export interface ConversationMessageResponse {
  ok: true;
  response: string;
  context_used: number;
  tokens_consumed: number;
  conversation_id: string;
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
export interface CorrectionRequest {
  incorrect_description: string;
  correct_behavior: string;
  target_capsule_id?: string;
}

// WHAT: Success response from POST /api/v1/otzar/correction.
export interface CorrectionResponse {
  ok: true;
  correction_capsule_id: string;
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
