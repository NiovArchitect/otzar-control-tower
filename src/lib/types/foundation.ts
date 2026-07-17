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

// WHAT: [SECTION-16] GET /auth/me success shape — the boot-time session restore.
// Returns the still-valid access token (for CT's in-memory store), the session
// scope, the safe identity shell, and capabilities freshly gated by the live TAR
// (a TAR change would have invalidated the session, so this is never stale).
export interface MeResponse {
  ok: true;
  token: string;
  session_id: string;
  entity: { email: string };
  allowed_operations: string[];
  clearance_ceiling: number;
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
  | "CONVERSATION_CLOSED"
  // [OTZAR-RETURN-12] summary event for a governed voice-note undo APPLY that
  // actually soft-revoked >= 1 caller-owned capsule (POST .../revoke-apply).
  // Mirrors the Foundation AuditEventType literal; the apply's returned audit_id
  // is this event. Per-capsule soft revokes still audit as CAPSULE_DELETED.
  | "VOICE_NOTE_REVOKE_APPLIED"
  // [P0-ONBOARD] activation-token onboarding lifecycle.
  | "USER_INVITED"
  | "ACTIVATION_LINK_CREATED"
  | "USER_ACTIVATED"
  | "PASSWORD_RESET_LINK_CREATED"
  | "PASSWORD_RESET_COMPLETED"
  // [AIX-2] a human validated seeded background context in-context.
  | "SEEDED_CONTEXT_VALIDATED"
  // [RETENTION] seeded-context lifecycle (retire/restore — never delete).
  | "SEEDED_CONTEXT_RETIRED"
  | "SEEDED_CONTEXT_RESTORED"
  // [ACT-EMAIL] activation-email delivery attempts.
  | "ACTIVATION_EMAIL_SENT"
  | "ACTIVATION_EMAIL_FAILED"
  // [TWIN-BOOTSTRAP] starter-twin guarantee.
  | "STARTER_TWIN_PROVISIONED"
  // [PASSWORD-LIFECYCLE] password lifecycle.
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_EMAIL_SENT"
  | "PASSWORD_RESET_EMAIL_FAILED"
  // [ORG-SUBSTRATE] self work-profile update.
  | "WORK_PROFILE_UPDATED"
  // [BLOCK-3A] admin set a member's domain decision rights (ids +
  // domain lists only; rights grant no tools/permissions/authority).
  | "DECISION_RIGHTS_UPDATED"
  // [SOURCE-INTEGRITY] imported-source lifecycle. Revalidation confirms a
  // snapshot still matches upstream, or demotes it (changed / access-revoked
  // / deleted); a rejected import is quarantined before any trusted row.
  | "SOURCE_VERIFIED"
  | "SOURCE_CHANGED_UPSTREAM"
  | "SOURCE_ACCESS_REVOKED"
  | "SOURCE_DELETED"
  | "IMPORT_QUARANTINED"
  | "IMPORT_FAILED"
  // [ORG-AUTONOMY] real Google Calendar event lifecycle — a create/delete is
  // audited whether it succeeded (real event id) or was gate-blocked.
  | "CALENDAR_EVENT_CREATE"
  | "CALENDAR_EVENT_DELETE";

// [BLOCK-3A] Mirror of Foundation's DecisionDomain vocabulary
// (decision-rights.ts). "unknown" is a classifier bucket and is never
// assignable, so it does not appear here.
export type DecisionDomain =
  | "strategic"
  | "technical"
  | "product"
  | "design"
  | "security"
  | "legal"
  | "finance"
  | "people"
  | "customer"
  | "execution"
  | "architecture"
  | "deadline";

// [BLOCK-3A] A person's domain decision-rights posture. A domain holds
// at most ONE posture per person; absence everywhere = no structured
// rights (Otzar reads decision signals from conversations instead).
export interface DecisionRightsPosture {
  owns: DecisionDomain[];
  can_approve: DecisionDomain[];
  recommend_only: DecisionDomain[];
}

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
  /** [P0-ONBOARD] safe server-derived onboarding state (org admin
   *  projections only) — never exposes credentials or token material. */
  activation_status?: "active" | "activation_pending" | "expired" | "invited";
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
  /** [GAP-G SLICE-1] What the role template RECOMMENDED at provisioning
   *  (the org ceiling decides what applied). Optional: older backends. */
  template_recommended_autonomy?: string | null;
  /** [GAP-G SLICE-1] How autonomy_level was determined at provisioning:
   *  role_template_default | org_ceiling_capped | system_default |
   *  admin_twin. Provenance only — never authority. Optional. */
  autonomy_source?: string | null;
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
  /** [GAP-H] Authoritative owner from the org-scoped membership edge —
   *  null only when the owner is truly missing. Optional: older backends. */
  owner_entity_id?: string | null;
  owner_display_name?: string | null;
  /** [GAP-H OPS] Honest operational truth (optional: older backends).
   *  status is "not_configured" until per-role required tools are modeled —
   *  the backend never fakes "ready". */
  tool_readiness?: {
    status: "ready" | "needs_setup" | "not_configured" | "unknown";
    missing_tools: Array<{ tool_key: string; label: string; setup_url?: string }>;
    connected_tools_count: number;
    required_tools_count: number;
  };
  /** [GAP-H OPS] Canonical activity: "twin" only when provably
   *  twin-attributable (conversations); owner work is labeled separately. */
  recent_activity?: {
    last_active_at: string | null;
    last_activity_label: string | null;
    recent_work_count: number;
    activity_source: "twin" | "owner_work" | "none" | "unknown";
  };
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
//        at audit-view.service.ts:383-387 VERBATIM. RULE 13
//        substrate-honest correction landed at CT D5: the
//        original CT D2.2 mirror had "CHAIN_HASH_MISMATCH"
//        which does not exist on Foundation — actual emitted
//        value is "HASH_MISMATCH" (no CHAIN_ prefix).
export type VerifyChainFailureReason =
  | "HASH_MISMATCH"
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

// ════════════════════════════════════════════════════════════════
// Section 9 — Compliance frameworks + live posture (Foundation
// LIVE per ComplianceService at apps/api/src/services/compliance/
// compliance.service.ts). Read-only at this CT slice.
// ════════════════════════════════════════════════════════════════

// WHAT: One row from `GET /api/v1/compliance/frameworks` — the
//        canonical catalog of compliance frameworks Foundation
//        evaluates. Mirrors `model ComplianceFramework` at
//        packages/database/prisma/schema.prisma:659. `rules` is
//        an opaque Json blob; CT NEVER renders it raw.
export interface ComplianceFramework {
  framework_id: string;
  framework_name: string;
  jurisdiction: readonly string[];
  applicable_entity_sectors: readonly string[];
  applicable_capsule_types: readonly string[];
  required_audit_events: readonly string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// WHAT: Per-framework verdict from `GET /api/v1/compliance/state`.
//        Mirrors Foundation `FrameworkComplianceState` at
//        compliance.service.ts:64. `compliant` flips on the
//        presence of any COMPLIANCE_CHECK_FAILED row within the
//        configured window (default 24h). `since` names the most
//        recent PASSED event; `last_check` is the freshest event
//        of either kind.
export interface FrameworkComplianceState {
  framework_name: string;
  compliant: boolean;
  since: string | null;
  last_check: string | null;
  sample_failure_count_24h: number;
}

// WHAT: Full response from `GET /api/v1/compliance/state`. The
//        posture is ORG-LEVEL per DRIFT 15 (looks up
//        EntityComplianceProfile by org_entity_id, not
//        aggregated across per-member profiles).
export interface ComplianceStateReport {
  org_entity_id: string;
  frameworks: readonly FrameworkComplianceState[];
  evaluated_at: string;
}

export interface ListComplianceFrameworksSuccess {
  ok: true;
  frameworks: readonly ComplianceFramework[];
}

export interface GetComplianceStateSuccess {
  ok: true;
  state: ComplianceStateReport;
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
// Section 7 — audit-events export (Foundation LIVE since
// Hardening Wave A per ADR-0071 §closure). The endpoint streams
// a bounded NDJSON or CSV export of the same SafeAuditEventView
// projection the list endpoint returns. Self-scope only at CT
// Wave 1; org / platform scopes are forward-substrate.
// ════════════════════════════════════════════════════════════════

// WHAT: Closed-vocab export format.
export type AuditExportFormat = "ndjson" | "csv";

// WHAT: Inputs accepted by the export endpoint. All optional;
//        `scope` defaults to `self` server-side; `format`
//        defaults to `ndjson`; `max_rows` is clamped to
//        [1, 10_000] at Foundation per
//        EXPORT_AUDIT_EVENTS_MAX_ROWS.
export interface ExportAuditEventsInput {
  format?: AuditExportFormat;
  scope?: AuditViewScope;
  event_type?: AuditEventType;
  target_entity_id?: string;
  target_capsule_id?: string;
  outcome?: AuditOutcome;
  start_time?: string;
  end_time?: string;
  max_rows?: number;
}

// WHAT: SAFE projection returned by the CT export client. The
//        body is the raw NDJSON / CSV text Foundation streams.
//        Metadata is parsed from the `x-audit-*` response
//        headers — `row_count` is the number of SafeAuditEventView
//        rows in the body, `truncated` indicates whether
//        Foundation hit the max_rows cap.
export interface ExportAuditEventsSuccess {
  format: AuditExportFormat;
  scope: AuditViewScope;
  row_count: number;
  truncated: boolean;
  body: string;
}

// ════════════════════════════════════════════════════════════════
// 12B.1 -- REQUEST / RESPONSE SHAPES
// ════════════════════════════════════════════════════════════════

// WHAT: Body for POST /api/v1/org/members from the FRONTEND
//        caller's perspective. Foundation's actual MemberInput
//        accepts an OPTIONAL password ([P0-ONBOARD]) -- the activation-link
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
  audit_event_id: string;
  /** [P0-ONBOARD] one-time activation token — shown ONCE to the admin as a
   *  copyable link (the controlled-pilot delivery channel until email
   *  ships). Never persisted client-side, never re-displayable. */
  activation_token: string;
  activation_expires_at: string;
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
  /** The caller's org root — distinguishes enrollment edges (parent=org)
   *  from person→person manager edges. */
  org_entity_id: string;
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
// [OTZAR-CONTINUITY C6] Server thread-restoration read shapes. The SERVER is authoritative
// for active conversation, pending request, and canonical result — CT restores from these.
export interface OtzarThreadSummary {
  conversation_id: string;
  twin_entity_id: string;
  status: string;
  timezone: string | null;
  source_type: string;
  started_at: string;
  last_active_at: string | null;
  message_count: number;
  archived: boolean;
  unresolved_count: number;
}

export interface OtzarSafeTurn {
  turn_id: string;
  role: string;
  content: string;
  sequence: number;
  source_channel: string;
  created_at: string;
}

export interface OtzarSafeRequestStatus {
  request_record_id: string;
  conversation_id: string;
  client_request_id: string | null;
  state: string;
  response_class: string | null;
  has_canonical_result: boolean;
  has_action: boolean;
  in_progress: boolean;
  retryable: boolean;
  failure_code: string | null;
  canonical_assistant_turn_id: string | null;
  canonical_text: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface OtzarRestoreThreadsResponse {
  ok: true;
  active: OtzarThreadSummary | null;
  recent: OtzarThreadSummary[];
}

export interface OtzarThreadDetailResponse {
  ok: true;
  thread: OtzarThreadSummary;
  turns: OtzarSafeTurn[];
}

export interface OtzarRequestStatusResponse {
  ok: true;
  status: OtzarSafeRequestStatus;
}

export interface OtzarUnresolvedResponse {
  ok: true;
  unresolved: OtzarSafeRequestStatus[];
}

export interface ConversationMessageRequest {
  message: string;
  conversation_id?: string;
  conversation_history?: string[];
  token_budget?: number;
  // [OTZAR-CONTINUITY P5 Stage 1 §11] Stable per-submission idempotency key. Retained
  // ACROSS retries of the same submission so a response-lost retry replays the durable
  // server result (one USER turn, one canonical assistant turn) instead of duplicating.
  request_id?: string;
  // [OTZAR-CONTINUITY P1/§11] The caller's live IANA timezone (travel-correct temporal
  // grounding). Always sent by the CT request builder.
  client_timezone?: string;
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
  // ────────────────────────────────────────────────────────────
  // Phase EDX-3 / EDX-4 / EDX-6 ConductSession output expansion.
  // All fields below are emitted on every ok=true response.
  // ────────────────────────────────────────────────────────────
  // Closed-vocab next-step label (slice 1).
  next_step: ConductNextStep;
  // Always true at the Foundation tier — POST /api/v1/otzar/correction
  // is live (slice 2).
  correction_capture_available: boolean;
  // TTS / device-speech-friendly projection of the response (slice 3).
  speech_ready_text: string;
  // False at the Foundation tier today; mirrors voice_readiness_state.
  voice_output_supported: boolean;
  // Slice 4 "denial of preconditions" envelope. Always emitted as
  // false at the chat tier until each detection substrate lands.
  clarification_needed: boolean;
  action_proposed: boolean;
  approval_required: boolean;
  policy_blocked: boolean;
  dmw_scope_blocked: boolean;
  collaboration_suggested: boolean;
  // Slice 5 layer-breakdown projection of memory used.
  memory_used_summary: MemoryUsedSummary;
  // EDX-4 PR 4 — closed-vocab companions surfaced only when
  // approval_required is true.
  approval_reason?: ApprovalReason;
  approval_duration_options?: ReadonlyArray<TwinAuthorityDurationClass>;
  // EDX-6 — closed-vocab companion surfaced only when
  // collaboration_suggested is true.
  collaboration_target_type?: TwinCollaborationTargetType;
  // Phase 1208 — structured envelope surfaced when the LLM's
  // canonical Phase 1207 draft shape is detected. The inline
  // ProposedActionCard binds to this. Absent when the chat
  // response is a normal answer / clarification / non-draft.
  proposed_action?: ProposedAction;
}

// Phase 1208 — chat-tier closed-vocab action types.
export type ProposedActionType = "SEND_INTERNAL_NOTIFICATION";

// Phase 1208 — resolved recipient (always present when
// proposed_action is present). entity_id/email are null when the
// recipient was not in the viewer's org roster -- the UI should
// surface a "recipient not in roster" warning in that case.
export interface ProposedActionTarget {
  display_name: string;
  email: string | null;
  entity_id: string | null;
}

// Phase 1208 — the structured action proposal the LLM drafted.
export interface ProposedAction {
  action_type: ProposedActionType;
  target: ProposedActionTarget;
  draft_text: string;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────
// Phase 1210 -- GET /api/v1/notifications inbox + read mutations.
// Self-scope only: every row has recipient_entity_id === caller.
// Safe projection (no body_redacted by default).
// ─────────────────────────────────────────────────────────────────

export interface SafeNotificationView {
  notification_id: string;
  // Phase 1284: the projection now includes a GOVERNED sender object for the
  // intended recipient (workplace accountability) — display fields only, no
  // private context. body_redacted / org / recipient / deleted_at remain
  // excluded.
  action_id: string | null;
  notification_class: string;
  body_summary: string;
  created_at: string;
  read_at: string | null;
  status?: "READ" | "UNREAD";
  sender?: {
    entity_id: string;
    display_name: string;
    role_title: string | null;
    source_kind: "HUMAN" | "AI_TWIN" | "AI_EMPLOYEE" | "SYSTEM";
    authority_label: string;
  } | null;
}

export interface NotificationListResponse {
  ok: true;
  page: number;
  page_size: number;
  total: number;
  notifications: SafeNotificationView[];
}

export interface NotificationReadResponse {
  ok: true;
  notification: SafeNotificationView;
}

// Phase 1215 — POST /api/v1/notifications/:id/reply.
export interface NotificationReplyResponse {
  ok: true;
  reply_action_id: string;
  reply_action_status: string;
}

// ─────────────────────────────────────────────────────────────────
// Phase 1213 -- POST /api/v1/otzar/comms/extract.
// Mirrors Foundation's CommsExtractionResult exactly.
// ─────────────────────────────────────────────────────────────────

export type CommsExtractionMode =
  | "DEMO_SCRIPTED"
  | "LLM"
  | "LOCAL_FALLBACK";

// [SECTION-12-WORKGRAPH] Deterministic recipient-governance proof path. Mirrors
// Foundation's RecipientGovernance exactly. A card is only "Send"-ready when
// recipientSafety === "confirmed".
export type RecipientSafety =
  | "confirmed"
  | "likely"
  | "ambiguous"
  | "out_of_scope"
  | "unauthorized"
  | "cross_team_needs_approval";
export type RecipientAutonomyEligibility =
  | "eligible"
  | "draft_only"
  | "approval_required"
  | "clarification_required"
  | "blocked";
export interface RecipientEvidence {
  quote: string | null;
  source:
    | "transcript"
    | "meeting"
    | "explicit_mention"
    | "project_ownership"
    | "approval_policy"
    | "correction_memory"
    // [PROD-UX-BUGC] The caller completed the recipient review (confirm/
    // select) — a distinct human proof source, mirrored from Foundation.
    | "caller_confirmed"
    | "fuzzy_only"
    | "none";
  matchedToken: string | null;
  alternativeCandidates: string[];
}
export interface RecipientGovernance {
  entity_id: string | null;
  display_name: string;
  email: string | null;
  role: string | null;
  participantStatus: "participant" | "non_participant" | "unknown";
  mentionStatus: "explicitly_mentioned" | "alias_mentioned" | "not_mentioned";
  workConnectionType: string;
  evidence: RecipientEvidence;
  roleMatch: "clear" | "weak" | "mismatch" | "unknown";
  hierarchyConnection: string;
  projectConnection: string;
  policyStatus: "allowed" | "review_needed" | "approval_required" | "blocked" | "unknown";
  sensitivity: "low" | "internal" | "restricted" | "sensitive" | "unknown";
  confidence: "high" | "medium" | "low";
  recipientSafety: RecipientSafety;
  autonomyEligibility: RecipientAutonomyEligibility;
}

// Earned-autonomy verdict. Mirrors Foundation's AutonomyDecision. No auto-send
// is enabled — advisory only (tells the card whether/why it WOULD be auto-
// eligible in a future trusted mode, plus the ledger bucket).
export type AutonomyLedgerState = "sent" | "waiting" | "needs_review" | "blocked" | "draft";
export interface AutonomyDecision {
  futureAutoEligible: boolean;
  reasons: string[];
  requiresApprovalReason: string | null;
  actionRisk: "low" | "medium" | "high";
  contextScope: "full" | "task_summary" | "narrow_excerpt" | "approval_summary" | "none";
  ledgerState: AutonomyLedgerState;
  wouldAutoSendUnderMode: boolean;
}

export interface CommsSuggestedAction {
  local_id: string;
  action_type: "SEND_INTERNAL_NOTIFICATION";
  target: ProposedActionTarget;
  draft_text: string;
  reason: string;
  source_excerpt: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  resolution_status: "RESOLVED" | "UNRESOLVED" | "AMBIGUOUS" | "RESTRICTED";
  recipient_governance: RecipientGovernance;
  autonomy: AutonomyDecision;
}

export interface CommsResponsibilityNode {
  name: string;
  role:
    | "meeting_lead"
    | "founder_context_authority"
    | "owner"
    | "support"
    | "reviewer"
    | "approver"
    | "optional_advisor";
  workItem: string | null;
  evidence: string;
  confidence: "high" | "medium" | "low";
}
export interface CommsResponsibilityGraph {
  lead: CommsResponsibilityNode | null;
  founderAuthority: CommsResponsibilityNode | null;
  nodes: CommsResponsibilityNode[];
}
export interface CommsLeadCard {
  lead: string;
  body: string;
  tracks: Array<{ name: string; role: CommsResponsibilityNode["role"]; workItem: string | null }>;
}

export interface CommsExtractionResult {
  summary: string;
  decisions: string[];
  commitments: string[];
  risks_or_blockers: string[];
  suggested_actions: CommsSuggestedAction[];
  extraction_mode: CommsExtractionMode;
  responsibility_graph: CommsResponsibilityGraph;
  lead_card: CommsLeadCard | null;
}

export interface CommsExtractResponse {
  ok: true;
  extraction: CommsExtractionResult;
}

// ── Governed transcript INGEST (POST /otzar/comms/ingest) ──────────────────
// Mirrors Foundation's IngestTranscriptResult. Unlike extract (ephemeral), ingest
// PERSISTS the conversation and creates per-owner Work Ledger rows under proof.
export interface CommsIngestWorkItem {
  ledger_entry_id: string | null;
  ledger_type: string;
  owner_entity_id: string | null;
  owner_name: string;
  title: string;
  status: string;
  needs_review: boolean;
  review_reason: string | null;
  // Phase 4/5 — the typed execution plan + connector capability for this item.
  execution: {
    execution_type: string;
    execution_mode: string;
    required_connector: string;
    capability_state: string | null;
    approval_required: boolean;
    blocker_reason: string | null;
    next_best_action: string;
  };
}

// Phase 6 — a governed admin org-seeding suggestion sourced from work evidence.
export interface CommsDandelionSeed {
  seedType: string;
  subjectName: string | null;
  recommendedAction: string;
  approvalRequired: boolean;
  policyStatus: string;
  riskIfIgnored: string;
}

// The admin-actionable Dandelion seed (Organization Seeding queue). Mirrors
// Foundation OrgSeedView.
// [T-3C] Safe possible-match candidate for an external review seed —
// labels + a machine id for the decision call; never emails/domains.
export interface OrgSeedPossibleMatch {
  external_collaborator_id: string;
  display_label: string;
  company_label?: string;
  relationship_label?: string;
  reason: string;
  confidence: "high" | "medium" | "low";
}

export interface OrgSeed {
  seed_id: string;
  seed_type: string;
  subject_name: string | null;
  /** [T-3C] present only on open external review seeds WITH candidates. */
  possible_matches?: OrgSeedPossibleMatch[];
  /** Resolved org entity for the subject when known (Slice PROD-UX-P0E). */
  subject_entity_id?: string | null;
  /** Stable grouping key so duplicate suggestions for the same person/target
   *  cluster into ONE Organization Seeding card (entity id, else normalized
   *  name, else seed type). Backend-provided; the frontend falls back to the
   *  same derivation when absent. */
  subject_key?: string;
  recommended_action: string;
  source_evidence: string | null;
  source_conversation_id: string | null;
  confidence: string;
  approval_required: boolean;
  policy_status: string;
  sensitivity: string;
  risk_if_ignored: string | null;
  status: string;
  resulting_action: string | null;
  rejection_reason: string | null;
  hold_reason: string | null;
  reviewed: boolean;
  created_at: string;
}
export interface OrgSeedListResponse {
  ok: true;
  seeds: OrgSeed[];
}
export interface OrgSeedActionResponse {
  ok: true;
  seed: OrgSeed;
}

export interface CommsIngestResult {
  conversation: {
    meeting_capture_id: string;
    title: string;
    participant_count: number;
    summary: string | null;
    status: string;
  };
  quality: {
    total: number;
    trusted: number;
    quarantined: number;
    noisy_tail_start_index: number | null;
  };
  decisions: string[];
  work_items: CommsIngestWorkItem[];
  support_edges: Array<{ name: string; relation: string; entity_id: string | null }>;
  counts: { owned: number; needs_review: number; support_edges: number };
  // Phase 6 — governed Dandelion org-seeding suggestions + work-graph event count.
  dandelion_seeds: CommsDandelionSeed[];
  work_graph_event_count: number;
  // Full governed extraction so the Comms UI keeps its trust-chip review surface.
  extraction: CommsExtractionResult;
}

export interface CommsIngestResponse {
  ok: true;
  result: CommsIngestResult;
}

// Closed-vocab next-step union per EDX-3 slice 1.
export type ConductNextStep =
  | "ANSWERED"
  | "NEEDS_CLARIFICATION"
  | "NEEDS_APPROVAL"
  | "ACTION_PROPOSED"
  | "ACTION_CREATED"
  | "BLOCKED_BY_POLICY"
  | "BLOCKED_BY_SCOPE"
  | "COLLABORATION_REQUEST_SUGGESTED"
  | "MEMORY_CORRECTION_AVAILABLE";

// EDX-3 slice 5 — layer-by-layer memory usage summary.
export interface MemoryUsedSummary {
  layer_1_corrections: number;
  layer_3_work_profile: number;
  layer_4_foundational: number;
  layer_5_relevant_context: number;
  layer_8_history_messages: number;
  total_capsules: number;
}

// EDX-4 PR 4 — closed-vocab approval-reason union.
export type ApprovalReason =
  | "EXTERNAL_WRITE"
  | "SENSITIVE_CONTEXT"
  | "CONNECTOR_ACCESS"
  | "CROSS_TEAM_REQUEST"
  | "CROSS_PROJECT_REQUEST"
  | "POLICY_REQUIRES_APPROVAL"
  | "DUAL_CONTROL_REQUIRED"
  | "LONG_TERM_AUTHORITY"
  | "INDEFINITE_AUTHORITY";

// EDX-6 — closed-vocab collaboration target type union.
export type TwinCollaborationTargetType =
  | "EMPLOYEE"
  | "EMPLOYEE_TWIN"
  | "TEAM"
  | "PROJECT"
  | "HIVE"
  | "WORKFLOW";

// Phase 3 — voice-ready route provider mode union.
export type VoiceProviderMode =
  | "TEXT_ONLY"
  | "LOCAL_MOCK"
  | "SELF_HOSTED_CSM1B_READY"
  | "SELF_HOSTED_CSM1B_ACTIVE"
  | "NOT_CONFIGURED";

// Phase 3 — POST /api/v1/otzar/my-twin/voice-intents body.
export interface VoiceIntentRequest {
  transcript_text?: string;
  message?: string;
  conversation_id?: string;
  conversation_history?: string[];
  token_budget?: number;
}

// Phase 3 — POST /api/v1/otzar/my-twin/voice-intents success response
// (ConductSessionSuccess + provider_mode).
export type VoiceIntentResponse = ConversationMessageResponse & {
  provider_mode: VoiceProviderMode;
};

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
  // [OTZAR-RETURN-10] forward-only voice-note grouping. When source is
  // "voice_note_capture", Foundation groups every capsule minted by this call
  // under one voice_note_id and returns it.
  source?: string;
  voice_note_id?: string;
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
// [OTZAR-RETURN-11] mirror of the Foundation read-only voice-note revoke PLAN
// (POST /otzar/voice-notes/:voice_note_id/revoke-plan). PLAN ONLY — apply is
// never enabled, nothing is revoked/deleted, no capsule payload is returned.
export interface VoiceNoteRevokeCapsulePlanView {
  capsule_id: string;
  wallet_scope: "caller" | "org" | "unknown";
  current_status: "ACTIVE" | "REVOKED";
  authority_status: "CAN_REVOKE" | "REQUIRES_ORG_AUTHORITY" | "NOT_OWNER" | "UNKNOWN";
  proposed_action: "SOFT_REVOKE" | "NOOP_ALREADY_REVOKED" | "SKIP_UNAUTHORIZED";
}
export interface VoiceNoteRevokePlanResponse {
  ok: true;
  mode: "PLAN_ONLY";
  voice_note_id: string;
  event_type: "NOTE";
  capsule_count: number;
  capsules: VoiceNoteRevokeCapsulePlanView[];
  plan_status:
    | "COMPLETE_CAN_APPLY"
    | "PARTIAL_REQUIRES_AUTHORITY"
    | "ALREADY_REVOKED"
    | "NOT_FOUND"
    | "UNSAFE_TO_APPLY";
  apply_allowed: false;
  hard_delete_allowed: false;
  external_side_effects: false;
  raw_audio_scope: "NONE";
  payload_returned: false;
  crypto_erasure_ready: boolean;
  crypto_erasure_status: "NO_KEY_PATH_YET" | "KEY_DISABLE_READY" | "NOT_APPLICABLE";
  audit_preview: { event_type: "VOICE_NOTE_REVOKE_PLANNED" };
  reason_codes: string[];
}

// [OTZAR-RETURN-12] mirror of the Foundation MUTATING voice-note revoke APPLY
// (POST /otzar/voice-notes/:voice_note_id/revoke-apply). This is the first undo
// step that actually changes state: it SOFT-revokes (deleted_at tombstone) only
// the caller-owned, active capsules grouped under the note. It never hard-
// deletes, never returns capsule payload, and reports a partial apply honestly
// (org/unknown capsules are skipped — never claimed as a complete undo).
export type VoiceNoteRevokeApplyStatus =
  | "APPLIED"
  | "PARTIAL_APPLIED"
  | "ALREADY_REVOKED"
  | "NOT_FOUND"
  | "UNSAFE_TO_APPLY"
  | "REFUSED";
export interface VoiceNoteRevokeApplySkippedView {
  capsule_id: string;
  wallet_scope: "caller" | "org" | "unknown";
  reason: "REQUIRES_ORG_AUTHORITY" | "UNKNOWN_AUTHORITY";
}
export interface VoiceNoteRevokeApplyResponse {
  ok: true;
  mode: "APPLY";
  voice_note_id: string;
  event_type: "NOTE";
  apply_status: VoiceNoteRevokeApplyStatus;
  capsule_count: number;
  revoked_capsule_ids: string[];
  already_revoked_capsule_ids: string[];
  skipped_capsules: VoiceNoteRevokeApplySkippedView[];
  audit_id?: string;
  external_side_effects: false;
  hard_delete_performed: false;
  payload_returned: false;
  raw_audio_scope: "NONE";
  message: string;
  reason_codes: string[];
}

export interface ObserveSuccessResponse {
  ok: true;
  skipped?: false;
  capsule_ids: string[];
  // [OTZAR-RETURN-10] present only for a voice-note observe (the durable
  // grouping id shared by every capsule in capsule_ids). Absent for older
  // backends / non-voice observes (backward compatible).
  voice_note_id?: string;
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
  /** [PROD-UX-APPROVAL-LOOP] The approver's human reason (reject). The route
   *  folds it into resolution_metadata and the ACTION_REJECTED audit carries
   *  it as a safe bounded scalar. */
  reason?: string;
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
  // ────────────────────────────────────────────────────────────
  // Phase EDX-1 / EDX-4 / EDX-5 / EDX-6 + Phase 1 MyTwinView
  // sidecars per the [FOUNDER-AUTH — AUTONOMOUS ENTERPRISE
  // COLLABORATION COMPLETION] arc. All optional; the route omits
  // them on per-source read miss per ADR-0068 §6.
  // ────────────────────────────────────────────────────────────
  pending_approvals_summary?: TwinPendingApprovalsSummary;
  recent_action_summary?: TwinRecentActionSummary;
  memory_scope_summary?: TwinMemoryScopeSummary;
  active_grants_summary?: TwinActiveGrantsSummary;
  active_authority_summary?: TwinActiveAuthoritySummary;
  personal_preferences_summary?: TwinPersonalPreferencesSummary;
  collaboration_inbox_summary?: TwinCollaborationInboxSummary;
  project_context_summary?: TwinProjectContextSummary;
  voice_readiness_state?: TwinVoiceReadinessState;
}

// ────────────────────────────────────────────────────────────
// MyTwinView sidecar types (Foundation-side mirrors)
// ────────────────────────────────────────────────────────────

// Phase EDX-1 — pending approvals where the caller is the approver.
export interface TwinPendingApprovalsSummary {
  pending_count: number;
  most_recent_at: string | null;
}

// Phase EDX-1 — recent action volume where the caller is the source.
export interface TwinRecentActionSummary {
  recent_action_count: number;
  most_recent_at: string | null;
}

// Phase EDX-1 — currently-active ConversationMemoryScope inventory.
export interface TwinMemoryScopeSummary {
  active_scope_count: number;
  most_recent_at: string | null;
}

// Phase EDX-1 — ConsentGrant + TeamDelegation aggregated count.
export interface TwinActiveGrantsSummary {
  active_consent_grants_count: number;
  active_team_delegations_count: number;
  soonest_expiry_at: string | null;
}

// Phase EDX-4 — TwinAuthorityGrant inventory (the employee→Twin
// authority-to-act substrate).
export type TwinAuthorityDurationClass =
  | "ONE_TIME"
  | "SESSION"
  | "SHORT_TERM"
  | "PROJECT_SCOPED"
  | "LONG_TERM"
  | "INDEFINITE"
  | "UNTIL_REVOKED"
  | "SENSITIVE_CASE_BY_CASE";

export interface TwinActiveAuthoritySummary {
  active_grant_count: number;
  expiring_soon_count: number;
  indefinite_grant_count: number;
  sensitive_case_by_case_count: number;
  most_recent_grant_at: string | null;
  next_expiry_at: string | null;
  has_revocable_grants: boolean;
  duration_classes_present: ReadonlyArray<TwinAuthorityDurationClass>;
}

// Phase EDX-5 — TwinCorrectionMemory inventory (personal work-style
// memory the employee taught their Twin).
export interface TwinPersonalPreferencesSummary {
  active_personal_preferences_count: number;
  active_tone_preferences_count: number;
  active_project_preferences_count: number;
  active_sensitivity_boundaries_count: number;
  active_approval_preferences_count: number;
  active_terminology_definitions_count: number;
  active_ask_before_acting_count: number;
  last_correction_at: string | null;
}

// Phase EDX-6 — TwinCollaborationRequest inbox where the caller is
// the target.
export interface TwinCollaborationInboxSummary {
  pending_request_count: number;
  needs_my_approval_count: number;
  blocked_request_count: number;
  completed_recent_count: number;
  most_recent_request_at: string | null;
}

// Phase 1 — WorkProject membership inventory.
export interface TwinProjectContextSummary {
  active_project_count: number;
  owned_project_count: number;
  reviewer_project_count: number;
  member_project_count: number;
  recent_project_activity_at: string | null;
}

// Phase EDX-1 — voice surface readiness posture.
export type VoiceReadinessValue =
  | "LIVE"
  | "NOT_AVAILABLE_AT_FOUNDATION_TIER";

export interface TwinVoiceReadinessState {
  envelope_construction: VoiceReadinessValue;
  live_audio_input: VoiceReadinessValue;
  live_audio_output: VoiceReadinessValue;
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

// ─────────────────────────────────────────────────────────────────
// Phase 1205 -- GET /api/v1/otzar/my-twin/context-health.
// Closed-vocab projection of the L0_IDENTITY block conductSession
// prepends to the LLM. Lets the Voice page render a "Signed in as
// / Org / Role / Twin / counts" badge so the operator sees at-a-
// glance whether Otzar will recognize them.
// ─────────────────────────────────────────────────────────────────

export type ContextHealthStatus = "READY" | "PARTIAL" | "UNCONFIGURED";

export interface ContextHealthIdentity {
  viewer: {
    user_id: string;
    email: string | null;
    display_name: string;
    title: string;
    org_role: string;
    is_founder_admin: boolean;
  };
  org: {
    org_id: string | null;
    name: string | null;
    domain: string | null;
  };
  twin: {
    twin_id: string | null;
    display_name: string | null;
    active: boolean;
  };
  projects: ReadonlyArray<{
    project_id: string;
    name: string;
    role: string;
  }>;
  authority: {
    can_admin_org: boolean;
    can_read_capsules: boolean;
    can_write_capsules: boolean;
    can_share_capsules: boolean;
    can_access_external_api: boolean;
    external_write_policy: string;
  };
  context_signals: {
    memory_capsules_count: number;
    transcript_summaries_count: number;
    collaboration_inbound_count: number;
    collaboration_outbound_count: number;
  };
  // Phase 1207 substrate -- other PERSON members of the viewer's org
  // with the rough collab signal Foundation surfaces to the LLM. The
  // CT consumer reads this from /otzar/my-twin/context-health and
  // renders it as the People directory on the Collaboration page.
  org_roster: ReadonlyArray<{
    entity_id: string;
    display_name: string;
    email: string | null;
    title: string;
    shared_project_count: number;
    recent_collab_count: number;
  }>;
  safety: {
    no_external_write_without_approval: true;
    no_private_data_to_unauthorized_users: true;
    no_raw_audio_storage: true;
    no_raw_transcript_default: true;
  };
}

export interface ContextHealthResponse {
  ok: true;
  status: ContextHealthStatus;
  identity: ContextHealthIdentity;
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
  /** [GAP-E] The approver's human reason on a REJECTED action (safe bounded
   *  scalar projected from the paired escalation). Optional/absent on every
   *  other state and on older backends. */
  not_approved_reason?: string | null;
  created_at: string;
  updated_at: string;
  // ADR-0057 §10 Amendment 1 — SAFE resolved display-name labels for the
  // action's recipient + requester (never the entity_id UUID, never the
  // message body). null/absent when unresolvable → render "recipient
  // unavailable". Optional because the create-time projection omits them.
  target_label?: string | null;
  requester_label?: string | null;
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

// Phase 1211 -- GET /api/v1/actions list (self-scoped by default).
// Mirrors ListActionsView at the Foundation tier.
export interface ActionListResponse {
  ok: true;
  items: SafeActionView[];
  page: number;
  page_size: number;
  total: number;
}

// ════════════════════════════════════════════════════════════════
// OTZAR STAGE-2 TRUTH-EVIDENCE — the governed-decision evidence surface.
// Mirrors the LIVE Foundation routes:
//   GET  /api/v1/otzar/obligations?with_basis=true
//   GET  /api/v1/otzar/obligations/:id/evidence
//   POST /api/v1/otzar/obligations/:id/evidence/recheck
// SAFE views only: ids + closed-vocab classifications + timestamps + hashes.
// The captured evidence basis is IMMUTABLE — `current_source_status` is a
// SEPARATE live projection and must never be conflated with the captured
// snapshot in the UI. Forbidden (NEVER add): raw source text, message
// bodies, tokens, permission internals, policy envelopes.
// ════════════════════════════════════════════════════════════════

// WHAT: Live basis status of a completed decision's captured evidence.
//       current = every final-decision basis still holds; stale = at least
//       one basis changed/superseded/retracted/gone; none = no durable basis
//       captured yet. Absent when the list was fetched without with_basis.
export type BasisStatus = "current" | "stale" | "none";

// WHAT: How the current source compares to the captured basis (per snapshot).
//       unchanged is safe; the rest are stale to varying severity; unknown =
//       no version to compare (never treated as stale).
export type CurrentSourceStatus =
  | "unchanged"
  | "changed"
  | "superseded"
  | "retracted"
  | "unavailable"
  | "unknown";

// WHAT: SAFE obligation (governed decision/commitment) projection.
// WHY: Surfaced-by-allowlist at Foundation; this mirror preserves the contract
//      so the UI cannot reach into forbidden fields. `details` is an opaque
//      safe object (ids + safe classifications only) — never render it raw.
export interface Obligation {
  obligation_id: string;
  obligation_type: string;
  title: string;
  details: Record<string, unknown>;
  state: string;
  priority: string;
  required_response_class: string | null;
  source_channel: string;
  provenance_class: string;
  conversation_id: string | null;
  source_turn_id: string | null;
  responsible_entity_id: string;
  has_action: boolean;
  has_completion_evidence: boolean;
  is_escalated: boolean;
  is_terminal: boolean;
  version: number;
  created_at: string;
  due_at: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
}

// WHAT: An obligation as returned WITH the optional live basis pass.
export interface ObligationWithBasis extends Obligation {
  basis_status?: BasisStatus;
}

// WHAT: GET /api/v1/otzar/obligations[?with_basis=true] response.
export interface ObligationListResponse {
  ok: true;
  obligations: ObligationWithBasis[];
}

// WHAT: One immutable point-in-time evidence snapshot + its SEPARATE live
//       source status. `current_source_status` is the only live-projected
//       field; every other field is the frozen captured basis.
export interface EvidenceSnapshotView {
  snapshot_id: string;
  decision_point: string;
  source_record_type: string;
  source_record_id: string;
  source_version: number | null;
  source_hash: string | null;
  source_timestamp: string | null;
  source_system: string | null;
  source_integrity_state: string | null;
  communication_act: string | null;
  truth_class: string | null;
  truth_weight_rank: number | null;
  authority_class: string | null;
  currentness: string | null;
  conflict_indicator: boolean;
  superseded_at_capture: boolean;
  captured_at: string;
  resolver_version: string;
  evidence_fingerprint: string;
  obligation_id: string | null;
  handoff_id: string | null;
  /** LIVE projection (captured basis vs. now) — NOT part of the frozen basis. */
  current_source_status: CurrentSourceStatus;
}

// WHAT: GET /api/v1/otzar/obligations/:id/evidence response.
export interface ObligationEvidenceResponse {
  ok: true;
  evidence: EvidenceSnapshotView[];
}

// WHAT: A stale-basis reference returned by an explicit recheck.
export interface StaleBasisRef {
  snapshot_id: string;
  decision_point: string;
  current_source_status: CurrentSourceStatus;
}

// WHAT: POST /api/v1/otzar/obligations/:id/evidence/recheck response.
//       remediation_open ⇒ a governed review item was raised (or already
//       existed) for the stale basis; current ⇒ the basis still holds.
export interface ObligationRecheckResponse {
  ok: true;
  status: "current" | "remediation_open";
  stale: StaleBasisRef[];
  remediation_obligation_id: string | null;
  remediation_created: boolean;
}

// ════════════════════════════════════════════════════════════════
// [SECTION-10 ORG-TRUTH REVIEW] Governed organizational-truth review surface.
// SAFE-view allowlist discipline — these mirror the Foundation safe projections
// (classifications + ids only; NEVER raw source content / hashes / metadata).
// ════════════════════════════════════════════════════════════════

export type ConflictSetState =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "SUPERSEDED"
  | "CANCELLED";

export type OrgTruthState =
  | "CANDIDATE"
  | "PROMOTED"
  | "DISPUTED"
  | "SUPERSEDED"
  | "RETRACTED";

// WHAT: A materialized conflict set (competing sources for one truth key).
export interface ConflictSet {
  conflict_set_id: string;
  org_entity_id: string;
  truth_key: string;
  decision_domain: string;
  subject_ref: string | null;
  state: ConflictSetState;
  version: number;
  review_obligation_id: string | null;
  candidate_set_fingerprint: string | null;
  resulting_truth_record_id: string | null;
  resolution_reason: string | null;
  created_at: string;
  updated_at: string;
}

// WHAT: A conflict set as returned by the list, WITH a candidate count.
export interface ConflictSetWithCount extends ConflictSet {
  candidate_count: number;
}

// WHAT: A preserved competing candidate — SAFE classifications only.
export interface ConflictCandidate {
  source_record_type: string;
  source_record_id: string;
  source_version: number | null;
  communication_act: string | null;
  truth_class: string | null;
  truth_weight_rank: number | null;
  authority_status: string | null;
  currentness: string | null;
  source_integrity_state: string | null;
  permission_eligible: boolean;
  superseded: boolean;
  retracted: boolean;
  is_winner: boolean;
  /** Human-readable identity — never anonymous UUID alone (WAVE recovery). */
  display_label?: string;
  claim_summary?: string | null;
}

// WHAT: A promoted organizational-truth record — SAFE projection.
export interface OrgTruthRecord {
  truth_record_id: string;
  org_entity_id: string;
  decision_domain: string;
  subject_ref: string | null;
  subject_ref_class: string | null;
  truth_key: string;
  state: OrgTruthState;
  version: number;
  winning_source_record_type: string | null;
  winning_source_record_id: string | null;
  winning_source_version: number | null;
  promotion_evidence_snapshot_id: string | null;
  truth_class: string | null;
  truth_weight_rank: number | null;
  authority_ref: string | null;
  promoter_entity_id: string | null;
  promoted_at: string | null;
  supersedes_truth_record_id: string | null;
  superseded_by_truth_record_id: string | null;
  retraction_reason: string | null;
  conflict_set_ref: string | null;
  title: string | null;
  value: Record<string, unknown>;
  value_type: string | null;
  visibility_scope: string;
  created_at: string;
  updated_at: string;
}

export interface OrgTruthConflictListResponse {
  ok: true;
  conflicts: ConflictSetWithCount[];
}

export interface OrgTruthConflictDetailResponse {
  ok: true;
  // `current_promoted_truth` is resolved server-side from the conflict's stored truth_key (the
  // client never reconstructs the topic); null ⇒ no current organizational answer. It is the answer
  // the reviewer's selected candidate would replace.
  conflict: { set: ConflictSet; candidates: ConflictCandidate[]; current_promoted_truth: OrgTruthRecord | null };
}

export interface OrgTruthCurrentResponse {
  ok: true;
  record: OrgTruthRecord | null;
}

export interface OrgTruthRecordResponse {
  ok: true;
  record: OrgTruthRecord;
}

// WHAT: The winner passed to a governed resolution (built from a selected
//       ConflictCandidate — identity + version only; the server re-resolves).
export interface OrgTruthSourceWinner {
  source_record_type: string;
  source_record_id: string;
  source_version?: number | null;
}

export interface OrgTruthResolveResponse {
  ok: true;
  result: { kind: "promoted"; record: OrgTruthRecord; created: boolean };
}

export interface OrgTruthRetractResponse {
  ok: true;
}

// ════════════════════════════════════════════════════════════════
// Phase EDX-4 — TwinAuthorityGrant types (PR Foundation #269/#270)
// ════════════════════════════════════════════════════════════════

export type TwinAuthorityGrantState =
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED"
  | "SUPERSEDED"
  | "CONSUMED"
  | "BLOCKED";

export type TwinAuthorityScopeType =
  | "PERSONAL"
  | "SESSION"
  | "PROJECT"
  | "TEAM"
  | "ORG"
  | "CONNECTOR"
  | "ACTION_TYPE"
  | "WORKFLOW"
  | "CONVERSATION";

export type TwinAuthoritySensitivityClass =
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "REGULATED"
  | "CUSTOMER_SENSITIVE"
  | "FINANCIAL"
  | "LEGAL"
  | "SECURITY"
  | "PERSONAL_MEMORY"
  | "CONNECTOR_WRITE";

export interface TwinAuthorityGrantSafeView {
  grant_id: string;
  duration_class: TwinAuthorityDurationClass;
  sensitivity_class: TwinAuthoritySensitivityClass;
  scope_type: TwinAuthorityScopeType;
  scope_id: string | null;
  state: TwinAuthorityGrantState;
  effective_from: string;
  expires_at: string | null;
  revoked_at: string | null;
  consumed_at: string | null;
  purpose_summary: string;
  action_type: string | null;
  connector_type: string | null;
  has_connector_binding: boolean;
  revocable: boolean;
  created_at: string;
}

export interface CreateAuthorityGrantRequest {
  scope_type: TwinAuthorityScopeType;
  duration_class: TwinAuthorityDurationClass;
  purpose_summary: string;
  scope_id?: string;
  action_type?: string;
  connector_type?: string;
  connector_binding_id?: string;
  sensitivity_class?: TwinAuthoritySensitivityClass;
  expires_at?: string;
  grantee_entity_id?: string;
}

export interface AuthorityGrantCreateResponse {
  ok: true;
  grant: TwinAuthorityGrantSafeView;
}

export interface AuthorityGrantListResponse {
  ok: true;
  grants: TwinAuthorityGrantSafeView[];
}

export interface AuthorityGrantRevokeResponse {
  ok: true;
  grant: TwinAuthorityGrantSafeView;
}

// ════════════════════════════════════════════════════════════════
// Phase EDX-5 — TwinCorrectionMemory types (PR Foundation #273/#274)
// ════════════════════════════════════════════════════════════════

export type TwinCorrectionType =
  | "MEANING_CLARIFICATION"
  | "TERMINOLOGY_DEFINITION"
  | "PREFERENCE"
  | "TONE_PREFERENCE"
  | "PROJECT_PREFERENCE"
  | "CLIENT_CONTEXT"
  | "TEAM_BEST_PRACTICE_CANDIDATE"
  | "ORG_BEST_PRACTICE_CANDIDATE"
  | "FAILED_PATTERN"
  | "SUCCESSFUL_PATTERN"
  | "SENSITIVITY_BOUNDARY"
  | "APPROVAL_PREFERENCE"
  | "DO_NOT_USE_CONTEXT"
  | "ASK_BEFORE_ACTING";

export type TwinCorrectionState =
  | "ACTIVE"
  | "REVOKED"
  | "SUPERSEDED"
  | "EXPIRED"
  | "PROMOTED_TO_TEAM_PATTERN"
  | "PROMOTED_TO_ORG_PATTERN";

export type TwinCorrectionScopeType =
  | "PERSONAL"
  | "CONVERSATION"
  | "PROJECT"
  | "TEAM"
  | "ROLE"
  | "ORG";

export type TwinCorrectionRetentionClass =
  | "EPHEMERAL"
  | "STANDARD"
  | "LONG_RETENTION"
  | "PERMANENT_UNTIL_REVOKED";

export interface TwinCorrectionSafeView {
  correction_id: string;
  scope_type: TwinCorrectionScopeType;
  scope_id: string | null;
  correction_type: TwinCorrectionType;
  state: TwinCorrectionState;
  sensitivity_class: TwinAuthoritySensitivityClass;
  retention_class: TwinCorrectionRetentionClass;
  safe_summary: string;
  effective_from: string;
  expires_at: string | null;
  revoked_at: string | null;
  superseded_by_id: string | null;
  revocable: boolean;
  created_at: string;
}

export interface CreateCorrectionRequest {
  scope_type: TwinCorrectionScopeType;
  correction_type: TwinCorrectionType;
  safe_summary: string;
  scope_id?: string;
  sensitivity_class?: TwinAuthoritySensitivityClass;
  retention_class?: TwinCorrectionRetentionClass;
  source_message_id?: string;
  source_conversation_id?: string;
  expires_at?: string;
}

export interface CorrectionCreateResponse {
  ok: true;
  correction: TwinCorrectionSafeView;
}

export interface CorrectionListResponse {
  ok: true;
  corrections: TwinCorrectionSafeView[];
}

export interface CorrectionRevokeResponse {
  ok: true;
  correction: TwinCorrectionSafeView;
}

// ════════════════════════════════════════════════════════════════
// Phase EDX-6 — TwinCollaborationRequest types (PR Foundation #276/#277)
// ════════════════════════════════════════════════════════════════

export type TwinCollaborationState =
  | "REQUESTED"
  | "ACCEPTED"
  | "NEEDS_APPROVAL"
  | "BLOCKED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELED";

export type TwinCollaborationRequestType =
  | "STATUS_REQUEST"
  | "REVIEW_REQUEST"
  | "BLOCKER_RESOLUTION"
  | "FOLLOW_UP"
  | "HANDOFF"
  | "CONTEXT_REQUEST"
  | "APPROVAL_REQUEST"
  | "PROJECT_COORDINATION"
  | "CROSS_TEAM_COORDINATION"
  | "WORKFLOW_COORDINATION";

export type TwinCollaborationBlockedReason =
  | "CROSS_ORG_DENIED"
  | "MISSING_PROJECT_MEMBERSHIP"
  | "MISSING_TEAM_MEMBERSHIP"
  | "MISSING_DMW_SCOPE"
  | "MISSING_AUTHORITY_GRANT"
  | "POLICY_REQUIRES_APPROVAL"
  | "CONNECTOR_WRITE_NOT_AUTHORIZED"
  | "SENSITIVE_CONTEXT_BLOCKED"
  | "TARGET_NOT_FOUND";

export interface CollaborationRequestSafeView {
  collaboration_id: string;
  target_type: TwinCollaborationTargetType;
  request_type: TwinCollaborationRequestType;
  state: TwinCollaborationState;
  sensitivity_class: TwinAuthoritySensitivityClass;
  safe_summary: string;
  requested_by_ai: boolean;
  requires_approval: boolean;
  blocked_reason: TwinCollaborationBlockedReason | null;
  has_target_entity: boolean;
  has_target_twin: boolean;
  has_target_team: boolean;
  has_target_project: boolean;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CreateCollaborationRequestBody {
  target_type: TwinCollaborationTargetType;
  request_type: TwinCollaborationRequestType;
  safe_summary: string;
  target_entity_id?: string;
  target_twin_entity_id?: string;
  target_team_id?: string;
  target_project_id?: string;
  requester_twin_entity_id?: string;
  requested_by_ai?: boolean;
  requires_approval?: boolean;
}

export interface CollaborationCreateResponse {
  ok: true;
  collaboration: CollaborationRequestSafeView;
}

export interface CollaborationListResponse {
  ok: true;
  collaborations: CollaborationRequestSafeView[];
}

export interface CollaborationTransitionResponse {
  ok: true;
  collaboration: CollaborationRequestSafeView;
}

// ════════════════════════════════════════════════════════════════
// Phase 1 — WorkProject types (PR Foundation #280/#281)
// ════════════════════════════════════════════════════════════════

export type WorkProjectState = "ACTIVE" | "ARCHIVED";
export type WorkProjectMemberRole = "OWNER" | "MEMBER" | "REVIEWER";

export interface WorkProjectSafeView {
  project_id: string;
  name: string;
  state: WorkProjectState;
  created_at: string;
  archivable: boolean;
}

export interface WorkProjectMemberSafeView {
  project_member_id: string;
  project_id: string;
  entity_id: string;
  role: WorkProjectMemberRole;
  created_at: string;
}

export interface CreateWorkProjectRequest {
  name: string;
}

export interface WorkProjectCreateResponse {
  ok: true;
  project: WorkProjectSafeView;
}

export interface WorkProjectListResponse {
  ok: true;
  projects: WorkProjectSafeView[];
}

export interface WorkProjectMembersResponse {
  ok: true;
  members: WorkProjectMemberSafeView[];
}

// ════════════════════════════════════════════════════════════════
// Phase 2 — OrgCollaborationPolicy types (PR Foundation #284/#286)
// ════════════════════════════════════════════════════════════════

export type OrgCollaborationScope =
  | "SAME_TEAM"
  | "SAME_PROJECT"
  | "CROSS_TEAM"
  | "CROSS_PROJECT"
  | "ORG_WIDE";

export type OrgCollaborationOutcome =
  | "ALLOW"
  | "NEEDS_APPROVAL"
  | "BLOCK"
  | "DRAFT_ONLY"
  | "DUAL_CONTROL_REQUIRED";

export interface OrgCollaborationPolicySafeView {
  policy_id: string;
  collaboration_scope: OrgCollaborationScope;
  request_type: TwinCollaborationRequestType | null;
  sensitivity_class: TwinAuthoritySensitivityClass | null;
  outcome: OrgCollaborationOutcome;
  requires_employee_authority: boolean;
  requires_admin_approval: boolean;
  requires_dual_control: boolean;
  connector_write_allowed: boolean;
  created_at: string;
}

export interface UpsertOrgCollaborationPolicyRequest {
  collaboration_scope: OrgCollaborationScope;
  outcome: OrgCollaborationOutcome;
  request_type?: TwinCollaborationRequestType | null;
  sensitivity_class?: TwinAuthoritySensitivityClass | null;
  requires_employee_authority?: boolean;
  requires_admin_approval?: boolean;
  requires_dual_control?: boolean;
  connector_write_allowed?: boolean;
}

export interface OrgCollaborationPolicyListResponse {
  ok: true;
  policies: OrgCollaborationPolicySafeView[];
}

export interface OrgCollaborationPolicyUpsertResponse {
  ok: true;
  policy: OrgCollaborationPolicySafeView;
}

// ──────────────────────────────────────────────────────────────────
// Phase 5/6 — Connector + MCP rails substrate (Foundation PR #296 +
// admin routes Foundation PR #298). Mirrors:
//   GET    /api/v1/orgs/me/connector-providers
//   POST   /api/v1/orgs/me/connector-scope-grants
//   GET    /api/v1/orgs/me/connector-scope-grants
//   DELETE /api/v1/orgs/me/connector-scope-grants/:grant_id
//   POST   /api/v1/orgs/me/mcp-server-connections
//   GET    /api/v1/orgs/me/mcp-server-connections
//   DELETE /api/v1/orgs/me/mcp-server-connections/:id
//   POST   /api/v1/orgs/me/mcp-tool-policies
//   GET    /api/v1/orgs/me/mcp-tool-policies
//   DELETE /api/v1/orgs/me/mcp-tool-policies/:policy_id
// ──────────────────────────────────────────────────────────────────

export type ConnectorProviderType =
  | "GOOGLE_WORKSPACE"
  | "MICROSOFT_365"
  | "SLACK"
  | "JIRA"
  | "LINEAR"
  | "SALESFORCE"
  | "HUBSPOT"
  | "GITHUB"
  | "GITLAB"
  | "NOTION"
  | "CONFLUENCE"
  | "INTERNAL_API"
  | "MCP_SERVER"
  | "CUSTOM";

export type ConnectorAuthMode =
  | "OAUTH2"
  | "API_KEY"
  | "SERVICE_ACCOUNT"
  | "MCP_AUTH"
  | "NONE_FOR_LOCAL_MOCK";

export type ConnectorWriteMode =
  | "DISABLED"
  | "DRAFT_ONLY"
  | "APPROVAL_REQUIRED"
  | "ENABLED_WITH_POLICY";

export interface ConnectorProviderDefinition {
  provider_id: ConnectorProviderType;
  display_name: string;
  supported_auth_modes: ConnectorAuthMode[];
  read_supported: boolean;
  draft_supported: boolean;
  write_supported: boolean;
  default_write_mode: ConnectorWriteMode;
  compliance_tags: string[];
  connector_write_founder_gated: boolean;
}

export type ConnectorScopeType =
  | "ORG"
  | "TEAM"
  | "PROJECT"
  | "ROLE"
  | "EMPLOYEE"
  | "TWIN";

export type ConnectorOperationClass =
  | "READ"
  | "DRAFT"
  | "WRITE_REQUEST"
  | "WRITE_EXECUTE";

export interface ConnectorScopeGrantView {
  grant_id: string;
  connection_id: string;
  scope_type: ConnectorScopeType;
  scope_id: string | null;
  allowed_operations: ConnectorOperationClass[];
  requires_employee_authority: boolean;
  requires_admin_approval: boolean;
  requires_dual_control: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface CreateConnectorScopeGrantRequest {
  connection_id: string;
  scope_type: ConnectorScopeType;
  scope_id?: string | null;
  allowed_operations: ConnectorOperationClass[];
  requires_employee_authority?: boolean;
  requires_admin_approval?: boolean;
  requires_dual_control?: boolean;
  expires_at?: string | null;
}

export type McpAuthMode =
  | "OAUTH2"
  | "API_KEY"
  | "SERVICE_ACCOUNT"
  | "MCP_AUTH"
  | "NONE_FOR_LOCAL_MOCK";

export type McpServerStatus =
  | "NOT_CONFIGURED"
  | "CONNECTED"
  | "DEGRADED"
  | "REVOKED"
  | "ERROR";

export type McpToolPolicyMode =
  | "READ_ONLY"
  | "APPROVAL_REQUIRED"
  | "BLOCKED_BY_DEFAULT";

export type McpOperationClass =
  | "READ"
  | "WRITE"
  | "MUTATION"
  | "EXTERNAL_SEND"
  | "FINANCIAL"
  | "LEGAL"
  | "SECURITY"
  | "CUSTOMER_SENSITIVE";

export type McpPolicyOutcome =
  | "ALLOW"
  | "NEEDS_APPROVAL"
  | "BLOCK"
  | "DRAFT_ONLY"
  | "DUAL_CONTROL_REQUIRED";

export interface McpServerConnectionView {
  mcp_connection_id: string;
  display_name: string;
  server_url: string;
  auth_mode: McpAuthMode;
  secret_ref: string | null;
  status: McpServerStatus;
  tool_policy_mode: McpToolPolicyMode;
  allowed_tool_names: string[];
  blocked_tool_names: string[];
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
  last_health_check_at: string | null;
}

export interface CreateMcpServerConnectionRequest {
  display_name: string;
  server_url: string;
  auth_mode?: McpAuthMode;
  secret_ref?: string | null;
  tool_policy_mode?: McpToolPolicyMode;
  allowed_tool_names?: string[];
  blocked_tool_names?: string[];
}

export interface McpToolPolicyView {
  policy_id: string;
  mcp_connection_id: string;
  tool_name: string;
  operation_class: McpOperationClass;
  outcome: McpPolicyOutcome;
  requires_employee_authority: boolean;
  requires_dmw_scope: boolean;
  requires_admin_approval: boolean;
  redaction_policy: string | null;
  output_retention_policy: string | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
}

export interface CreateMcpToolPolicyRequest {
  mcp_connection_id: string;
  tool_name: string;
  operation_class: McpOperationClass;
  outcome?: McpPolicyOutcome;
  requires_employee_authority?: boolean;
  requires_dmw_scope?: boolean;
  requires_admin_approval?: boolean;
  redaction_policy?: string | null;
  output_retention_policy?: string | null;
}

export interface ConnectorProvidersListResponse {
  ok: true;
  providers: ConnectorProviderDefinition[];
}

export interface ConnectorScopeGrantListResponse {
  ok: true;
  grants: ConnectorScopeGrantView[];
}

export interface ConnectorScopeGrantResponse {
  ok: true;
  grant: ConnectorScopeGrantView;
}

export interface McpServerConnectionListResponse {
  ok: true;
  connections: McpServerConnectionView[];
}

export interface McpServerConnectionResponse {
  ok: true;
  connection: McpServerConnectionView;
}

export interface McpToolPolicyListResponse {
  ok: true;
  policies: McpToolPolicyView[];
}

export interface McpToolPolicyResponse {
  ok: true;
  policy: McpToolPolicyView;
}

// ──────────────────────────────────────────────────────────────
// Phase 1221 — Collaboration Workspace types (+ External
// Collaborator addendum). All views are SAFE projections from
// the Foundation `*ForCaller` services; NEVER contain raw
// transcripts / payload_summary internals / wallet_id /
// capsule_id / embeddings / vectors / Bearer tokens.
// ──────────────────────────────────────────────────────────────

export type WorkspaceStatus = "ACTIVE" | "ARCHIVED";
export type WorkspaceVisibility = "INTERNAL_ONLY" | "EXTERNAL_ALLOWED";
export type WorkspaceSourceType =
  | "MANUAL"
  | "COMMS_CAPTURE"
  | "PROJECT"
  | "IMPORTED";
export type MembershipType = "INTERNAL" | "EXTERNAL";
export type MembershipAccessLevel =
  | "VIEW"
  | "COMMENT"
  | "CONTRIBUTE"
  | "APPROVE";
export type MembershipStatus = "ACTIVE" | "PENDING" | "REVOKED";
export type CommitmentResolutionStatus =
  | "RESOLVED"
  | "UNRESOLVED"
  | "AMBIGUOUS"
  | "RESTRICTED";
export type CommitmentConfidence = "HIGH" | "MEDIUM" | "LOW";
export type CommitmentStatus =
  | "PROPOSED"
  | "CONFIRMED"
  | "ACTION_CREATED"
  | "COMPLETED"
  | "BLOCKED";
export type SharedContextType =
  | "COMMS_SUMMARY"
  | "DECISION"
  | "COMMITMENT"
  | "ACTION"
  | "MEMORY_CANDIDATE"
  | "PROJECT";
export type SharedContextSensitivity =
  | "PUBLIC"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "RESTRICTED";

export interface CollaborationWorkspaceSafeView {
  workspace_id: string;
  title: string;
  description: string | null;
  status: WorkspaceStatus;
  visibility: WorkspaceVisibility;
  source_type: WorkspaceSourceType;
  source_conversation_id: string | null;
  created_by_entity_id: string;
  created_at: string;
  updated_at: string;
}

export interface CollaborationWorkspaceListItem
  extends CollaborationWorkspaceSafeView {
  counts: {
    members: number;
    decisions: number;
    commitments: number;
    open_actions: number;
    completed_actions: number;
  };
}

export interface CollaborationMembershipView {
  membership_id: string;
  workspace_id: string;
  member_entity_id: string;
  member_display_name: string;
  member_email: string | null;
  role_label: string;
  responsibility_summary: string | null;
  member_type: MembershipType;
  access_level: MembershipAccessLevel;
  status: MembershipStatus;
}

export interface CollaborationDecisionView {
  decision_id: string;
  workspace_id: string;
  text: string;
  source_conversation_id: string | null;
  source_excerpt: string | null;
  created_at: string;
}

export interface CollaborationCommitmentView {
  commitment_id: string;
  workspace_id: string;
  owner_entity_id: string | null;
  owner_display_name: string;
  text: string;
  due_date: string | null;
  source_conversation_id: string | null;
  source_excerpt: string | null;
  assignment_reason: string;
  confidence: CommitmentConfidence;
  resolution_status: CommitmentResolutionStatus;
  related_action_id: string | null;
  status: CommitmentStatus;
}

export interface CollaborationSharedContextView {
  shared_context_id: string;
  workspace_id: string;
  context_type: SharedContextType;
  context_ref_id: string | null;
  title: string;
  summary: string;
  sensitivity: SharedContextSensitivity;
  created_at: string;
}

export interface CollaborationWorkspaceDetailResponse {
  ok: true;
  workspace: CollaborationWorkspaceSafeView;
  members: CollaborationMembershipView[];
  decisions: CollaborationDecisionView[];
  commitments: CollaborationCommitmentView[];
  linked_actions: SafeActionView[];
  shared_context: CollaborationSharedContextView[];
  permissions: {
    can_view: boolean;
    can_contribute: boolean;
    can_approve: boolean;
    is_creator: boolean;
  };
  audit_summary: {
    created_at: string;
    member_count: number;
    decision_count: number;
    commitment_count: number;
    action_count: number;
  };
}

export interface CollaborationWorkspaceListResponse {
  ok: true;
  workspaces: CollaborationWorkspaceListItem[];
}

export interface CollaborationWorkspaceCreateResponse {
  ok: true;
  workspace: CollaborationWorkspaceSafeView;
  members: CollaborationMembershipView[];
}

export interface CollaborationMembershipResponse {
  ok: true;
  membership: CollaborationMembershipView;
}

export interface ImportCommsOutputResponse {
  ok: true;
  decisions: CollaborationDecisionView[];
  commitments: CollaborationCommitmentView[];
  shared_context: CollaborationSharedContextView | null;
}

export interface ConfirmCommitmentResponse {
  ok: true;
  commitment: CollaborationCommitmentView;
  action: SafeActionView;
}

export interface CollaborationWorkspaceActionsResponse {
  ok: true;
  actions: SafeActionView[];
}

// External Collaborator types (addendum).

export type ExternalRelationshipType =
  | "CLIENT"
  | "VENDOR"
  | "CONTRACTOR"
  | "PARTNER"
  | "INVESTOR"
  | "ADVISOR"
  | "AGENCY"
  | "REGULATOR"
  | "PROSPECT"
  | "CANDIDATE"
  | "OTHER";

export type ExternalCollaboratorStatus =
  | "TRACKED_EXTERNAL"
  | "INVITED_EXTERNAL"
  | "ACTIVE_EXTERNAL"
  | "REVOKED_EXTERNAL"
  | "BLOCKED_EXTERNAL";

export type WorkspaceExternalAccessLevel =
  | "NONE"
  | "VIEW_SHARED"
  | "COMMENT_SHARED"
  | "CONTRIBUTE_SHARED"
  | "APPROVE_SHARED";

export type ExternalCommitmentDirection =
  | "INTERNAL_OWES_EXTERNAL"
  | "EXTERNAL_OWES_INTERNAL";

export type ExternalRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ExternalCollaboratorSafeView {
  external_collaborator_id: string;
  display_name: string;
  email: string | null;
  company_name: string | null;
  relationship_type: ExternalRelationshipType;
  status: ExternalCollaboratorStatus;
  internal_owner_entity_id: string | null;
  purpose_summary: string | null;
  goals_summary: string | null;
  needs_from_us: string | null;
  we_need_from_them: string | null;
  risk_level: ExternalRiskLevel;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceExternalMembershipView {
  workspace_external_membership_id: string;
  workspace_id: string;
  external_collaborator: ExternalCollaboratorSafeView;
  access_level: WorkspaceExternalAccessLevel;
  status: ExternalCollaboratorStatus;
  project_role: string | null;
  internal_owner_entity_id: string | null;
  invited_at: string | null;
  approved_at: string | null;
  revoked_at: string | null;
}

export interface ExternalCommitmentSafeView {
  external_commitment_id: string;
  workspace_id: string;
  external_collaborator_id: string;
  external_collaborator_display_name: string;
  external_collaborator_company_name: string | null;
  direction: ExternalCommitmentDirection;
  text: string;
  due_date: string | null;
  source_excerpt: string | null;
  internal_owner_entity_id: string | null;
  related_action_id: string | null;
  status: CommitmentStatus;
  confidence: CommitmentConfidence;
}

export interface TrackExternalCollaboratorResponse {
  ok: true;
  external_collaborator: ExternalCollaboratorSafeView;
  workspace_membership: WorkspaceExternalMembershipView;
}

export interface ListExternalCollaboratorsResponse {
  ok: true;
  workspace_memberships: WorkspaceExternalMembershipView[];
}

export interface UpdateExternalContextResponse {
  ok: true;
  external_collaborator: ExternalCollaboratorSafeView;
}

export interface InviteExternalCollaboratorResponse {
  ok: true;
  workspace_membership: WorkspaceExternalMembershipView;
}

export interface ListExternalCommitmentsResponse {
  ok: true;
  external_commitments: ExternalCommitmentSafeView[];
}

export interface CreateExternalFollowupResponse {
  ok: true;
  action: SafeActionView;
  external_commitment: ExternalCommitmentSafeView;
}

// ──────────────────────────────────────────────────────────────
// Phase 1222 — MeetingCapture types.
// ──────────────────────────────────────────────────────────────

export type MeetingCaptureProvider =
  | "GOOGLE_MEET"
  | "ZOOM"
  | "MICROSOFT_TEAMS"
  | "MANUAL_UPLOAD"
  | "API_INGEST";

export type MeetingCaptureStatus =
  | "PENDING"
  | "PROCESSED"
  | "ATTACHED_TO_WORKSPACE"
  | "BLOCKED_PARTICIPANT_CONSENT"
  | "FAILED"
  | "ARCHIVED";

export type MeetingParticipantConsentState =
  | "CONSENTED"
  | "NOT_CONSENTED"
  | "PENDING"
  | "EXTERNAL_TRACKED";

export interface MeetingCaptureSafeView {
  meeting_capture_id: string;
  provider: MeetingCaptureProvider;
  provider_meeting_id: string | null;
  title: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  recorded_start: string | null;
  recorded_end: string | null;
  participant_count: number;
  status: MeetingCaptureStatus;
  workspace_id: string | null;
  source_conversation_id: string | null;
  summary: string | null;
  has_transcript: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParticipantConsentView {
  meeting_participant_consent_id: string;
  display_name: string;
  email: string | null;
  participant_entity_id: string | null;
  external_collaborator_id: string | null;
  consent_state: MeetingParticipantConsentState;
  consent_source: string | null;
  consent_recorded_at: string | null;
}

export interface MeetingCaptureReceiveResponse {
  ok: true;
  meeting_capture: MeetingCaptureSafeView;
  participants: ParticipantConsentView[];
}

export interface MeetingCaptureListResponse {
  ok: true;
  meeting_captures: MeetingCaptureSafeView[];
}

export interface MeetingCaptureDetailResponse {
  ok: true;
  meeting_capture: MeetingCaptureSafeView;
  participants: ParticipantConsentView[];
}

// PROD-UX-P0C — the original transcript/source of a saved conversation,
// returned only to an authorized caller (captor or active workspace member).
export interface MeetingCaptureTranscriptResponse {
  ok: true;
  meeting_capture_id: string;
  title: string;
  transcript: string | null;
  has_transcript: boolean;
}

export interface MeetingCaptureAttachResponse {
  ok: true;
  meeting_capture: MeetingCaptureSafeView;
}

export interface MeetingParticipantConsentUpdateResponse {
  ok: true;
  participant: ParticipantConsentView;
}

// ──────────────────────────────────────────────────────────────
// Phase 1228 — DMW Registry types.
// ──────────────────────────────────────────────────────────────

export type DMWType =
  | "HUMAN"
  | "ENTERPRISE"
  | "DEPARTMENT"
  | "AI_TWIN"
  | "AI_EMPLOYEE"
  | "DEVICE"
  | "VENDOR"
  | "REGULATOR"
  | "AGENT"
  | "EXTERNAL_COLLABORATOR";

export interface DMWRegistryEntry {
  dmw_id: string;
  entity_id: string | null;
  external_collaborator_id: string | null;
  dmw_type: DMWType;
  display_name: string;
  email: string | null;
  org_entity_id: string | null;
  wallet_type: "PERSONAL" | "ENTERPRISE" | "DEVICE" | null;
  controller_dmw_id: string | null;
  counts: {
    consent_grants_active: number;
    delegations_active: number;
    swarm_boundaries: number;
    memory_scopes_active: number;
    external_collaborations: number;
  };
  status: "ACTIVE" | "SUSPENDED" | "REVOKED" | "DELETED";
  created_at: string;
}

export interface GetMyDMWResponse {
  ok: true;
  dmw: DMWRegistryEntry;
}

export interface ListOrgDMWResponse {
  ok: true;
  org_entity_id: string;
  entries: DMWRegistryEntry[];
}

export interface GetDMWByIdResponse {
  ok: true;
  dmw: DMWRegistryEntry;
}

export interface DMWAuditEntry {
  event_id: string;
  event_type: string;
  outcome: string;
  actor_entity_id: string | null;
  created_at: string;
}

export interface ListDMWAuditResponse {
  ok: true;
  events: DMWAuditEntry[];
}

// ──────────────────────────────────────────────────────────────
// Phase 1229 — COSMP capsule management types.
// ──────────────────────────────────────────────────────────────

export interface CapsuleSafeView {
  capsule_id: string;
  wallet_id: string;
  entity_id: string;
  capsule_type: string;
  topic_tags: string[];
  payload_summary: string;
  relevance_score: number;
  clearance_required: number;
  access_count: number;
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "ARCHIVED";
  created_at: string;
  last_updated_at: string;
  last_accessed_at: string | null;
  expires_at: string | null;
}

export interface ListCapsulesResponse {
  ok: true;
  capsules: CapsuleSafeView[];
  total: number;
}

export interface RevokeCapsuleResponse {
  ok: true;
  capsule_id: string;
  revoked_at: string;
}

export interface COSMPAuditSummaryView {
  total_events: number;
  by_event_type: Record<string, number>;
  recent_events: Array<{
    audit_id: string;
    event_type: string;
    outcome: string;
    timestamp: string;
    capsule_id: string | null;
  }>;
}

export interface GetCOSMPAuditResponse {
  ok: true;
  summary: COSMPAuditSummaryView;
}

// ──────────────────────────────────────────────────────────────
// Phase 1230 — Onboarding checklist types.
// ──────────────────────────────────────────────────────────────

export type OnboardingStepStatus =
  | "PENDING"
  | "READY"
  | "MISSING_KEYS"
  | "ATTENTION";

export interface OnboardingStep {
  step_id: string;
  label: string;
  status: OnboardingStepStatus;
  summary: string;
  completed_at: string | null;
  action_required?: string;
}

export interface OnboardingChecklist {
  org_entity_id: string;
  mode: "DEMO" | "PRODUCTION";
  ready_for_production_at: string | null;
  steps: OnboardingStep[];
  facts: {
    total_members: number;
    admin_members: number;
    role_archetypes_assigned: number;
    action_policies_configured: number;
    connector_bindings: number;
    stt_providers_available: number;
    stt_providers_missing_keys: number;
    has_open_audit_chain: boolean;
    schema_migration_state:
      | "LOCAL_ONLY"
      | "PROD_MIGRATION_ACKNOWLEDGED"
      | "PROD_MIGRATION_APPLIED";
  };
}

export interface GetOnboardingChecklistResponse {
  ok: true;
  checklist: OnboardingChecklist;
}

// ──────────────────────────────────────────────────────────────
// Phase 1223 — Voice/STT types.
// ──────────────────────────────────────────────────────────────

export type STTProviderType =
  | "DEMO_FIXTURE"
  | "LOCAL_BROWSER"
  | "WHISPER_API"
  | "DEEPGRAM"
  | "GOOGLE_SPEECH"
  | "AZURE_SPEECH";

export type STTProviderStatus =
  | "CONFIGURED"
  | "MISSING_CREDENTIAL"
  | "ERROR"
  | "DISABLED"
  | "DEMO_ONLY";

export type AudioCaptureMode =
  | "LIVE_MIC"
  | "AUDIO_FILE_UPLOAD"
  | "DEMO_AUDIO_SAMPLE"
  | "LOCAL_FALLBACK";

export type AudioCaptureStatus =
  | "RECEIVED"
  | "TRANSCRIBING"
  | "TRANSCRIBED"
  | "FAILED"
  | "ATTACHED_TO_MEETING_CAPTURE"
  | "ARCHIVED";

export interface STTProviderStatusRow {
  provider_name: STTProviderType;
  status: STTProviderStatus;
  always_available: boolean;
  description: string;
}

export interface AudioCaptureSafeView {
  audio_capture_id: string;
  provider: STTProviderType;
  provider_status_at_start: STTProviderStatus;
  mode: AudioCaptureMode;
  status: AudioCaptureStatus;
  title: string | null;
  summary: string | null;
  duration_ms: number | null;
  meeting_capture_id: string | null;
  workspace_id: string | null;
  segment_count: number;
  full_transcript: string | null;
  failure_class: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegmentView {
  transcript_segment_id: string;
  speaker_label: string | null;
  start_ms: number;
  end_ms: number;
  text: string;
  confidence: number | null;
  is_final: boolean;
}

export interface ListSTTProvidersResponse {
  ok: true;
  providers: STTProviderStatusRow[];
}

export interface ReceiveAudioResponse {
  ok: true;
  audio_capture: AudioCaptureSafeView;
  segments: TranscriptSegmentView[];
  handoff_meeting_capture_id?: string;
}

export interface ListAudioCapturesResponse {
  ok: true;
  audio_captures: AudioCaptureSafeView[];
}

export interface GetAudioCaptureDetailResponse {
  ok: true;
  audio_capture: AudioCaptureSafeView;
  segments: TranscriptSegmentView[];
}

// ─── Phase 1234 — My Day intelligence ────────────────────────
// Calm ambient daily ranking from GET /otzar/my-day/intelligence.
// Foundation builds a SAFE caller-scoped signal pack and ranks it
// through the Python intelligence runtime (or the honest fixture
// fallback). Counts + closed-vocab labels only — never payloads.

export type MyDayProviderStatus =
  | "PYTHON_CONFIGURED"
  | "FIXTURE_PROVIDER_URL_NOT_SET"
  | "FIXTURE_PROVIDER_DISABLED"
  | "FIXTURE_PROVIDER_TIMEOUT"
  | "FIXTURE_PROVIDER_ERROR"
  | "FIXTURE_PROVIDER_INVALID_RESPONSE";

export type MyDaySuggestionReason =
  | "PENDING_APPROVALS_AWAITING_YOU"
  | "AUTHORITY_GRANT_EXPIRING_SOON"
  | "SENSITIVE_GRANT_REQUIRES_CASE_BY_CASE"
  | "COLLABORATION_INBOX_NEEDS_RESPONSE"
  | "COLLABORATION_NEEDS_YOUR_APPROVAL"
  | "COLLABORATION_BLOCKED_NEEDS_ATTENTION"
  | "CHAT_NEEDS_APPROVAL"
  | "CHAT_NEEDS_CLARIFICATION"
  | "CHAT_COLLABORATION_SUGGESTED"
  | "PROJECT_ACTIVITY_RESUMING"
  | "TEACH_YOUR_TWIN_PREFERENCES"
  | "REVIEW_RECENT_ACTIONS";

export interface MyDaySuggestion {
  rank: number;
  reason: MyDaySuggestionReason;
  safe_title: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_CONTEXT";
  risk:
    | "NONE"
    | "APPROVAL_REQUIRED"
    | "POLICY_REVIEW"
    | "MISSING_CONTEXT"
    | "CROSS_TEAM_DEPENDENCY"
    | "PROJECT_BLOCKER"
    | "DMW_SCOPE_NEEDED";
  score: number;
}

export interface MyDaySignals {
  proposed_actions_count: number;
  recent_action_count: number;
  unread_notifications_count: number;
  collaboration_inbox_pending_count: number;
  collaboration_needs_approval_count: number;
  collaboration_blocked_count: number;
  active_authority_grants_count: number;
  expiring_soon_grants_count: number;
  sensitive_case_by_case_grants_count: number;
  active_project_count: number;
  open_commitments_owned_count: number;
  waiting_on_external_count: number;
  owed_to_external_count: number;
  most_recent_action_at: string | null;
  most_recent_collaboration_at: string | null;
}

export interface MyDayIntelligenceView {
  headline: string;
  suggestions: MyDaySuggestion[];
  signals: MyDaySignals;
  waiting_on_external: {
    they_owe_us_count: number;
    we_owe_them_count: number;
  };
  provider_status: MyDayProviderStatus;
  generated_at: string;
}

export interface MyDayIntelligenceResponse {
  ok: true;
  intelligence: MyDayIntelligenceView;
}

// ─── [DGI-COHERENCE WAVE-2] Collaborative organizational intelligence ──
// Product projection of the same leak-safe strip the Twin receives.
// Pairing failures are fields (BLOCKED/UNPAIRED), not fetch failures.

export type DgiTwinPairingStatus = "OK" | "TWIN_NOT_FOUND" | "TWIN_AMBIGUOUS";

export type DgiCoherenceStatus =
  | "HEALTHY"
  | "NEEDS_ATTENTION"
  | "BLOCKED"
  | "UNPAIRED";

export type DgiCoherenceSignal =
  | "CONFLICTED"
  | "HANDOFF_INCOMPLETE"
  | "AUTHORITY_PRESENT"
  | "AUTHORITY_MISSING"
  | "CORRECTIONS_ACTIVE"
  | "OBLIGATIONS_OPEN"
  | "PAIRING_OK"
  | "PAIRING_BLOCKED"
  | "PAIRING_UNPAIRED";

export type DgiAutonomyCeiling =
  | "OBSERVE"
  | "DRAFT"
  | "EXECUTE_WITH_CONFIRMATION"
  | "EXECUTE_WITHIN_POLICY"
  | "DELEGATE_WITHIN_SCOPE"
  | "ESCALATE"
  | "FAIL_CLOSED";

export type DgiNextBestStepKind =
  | "RESOLVE_TWIN_PAIRING"
  | "PAIR_TWIN"
  | "REVIEW_ORG_TRUTH"
  | "ACKNOWLEDGE_HANDOFF"
  | "ADVANCE_OBLIGATION"
  | "GRANT_AUTHORITY"
  | "IDLE_HEALTHY";

export interface DgiNextBestStep {
  kind: DgiNextBestStepKind;
  priority: number;
  safe_title: string;
  reason: string;
  route_hint: string;
  autonomy_ceiling: DgiAutonomyCeiling;
}

export interface DgiCoherenceSnapshot {
  open_obligations_count: number;
  open_obligation_titles: string[];
  open_org_truth_conflicts_count: number;
  active_personal_corrections_count: number;
  active_twin_authority_grants_count: number;
  open_incoming_handoffs_count: number;
  open_incoming_handoff_titles: string[];
  /** Optional deep-link ids from newer API builds. */
  open_incoming_handoff_ids?: string[];
  open_obligation_ids?: string[];
  open_org_truth_conflict_ids?: string[];
  twin_pairing_status: DgiTwinPairingStatus;
  twin_entity_id: string | null;
  eligible_twin_count: number;
  coherence_status: DgiCoherenceStatus;
  attention_count: number;
  /** Optional on older API builds — treat as []. */
  signals?: DgiCoherenceSignal[];
  /** Optional on older API builds — treat as null. */
  next_best_step?: DgiNextBestStep | null;
  system_block: string;
}

/** [STAGE-2 §L] Multi-party responsibility handoff (safe projection). */
export interface SafeHandoffView {
  handoff_id: string;
  state: string;
  title: string;
  summary: string | null;
  priority: string;
  outgoing_responsible_entity_id: string;
  incoming_responsible_entity_id: string | null;
  workspace_id: string | null;
  conversation_id: string | null;
  is_escalated: boolean;
  is_terminal: boolean;
  caller_is_outgoing: boolean;
  caller_is_incoming: boolean;
  version: number;
  created_at: string;
  sent_at: string | null;
  received_at: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  due_at: string | null;
}

export interface HandoffListResponse {
  ok: true;
  handoffs: SafeHandoffView[];
}

export interface HandoffAmbientAcknowledgeResponse {
  ok: true;
  handoff: SafeHandoffView;
  acknowledged_turn_id: string;
  conversation_id: string;
}

export interface DgiCollaborationRecommendation {
  kind: string;
  selected_actor_id: string | null;
  goal_id: string | null;
  obligation_id: string | null;
  risk_class: string;
  autonomy_ceiling: string;
  safe_summary: string;
  reason: string;
}

export interface DgiCollaborationPlanView {
  recommendation_count: number;
  recommendations: DgiCollaborationRecommendation[];
  metrics: {
    actor_count: number;
    twin_count: number;
    open_obligation_count: number;
    open_handoff_count: number;
    at_risk_goal_count: number;
    fail_closed_count: number;
    cross_org_rejected: number;
  };
}

export interface DgiTwinAuthorityPosture {
  has_active_grants: boolean;
  sample_action_checks: Array<{
    action_type: string;
    allowed: boolean;
    reason: string | null;
  }>;
}

export interface DgiCoherenceResponse {
  ok: true;
  coherence: DgiCoherenceSnapshot;
  /** WAVE-4 — optional on older API builds. */
  collaboration_plan?: DgiCollaborationPlanView;
  twin_authority_posture?: DgiTwinAuthorityPosture;
}

// ─── Phase 1227 — OCR / Observe (governed document observation) ──
// "Let Otzar read this": capture → provider text extraction →
// structured extraction (the Phase 1213 comms pipeline) → optional
// workspace attach. Suggested follow-ups are draft proposals only.

export type ObserveOCRProvider =
  | "DEMO_FIXTURE"
  | "PLAIN_TEXT"
  | "TESSERACT_LOCAL"
  | "AWS_TEXTRACT"
  | "GOOGLE_VISION";

export type ObserveOCRProviderStatus =
  | "READY"
  | "DEMO_ONLY"
  | "BLOCKED_BY_KEY"
  | "NEEDS_PROVIDER_INSTALL";

export interface ObserveProviderStatusRow {
  provider: ObserveOCRProvider;
  status: ObserveOCRProviderStatus;
  display_name: string;
  description: string;
  required_envs: string[];
}

export interface ObserveProvidersResponse {
  ok: true;
  providers: ObserveProviderStatusRow[];
}

export type ObserveCaptureSourceType =
  | "IMAGE"
  | "PDF"
  | "DOCUMENT"
  | "SCREENSHOT"
  | "PLAIN_TEXT_SOURCE"
  | "DEMO";

export interface ObserveCaptureView {
  observe_capture_id: string;
  provider: ObserveOCRProvider;
  source_type: ObserveCaptureSourceType;
  title: string | null;
  status: "RECEIVED" | "EXTRACTED" | "FAILED" | "ATTACHED";
  extracted_text_summary: string | null;
  extraction: CommsExtractionResult | null;
  workspace_id: string | null;
  created_at: string;
}

export interface ObserveExtractResponse {
  ok: true;
  capture: ObserveCaptureView;
}

export interface ObserveCapturesListResponse {
  ok: true;
  captures: ObserveCaptureView[];
}

export interface ObserveAttachWorkspaceResponse {
  ok: true;
  capture: ObserveCaptureView;
  imported_decisions: number;
  imported_commitments: number;
}

// ─── Phase 1236 — calendar-aware quiet mode ──────────────────
// GET /otzar/calendar/context: whether voice is appropriate right
// now. Meeting detection comes from real MeetingCapture schedule
// windows (credential-free); provider_mode is honest readiness.

export type CalendarProviderMode =
  | "MOCK_CALENDAR"
  | "GOOGLE_CALENDAR_CONFIGURED"
  | "MICROSOFT_CALENDAR_CONFIGURED"
  | "BLOCKED_BY_CREDENTIALS"
  | "ERROR";

export type CalendarQuietReason =
  | "IN_MEETING"
  | "PRESENTING"
  | "FOCUS_TIME"
  | "OUTSIDE_WORK_HOURS"
  | "USER_PREFERENCE"
  | "NONE";

export interface CalendarContextResponse {
  ok: true;
  provider_mode: CalendarProviderMode;
  quiet_recommended: boolean;
  quiet_reason: CalendarQuietReason;
  current_event?: {
    title_summary: string;
    starts_at: string;
    ends_at: string;
    meeting_provider?: "GOOGLE_MEET" | "ZOOM" | "MICROSOFT_TEAMS" | "OTHER";
    has_external_participants: boolean;
    capture_allowed_status:
      | "ALLOWED"
      | "NEEDS_CONSENT"
      | "BLOCKED"
      | "UNKNOWN";
  };
  next_event?: {
    title_summary: string;
    starts_at: string;
    prep_recommended: boolean;
  };
}

// ─── Phase 1237 — Dandelion org growth + onboarding ──────────

export type DandelionRecommendationKind =
  | "ASSIGN_INTERNAL_OWNER"
  | "REDUCE_OVERLOAD"
  // [PROD-UX-BUGD] Was CONNECT_TEAMMATE — renamed because the old copy read as
  // "disconnected from the org" when the only missing object is a first
  // project/workspace assignment. Mirrored from Foundation.
  | "NEEDS_PROJECT_OR_WORKSPACE"
  | "PREPARE_ONBOARDING";

// [PROD-UX-ASSIGN] The org-wide picker feed + assignment result for the
// People & Collaboration "Assign" flow (admin-gated, stable ids only).
export interface AssignmentTarget {
  kind: "project" | "workspace";
  target_id: string;
  label: string;
  status: string;
  created_at: string;
}

export interface AssignmentTargetsResponse {
  ok: boolean;
  targets?: AssignmentTarget[];
  code?: string;
}

export interface AssignmentResponse {
  ok: boolean;
  target_kind?: "project" | "workspace";
  target_id?: string;
  person_entity_id?: string;
  membership_id?: string | null;
  audit_event_id?: string;
  already_member?: boolean;
  code?: string;
  message?: string;
}

// [PROD-UX-BUGD] Structured source-of-truth metadata (mirrored from
// Foundation) — the CT renders accurate copy from the server and keys
// dismissal by the stable person id, never by display name.
export interface DandelionRecommendationContext {
  person_entity_id: string;
  org_member: boolean;
  has_department: boolean;
  has_manager: boolean;
  has_project_or_workspace: boolean;
  missing_connection_type: "PROJECT_OR_WORKSPACE";
}

export interface DandelionRecommendation {
  kind: DandelionRecommendationKind;
  title: string;
  why: string;
  people: string[];
  suggested_next_step: string;
  context?: DandelionRecommendationContext;
}

export interface DandelionOrgGrowthResponse {
  ok: true;
  growth: {
    headline: string;
    recommendations: DandelionRecommendation[];
    signals: {
      members_count: number;
      external_collaborators_count: number;
      unowned_external_count: number;
      members_without_project_count: number;
    };
    /** [GAP-B] The FULL setup queue behind the capped recommendation list
     *  (uncapped server truth; stable ids + safe display fields only).
     *  Optional so older backends without the field stay renderable. */
    needs_first_project_people?: Array<{
      person_entity_id: string;
      display_name: string;
    }>;
    generated_at: string;
  };
}

export interface DandelionOnboardingResponse {
  ok: true;
  onboarding: {
    greeting: string;
    teammates_to_meet: Array<{
      display_name: string;
      role_label: string | null;
      shares_a_project: boolean;
    }>;
    workspaces_to_join: Array<{ workspace_id: string; title: string }>;
    first_steps: string[];
    memory_consent_note: string;
  };
}

export interface DandelionMemoryCandidateResponse {
  ok: true;
  action: SafeActionView;
}

// ─── Phase 1242 — enterprise handoff readiness aggregate ─────

export type HandoffCapabilityClass =
  | "PROD"
  | "PROD_READY_PENDING_SCHEMA_PUSH"
  | "PROD_READY_PENDING_CREDENTIALS"
  | "BLOCKED_BY_CREDENTIALS"
  | "BLOCKED_BY_APP_REVIEW"
  | "DEMO_ONLY"
  | "PARTIAL"
  | "NOT_STARTED";

export interface HandoffReadinessResponse {
  ok: true;
  readiness: {
    headline: string;
    org: {
      checklist_steps_ready: number;
      checklist_steps_total: number;
      mode: string;
    };
    runtimes: Array<{
      runtime: string;
      status: "CONFIGURED" | "FALLBACK_AVAILABLE" | "NOT_CONFIGURED";
      note: string;
    }>;
    connectors: Array<{
      provider: string;
      display_name: string;
      status: string;
      required_envs: string[];
      app_review_required: boolean;
    }>;
    schema: {
      pending_push: boolean;
      pending_tables: string[];
      approval_phrase: string;
      note: string;
    };
    demo_prod_separation: { mode: string; note: string };
    audit_compliance: {
      audit_chain: "LIVE";
      share_packages: HandoffCapabilityClass;
      note: string;
    };
    capabilities: Array<{
      capability: string;
      classification: HandoffCapabilityClass;
      note: string;
    }>;
    generated_at: string;
  };
}

// ─── Phase 1244 — connector adapter status + setup guidance ──

export interface ConnectorAdapterRow {
  provider_name: string;
  category: string;
  display_name: string;
  description: string;
  required_envs: string[];
  oauth_scopes: string[];
  setup_docs_url?: string;
  app_review_required?: boolean;
  can_write: boolean;
  phase: number;
  setup_steps: string[];
  demo_mode_available: boolean;
  status:
    | "CONFIGURED"
    | "BLOCKED_BY_CREDENTIAL"
    | "BLOCKED_BY_APP_REVIEW"
    | "DISABLED"
    | "ERROR";
  missing_envs: string[];
}

export interface ConnectorAdaptersResponse {
  ok: true;
  adapters: ConnectorAdapterRow[];
}

/** Phase 1261 — Priority C OAuth connection status (Foundation
 *  GET /connectors/oauth/status). VERIFIED appears only after a
 *  live server-side probe; token material never rides this shape. */
export type OAuthConnectionStatus =
  | "APP_CREDENTIALS_MISSING"
  | "READY_FOR_CONSENT"
  | "CONNECTED_UNVERIFIED"
  | "VERIFIED"
  | "ERROR_NEEDS_RECONNECT"
  | "REVOKED";

export interface OAuthStatusRow {
  provider: string;
  display_name: string;
  slug: string;
  app_credentials_present: boolean;
  status: OAuthConnectionStatus;
  scopes: string[];
  account_label: string | null;
  connected_at: string | null;
  last_verified_at: string | null;
  redirect_uri: string;
}

export interface OAuthStatusResponse {
  ok: true;
  providers: OAuthStatusRow[];
}

export interface OAuthStartResponse {
  ok: true;
  authorize_url: string;
}

// Phase 1270 — read-only connector data bridges. SAFE projections
// only: no recording download/play URLs, no calendar event titles.
export interface ZoomRecordingView {
  meeting_uuid: string;
  topic: string;
  start_time: string;
  duration_minutes: number;
  recording_count: number;
  total_size_bytes: number;
  file_types: string[];
}

export interface ZoomRecordingsResponse {
  ok: true;
  provider: "zoom";
  recordings: ZoomRecordingView[];
}

export interface FreeBusyInterval {
  start: string;
  end: string;
}

export interface CalendarFreeBusyResponse {
  ok: true;
  provider: "google";
  calendar_id: string;
  time_min: string;
  time_max: string;
  busy: FreeBusyInterval[];
}

// Phase 1272 — gated calendar event proposal/create. The backend
// enforces the gate ladder; the client never asserts readiness it
// can't back. Participants carry display labels only (no emails).
export interface CalendarEventProposalBody {
  title: string;
  participants: Array<{ label: string; resolved: boolean }>;
  selected_time?: { start: string; end: string } | null;
  duration_minutes?: number;
  source_command?: string;
  prerequisite?: string;
  participant_confirmations_satisfied?: boolean;
  requires_approval?: boolean;
  approved?: boolean;
  caller_confirmed?: boolean;
}

// [GOOGLE-DOCS-WRITE] Gated Google Doc create — caller_confirmed required;
// Foundation never auto-creates. Success carries real document_id + link.
export interface GoogleDocCreateBody {
  title: string;
  body_text?: string;
  requires_approval?: boolean;
  approved?: boolean;
  caller_confirmed?: boolean;
  policy_blocked?: boolean;
  source_command?: string;
}

export type GoogleDocGateCode =
  | "NEEDS_TITLE"
  | "NEEDS_APPROVAL"
  | "NEEDS_CALLER_CONFIRMATION"
  | "POLICY_BLOCKED"
  | "GOOGLE_RECONNECT_REQUIRED"
  | "DOC_WRITE_SCOPE_MISSING"
  | "PROVIDER_ERROR";

export interface GoogleDocCreateSuccess {
  ok: true;
  status: "CREATED";
  source_kind: "google_docs";
  document_id: string;
  title: string;
  web_view_link: string | null;
}

// Phase 1279 — durable Work Ledger entry (safe projection).
// [CE-1] Read-only clarity projection (FND clarity.service.ts): ranked
// "who can clarify?" candidates with human reasons. Suggestions only —
// nothing is created, sent, or escalated by this projection.
export interface ClarityCandidateView {
  entity_id: string;
  display_name: string;
  role: string;
  reason: string;
  rank: number;
}
export interface ClarityProjectionView {
  can_answer: boolean;
  authority_question: boolean;
  source_author_state: "resolved" | "ambiguous" | "unresolved" | "none";
  candidates: ClarityCandidateView[];
  // [CE-2] the caller's own clarification on this row (latest), so the Why
  // shows requested → clarified/declined without a new surface.
  pending_clarification?: {
    escalation_id: string;
    status: string;
    clarifier_entity_id: string;
    clarifier_display_name: string;
  };
}

// [CE-4B] Manager exception summary (FND team-clarity-health.service.ts):
// counts + org-internal labels only — never answer text, excerpts, or
// private activity. Rendered only when a count is non-zero (calm).
export interface TeamClarityHealthView {
  unresolved_clarifications_count: number;
  overdue_clarifications_count: number;
  ownership_unclear_count: number;
  repeated_ambiguity_topics: Array<{ label: string; count: number }>;
  top_exception?: { label: string; reason: string };
  external_relationships?: ExternalRelationshipsSummaryView;
}

// [T-4] External relationship exceptions on the same manager summary —
// client/vendor work at risk as counts + governed account labels. Absent
// (or all-zero) renders silence; never a CRM feed.
export interface ExternalRelationshipsSummaryView {
  waiting_on_external_count: number;
  internal_commitments_to_external_count: number;
  overdue_external_count: number;
  external_review_pending_count: number;
  external_ownership_unclear_count: number;
  repeated_external_ambiguity_count: number;
  top_external_exception?: { label: string; reason: string };
  external_topics: Array<{ label: string; count: number }>;
}

// [CE-3] Structured clarity answer (FND clarity-answer.service.ts):
// deterministic, truth-composed, read-only. The suggested action is a
// SUGGESTION the human clicks through the existing CE-2 rail.
export interface ClarityAnswerView {
  answer: string;
  confidence: "high" | "medium" | "low";
  used_sources: string[];
  suggested_next_action?: {
    type: "request_clarification";
    clarifier_entity_id: string;
    label: string;
  };
}

// [T-1] External-party context (FND external-context.service.ts): safe
// labels only, present only when a deterministic org-scoped link proves it
// (governed collaborator/commitment or roster-first lineage match).
// Context, not CRM — absent on most rows by design.
// [AIX-1] Mirror of FND SeededOriginProjection — customer-safe only.
export interface SeededOriginView {
  origin: "seeded_history" | "seeded_document";
  origin_label: string;
  currentness_label?: string;
  covering_period_label?: string;
  boundary_label: string;
  confidence_note: string;
  // [AIX-2] human validation read-through — labels only; present only
  // after someone answered "Is this still current?" on the row.
  validation_state_label?: string;
  validation_guidance?: string;
}

// [AIX-3] Mirror of FND ContextCandidateProjection — derived candidate
// relevance ("may relate — needs confirmation"). Labels only; the
// ledger_entry_id exists solely to route AIX-2 validation, never as copy.
export interface ContextCandidateView {
  ledger_entry_id: string;
  title_label: string;
  origin_label: string;
  covering_period_label?: string;
  status_label: string;
  reason_label: string;
  signal_labels: string[];
  validation_state_label?: string;
  validation_guidance?: string;
}

// [DOC-EXTRACT] Review-first extraction preview (FND ExtractPreviewResult).
// Candidates are possibilities for human review — never facts, never work
// until a human approves one through the existing work rail.
export interface DocumentWorkCandidateView {
  kind_label: string;
  text: string;
  can_create: boolean;
  suggested_ledger_type?: "TASK" | "DECISION" | "BLOCKER";
  excerpt?: string;
}
export interface DocumentExtractPreviewResponse {
  ok: boolean;
  source: {
    title_label: string;
    origin_label: string;
    currentness_label?: string;
    covering_period_label?: string;
  };
  candidates: DocumentWorkCandidateView[];
  review_note: string;
}

// [CTX-BOUNDARY] Mirror of FND ContextBoundariesProjection — grouped
// counts + recent seeded-document labels for the admin boundary view.
export interface ContextBoundariesView {
  seeded_history_count: number;
  seeded_document_count: number;
  extracted_reviewed_count: number;
  /** [RETENTION] retired from active use — still preserved. */
  retired_context_count: number;
  recent_documents: Array<{
    title_label: string;
    origin_label: string;
    currentness_label?: string;
    covering_period_label?: string;
    seeded_on: string;
  }>;
}

// [RETENTION] one row of the admin seeded-document lifecycle list. The
// id exists only as the retire/restore POST target — never as copy.
export interface SeededDocumentLifecycleRowView {
  ledger_entry_id: string;
  title_label: string;
  origin_label: string;
  currentness_label?: string;
  covering_period_label?: string;
  seeded_on: string;
  lifecycle_state_label: string;
}

export interface ExternalContextView {
  external_party_type:
    | "client"
    | "prospect"
    | "vendor"
    | "partner"
    | "contractor"
    | "regulator"
    | "customer"
    | "unknown";
  external_org_label?: string;
  external_person_label?: string;
  relationship_label?: string;
  safe_context_label: string;
  waiting_direction?: "we_owe_them" | "they_owe_us" | "unknown";
  source: "external_collaborator" | "external_commitment" | "source_lineage" | "none";
}

// [GAP-J] The SAFE source-lineage block (FND SourceLineageProjection).
// Closed-vocab scalars only — the raw source id, dedupe key, URL, and
// connector identity deliberately never cross the API.
export interface SourceLineageView {
  source_system: string;
  source_id_present: boolean;
  has_source_excerpt: boolean;
  source_actor: string | null;
  source_timestamp: string | null;
}

export interface WorkLedgerEntryView {
  ledger_entry_id: string;
  ledger_type: string;
  source_type: string;
  source_command: string | null;
  work_plan_id: string | null;
  requester_entity_id: string | null;
  owner_entity_id: string | null;
  target_entity_id: string | null;
  title: string;
  status: string;
  priority: string;
  extraction_source: string;
  next_action: string | null;
  due_at: string | null;
  created_at: string;
  // PROD-UX-P0A — link to the source conversation + the governed execution
  // link/plan (Slice F backend projects these on WorkLedgerView). execution_plan
  // is the stored camelCase plan (requiredConnector / executionMode / executionType
  // / capabilityState / approvalRequired / nextBestAction); read defensively.
  conversation_id?: string | null;
  proposed_action_id?: string;
  execution_plan?: Record<string, unknown>;
  // Phase 1281 — governed BEAM coordination result (create-time).
  coordination_runtime?: string;
  coordination_watcher?: string;
  // Phase 1282 — advisory Python enrichment truth (View/Why). Present only
  // when enrichment ran; status names the degrade path when Python was not
  // used. Foundation stays the authority — this never decides ownership.
  python_enrichment?: {
    status: string;
    signals: Array<{ signal_type: string; confidence: string; evidence_phrase: string }>;
    primary_signal: string | null;
    multi_intent: boolean;
  };
  // Phase 1285-V — the SAFE advisory meeting-intelligence projection (present
  // only when the row carries it; read-only display surface for Phase 1286-C).
  meeting_intelligence?: MeetingIntelligenceView;
  // Phase 1283 — persisted coordination summary (read back from the row, not
  // just the create response).
  coordination?: {
    runtime: string;
    event_id: string | null;
    watcher: string | null;
    dispatched_at: string | null;
    error_code: string | null;
  };
  // Phase 1283 — internal watcher state. Never sends anything.
  watchers?: Array<{
    watcher_id: string;
    watcher_type: string;
    status: string;
    source_runtime: string;
    escalation_level: string;
    created_at: string;
  }>;
  // Phase 1283 — set when the row is in Blind Spots due to a runtime/
  // verification failure (vs a ledger-status blind spot).
  blind_spot_reason?: string;
  blind_spot_severity?: string;
  // Phase 1285-E — the thread message this work was tracked from (proof link).
  source_message_id?: string;
  // [GAP-J] — quiet source-lineage truth (safe scalars only; FND
  // sourceLineageFromDetails). Present only when the row's source was
  // recorded by the ingest spine — the UI never invents an origin.
  source_lineage?: SourceLineageView;
  // [T-1] — external-party context (context, not CRM). Present only when a
  // deterministic org-scoped link proves it. Additive + optional.
  external_context?: ExternalContextView;
  /** [AIX-1] seeded-origin lineage — calm background labels for rows born
   *  from setup seeding. Absent on live-work rows. */
  seeded_origin?: SeededOriginView;
  // Phase 1285-E — server-computed: the caller owns this active task and may
  // mark it complete (My Work only). Drives the "Mark complete" control.
  can_complete?: boolean;
  // Phase 1285-G — human-readable participant names (Team Work enrichment).
  owner_display_name?: string;
  requester_display_name?: string;
  target_display_name?: string;
  // PROD-UX-P0R — the routing/autonomy decision PROJECTION Foundation attaches
  // to getMyWork items (and serves per-item via GET /work-os/ledger/:id/
  // routing-decision). Pure read over persisted decider outputs — the UI
  // renders it; it never recomputes policy. Additive + optional.
  routing?: RoutingDecisionView;
  // PROD-UX-P0R — the anchoring audit event link (persisted column), surfaced
  // so routing/audit affordances can deep-link. Additive + optional.
  audit_event_id?: string;
  // [SCHEDULED-LANE] Foundation's SAFE curated roster projection for a terminal
  // calendar MEETING/EXECUTED row: provider + participant label/role/required
  // ONLY. Never carries event_id / calendar_id / recipient_entity_ids /
  // entity_ids (those stay in `details`, off the wire). Present only for
  // calendar_event rows. Additive + optional.
  scheduled_meeting?: {
    provider: string | null;
    participants: Array<{ label: string; role: string | null; required: boolean }>;
  };
}

// PROD-UX-P0R — mirror of Foundation's RoutingDecisionView
// (apps/api/src/services/work-os/routing-decision.ts). The lane a ledger row
// sits in plus the plain-language why; reasons arrive already humanized
// (no enum literals / underscores / backend jargon).
export type RoutingLane =
  | "silent_capture"
  | "silent_routing"
  | "notify_owner"
  | "draft_ready"
  | "execute_when_allowed"
  | "ask_approval"
  | "escalate"
  | "blocked"
  | "setup_required"
  | "identity_review";

export interface RoutingDecisionView {
  lane: RoutingLane;
  reason: string;
  risk: "low" | "medium" | "high";
  confidence: number | null;
  policy_basis: string | null;
  owner_entity_id: string | null;
  owner_status: "resolved" | "needs_review" | "unowned";
  next_best_action: string | null;
  required_tool: string | null;
  evidence_refs: string[];
  audit_pointer: string | null;
}

// Phase 1282 — durable execution evidence for a ledger entry. An attempt is
// EVIDENCE that a runtime step happened, never an action.
export interface ExecutionAttemptView {
  attempt_id: string;
  ledger_entry_id: string;
  attempt_type: string;
  runtime: string;
  evidence_type: string;
  status: string;
  error_code: string | null;
  created_at: string;
  verified_at: string | null;
}

export interface ExecutionAttemptListResponse {
  ok: boolean;
  attempts?: ExecutionAttemptView[];
}

// Phase 1284 Wave 3 — direct relationship thread (both-direction exchange).
export interface DirectThreadMessageView {
  message_id: string;
  sender_entity_id: string;
  sender_display_name: string;
  sender_role_title: string | null;
  body: string;
  created_at: string;
  from_me: boolean;
  // Phase 1285 slice 3 — advisory POSSIBLE work signal (never auto-promoted).
  signal?: {
    signal_type: string;
    confidence: string;
    evidence_phrase: string;
    // Phase 1285-C — true when this message is already tracked in the Work
    // Ledger; the chip renders an "Already tracked" terminal state.
    tracked?: boolean;
  };
}
export interface DirectThreadResponse {
  ok: boolean;
  thread_key?: string;
  participants?: Array<{ entity_id: string; display_name: string; role_title: string | null }>;
  messages?: DirectThreadMessageView[];
  latest_message_at?: string | null;
  code?: string;
}

// Phase 1285 slice 4 — waiting-on relationship (derived from Work Ledger).
export interface WaitingOnItemView {
  ledger_entry_id: string;
  ledger_type: string;
  title: string;
  status: string;
  due_at: string | null;
  source_message_id: string | null;
}
export interface WaitingOnResponse {
  ok: boolean;
  waiting_on_them?: WaitingOnItemView[];
  pending_from_them?: WaitingOnItemView[];
  code?: string;
}

// Phase 1285-M — relationship work graph (durable answers for completed /
// blockers / decisions / both waiting-on directions).
export interface RelationshipItemView {
  ledger_entry_id: string;
  ledger_type: string;
  title: string;
  status: string;
  requester_entity_id: string | null;
  owner_entity_id: string | null;
  requester_display_name: string;
  owner_display_name: string;
  due_at: string | null;
  updated_at: string;
  source_message_id: string | null;
}
export interface RelationshipWorkResponse {
  ok: boolean;
  other_display_name?: string;
  waiting_on_them?: RelationshipItemView[];
  pending_from_them?: RelationshipItemView[];
  completed?: RelationshipItemView[];
  blockers?: RelationshipItemView[];
  decisions?: RelationshipItemView[];
  code?: string;
}

// Phase 1285-N — Blind Spots typed risk feed.
export type BlindSpotType =
  | "OVERDUE_WORK"
  | "STALE_WAITING_ON"
  | "UNRESOLVED_BLOCKER"
  | "NO_NEXT_ACTION";
export interface BlindSpotFeedItem {
  blind_spot_id: string;
  type: BlindSpotType;
  title: string;
  summary: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ledger_entry_id: string;
  ledger_type: string;
  status: string;
  owner_entity_id: string | null;
  requester_entity_id: string | null;
  owner_display_name: string | null;
  requester_display_name: string | null;
  due_at: string | null;
  age_days: number;
  source_message_id: string | null;
  recommended_action: string;
  detection_rule: string;
}
export interface BlindSpotFeedResponse {
  ok: boolean;
  items?: BlindSpotFeedItem[];
  code?: string;
}

// ── Governed watcher feed (Phase 1285-P) — the richer WatcherFinding contract.
//    Mirrors apps/api/src/services/work-os/watcher.service.ts. ──
export type WatcherType =
  | "STALE_WAITING_ON"
  | "OVERDUE_WORK"
  | "UNRESOLVED_BLOCKER"
  | "NO_NEXT_ACTION"
  | "UNANSWERED_ASK"
  | "STALE_COMMITMENT";

export type WatcherActionKind =
  | "view_thread"
  | "view_work"
  | "nudge_owner"
  | "mark_complete"
  | "assign_owner"
  | "review_blocker"
  | "none";

// A person on a finding, server-resolved. display_name is ALWAYS a human label
// ("Unknown entity" when unresolved); entity_id is secondary proof only.
export interface WatcherEntity {
  entity_id: string | null;
  display_name: string;
  unresolved: boolean;
}

export interface WatcherFinding {
  finding_id: string;
  watcher_type: WatcherType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  summary: string;
  org_id: string;
  owner: WatcherEntity | null;
  requester: WatcherEntity | null;
  target: WatcherEntity | null;
  related_person: WatcherEntity | null;
  source: {
    source_system:
      | "work_ledger"
      | "thread"
      | "waiting_on"
      | "signal"
      | "relationship_summary";
    ledger_entry_id: string | null;
    source_message_id: string | null;
    source_thread_key: string | null;
    relationship_key: string | null;
  };
  detection: {
    rule_id: string;
    detected_at: string;
    age_hours: number | null;
    due_at: string | null;
    threshold_hours: number | null;
    reason: string;
  };
  recommendation: {
    next_action: string;
    action_kind: WatcherActionKind;
  };
}

export interface WatcherFeedResponse {
  ok: boolean;
  findings?: WatcherFinding[];
  code?: string;
}

// ── Advisory intelligence envelope (Phases 1285-U..Z) ───────────────────────
// The CT projection of the Foundation PythonIntelligenceEnvelope. Foundation is
// the authority; this is advisory DISPLAY metadata only. CT labels the narrative
// "Advisory (Python)" only when authority === "FOUNDATION_VALIDATED"; otherwise
// the deterministic Foundation value is shown with an honest status.
export interface PythonAdvisoryEnvelope {
  status: string; // PENDING | PYTHON_ENRICHED | NOT_CONFIGURED | UNHEALTHY | TIMEOUT | ERROR | NO_SIGNAL | SKIPPED | FOUNDATION_REJECTED | FOUNDATION_DOWNGRADED
  source: string; // "PYTHON_ADVISORY"
  authority: string | null; // "FOUNDATION_VALIDATED" | "FOUNDATION_REJECTED" | null
  capability: string;
  latency_ms: number | null;
  provenance: string | null;
  warnings: string[];
  updated_at: string;
}

// ── Operational health (Phase 1285-Z) — advisory OPERATIONAL_ANALYTICS over a
//    Foundation-scoped execution-health snapshot. health_score / execution_status
//    / counts are DETERMINISTIC (Foundation-authoritative); the narrative is
//    advisory. ──
export type OperationalScope = "personal" | "team" | "org";
export type ExecutionStatus = "HEALTHY" | "WATCH" | "AT_RISK" | "CRITICAL";

export interface OperationalHealthAssessment {
  scope: OperationalScope;
  health_score: number;
  execution_status: ExecutionStatus;
  summary: string;
  top_risks: string[];
  recurring_blockers: string[];
  overloaded_people: string[];
  suggested_focus: string[];
  recommended_next_actions: string[];
  total_work: number;
  overdue_count: number;
  blocked_count: number;
  waiting_on_count: number;
  no_next_action_count: number;
  stale_work_count: number;
  high_risk_count: number;
  critical_risk_count: number;
  recent_completed_count: number;
  recent_failed_count: number;
  confidence: string;
  reasoning_summary: string | null;
  human_review_needed: boolean;
  provenance: string; // "python:operational-analytics" | "foundation:deterministic-analytics"
}
export interface OperationalHealthResponse {
  ok: boolean;
  health?: OperationalHealthAssessment;
  envelope?: PythonAdvisoryEnvelope;
  code?: string;
}

// ── Risk assessment (Phase 1285-X) — advisory RISK_SCORING enriching the
//    deterministic watcher findings. Deterministic Blind Spots / Watchers remain
//    primary; risk_assessment is ADDITIVE advisory metadata. ──
export interface RiskAssessment {
  risk_score: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: string;
  reason: string;
  contributing_signals: string[];
  suggested_next_action: string;
  human_review_needed: boolean;
  provenance: string; // "python:risk-scoring" | "foundation:deterministic-risk"
}
export type RiskAssessedFinding = WatcherFinding & { risk_assessment: RiskAssessment };
export interface RiskAssessmentResponse {
  ok: boolean;
  findings?: RiskAssessedFinding[];
  envelope?: PythonAdvisoryEnvelope;
  code?: string;
}

// ── Draft tone (Phase 1285-Y) — advisory DRAFT_TONE over a PROPOSED message.
//    original_draft is PRESERVED verbatim; suggested_revision is advisory and
//    null when a Python rewrite was rejected (downgraded). approval_required is
//    Foundation-authoritative (Python can raise, never lower). ──
export type DraftToneChannel =
  | "internal_message"
  | "email"
  | "meeting_follow_up"
  | "action_proposal"
  | "voice_draft"
  | "unknown";

export interface DraftRecipientContext {
  display_name?: string; // display name only — never a raw entity UUID
  relationship?: string;
  internal: boolean;
}

export interface DraftToneAssessment {
  original_draft: string;
  channel: DraftToneChannel;
  quality_score: number;
  tone_label: string;
  risk_flags: string[];
  suggested_revision: string | null;
  reason: string;
  confidence: string;
  approval_required: boolean;
  preserves_intent: boolean;
  provenance: string; // "python:draft-tone" | "foundation:deterministic-tone"
}
export interface DraftToneEvaluateResponse {
  ok: boolean;
  assessment?: DraftToneAssessment;
  envelope?: PythonAdvisoryEnvelope;
  code?: string;
}

// ── Comms recent-artifacts feed (Phase 1285-T) — mirrors
//    apps/api/src/services/work-os/comms-artifacts.service.ts. ──
export type CommsArtifactType =
  | "DIRECT_MESSAGE"
  | "THREAD_REPLY"
  | "WORK_CAPTURE"
  | "FOLLOW_UP"
  | "DECISION"
  | "BLOCKER"
  | "MEETING_CAPTURE"
  | "ACTION_PROPOSAL"
  | "NOTIFICATION";

export interface CommsArtifactEntity {
  entity_id: string | null;
  display_name: string;
  unresolved: boolean;
}

export interface RecentCommsArtifact {
  artifact_id: string;
  artifact_type: CommsArtifactType;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  scope: "personal";
  related_person: CommsArtifactEntity | null;
  source: {
    source_system: string;
    source_message_id: string | null;
    ledger_entry_id: string;
  };
  destination: {
    kind: "work" | "thread" | "notification" | "none";
    route: string | null;
  };
  // Phase 1286-C — the SAFE advisory meeting-intelligence projection, present
  // only when the underlying ledger row carries it (read-only display).
  meeting_intelligence?: MeetingIntelligenceView;
}

export interface RecentCommsArtifactsResponse {
  ok: boolean;
  artifacts?: RecentCommsArtifact[];
  next_cursor?: string | null;
  code?: string;
}

// [PROD-UX-BUGB] A pending drafted follow-up, projected from a durable FOLLOW_UP
// Work Ledger row so the Comms send-cards survive navigation/refresh. `action`
// is the full pre-governed send-card stored verbatim at ingest, so the CT
// re-renders the SAME ProposedActionCard (draft + recipient governance +
// autonomy). `ledger_entry_id` is the PATCH target on send (-> EXECUTED) and
// dismiss (-> CANCELLED).
export interface PendingFollowUp {
  ledger_entry_id: string;
  meeting_capture_id: string | null;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  action: CommsSuggestedAction;
  /** [PROD-UX-BUGC] Present ONLY on ambiguous cards: selectable people resolved
   *  SERVER-side (id-based, tenant-scoped) for the "Choose recipient" review.
   *  The CT renders labels and posts back an entity_id — it never resolves
   *  identity from a display name. */
  select_candidates?: Array<{ entity_id: string; display_name: string }>;
}

export interface PendingFollowUpsResponse {
  ok: boolean;
  follow_ups?: PendingFollowUp[];
  code?: string;
  message?: string;
}

// [PROD-UX-BUGC] Complete a blocked recipient review on a durable follow-up:
// confirm (out_of_scope / likely — the caller vouches; proof source becomes
// caller_confirmed) or select (ambiguous — resolve to a specific org member).
// unauthorized / cross_team_needs_approval reject with human copy — a sender
// can never self-approve past a policy or approval boundary.
export interface ResolveRecipientRequest {
  decision: "confirm" | "select";
  recipient_entity_id?: string;
}

export interface ResolveRecipientResponse {
  ok: boolean;
  follow_up?: PendingFollowUp;
  audit_event_id?: string;
  code?: string;
  message?: string;
}

// ── Meeting intelligence projection (Phase 1285-V; surfaced read-only in Phase
//    1286-C). The SAFE shape: short candidates only, never the raw transcript or
//    chain-of-thought. candidate_type ∈ SUMMARY / DECISION / ACTION_ITEM /
//    BLOCKER / RISK / OPEN_QUESTION / COMMITMENT / FOLLOW_UP / DRAFT_SUGGESTION. ──
export interface MeetingIntelligenceCandidateView {
  candidate_type: string;
  text: string;
  confidence: string;
}
export interface MeetingIntelligenceView {
  status: string;
  authority: string | null;
  capability: string;
  summary: string | null;
  candidates: MeetingIntelligenceCandidateView[];
}

// ── Semantic retrieval (Phase 1285-W; surfaced in Ask your Twin at Phase
//    1286-D). Foundation-scoped results only; the title is the primary label
//    (never a raw UUID). The advisory rerank is validated by Foundation. ──
export interface SemanticRetrievalResultView {
  result_id: string;
  result_type: string;
  title: string;
  summary: string | null;
  score: number;
  reason: string;
  source: { source_system: string; ledger_entry_id: string };
  route: string;
  related_person: { entity_id: string | null; display_name: string; unresolved: boolean } | null;
  created_at: string;
  updated_at: string;
  scope_label: string;
  provenance: string; // "python:semantic-rerank" | "foundation:deterministic-lexical"
}
export interface SemanticRetrievalQueryResponse {
  ok: boolean;
  results?: SemanticRetrievalResultView[];
  envelope?: PythonAdvisoryEnvelope;
  code?: string;
}

// Phase 1284 — human-authority direct internal message result.
export interface InternalMessageResponse {
  ok: boolean;
  status: "DELIVERED" | "NEEDS_RESOLUTION" | "GATED" | "BLOCKED";
  notification_id?: string;
  ledger_entry_id?: string | null;
  recipient_entity_id?: string;
  recipient_display_name?: string;
  sender_display_name?: string;
  reason?: string;
  resolution?: {
    kind: string;
    reason: string;
    candidates?: Array<{ entity_id: string; display_name: string; role_title: string | null }>;
  };
}

export interface WorkLedgerCreateResponse {
  ok: true;
  entry: WorkLedgerEntryView;
}

export interface WorkLedgerListResponse {
  ok: true;
  items?: WorkLedgerEntryView[];
  entries?: WorkLedgerEntryView[];
  // PROD-UX-SCALE — server pagination (my-work): present when the route
  // paginates; absent on older payloads (treated as no-more).
  skip?: number;
  take?: number;
  has_more?: boolean;
}

// Phase 1277 — polyglot runtime fabric capability registry.
export interface RuntimeView {
  status:
    | "NOT_CONFIGURED"
    | "CONFIGURED_UNVERIFIED"
    | "HEALTHY"
    | "UNHEALTHY"
    | "DISABLED";
  env_key: string | null;
  configured: boolean;
  capabilities: string[];
  note: string;
  last_checked_at: string | null;
}

export interface RuntimeCapabilitiesResponse {
  ok: true;
  runtimes: {
    typescript_api: RuntimeView;
    python_worker: RuntimeView;
    beam_fabric: RuntimeView;
    desktop_native: RuntimeView;
    queue_event_bus: RuntimeView;
    fallback_active: boolean;
  };
}

// Phase 1273 — authority context (hierarchy/RBAC/ABAC) from the backend.
export interface AuthorityContextView {
  caller_can_admin_org: boolean;
  target_resolution:
    | "RESOLVED_INTERNAL_ENTITY"
    | "AMBIGUOUS"
    | "NOT_FOUND"
    | "NEEDS_EMAIL"
    | "RUNTIME_MISSING";
  target_entity_id: string | null;
  target_display_name: string | null;
  target_role_title: string | null;
  caller_is_manager_of_target: boolean;
  caller_can_view_target_calendar: boolean;
  caller_can_schedule_with_target: boolean;
  caller_can_assign_task_to_target: boolean;
  // Phase 1274 — enterprise time context.
  caller_timezone: string | null;
  target_timezone: string | null;
  org_default_timezone: string;
}

export interface WorkOsPolicyResult {
  action: string;
  decision: string;
  reason_code: string;
  reason: string;
}

export interface AuthorityContextResponse {
  ok: true;
  authority: AuthorityContextView;
  policies: WorkOsPolicyResult[];
}

// POST /api/v1/work-os/resolve-target — name → org entity, read-scoped so any
// authenticated employee can resolve a same-org teammate (active membership
// only; no cross-org). Returns the single match, or all candidates when the
// name is ambiguous, so the caller can ask ONE focused clarification.
export interface ResolveTargetMatch {
  entity_id: string;
  display_name: string;
  role_title: string | null;
}

export interface ResolveTargetResponse {
  ok: true;
  resolution: {
    code:
      | "RESOLVED_INTERNAL_ENTITY"
      | "AMBIGUOUS"
      | "NOT_FOUND"
      | "NEEDS_EMAIL"
      | "RUNTIME_MISSING";
    match: ResolveTargetMatch | null;
    candidates: ResolveTargetMatch[];
  };
}

/** Gate blocker codes returned by the gated create endpoint. */
export type CalendarEventGateCode =
  | "NEEDS_SELECTED_TIME"
  | "PARTICIPANT_UNRESOLVED"
  | "NEEDS_PARTICIPANT_CONFIRMATION"
  | "NEEDS_APPROVAL"
  | "NEEDS_CALLER_CONFIRMATION"
  | "POLICY_BLOCKED"
  | "GOOGLE_RECONNECT_REQUIRED"
  | "EVENT_WRITE_SCOPE_MISSING"
  | "CALENDAR_PROVIDER_UNAVAILABLE";

// ════════════════════════════════════════════════════════════════
// PHASE 1300-A — High-Sensitivity REVIEW CENTER (governance surface)
// Consumes the shipped Foundation routes (1297-A / 1298-A / 1299-A /
// 1299-B). SAFE-LABELS-ONLY: the UI never displays raw capsule body,
// payload_content, storage_location, embedding, content_hash, medical/
// biometric/children content, secrets, hidden reasoning, or payment
// data. Entity-id fields are references the UI must NOT surface as
// primary labels. Visibility is NOT approval authority — every action
// honors the backend response code.
// ════════════════════════════════════════════════════════════════

// The list scopes the backend honors (1299-B).
export type ReviewListScope = "mine" | "org_reviewable" | "org_history";

// SAFE projection of one high-sensitivity review (mirrors Foundation's
// SafeReviewView — labels + lifecycle only, never raw content).
export interface HighSensitivityReview {
  review_id: string;
  listing_id: string;
  data_package_id: string;
  grant_id: string | null;
  provider_entity_id: string;
  provider_org_entity_id: string | null;
  buyer_entity_id: string;
  buyer_org_entity_id: string | null;
  requester_entity_id: string;
  reviewer_entity_id: string | null;
  intended_use: string;
  access_mode: string;
  sensitivity_class: string;
  sensitive_categories: string[];
  policy_decision: string;
  policy_reason_codes: string[];
  approved_access_modes: string[];
  status: string;
  raw_body_allowed: false;
  proof_required: boolean;
  training_allowed: boolean;
  model_improvement_allowed: boolean;
  redistribution_allowed: boolean;
  commercial_use_allowed: boolean;
  expires_at: string | null;
  reviewed_at: string | null;
  revoked_at: string | null;
  denial_reason: string | null;
  created_at: string;
}

// SAFE org-scoped status counts (1299-B summary).
export interface ReviewSummary {
  pending_review_count: number;
  approved_count: number;
  denied_count: number;
  revoked_count: number;
  expired_count: number;
  expiring_soon_count: number;
}

// GET /api/v1/foundation/high-sensitivity/reviews?scope=…
export interface ReviewListResponse {
  ok: true;
  scope: ReviewListScope;
  reviews: HighSensitivityReview[];
  summary?: ReviewSummary;
}

// One SAFE lifecycle/eligibility audit row (1299-B projection).
export interface ReviewAuditEvent {
  event_type: string;
  outcome: string;
  timestamp: string;
  denial_reason: string | null;
  status: string | null;
  access_mode: string | null;
  candidate_reviewer_entity_id: string | null;
  reviewer_scope: string | null;
  reviewer_reason_codes: string[];
}

// GET /api/v1/foundation/high-sensitivity/reviews/:id/audit
export interface ReviewAuditResponse {
  ok: true;
  review: HighSensitivityReview;
  audit_events: ReviewAuditEvent[];
}

// POST approve/deny/revoke → the updated SAFE review.
export interface ReviewActionResponse {
  ok: true;
  review: HighSensitivityReview;
}

// Optional bodies for the review actions (safe fields only — never raw
// content; never training/model-improvement/redistribution/commercial).
export interface ReviewApproveRequest {
  approved_access_modes?: string[];
  expires_at?: string;
}
export interface ReviewDenyRequest {
  reason?: string;
}
export interface ReviewRevokeRequest {
  reason?: string;
}

// ════════════════════════════════════════════════════════════════
// CROSS-ORG MARKETPLACE DISCOVERY (Phase 1301-A backend / 1302-A shell)
// ════════════════════════════════════════════════════════════════
// The cross-org discovery catalog is metadata-only: a provider opts a
// PUBLISHED listing into CROSS_ORG reach, and other orgs can browse its
// SAFE projection. Browsing GRANTS NOTHING — access is still provider-
// governed (request-access here only surfaces requirements; it never
// implies a grant). High-sensitivity data products are never discoverable.

export type MarketplaceListingType =
  | "AGENT"
  | "SKILL"
  | "TOOL"
  | "DEVICE"
  | "APP"
  | "WORLD"
  | "CONNECTOR"
  | "SERVICE"
  | "DATA_PACKAGE";

export type MarketplaceListingStatus = "DRAFT" | "PRIVATE" | "PUBLISHED" | "DELISTED";
export type MarketplaceDiscoveryScope = "PRIVATE" | "CROSS_ORG";

// SAFE projection of one marketplace listing (mirrors Foundation's
// SafeListingView — labels + advisory metadata only; never capsules,
// grants, consent, or raw content).
export interface DiscoveredListing {
  listing_id: string;
  listing_type: MarketplaceListingType;
  provider_entity_id: string;
  title: string;
  description: string;
  version: string;
  // Advisory only — no real settlement. e.g. {"model":"PER_USE","amount_usd":0.01}
  pricing_model: unknown;
  required_authority: string[];
  required_memory_scope: string[];
  trust_metadata: unknown;
  status: MarketplaceListingStatus;
  discovery_scope: MarketplaceDiscoveryScope;
  created_at: string;
}

// GET /api/v1/foundation/marketplace/discover
export interface DiscoverListingsResponse {
  ok: true;
  listings: DiscoveredListing[];
}

// ── Federation Cloud cohort governance (Phase 1310-A) ───────────────────────
// SAFE projections mirroring Foundation's cohort substrate (1305-A registry +
// 1307-A access requests + 1308-A delivery + 1309-A metering). The UI never
// receives raw capsule content, contributor identities, exact eligible counts,
// or real settlement — cohorts are governed substrate with MOCK-only economics.

export type CohortStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

// Mirrors SafeCohortView (federation-cloud-cohort.service.ts).
export interface SafeCohort {
  cohort_product_id: string;
  provider_entity_id: string;
  title: string;
  description: string;
  cohort_type: string;
  access_modes: string[];
  allowed_uses: string[];
  sensitivity_class: string;
  sensitive_categories: string[];
  minimum_cohort_size: number;
  consent_required: boolean;
  opt_in_required: boolean;
  proof_required: boolean;
  raw_body_excluded: boolean;
  training_allowed: boolean;
  commercial_use_allowed: boolean;
  retention_policy: string | null;
  metering_unit: string | null;
  status: CohortStatus;
  created_at: string;
  // Honesty markers — accounting/registry only until delivery enforces them.
  threshold_enforced: boolean;
  signal_available: boolean;
}

// GET /api/v1/foundation/cohorts
export interface CohortListResponse {
  ok: true;
  cohorts: SafeCohort[];
}

// Mirrors CohortMockEconomics (cohort-metering.service.ts). Always a mock.
export interface CohortMockEconomics {
  is_mock: boolean;
  settlement_mode: string;
  asset: string;
  metering_unit: string | null;
  unit_price_usd: number | null;
  billable_units: number;
  estimated_amount_usd: number | null;
  note: string;
}

// Mirrors CohortUsageView (cohort-metering.service.ts).
export interface CohortUsage {
  cohort_product_id: string;
  total_attempts: number;
  delivered_count: number;
  suppressed_count: number;
  denied_count: number;
  delivered_by_access_mode: Record<string, number>;
  mock_economics: CohortMockEconomics;
  generated_at: string;
}

// GET /api/v1/foundation/cohorts/:id/usage
export interface CohortUsageResponse {
  ok: true;
  usage: CohortUsage;
}

export type CohortAccessRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "DENIED"
  | "REVOKED"
  | "EXPIRED";

// Mirrors SafeAccessRequestView (cohort-access-request.service.ts).
export interface SafeCohortAccessRequest {
  request_id: string;
  cohort_product_id: string;
  buyer_entity_id: string;
  intended_use: string;
  requested_access_mode: string;
  status: CohortAccessRequestStatus;
  requires_review: boolean;
  proof_required: boolean;
  retention_policy: string | null;
  decision_reason: string | null;
  requested_at: string;
  decided_at: string | null;
  expires_at: string | null;
  signal_available: boolean;
}

// GET /api/v1/foundation/cohorts/:id/access-requests
export interface CohortAccessRequestsResponse {
  ok: true;
  access_requests: SafeCohortAccessRequest[];
  is_manager: boolean;
}

// POST /api/v1/foundation/cohorts/:id/access-requests/:rid/decide
export interface CohortDecideResponse {
  ok: true;
  access_request: SafeCohortAccessRequest;
}

// ── Data grants: Buyer Access Console + Contributor Sovereignty (1311-B/1312-A)
// SAFE projections of governed data-access grants. A grant never delivers raw
// content (raw_body_excluded). Economics are mock-only. Revocation is visible +
// enforced at read time.

export type DataGrantStatus =
  | "PENDING_CONSENT"
  | "ACTIVE"
  | "REVOKED"
  | "EXPIRED"
  | "DENIED";

// Mirrors SafeDataGrantView (marketplace.service.ts).
export interface SafeDataGrant {
  grant_id: string;
  listing_id: string;
  data_package_id: string;
  provider_entity_id: string;
  buyer_entity_id: string;
  intended_use: string;
  access_mode: string;
  status: DataGrantStatus;
  proof_required: boolean;
  proof_delivery: string;
  economic_decision: string | null;
  raw_body_excluded: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

// GET /api/v1/foundation/marketplace/my-data-grants?role=buyer|provider
export interface DataGrantsListResponse {
  ok: true;
  role: "buyer" | "provider";
  grants: SafeDataGrant[];
}

export interface DataGrantUsage {
  read_count: number;
  denied_count: number;
  last_accessed_at: string | null;
}

export interface DataGrantPolicy {
  allowed_uses: string[];
  training_allowed: boolean;
  model_improvement_allowed: boolean;
  sensitivity_class: string | null;
  aggregate_only: boolean;
  depersonalized_only: boolean;
  raw_body_excluded: boolean;
}

// GET /api/v1/foundation/marketplace/data-grants/:id/console (buyer)
export interface BuyerGrantConsoleResponse {
  ok: true;
  console: {
    grant: SafeDataGrant;
    resource: { listing_title: string | null; listing_type: string | null };
    policy: DataGrantPolicy;
    usage: DataGrantUsage;
    settlement: { is_mock: boolean; economic_decision: string | null; note: string };
  };
}

// GET /api/v1/foundation/marketplace/data-grants/:id/sovereignty (provider)
export interface ProviderGrantSovereigntyResponse {
  ok: true;
  sovereignty: {
    grant: SafeDataGrant;
    resource: { listing_title: string | null; listing_type: string | null };
    policy: DataGrantPolicy;
    usage: DataGrantUsage;
    sovereignty: {
      is_active: boolean;
      revocable: boolean;
      status: DataGrantStatus;
      revoked_at: string | null;
      revocation_reason: string | null;
      expires_at: string | null;
      revocation_enforced_at_read: boolean;
    };
  };
}

// POST /api/v1/foundation/marketplace/data-grants/:id/revoke
export interface RevokeDataGrantResponse {
  ok: true;
  grant: SafeDataGrant;
}

// ── Cohort participation + discovery (Phase 1313-B / 1314-A) ─────────────────

// Mirrors MyCohortContributionView (cohort-contribution.service.ts) — the
// CALLER's own participation only (never other contributors).
export interface MyCohortContribution {
  contribution_id: string;
  cohort_product_id: string;
  contribution_scope: string;
  status: string;
  joined_at: string;
  withdrawn_at: string | null;
  self_initiated: boolean;
}

// GET /api/v1/foundation/cohorts/my-contributions
export interface MyCohortContributionsResponse {
  ok: true;
  contributions: MyCohortContribution[];
}

// POST /api/v1/foundation/cohorts/:id/join
export interface CohortJoinResponse {
  ok: true;
  contribution: MyCohortContribution;
}

// POST /api/v1/foundation/cohorts/:id/withdraw
export interface CohortWithdrawResponse {
  ok: true;
  withdrawn_count: number;
}

// POST /api/v1/foundation/cohorts/:id/access-requests (buyer request)
export interface CohortRequestAccessResponse {
  ok: true;
  access_request: SafeCohortAccessRequest;
}

// POST /api/v1/foundation/cohorts (register)
export interface CohortRegisterResponse {
  ok: true;
  cohort: SafeCohort;
}
