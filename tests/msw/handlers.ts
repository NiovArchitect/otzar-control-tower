// FILE: handlers.ts
// PURPOSE: MSW request handlers for Foundation endpoints invoked by
//          tests. Each test sub-box (12B.1, 12B.2, ...) extends this
//          file with handlers for the new endpoints it consumes.
// CONNECTS TO: tests/msw/server.ts (uses these handlers), every
//              unit test that exercises real API client paths.

import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:3000/api/v1";

// ════════════════════════════════════════════════════════════════
// 12B.1 baseline (now extended in 12B.4 with body recorder + failure
// fixture for the GRANTEE_NO_TAR path).
// ════════════════════════════════════════════════════════════════

// 12B.4 (Refinement 4): Foundation /cosmp/share + /cosmp/share/:bridgeId
// recorders return { count, lastBody, allBodies } so tests can assert
// both the LAST body shape AND total call count (defends against
// accidental double-submit regressions).
export interface RecordedShareCall {
  count: number;
  lastBody: Record<string, unknown> | null;
  allBodies: Record<string, unknown>[];
}
export interface RecordedRevokeCall {
  count: number;
  lastBridgeId: string | null;
  allBridgeIds: string[];
}

// 12B.4 GRANTEE_NO_TAR fixture: when the share request grantee_entity_id
// matches this id, the handler returns the 404 ShareFailure shape
// Foundation produces (per share.service.ts:90 + cosmp.routes.ts:375).
// Test 12 uses this to verify Stage 4 fail-toast surfaces result.message
// AND omits any audit_event_id (12B.0 contract).
export const GRANTEE_NO_TAR_FIXTURE_ID =
  "fafafafa-fafa-fafa-fafa-fafafafafafa";

const recordedShare: { count: number; bodies: Record<string, unknown>[] } = {
  count: 0,
  bodies: [],
};
const recordedRevoke: { count: number; ids: string[] } = {
  count: 0,
  ids: [],
};

export function getRecordedShareCalls(): RecordedShareCall {
  const last = recordedShare.bodies[recordedShare.bodies.length - 1] ?? null;
  return {
    count: recordedShare.count,
    lastBody: last !== null ? { ...last } : null,
    allBodies: recordedShare.bodies.map((b) => ({ ...b })),
  };
}
export function resetRecordedShareCalls(): void {
  recordedShare.count = 0;
  recordedShare.bodies = [];
}
export function getRecordedRevokeCalls(): RecordedRevokeCall {
  return {
    count: recordedRevoke.count,
    lastBridgeId:
      recordedRevoke.ids[recordedRevoke.ids.length - 1] ?? null,
    allBridgeIds: [...recordedRevoke.ids],
  };
}
export function resetRecordedRevokeCalls(): void {
  recordedRevoke.count = 0;
  recordedRevoke.ids = [];
}

const shareSuccessAuditId = "11111111-2222-3333-4444-555555555555";
const shareSuccessBridgeId = "00000000-1111-2222-3333-444444444444";

const shareHandler = http.post(
  `${API_BASE}/cosmp/share`,
  async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    recordedShare.count += 1;
    recordedShare.bodies.push(body);
    if (body.grantee_entity_id === GRANTEE_NO_TAR_FIXTURE_ID) {
      // Failure path: Foundation share.service.ts returns this shape
      // when the grantee has no TAR. cosmp.routes.ts:375 maps the
      // code to HTTP 404. NO audit_event_id surfaced (12B.0 contract).
      return HttpResponse.json(
        {
          ok: false,
          code: "GRANTEE_NO_TAR",
          message: "Grantee has no TAR",
        },
        { status: 404 },
      );
    }
    const grantsLength = Array.isArray(body.capsule_grants)
      ? (body.capsule_grants as unknown[]).length
      : 0;
    return HttpResponse.json(
      {
        ok: true,
        bridge_id: shareSuccessBridgeId,
        permissions_created: Array.from(
          { length: Math.max(grantsLength, 1) },
          (_, i) => `perm-${i}`,
        ),
        audit_event_id: shareSuccessAuditId,
      },
      { status: 201 },
    );
  },
);

const revokeSuccessAuditId = "22222222-3333-4444-5555-666666666666";

const revokeHandler = http.delete(
  `${API_BASE}/cosmp/share/:bridgeId`,
  async ({ params }) => {
    const bridgeId = String(params.bridgeId);
    recordedRevoke.count += 1;
    recordedRevoke.ids.push(bridgeId);
    return HttpResponse.json(
      {
        ok: true,
        bridge_id: bridgeId,
        revoked_count: 2,
        audit_event_id: revokeSuccessAuditId,
      },
      { status: 200 },
    );
  },
);

// ════════════════════════════════════════════════════════════════
// 12B.2 additions: Users + InviteWizard + Home Recent Activity
// ════════════════════════════════════════════════════════════════

// Captures the most recent /org/members POST body so the wizard
// test can assert password discipline (decision #21). Reset between
// tests via tests/setup.ts server.resetHandlers().
export interface RecordedMembersPost {
  body: Record<string, unknown>;
}
const recordedMembersPost: RecordedMembersPost = { body: {} };
const recordedCalls = {
  members: false,
  onboardingStart: false,
  onboardingInvite: false,
};

export function getLastMembersPostBody(): Record<string, unknown> {
  return { ...recordedMembersPost.body };
}
export function getRecordedCalls(): typeof recordedCalls {
  return { ...recordedCalls };
}
export function resetRecordedCalls(): void {
  recordedMembersPost.body = {};
  recordedCalls.members = false;
  recordedCalls.onboardingStart = false;
  recordedCalls.onboardingInvite = false;
}

const newMemberId = "10000000-aaaa-bbbb-cccc-000000000001";
const newAuditId = "30000000-aaaa-bbbb-cccc-000000000003";
const phase3AuditId = "40000000-aaaa-bbbb-cccc-000000000004";

const membersCreateHandler = http.post(
  `${API_BASE}/org/members`,
  async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    recordedMembersPost.body = body;
    recordedCalls.members = true;
    return HttpResponse.json(
      {
        ok: true,
        entity_id: newMemberId,
        email: body.email,
        display_name:
          `${body.first_name ?? ""} ${body.last_name ?? ""}`.trim() ||
          (body.email as string),
        audit_event_id: newAuditId,
      },
      { status: 201 },
    );
  },
);

const onboardingStartHandler = http.post(
  `${API_BASE}/org/onboarding/start`,
  async () => {
    recordedCalls.onboardingStart = true;
    return HttpResponse.json(
      {
        ok: true,
        org_entity_id: "org-test",
        mode: "HIERARCHY",
        total_users: 4,
        propagation_order: [
          {
            entity_id: "manager-id",
            display_name: "Existing Manager",
            hierarchy_level: 0,
            is_admin: true,
            reason: "Org admin",
            status: "ACTIVATED",
            activated_at: new Date().toISOString(),
          },
          {
            entity_id: newMemberId,
            display_name: "Pending Invitee",
            hierarchy_level: 1,
            is_admin: false,
            reason: "New invitee",
            status: "PENDING",
            activated_at: null,
          },
          {
            entity_id: "report-1",
            display_name: "Report One",
            hierarchy_level: 2,
            is_admin: false,
            reason: "Direct report",
            status: "PENDING",
            activated_at: null,
          },
          {
            entity_id: "report-2",
            display_name: "Report Two",
            hierarchy_level: 2,
            is_admin: false,
            reason: "Direct report",
            status: "PENDING",
            activated_at: null,
          },
        ],
      },
      { status: 200 },
    );
  },
);

const onboardingInviteHandler = http.post(
  `${API_BASE}/org/onboarding/invite`,
  async () => {
    recordedCalls.onboardingInvite = true;
    return HttpResponse.json(
      {
        ok: true,
        org_entity_id: "org-test",
        entity_id: newMemberId,
        twin_id: "twin-test",
        hive_membership_id: null,
        activation_credential: "act-cred-test",
        audit_event_id: phase3AuditId,
      },
      { status: 200 },
    );
  },
);

const entitiesListHandler = http.get(
  `${API_BASE}/org/entities`,
  async () => {
    return HttpResponse.json(
      {
        ok: true,
        items: [
          {
            entity_id: "00000000-aaaa-bbbb-cccc-000000000001",
            entity_type: "PERSON",
            display_name: "Sarah Lee",
            email: "sarah@example.com",
            status: "ACTIVE",
            clearance_level: 4,
            public_key: "pk_sarah",
            failed_auth_attempts: 0,
            suspended_at: null,
            created_at: new Date(Date.now() - 86_400_000).toISOString(),
            updated_at: new Date(Date.now() - 3_600_000).toISOString(),
            deleted_at: null,
          },
        ],
        total: 1,
        skip: 0,
        take: 25,
      },
      { status: 200 },
    );
  },
);

const entitiesPatchHandler = http.patch(
  `${API_BASE}/org/entities/:id`,
  async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        ok: true,
        entity_id: String(params.id),
        entity_type: "PERSON",
        display_name: "Patched Member",
        email: "patched@example.com",
        status: (body.status as string) ?? "ACTIVE",
        clearance_level: 4,
        public_key: "pk_patched",
        failed_auth_attempts: 0,
        suspended_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
      { status: 200 },
    );
  },
);

// /org/audit handler returns a MIXED set of event_types so the
// Home Recent Activity test can verify the client-side ADMIN_ACTION
// filter works correctly (Test 8).
const auditListHandler = http.get(
  `${API_BASE}/org/audit`,
  async () => {
    const baseTime = Date.now();
    function row(
      i: number,
      event_type: string,
    ): Record<string, unknown> {
      return {
        audit_id: `audit-${event_type}-${i}`,
        event_type,
        actor_entity_id: "actor-1",
        target_entity_id: "target-1",
        target_capsule_id: null,
        session_id: null,
        outcome: "SUCCESS",
        denial_reason: null,
        details: { action: `${event_type}_DETAIL_${i}` },
        ip_address: null,
        timestamp: new Date(baseTime - i * 60_000).toISOString(),
      };
    }
    const items: Record<string, unknown>[] = [];
    // 10 ADMIN_ACTION + 10 LOGIN_SUCCESS + 5 CAPSULE_CREATED, mixed.
    for (let i = 0; i < 10; i++) items.push(row(i, "ADMIN_ACTION"));
    for (let i = 0; i < 10; i++) items.push(row(i, "LOGIN_SUCCESS"));
    for (let i = 0; i < 5; i++) items.push(row(i, "CAPSULE_CREATED"));
    return HttpResponse.json(
      { ok: true, items, total: items.length, skip: 0, take: items.length },
      { status: 200 },
    );
  },
);

const analyticsHandler = http.get(
  `${API_BASE}/org/analytics`,
  async () => {
    return HttpResponse.json(
      {
        ok: true,
        org_entity_id: "org-test",
        pending_approvals_count: 0,
        active_twins: 3,
        capsule_count: 42,
        compound_score: 85,
        decision_count: 0,
        pattern_count: 7,
        vocab_count: 21,
        external_count: 0,
        completion_rate: 0.62,
      },
      { status: 200 },
    );
  },
);

const hierarchyHandler = http.get(
  `${API_BASE}/org/hierarchy`,
  async () => {
    return HttpResponse.json(
      { ok: true, memberships: [] },
      { status: 200 },
    );
  },
);

// 12B.4: /org/permissions returns ACTIVE Permission rows mixing:
//   - 3 distinct bridge_ids (one stacks 2 permissions on the same
//     grantee × capsule_type cell so the matrix's bridgeCount=2 path
//     is exercised),
//   - mixed access_scopes + can_share_forward booleans + duration_types
//     so MatrixCell aggregation (max-scope, OR-of-share-forward) is
//     exercised,
//   - 1 row whose capsule_id is NOT in the /org/capsules slice (the
//     CROSS_WALLET_CAPSULE_ID below) so Test 11 can assert
//     cross-wallet drop-out (Drift 4 + Drift 6).
const ORG_CAPSULE_DECISION_ID = "c1c1c1c1-1111-1111-1111-111111111111";
const ORG_CAPSULE_DECISION_ID_2 = "c1c1c1c1-2222-2222-2222-222222222222";
const ORG_CAPSULE_HANDOFF_ID = "c2c2c2c2-1111-1111-1111-111111111111";
const ORG_CAPSULE_RISK_ID = "c3c3c3c3-1111-1111-1111-111111111111";
const CROSS_WALLET_CAPSULE_ID = "feedfeed-feed-feed-feed-feedfeedfeed";

const SARAH_ID = "00000000-aaaa-bbbb-cccc-000000000001";
const TWIN_A_ID = "20000000-aaaa-bbbb-cccc-000000000001";

const BRIDGE_A_ID = "bbbbbbbb-1111-1111-1111-aaaaaaaaaaaa";
const BRIDGE_B_ID = "bbbbbbbb-2222-2222-2222-aaaaaaaaaaaa";
const BRIDGE_C_ID = "bbbbbbbb-3333-3333-3333-aaaaaaaaaaaa";

const permissionsHandler = http.get(
  `${API_BASE}/org/permissions`,
  async () => {
    const now = new Date().toISOString();
    function row(args: {
      id: string;
      bridge_id: string;
      capsule_id: string;
      grantee: string;
      access_scope: "METADATA_ONLY" | "SUMMARY" | "FULL";
      can_share_forward: boolean;
      duration_type: "TEMPORARY" | "SHORT_TERM" | "LONG_TERM";
    }) {
      return {
        permission_id: args.id,
        bridge_id: args.bridge_id,
        capsule_id: args.capsule_id,
        grantor_entity_id: "org-test",
        grantee_entity_id: args.grantee,
        access_scope: args.access_scope,
        duration_type: args.duration_type,
        can_share_forward: args.can_share_forward,
        monetization_active: false,
        status: "ACTIVE",
        valid_from: now,
        expires_at: null,
        conditions: {},
        created_at: now,
      };
    }
    const items = [
      // BRIDGE_A: Sarah, two rows on DECISION cell — exercises
      // bridgeCount=1 + multi-row max-scope (FULL > SUMMARY).
      row({
        id: "perm-a-1",
        bridge_id: BRIDGE_A_ID,
        capsule_id: ORG_CAPSULE_DECISION_ID,
        grantee: SARAH_ID,
        access_scope: "SUMMARY",
        can_share_forward: false,
        duration_type: "TEMPORARY",
      }),
      row({
        id: "perm-a-2",
        bridge_id: BRIDGE_A_ID,
        capsule_id: ORG_CAPSULE_DECISION_ID_2,
        grantee: SARAH_ID,
        access_scope: "FULL",
        can_share_forward: true,
        duration_type: "TEMPORARY",
      }),
      // BRIDGE_B: Sarah, HANDOFF cell — separate bridge, distinct cell
      // so Test 11 sees columns ordered by frequency.
      row({
        id: "perm-b-1",
        bridge_id: BRIDGE_B_ID,
        capsule_id: ORG_CAPSULE_HANDOFF_ID,
        grantee: SARAH_ID,
        access_scope: "METADATA_ONLY",
        can_share_forward: false,
        duration_type: "SHORT_TERM",
      }),
      // BRIDGE_C: Twin A, RISK cell — second grantee on the matrix
      // so Test 11's "rows" assertion has multiple entries.
      row({
        id: "perm-c-1",
        bridge_id: BRIDGE_C_ID,
        capsule_id: ORG_CAPSULE_RISK_ID,
        grantee: TWIN_A_ID,
        access_scope: "FULL",
        can_share_forward: true,
        duration_type: "LONG_TERM",
      }),
      // CROSS-WALLET ROW: capsule_id NOT in /org/capsules slice. Test
      // 11 asserts this row is dropped from the matrix display.
      row({
        id: "perm-x-1",
        bridge_id: "bbbbbbbb-9999-9999-9999-aaaaaaaaaaaa",
        capsule_id: CROSS_WALLET_CAPSULE_ID,
        grantee: SARAH_ID,
        access_scope: "FULL",
        can_share_forward: false,
        duration_type: "PERMANENT" as never,
      }),
    ];
    return HttpResponse.json(
      { ok: true, items, total: items.length, skip: 0, take: 250 },
      { status: 200 },
    );
  },
);

// 12B.4: /org/capsules returns slim OrgCapsuleListItem rows (10 fields
// including relevance_score). Org-wallet-only by Foundation design.
// The CROSS_WALLET_CAPSULE_ID intentionally does NOT appear here so
// Test 11 can assert cross-wallet drop-out behavior.
const capsulesHandler = http.get(
  `${API_BASE}/org/capsules`,
  async () => {
    const now = new Date().toISOString();
    function capsule(
      id: string,
      type:
        | "DECISION"
        | "HANDOFF"
        | "RISK"
        | "COMMITMENT"
        | "BLOCKER",
      summary: string,
      tags: string[],
    ) {
      return {
        capsule_id: id,
        capsule_type: type,
        topic_tags: tags,
        relevance_score: 0.5,
        payload_summary: summary,
        payload_size_tokens: 256,
        clearance_required: 1,
        access_count: 0,
        created_at: now,
        last_accessed_at: null,
      };
    }
    const items = [
      capsule(
        ORG_CAPSULE_DECISION_ID,
        "DECISION",
        "Q4 pricing decision summary.",
        ["pricing", "q4"],
      ),
      capsule(
        ORG_CAPSULE_DECISION_ID_2,
        "DECISION",
        "Q3 vendor selection decision.",
        ["vendors", "q3"],
      ),
      capsule(
        ORG_CAPSULE_HANDOFF_ID,
        "HANDOFF",
        "Onboarding playbook handoff to new manager.",
        ["onboarding"],
      ),
      capsule(
        ORG_CAPSULE_RISK_ID,
        "RISK",
        "Top supplier concentration risk.",
        ["supplier-risk"],
      ),
      capsule(
        "c4c4c4c4-1111-1111-1111-111111111111",
        "COMMITMENT",
        "Quarterly board commitment summary.",
        ["board"],
      ),
      capsule(
        "c5c5c5c5-1111-1111-1111-111111111111",
        "BLOCKER",
        "Vendor-renewal blocker summary.",
        ["renewals"],
      ),
    ];
    return HttpResponse.json(
      { ok: true, items, total: items.length, skip: 0, take: 250 },
      { status: 200 },
    );
  },
);

// ════════════════════════════════════════════════════════════════
// 12B.3 additions: AI Teammates screen + TwinDetailDrawer
// ════════════════════════════════════════════════════════════════
//
// Six handlers cover the endpoints that the AI Teammates screen and
// TwinDetailDrawer consume against a single seeded twin (twinAId).
// Recorders track which mutations fired and capture POST/PATCH
// bodies so unit tests can assert audit_event_id surfacing and the
// 1-call create body shape (no synthetic name/skill_package_id per
// 12B.0). Reset between tests via tests/setup.ts
// server.resetHandlers() + resetRecordedTwinCalls().

export interface RecordedTwinCalls {
  list: boolean;
  detail: boolean;
  create: boolean;
  createBody: Record<string, unknown>;
  update: boolean;
  updateBody: Record<string, unknown>;
  skillPackagesList: boolean;
  addSkill: boolean;
  addSkillBody: Record<string, unknown>;
}
const recordedTwinCalls: RecordedTwinCalls = {
  list: false,
  detail: false,
  create: false,
  createBody: {},
  update: false,
  updateBody: {},
  skillPackagesList: false,
  addSkill: false,
  addSkillBody: {},
};

export function getRecordedTwinCalls(): RecordedTwinCalls {
  return {
    ...recordedTwinCalls,
    createBody: { ...recordedTwinCalls.createBody },
    updateBody: { ...recordedTwinCalls.updateBody },
    addSkillBody: { ...recordedTwinCalls.addSkillBody },
  };
}
export function resetRecordedTwinCalls(): void {
  recordedTwinCalls.list = false;
  recordedTwinCalls.detail = false;
  recordedTwinCalls.create = false;
  recordedTwinCalls.createBody = {};
  recordedTwinCalls.update = false;
  recordedTwinCalls.updateBody = {};
  recordedTwinCalls.skillPackagesList = false;
  recordedTwinCalls.addSkill = false;
  recordedTwinCalls.addSkillBody = {};
}

const twinAId = "20000000-aaaa-bbbb-cccc-000000000001";
const ownerAId = "00000000-aaaa-bbbb-cccc-000000000001";
const skillPackageAId = "50000000-aaaa-bbbb-cccc-000000000001";
const skillPackageBId = "50000000-aaaa-bbbb-cccc-000000000002";
const twinCreateAuditId = "60000000-aaaa-bbbb-cccc-000000000001";
const twinUpdateAuditId = "60000000-aaaa-bbbb-cccc-000000000002";
const twinSkillAuditId = "60000000-aaaa-bbbb-cccc-000000000003";
const twinSkillRowId = "70000000-aaaa-bbbb-cccc-000000000001";
const twinPermissionBridgeId = "80000000-aaaa-bbbb-cccc-000000000001";

const aiTeammatesListHandler = http.get(
  `${API_BASE}/org/ai-teammates`,
  async () => {
    recordedTwinCalls.list = true;
    return HttpResponse.json(
      {
        ok: true,
        items: [
          {
            entity_id: twinAId,
            display_name: "Sarah's AI Teammate",
            status: "ACTIVE",
            created_at: new Date(Date.now() - 7 * 86_400_000).toISOString(),
            config: {
              twin_id: twinAId,
              autonomy_level: "APPROVAL_REQUIRED",
              swarm_enabled: false,
              role_template: "Executive Assistant",
              is_admin_twin: true,
              approver_entity_id: ownerAId,
              updated_at: new Date(Date.now() - 3_600_000).toISOString(),
            },
          },
        ],
        total: 1,
        skip: 0,
        take: 25,
      },
      { status: 200 },
    );
  },
);

const aiTeammatesGetHandler = http.get(
  `${API_BASE}/org/ai-teammates/:id`,
  async ({ params }) => {
    recordedTwinCalls.detail = true;
    const id = String(params.id);
    return HttpResponse.json(
      {
        ok: true,
        entity: {
          entity_id: id,
          entity_type: "AI_AGENT",
          display_name: "Sarah's AI Teammate",
          email: null,
          status: "ACTIVE",
          clearance_level: 6,
          public_key: "pk_twin_a",
          failed_auth_attempts: 0,
          suspended_at: null,
          created_at: new Date(Date.now() - 7 * 86_400_000).toISOString(),
          updated_at: new Date(Date.now() - 3_600_000).toISOString(),
          deleted_at: null,
        },
        twin_config: {
          twin_id: id,
          autonomy_level: "APPROVAL_REQUIRED",
          swarm_enabled: false,
          role_template: "Executive Assistant",
          is_admin_twin: true,
          approver_entity_id: ownerAId,
          updated_at: new Date(Date.now() - 3_600_000).toISOString(),
        },
        owner_entity_id: ownerAId,
        skills: [
          {
            id: twinSkillRowId,
            twin_id: id,
            package_id: skillPackageAId,
            assigned_at: new Date(Date.now() - 6 * 86_400_000).toISOString(),
            package: {
              package_id: skillPackageAId,
              name: "Calendar Coordination",
              category: "PRODUCTIVITY",
              description: "Schedule meetings on behalf of the owner.",
              capability_flags: ["calendar:read", "calendar:write"],
              created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
            },
          },
        ],
      },
      { status: 200 },
    );
  },
);

const aiTeammatesCreateHandler = http.post(
  `${API_BASE}/org/ai-teammates`,
  async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    recordedTwinCalls.create = true;
    recordedTwinCalls.createBody = body;
    return HttpResponse.json(
      {
        ok: true,
        entity_id: twinAId,
        twin_config: {
          twin_id: twinAId,
          autonomy_level: "APPROVAL_REQUIRED",
          swarm_enabled: false,
          role_template: (body.role_title as string) ?? null,
          is_admin_twin: Boolean(body.is_admin_invite),
          approver_entity_id: null,
          updated_at: new Date().toISOString(),
        },
        is_admin_twin: Boolean(body.is_admin_invite),
        org_permission_bridge_id: null,
        owner_permission_bridge_id: twinPermissionBridgeId,
        default_hive_membership_id: null,
        audit_event_id: twinCreateAuditId,
      },
      { status: 201 },
    );
  },
);

const aiTeammatesPatchHandler = http.patch(
  `${API_BASE}/org/ai-teammates/:id`,
  async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    recordedTwinCalls.update = true;
    recordedTwinCalls.updateBody = body;
    return HttpResponse.json(
      {
        ok: true,
        twin_config: {
          twin_id: String(params.id),
          autonomy_level:
            (body.autonomy_level as string) ?? "APPROVAL_REQUIRED",
          swarm_enabled: Boolean(body.swarm_enabled ?? false),
          role_template: (body.role_template as string | null) ?? null,
          is_admin_twin: true,
          approver_entity_id:
            (body.approver_entity_id as string | null) ?? null,
          updated_at: new Date().toISOString(),
        },
        audit_event_id: twinUpdateAuditId,
      },
      { status: 200 },
    );
  },
);

const skillPackagesListHandler = http.get(
  `${API_BASE}/org/skill-packages`,
  async () => {
    recordedTwinCalls.skillPackagesList = true;
    return HttpResponse.json(
      {
        ok: true,
        items: [
          {
            package_id: skillPackageAId,
            name: "Calendar Coordination",
            category: "PRODUCTIVITY",
            description: "Schedule meetings on behalf of the owner.",
            capability_flags: ["calendar:read", "calendar:write"],
            created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
          },
          {
            package_id: skillPackageBId,
            name: "Inbox Triage",
            category: "PRODUCTIVITY",
            description: "Categorize and prioritize incoming mail.",
            capability_flags: ["mail:read"],
            created_at: new Date(Date.now() - 14 * 86_400_000).toISOString(),
          },
        ],
      },
      { status: 200 },
    );
  },
);

const aiTeammatesAddSkillHandler = http.post(
  `${API_BASE}/org/ai-teammates/:id/skills`,
  async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    recordedTwinCalls.addSkill = true;
    recordedTwinCalls.addSkillBody = body;
    return HttpResponse.json(
      {
        ok: true,
        skill: {
          id: twinSkillRowId,
          twin_id: String(params.id),
          package_id: (body.package_id as string) ?? skillPackageBId,
          assigned_at: new Date().toISOString(),
        },
        audit_event_id: twinSkillAuditId,
      },
      { status: 201 },
    );
  },
);

// ════════════════════════════════════════════════════════════════
// Employee Otzar MVP additions: /otzar/* product routes
// ════════════════════════════════════════════════════════════════
//
// These mirror the EMPLOYEE-FACING product routes. The message handler
// supports a sentinel ("__force_llm_unavailable__") to exercise the
// 503 error branch; the observe handler supports a "__duplicate__"
// marker to exercise the DUPLICATE_CONTENT skipped arm.

const otzarConversationMessageHandler = http.post(
  `${API_BASE}/otzar/conversation/message`,
  async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.message === "__force_llm_unavailable__") {
      return HttpResponse.json(
        {
          ok: false,
          code: "LLM_UNAVAILABLE",
          message: "LLM provider unavailable",
        },
        { status: 503 },
      );
    }
    const conversationId =
      typeof body.conversation_id === "string" &&
      body.conversation_id.length > 0
        ? body.conversation_id
        : "conv-msw-0001";
    return HttpResponse.json(
      {
        ok: true,
        response: `Echo: ${String(body.message ?? "")}`,
        context_used: 3,
        tokens_consumed: 128,
        conversation_id: conversationId,
        // ADR-0051 Wave 1 transparency (pre-sanitized projection only --
        // no raw content, no raw denied counts).
        transparency: {
          context_items_used: 2,
          items_skipped_low_relevance: 1,
          items_skipped_budget: 0,
          access_limited: true,
          retrieval_status: "USED",
          retrieval_source: "COE_ASSEMBLE_CONTEXT",
          retrieval_reason:
            "Matched recent decisions and commitments relevant to your message.",
          memory_updated: false,
          tool_calls: [],
          approval_required: false,
          verification_status: "NOT_ACTIVE",
        },
        context_provenance: [
          {
            context_id: "ctx-0001",
            title: "Q4 pricing decision",
            source_type: "DECISION",
            scope: "ENTERPRISE",
            content_available: true,
            reason: "High relevance to your question.",
            tokens_used: 120,
            created_at: new Date().toISOString(),
          },
          {
            context_id: "ctx-0002",
            title: null,
            source_type: "COE_ASSEMBLE_CONTEXT",
            scope: "UNKNOWN",
            content_available: false,
            reason: "Summarized for focus.",
          },
        ],
      },
      { status: 200 },
    );
  },
);

const otzarConversationCloseHandler = http.post(
  `${API_BASE}/otzar/conversation/close`,
  async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        ok: true,
        capsule_id: "cap-conv-summary-0001",
        conversation_id: String(body.conversation_id ?? "conv-msw-0001"),
        topics: ["pricing", "q4-planning"],
      },
      { status: 200 },
    );
  },
);

// Phase 1244 — default connector adapters (setup guidance).
const otzarConnectorAdaptersHandler = http.get(
  `${API_BASE}/connectors/adapters`,
  () =>
    HttpResponse.json({
      ok: true,
      adapters: [
        {
          provider_name: "SLACK",
          category: "MESSAGING",
          display_name: "Slack",
          description: "Workspace messaging.",
          required_envs: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
          oauth_scopes: ["chat:write"],
          app_review_required: false,
          can_write: true,
          phase: 1225,
          setup_steps: [
            "Create a Slack app in your workspace's API portal.",
            "Add the client ID, client secret, and signing secret to your deployment.",
            "Sends remain approval-gated inside Otzar even after connection.",
          ],
          demo_mode_available: true,
          status: "BLOCKED_BY_CREDENTIAL",
          missing_envs: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
        },
        {
          provider_name: "OCR_TESSERACT",
          category: "AI",
          display_name: "Tesseract.js (local OCR)",
          description: "Local image reading.",
          required_envs: [],
          oauth_scopes: [],
          can_write: false,
          phase: 1227,
          setup_steps: [
            "No credentials needed — local reading installs with a future build update.",
          ],
          demo_mode_available: true,
          status: "DISABLED",
          missing_envs: [],
        },
      ],
    }),
);

// Phase 1242 — default handoff readiness aggregate.
const otzarProductionReadinessHandler = http.get(
  `${API_BASE}/otzar/production-readiness`,
  () =>
    HttpResponse.json({
      ok: true,
      readiness: {
        headline:
          "Your organization is ready for a full internal demo today. 9 of 11 setup steps are complete; the production schema update is waiting for your approval.",
        org: { checklist_steps_ready: 9, checklist_steps_total: 11, mode: "DEMO" },
        runtimes: [
          {
            runtime: "Language intelligence (LLM)",
            status: "CONFIGURED",
            note: "A language model provider is configured.",
          },
          {
            runtime: "Voice input (speech-to-text)",
            status: "FALLBACK_AVAILABLE",
            note: "Sample and browser voice paths work today; connect Deepgram or Whisper for production voice input.",
          },
        ],
        connectors: [
          {
            provider: "SLACK",
            display_name: "Slack",
            status: "BLOCKED_BY_CREDENTIAL",
            required_envs: ["SLACK_CLIENT_ID"],
            app_review_required: false,
          },
        ],
        schema: {
          pending_push: true,
          pending_tables: ["collaboration_workspaces"],
          approval_phrase: "APPROVE PROD SCHEMA PUSH",
          note: "The pending update is additive only — no existing data changes. It requires the Founder's explicit approval phrase before it touches production.",
        },
        demo_prod_separation: {
          mode: "DEMO",
          note: "Demo mode — demo data is clearly marked and production is untouched.",
        },
        audit_compliance: {
          audit_chain: "LIVE",
          share_packages: "PROD_READY_PENDING_SCHEMA_PUSH",
          note: "Every action is recorded in the tamper-evident audit trail. Regulator share packages go live with the schema update.",
        },
        capabilities: [
          {
            capability: "Notes, replies & Action Center",
            classification: "PROD",
            note: "Live end-to-end with full audit.",
          },
          {
            capability: "Observe (let Otzar read documents)",
            classification: "PROD_READY_PENDING_SCHEMA_PUSH",
            note: "Sample and pasted-text reading work end-to-end; goes live with the pending schema update.",
          },
          {
            capability: "Slack / Microsoft 365 / Zoom connectors",
            classification: "BLOCKED_BY_CREDENTIALS",
            note: "Setup paths and status are ready; each needs the organization's app credentials.",
          },
          {
            capability:
              "Governed transaction substrate (intent → policy → approval → proof)",
            classification: "PROD",
            note: "Live on the current schema: DMW actors propose, policy gates, humans approve, every step audit-chained.",
          },
          {
            capability: "Mock settlement rail (development/demo)",
            classification: "DEMO_ONLY",
            note: "The only executable rail. Produces clearly-labeled mock receipts — settles nothing.",
          },
          {
            capability: "Circle / Base / USDC settlement",
            classification: "BLOCKED_BY_CREDENTIALS",
            note: "Architecture prepared; no funds move until the Founder explicitly authorizes implementation and credentials exist.",
          },
        ],
        generated_at: new Date().toISOString(),
      },
    }),
);

// Phase 1237 — Dandelion defaults (healthy org; warm onboarding).
const otzarDandelionGrowthHandler = http.get(
  `${API_BASE}/otzar/dandelion/org-growth`,
  () =>
    HttpResponse.json({
      ok: true,
      growth: {
        headline:
          "Your organization looks healthy this week. Otzar will keep watching for ways to help it grow.",
        recommendations: [],
        signals: {
          members_count: 4,
          external_collaborators_count: 1,
          unowned_external_count: 0,
          disconnected_members_count: 0,
        },
        generated_at: new Date().toISOString(),
      },
    }),
);

const otzarDandelionOnboardingHandler = http.get(
  `${API_BASE}/otzar/dandelion/onboarding`,
  () =>
    HttpResponse.json({
      ok: true,
      onboarding: {
        greeting:
          "Welcome, Sadeil — I'm Otzar. I'll help you understand your day, your team, and what needs your attention.",
        teammates_to_meet: [
          {
            display_name: "David Odie",
            role_label: "Tech Lead",
            shares_a_project: true,
          },
        ],
        workspaces_to_join: [
          { workspace_id: "ws-1", title: "Launch Collaboration" },
        ],
        first_steps: [
          "Tell Otzar what to call you — and how to pronounce it.",
          "Open My Day to see what matters today.",
          "Say hello to a teammate Otzar suggested.",
        ],
        memory_consent_note:
          "Otzar only remembers what you approve. Anything you save is private to your organization, recorded in the audit trail, and you can revoke it later.",
      },
    }),
);

// Phase 1236 — default calendar context (no quiet recommendation).
const otzarCalendarContextHandler = http.get(
  `${API_BASE}/otzar/calendar/context`,
  () =>
    HttpResponse.json({
      ok: true,
      provider_mode: "MOCK_CALENDAR",
      quiet_recommended: false,
      quiet_reason: "NONE",
    }),
);

// Phase 1227 — default handlers for the Observe read-flow mounts.
// Per-test server.use(...) overrides take precedence.
const otzarObserveProvidersHandler = http.get(
  `${API_BASE}/otzar/observe/providers`,
  () =>
    HttpResponse.json({
      ok: true,
      providers: [
        {
          provider: "DEMO_FIXTURE",
          status: "DEMO_ONLY",
          display_name: "Sample document",
          description: "Try Otzar's reading flow with a built-in sample.",
          required_envs: [],
        },
        {
          provider: "PLAIN_TEXT",
          status: "READY",
          display_name: "Pasted text",
          description: "Paste text from any document.",
          required_envs: [],
        },
        {
          provider: "AWS_TEXTRACT",
          status: "BLOCKED_BY_KEY",
          display_name: "AWS Textract",
          description: "Cloud document reading. Needs your organization's AWS setup.",
          required_envs: ["AWS_ACCESS_KEY_ID"],
        },
      ],
    }),
);

const otzarCollaborationWorkspacesDefaultHandler = http.get(
  `${API_BASE}/otzar/collaboration/workspaces`,
  () => HttpResponse.json({ ok: true, workspaces: [] }),
);

const otzarObserveHandler = http.post(
  `${API_BASE}/otzar/observe`,
  async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (
      typeof body.content === "string" &&
      body.content.includes("__duplicate__")
    ) {
      return HttpResponse.json(
        { ok: true, skipped: true, reason: "DUPLICATE_CONTENT" },
        { status: 200 },
      );
    }
    // [OTZAR-RETURN-10] mirror Foundation: a voice-note capture
    // (source === "voice_note_capture") gets a durable voice_note_id grouping
    // every capsule; non-voice observes get none (backward compatible).
    const isVoiceNote = body.source === "voice_note_capture";
    return HttpResponse.json(
      {
        ok: true,
        capsule_ids: ["cap-obs-1", "cap-obs-2"],
        ...(isVoiceNote
          ? { voice_note_id: "11111111-2222-3333-4444-555555555555" }
          : {}),
        extracted_summary: {
          decisions: 1,
          commitments: 2,
          work_patterns: 0,
          external_entities: 1,
          vocab_growth: 0,
        },
      },
      { status: 200 },
    );
  },
);

// [OTZAR-RETURN-11] READ-ONLY voice-note revoke PLAN — mirrors the Foundation
// service shape exactly (PLAN_ONLY; apply_allowed false; payload_returned false;
// safe per-capsule fields only). Mutates nothing. The default group is the
// caller+org fan-out from the observe handler, so plan_status is
// PARTIAL_REQUIRES_AUTHORITY.
const otzarVoiceNoteRevokePlanHandler = http.post(
  `${API_BASE}/otzar/voice-notes/:voice_note_id/revoke-plan`,
  ({ params }) => {
    const voiceNoteId = String(params.voice_note_id);
    return HttpResponse.json(
      {
        ok: true,
        mode: "PLAN_ONLY",
        voice_note_id: voiceNoteId,
        event_type: "NOTE",
        capsule_count: 2,
        capsules: [
          {
            capsule_id: "cap-obs-1",
            wallet_scope: "caller",
            current_status: "ACTIVE",
            authority_status: "CAN_REVOKE",
            proposed_action: "SOFT_REVOKE",
          },
          {
            capsule_id: "cap-obs-2",
            wallet_scope: "org",
            current_status: "ACTIVE",
            authority_status: "REQUIRES_ORG_AUTHORITY",
            proposed_action: "SKIP_UNAUTHORIZED",
          },
        ],
        plan_status: "PARTIAL_REQUIRES_AUTHORITY",
        apply_allowed: false,
        hard_delete_allowed: false,
        external_side_effects: false,
        raw_audio_scope: "NONE",
        payload_returned: false,
        crypto_erasure_ready: false,
        crypto_erasure_status: "NO_KEY_PATH_YET",
        audit_preview: { event_type: "VOICE_NOTE_REVOKE_PLANNED" },
        reason_codes: ["SOME_CAPSULES_REQUIRE_ORG_AUTHORITY", "APPLY_NOT_IMPLEMENTED_IN_THIS_BUILD"],
      },
      { status: 200 },
    );
  },
);

// [OTZAR-RETURN-12] MUTATING revoke-apply. Mirrors the plan above: the caller-
// owned capsule (cap-obs-1) is soft-revoked; the org capsule (cap-obs-2) is
// skipped (org authority not carried) -> a HONEST PARTIAL_APPLIED. Soft revoke
// only; no hard delete; no capsule payload; summary audit id surfaced.
const otzarVoiceNoteRevokeApplyHandler = http.post(
  `${API_BASE}/otzar/voice-notes/:voice_note_id/revoke-apply`,
  ({ params }) => {
    const voiceNoteId = String(params.voice_note_id);
    return HttpResponse.json(
      {
        ok: true,
        mode: "APPLY",
        voice_note_id: voiceNoteId,
        event_type: "NOTE",
        apply_status: "PARTIAL_APPLIED",
        capsule_count: 2,
        revoked_capsule_ids: ["cap-obs-1"],
        already_revoked_capsule_ids: [],
        skipped_capsules: [
          {
            capsule_id: "cap-obs-2",
            wallet_scope: "org",
            reason: "REQUIRES_ORG_AUTHORITY",
          },
        ],
        audit_id: "audit-revoke-apply-1",
        external_side_effects: false,
        hard_delete_performed: false,
        payload_returned: false,
        raw_audio_scope: "NONE",
        message: "Revoked 1 of your capsule(s); 1 could not be revoked by you and was left untouched.",
        reason_codes: ["SOME_CAPSULES_REVOKED", "SOME_CAPSULES_REQUIRE_OTHER_AUTHORITY"],
      },
      { status: 200 },
    );
  },
);

// WHAT: Recorder for POST /otzar/correction calls (Wave 2C). Tests use
//        getRecordedCorrectionCalls() to assert the body shape (e.g. that
//        the inline Chat correction passes conversation_id while the
//        standalone Corrections.tsx omits it).
interface RecordedCorrectionCalls {
  count: number;
  lastBody: Record<string, unknown> | null;
  allBodies: Record<string, unknown>[];
}
const recordedCorrectionCalls: RecordedCorrectionCalls = {
  count: 0,
  lastBody: null,
  allBodies: [],
};
export function getRecordedCorrectionCalls(): RecordedCorrectionCalls {
  return {
    count: recordedCorrectionCalls.count,
    lastBody: recordedCorrectionCalls.lastBody,
    allBodies: [...recordedCorrectionCalls.allBodies],
  };
}
export function resetRecordedCorrectionCalls(): void {
  recordedCorrectionCalls.count = 0;
  recordedCorrectionCalls.lastBody = null;
  recordedCorrectionCalls.allBodies = [];
}

// POST /otzar/correction -- Wave 2C extension: accepts optional
// conversation_id. Forbidden/missing fixture ids exercise the
// self-scope validation codes Foundation will emit.
const otzarCorrectionHandler = http.post(
  `${API_BASE}/otzar/correction`,
  async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    recordedCorrectionCalls.count += 1;
    recordedCorrectionCalls.lastBody = body;
    recordedCorrectionCalls.allBodies.push(body);

    const conversationId =
      typeof body.conversation_id === "string" ? body.conversation_id : null;
    if (conversationId === "conv-forbidden-0001") {
      return HttpResponse.json(
        {
          ok: false,
          code: "NOT_CONVERSATION_OWNER",
          message: "You do not own this conversation",
        },
        { status: 403 },
      );
    }
    if (conversationId === "conv-missing-0001") {
      return HttpResponse.json(
        {
          ok: false,
          code: "CONVERSATION_NOT_FOUND",
          message: "Conversation not found",
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(
      { ok: true, correction_capsule_id: "cap-correction-0001" },
      { status: 200 },
    );
  },
);

// GET /otzar/conversations/:id/corrections -- Wave 2C look-back signals.
// Fixture ids exercise has_corrections / zero state / 403 / 404 / 500.
// Notes mirror Foundation's CORRECTION_DRIFT_PREVENTION_NOTE +
// CORRECTION_CONTINUITY_NOTE verbatim so the consumer renders the
// real product copy (which already contains the two required
// anti-overclaim phrases).
const DRIFT_PREVENTION_NOTE =
  "Correction signals help your Twin prioritize future context within " +
  "scope. This does not expose raw messages. This is not an employee score.";
const CORRECTIONS_CONTINUITY_NOTE =
  "Corrections are scoped signals attached to your own wallet; they " +
  "improve future context priority within scope and are not a transcript " +
  "or replay of raw messages.";

const otzarConversationCorrectionsHandler = http.get(
  `${API_BASE}/otzar/conversations/:id/corrections`,
  async ({ params }) => {
    const id = String(params.id);
    const now = Date.now();

    if (id === "conv-forbidden-0001") {
      return HttpResponse.json(
        {
          ok: false,
          code: "NOT_CONVERSATION_OWNER",
          message: "You do not own this conversation",
        },
        { status: 403 },
      );
    }
    if (id === "conv-missing-0001") {
      return HttpResponse.json(
        {
          ok: false,
          code: "CONVERSATION_NOT_FOUND",
          message: "Conversation not found",
        },
        { status: 404 },
      );
    }
    if (id === "conv-error-0001") {
      return HttpResponse.json(
        {
          ok: false,
          code: "INTERNAL_ERROR",
          message: "Something went wrong",
        },
        { status: 500 },
      );
    }

    // Zero-state fixtures (active conversation, or a closed one with no
    // linked corrections).
    if (id === "conv-active-0001" || id === "conv-no-corrections-0001") {
      return HttpResponse.json(
        {
          ok: true,
          conversation_id: id,
          corrections_count: 0,
          has_corrections: false,
          last_correction_at: null,
          drift_prevention_note: DRIFT_PREVENTION_NOTE,
          continuity_note: CORRECTIONS_CONTINUITY_NOTE,
        },
        { status: 200 },
      );
    }

    // Default + conv-closed-0001 -> has_corrections.
    return HttpResponse.json(
      {
        ok: true,
        conversation_id: id,
        corrections_count: 3,
        has_corrections: true,
        last_correction_at: new Date(now - 6 * 3_600_000).toISOString(),
        drift_prevention_note: DRIFT_PREVENTION_NOTE,
        continuity_note: CORRECTIONS_CONTINUITY_NOTE,
      },
      { status: 200 },
    );
  },
);

// ════════════════════════════════════════════════════════════════
// Employee Approvals / Escalations: /escalations/* product routes
// ════════════════════════════════════════════════════════════════
//
// pending returns the caller's own queue. Fixtures include one
// APPROVABLE row (source !== target) and one SELF-TARGET dual-control
// row (source === target, non-approvable). approve/reject return the
// updated row, with sentinel ids for the 403 / 409 error arms.

export const ESC_APPROVABLE_ID = "e1111111-1111-1111-1111-111111111111";
export const ESC_SELF_TARGET_ID = "e2222222-2222-2222-2222-222222222222";
export const ESC_FORBIDDEN_ID = "e3333333-3333-3333-3333-333333333333";
export const ESC_RESOLVED_ID = "e4444444-4444-4444-4444-444444444444";

const ESC_ME_ID = "me-entity-0001";
const ESC_AGENT_ID = "agent-entity-0001";

function escalationResolveResponse(
  id: string,
  status: "APPROVED" | "REJECTED",
) {
  if (id === ESC_FORBIDDEN_ID) {
    return HttpResponse.json(
      {
        ok: false,
        code: "ESCALATION_FORBIDDEN",
        message:
          "Caller is not authorized to resolve or view this escalation",
      },
      { status: 403 },
    );
  }
  if (id === ESC_RESOLVED_ID) {
    return HttpResponse.json(
      {
        ok: false,
        code: "ESCALATION_INVALID_TRANSITION",
        message: "Escalation is not in PENDING state",
      },
      { status: 409 },
    );
  }
  const now = new Date().toISOString();
  return HttpResponse.json(
    {
      ok: true,
      escalation: {
        escalation_id: id,
        source_entity_id: ESC_AGENT_ID,
        target_entity_id: ESC_ME_ID,
        capsule_id: "cap-ref-0001",
        escalation_type: "COMPLIANCE_GATE",
        severity: "HIGH",
        description:
          "An AI teammate was denied access to a knowledge item; your review is needed.",
        status,
        resolved_by_entity_id: ESC_ME_ID,
        resolution_metadata: null,
        created_at: now,
        resolved_at: now,
        expires_at: null,
      },
    },
    { status: 200 },
  );
}

const escalationsPendingHandler = http.get(
  `${API_BASE}/escalations/pending`,
  async () => {
    const now = new Date().toISOString();
    return HttpResponse.json(
      {
        ok: true,
        escalations: [
          {
            escalation_id: ESC_APPROVABLE_ID,
            source_entity_id: ESC_AGENT_ID,
            target_entity_id: ESC_ME_ID,
            capsule_id: "cap-ref-0001",
            escalation_type: "COMPLIANCE_GATE",
            severity: "HIGH",
            description:
              "An AI teammate was denied access to a knowledge item; your review is needed.",
            status: "PENDING",
            resolved_by_entity_id: null,
            resolution_metadata: null,
            created_at: now,
            resolved_at: null,
            expires_at: null,
          },
          {
            escalation_id: ESC_SELF_TARGET_ID,
            source_entity_id: ESC_ME_ID,
            target_entity_id: ESC_ME_ID,
            capsule_id: null,
            escalation_type: "DUAL_CONTROL_REQUIRED",
            severity: "HIGH",
            description: "Privileged action pending a second approver.",
            status: "PENDING",
            resolved_by_entity_id: null,
            resolution_metadata: null,
            created_at: now,
            resolved_at: null,
            expires_at: null,
          },
        ],
      },
      { status: 200 },
    );
  },
);

const escalationsDetailHandler = http.get(
  `${API_BASE}/escalations/:id`,
  async ({ params }) => {
    const id = String(params.id);
    return HttpResponse.json(
      {
        ok: true,
        escalation: {
          escalation_id: id,
          source_entity_id: ESC_AGENT_ID,
          target_entity_id: ESC_ME_ID,
          capsule_id: "cap-ref-0001",
          escalation_type: "COMPLIANCE_GATE",
          severity: "HIGH",
          description:
            "An AI teammate was denied access to a knowledge item; your review is needed.",
          status: "PENDING",
          resolved_by_entity_id: null,
          resolution_metadata: null,
          created_at: new Date().toISOString(),
          resolved_at: null,
          expires_at: null,
        },
      },
      { status: 200 },
    );
  },
);

const escalationsApproveHandler = http.post(
  `${API_BASE}/escalations/:id/approve`,
  async ({ params }) => escalationResolveResponse(String(params.id), "APPROVED"),
);

const escalationsRejectHandler = http.post(
  `${API_BASE}/escalations/:id/reject`,
  async ({ params }) => escalationResolveResponse(String(params.id), "REJECTED"),
);

// ════════════════════════════════════════════════════════════════
// Employee Otzar: My Twin + Conversations metadata (read-only)
// ════════════════════════════════════════════════════════════════

const otzarMyTwinHandler = http.get(
  `${API_BASE}/otzar/my-twin`,
  async () => {
    const now = new Date().toISOString();
    return HttpResponse.json(
      {
        ok: true,
        twin: {
          twin_id: "twin-self-0001",
          display_name: "Your AI Teammate",
          role_title: "Executive Assistant",
          autonomy_mode: "APPROVAL_REQUIRED",
          swarm_enabled: false,
          role_template: "executive-assistant",
          is_admin_twin: false,
          status: "ACTIVE",
          skills: [
            { name: "Calendar Coordination", category: "PRODUCTIVITY" },
            { name: "Inbox Triage", category: "PRODUCTIVITY" },
          ],
          approver: { entity_id: "mgr-0001", display_name: "Dana Manager" },
          created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
          updated_at: now,
          // ADR-0053 Wave 2A: additive, self-scoped role-scope profile
          // (friendly labels + counts only; no envelopes / bridge ids /
          // capability flags).
          role_scope_profile: {
            identity: {
              twin_id: "twin-self-0001",
              display_name: "Your AI Teammate",
              status: "ACTIVE",
            },
            role: {
              role_title: "Executive Assistant",
              job_title: "Operations Lead",
              department: "Operations",
              hierarchy_level: 2,
              is_admin_twin: false,
            },
            scope_summary: {
              scope_label: "Role-scoped enterprise context",
              membership_count: 1,
              active_membership_count: 1,
              department_count: 1,
              has_department_scope: true,
              has_multiple_memberships: false,
              permission_posture:
                "Governed by role and organization access rules",
              approval_posture: "Approval required for sensitive actions",
            },
            assistance_profile: {
              autonomy_mode: "APPROVAL_REQUIRED",
              swarm_enabled: false,
              role_template_status: "CONFIGURED",
              skills_status: "AVAILABLE",
              current_assistance_boundaries: [
                "Operates within your role and organization access scope",
                "Sensitive actions require permission, policy, or approval",
                "Observes permissioned work context to reduce drift and keep your work aligned",
              ],
            },
            governance: {
              approver_configured: true,
              approver: { entity_id: "mgr-0001", display_name: "Dana Manager" },
              sensitive_actions_require: "PERMISSION_POLICY_OR_APPROVAL",
              observation_mode: "PERMISSIONED_WORK_CONTEXT_NOT_SURVEILLANCE",
            },
            continuity: {
              recent_conversation_count: 3,
              recent_correction_count: 1,
              recent_learning_summary_count: 2,
              alignment_signals_available: true,
            },
          },
        },
        has_multiple_twins: false,
        twin_count: 1,
      },
      { status: 200 },
    );
  },
);

const otzarConversationsHandler = http.get(
  `${API_BASE}/otzar/conversations`,
  async ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    if (status !== null && status !== "ACTIVE" && status !== "CLOSED") {
      return HttpResponse.json(
        {
          ok: false,
          code: "INVALID_STATUS",
          message: "status must be ACTIVE or CLOSED",
        },
        { status: 400 },
      );
    }
    const now = Date.now();
    const all = [
      {
        conversation_id: "conv-active-0001",
        twin_id: "twin-self-0001",
        source_type: "CHAT",
        status: "ACTIVE",
        message_count: 4,
        started_at: new Date(now - 3_600_000).toISOString(),
        closed_at: null,
      },
      {
        conversation_id: "conv-closed-0001",
        twin_id: "twin-self-0001",
        source_type: "CHAT",
        status: "CLOSED",
        message_count: 9,
        started_at: new Date(now - 2 * 86_400_000).toISOString(),
        closed_at: new Date(now - 2 * 86_400_000 + 1_800_000).toISOString(),
      },
    ];
    const items =
      status === null ? all : all.filter((c) => c.status === status);
    return HttpResponse.json(
      { ok: true, items, total: items.length, has_more: false },
      { status: 200 },
    );
  },
);

// GET /otzar/conversations/:id -- Wave 2B look-back detail (ADR-0054).
// Fixture ids exercise every detail_availability + error branch. The
// SUMMARY_AVAILABLE fixture carries a summary_capsule_id on purpose: the
// contract includes it, and the UI must NOT render it (raw id boundary).
const otzarConversationDetailHandler = http.get(
  `${API_BASE}/otzar/conversations/:id`,
  async ({ params }) => {
    const id = String(params.id);
    const now = Date.now();
    const CONTINUITY_NOTE =
      "Per-conversation correction and transparency signals are not " +
      "retained in Wave 2B; this is a metadata and close-summary view, " +
      "not a transcript.";

    if (id === "conv-forbidden-0001") {
      return HttpResponse.json(
        {
          ok: false,
          code: "NOT_CONVERSATION_OWNER",
          message: "You do not own this conversation",
        },
        { status: 403 },
      );
    }
    if (id === "conv-missing-0001") {
      return HttpResponse.json(
        {
          ok: false,
          code: "CONVERSATION_NOT_FOUND",
          message: "Conversation not found",
        },
        { status: 404 },
      );
    }
    if (id === "conv-error-0001") {
      return HttpResponse.json(
        {
          ok: false,
          code: "INTERNAL_ERROR",
          message: "Something went wrong",
        },
        { status: 500 },
      );
    }

    const base = {
      conversation_id: id,
      twin_id: "twin-self-0001",
      source_type: "CHAT",
      transparency_available: false,
      continuity_note: CONTINUITY_NOTE,
    };

    if (id === "conv-active-0001") {
      return HttpResponse.json(
        {
          ok: true,
          conversation: {
            ...base,
            status: "ACTIVE",
            started_at: new Date(now - 3_600_000).toISOString(),
            closed_at: null,
            message_count: 4,
            summary: null,
            topics: [],
            summary_available: false,
            summary_capsule_id: null,
            detail_availability: "ACTIVE_NOT_CLOSED",
          },
        },
        { status: 200 },
      );
    }

    if (id === "conv-no-summary-0001") {
      return HttpResponse.json(
        {
          ok: true,
          conversation: {
            ...base,
            status: "CLOSED",
            started_at: new Date(now - 3 * 86_400_000).toISOString(),
            closed_at: new Date(now - 3 * 86_400_000 + 600_000).toISOString(),
            message_count: 2,
            summary: null,
            topics: [],
            summary_available: false,
            summary_capsule_id: null,
            detail_availability: "NO_SUMMARY_YET",
          },
        },
        { status: 200 },
      );
    }

    // Default + conv-closed-0001 -> SUMMARY_AVAILABLE.
    return HttpResponse.json(
      {
        ok: true,
        conversation: {
          ...base,
          status: "CLOSED",
          started_at: new Date(now - 2 * 86_400_000).toISOString(),
          closed_at: new Date(now - 2 * 86_400_000 + 1_800_000).toISOString(),
          message_count: 9,
          summary:
            "Reviewed Q4 pricing options and aligned on the enterprise " +
            "tier discount. Action: send the revised proposal to the " +
            "client by Friday.",
          topics: ["pricing", "q4-planning", "enterprise-tier"],
          summary_available: true,
          summary_capsule_id: "cap-summary-0001",
          detail_availability: "SUMMARY_AVAILABLE",
        },
      },
      { status: 200 },
    );
  },
);

// ════════════════════════════════════════════════════════════════
// Section 5 Agent Playground -- Wave 10 (ADR-0077) handlers.
// Mock the 6 Foundation Agent Playground routes consumed by
// /agent-playground. In-memory scenario store so tests can exercise
// create -> list -> get -> archive. Wave 5/6/7/8/9 return
// closed-vocab fixtures matching Foundation public success interfaces.
// ════════════════════════════════════════════════════════════════

interface PlaygroundScenarioRow {
  scenario_id: string;
  owner_entity_id: string;
  org_entity_id: string | null;
  title: string;
  description: string | null;
  goal_summary: string | null;
  status: "DRAFT" | "READY" | "IN_REVIEW" | "ARCHIVED";
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

const playgroundScenarios = new Map<string, PlaygroundScenarioRow>();

export function resetPlaygroundScenarios(): void {
  playgroundScenarios.clear();
}

export function seedPlaygroundScenario(
  partial: Partial<PlaygroundScenarioRow> & { title: string },
): PlaygroundScenarioRow {
  const now = new Date().toISOString();
  const row: PlaygroundScenarioRow = {
    scenario_id: partial.scenario_id ?? `scn-${playgroundScenarios.size + 1}`,
    owner_entity_id: partial.owner_entity_id ?? "owner-self",
    org_entity_id: partial.org_entity_id ?? "org-self",
    title: partial.title,
    description: partial.description ?? null,
    goal_summary: partial.goal_summary ?? null,
    status: partial.status ?? "DRAFT",
    created_at: partial.created_at ?? now,
    updated_at: partial.updated_at ?? now,
    archived_at: partial.archived_at ?? null,
  };
  playgroundScenarios.set(row.scenario_id, row);
  return row;
}

const playgroundListScenariosHandler = http.get(
  `${API_BASE}/playground/scenarios`,
  () =>
    HttpResponse.json(
      { ok: true, scenarios: [...playgroundScenarios.values()] },
      { status: 200 },
    ),
);

const playgroundCreateScenarioHandler = http.post(
  `${API_BASE}/playground/scenarios`,
  async ({ request }) => {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      goal_summary?: string;
      status?: PlaygroundScenarioRow["status"];
    };
    if (typeof body.title !== "string" || body.title.length === 0) {
      return HttpResponse.json(
        { ok: false, code: "INVALID_REQUEST", message: "title is required" },
        { status: 422 },
      );
    }
    const row = seedPlaygroundScenario({
      title: body.title,
      description: body.description ?? null,
      goal_summary: body.goal_summary ?? null,
      status: body.status ?? "DRAFT",
    });
    return HttpResponse.json(
      { ok: true, scenario: row, audit_event_id: `aud-${row.scenario_id}` },
      { status: 201 },
    );
  },
);

const playgroundGetScenarioHandler = http.get(
  `${API_BASE}/playground/scenarios/:id`,
  ({ params }) => {
    const row = playgroundScenarios.get(String(params.id));
    if (row === undefined) {
      return HttpResponse.json(
        { ok: false, code: "SCENARIO_NOT_FOUND", message: "Scenario not found" },
        { status: 404 },
      );
    }
    return HttpResponse.json({ ok: true, scenario: row }, { status: 200 });
  },
);

const playgroundDeleteScenarioHandler = http.delete(
  `${API_BASE}/playground/scenarios/:id`,
  ({ params }) => {
    const row = playgroundScenarios.get(String(params.id));
    if (row === undefined) {
      return HttpResponse.json(
        { ok: false, code: "SCENARIO_NOT_FOUND", message: "Scenario not found" },
        { status: 404 },
      );
    }
    const now = new Date().toISOString();
    const archived = {
      ...row,
      status: "ARCHIVED" as const,
      archived_at: now,
      updated_at: now,
    };
    playgroundScenarios.set(row.scenario_id, archived);
    return HttpResponse.json(
      { ok: true, scenario: archived, audit_event_id: `aud-arch-${row.scenario_id}` },
      { status: 200 },
    );
  },
);

const playgroundCandidatesHandler = http.post(
  `${API_BASE}/playground/scenarios/:id/candidates`,
  ({ params }) =>
    HttpResponse.json(
      {
        ok: true,
        scenario_id: String(params.id),
        generated_at: new Date().toISOString(),
        candidates: [
          {
            candidate_key: "candkey-status-quo-0001",
            candidate_type: "STATUS_QUO",
            candidate_title: "Maintain current state",
            candidate_summary:
              "No change at this time. Preserves operational stability while review continues.",
            assumptions: ["No new dependencies", "Current policy holds"],
            required_inputs: ["Current scenario context"],
            expected_benefits: ["Operational stability"],
            known_risks: ["Possible competitive lag"],
            dependencies: ["NO_BLOCKING_DEPENDENCY_IDENTIFIED"],
            governance_findings: ["HUMAN_REVIEW_REQUIRED", "POLICY_REVIEW_REQUIRED"],
            required_approvals: ["HUMAN_OWNER_REVIEW"],
            evidence_refs: [],
            blocked_by_policy: false,
            action_runtime_transition_hint: "NO_ACTION",
            confidence_label: "MEDIUM",
            honest_note: "This candidate is advisory only and not a final decision.",
          },
          {
            candidate_key: "candkey-low-risk-0002",
            candidate_type: "LOW_RISK_INCREMENTAL",
            candidate_title: "Incremental low-risk step",
            candidate_summary:
              "Move forward with a low-risk incremental step under existing governance.",
            assumptions: ["Existing policy supports the path"],
            required_inputs: ["Same-org permission scope"],
            expected_benefits: ["Reversible progress"],
            known_risks: ["Limited speed"],
            dependencies: ["NO_BLOCKING_DEPENDENCY_IDENTIFIED"],
            governance_findings: ["HUMAN_REVIEW_REQUIRED"],
            required_approvals: ["POLICY_OWNER_REVIEW"],
            evidence_refs: [],
            blocked_by_policy: false,
            action_runtime_transition_hint: "MAY_PROPOSE_ACTION_LATER",
            confidence_label: "HIGH",
            honest_note: "This candidate is advisory only and not a final decision.",
          },
        ],
        audit_event_id: `aud-cand-${params.id}`,
      },
      { status: 200 },
    ),
);

const playgroundComparisonHandler = http.post(
  `${API_BASE}/playground/scenarios/:id/outcome-comparisons`,
  ({ params }) =>
    HttpResponse.json(
      {
        ok: true,
        scenario_id: String(params.id),
        compared_at: new Date().toISOString(),
        comparison_mode: "DETERMINISTIC_RUBRIC",
        candidate_count: 2,
        comparison_matrix: [
          {
            candidate_key: "candkey-status-quo-0001",
            candidate_type: "STATUS_QUO",
            candidate_title: "Maintain current state",
            comparison_summary:
              "Status quo preserves stability but produces no movement.",
            outcome_dimensions: [
              { dimension: "GOVERNANCE_ALIGNMENT", rating: "FAVORABLE" },
              { dimension: "EXECUTION_COMPLEXITY", rating: "FAVORABLE" },
              { dimension: "OPERATIONAL_RISK", rating: "MIXED" },
            ],
            risk_findings: ["NO_NOTABLE_RISK"],
            dependency_findings: ["NO_BLOCKING_DEPENDENCY_IDENTIFIED"],
            required_reviews: ["HUMAN_OWNER_REVIEW"],
            governance_findings: ["HUMAN_REVIEW_REQUIRED"],
            blocked_by_policy: false,
            action_runtime_transition_hint: "NO_ACTION",
            confidence_label: "MEDIUM",
            honest_note: "Comparison is advisory only and not a winner selection.",
          },
          {
            candidate_key: "candkey-low-risk-0002",
            candidate_type: "LOW_RISK_INCREMENTAL",
            candidate_title: "Incremental low-risk step",
            comparison_summary:
              "Low-risk incremental step balances movement with reversibility.",
            outcome_dimensions: [
              { dimension: "GOVERNANCE_ALIGNMENT", rating: "FAVORABLE" },
              { dimension: "REVERSIBILITY", rating: "FAVORABLE" },
              { dimension: "EXECUTION_COMPLEXITY", rating: "FAVORABLE" },
            ],
            risk_findings: ["NO_NOTABLE_RISK"],
            dependency_findings: ["NO_BLOCKING_DEPENDENCY_IDENTIFIED"],
            required_reviews: ["POLICY_OWNER_REVIEW"],
            governance_findings: ["HUMAN_REVIEW_REQUIRED"],
            blocked_by_policy: false,
            action_runtime_transition_hint: "MAY_PROPOSE_ACTION_LATER",
            confidence_label: "HIGH",
            honest_note: "Comparison is advisory only and not a winner selection.",
          },
        ],
        tradeoff_summary: {
          fewest_blocking_findings: ["candkey-low-risk-0002"],
          strongest_governance_alignment: [
            "candkey-status-quo-0001",
            "candkey-low-risk-0002",
          ],
          lowest_review_burden: ["candkey-status-quo-0001"],
          strongest_resilience: ["candkey-low-risk-0002"],
        },
        blocked_candidates_count: 0,
        review_required_count: 2,
        honest_note: "Comparison is advisory only and not a winner selection.",
        audit_event_id: `aud-cmp-${params.id}`,
      },
      { status: 200 },
    ),
);

const playgroundRecommendationHandler = http.post(
  `${API_BASE}/playground/scenarios/:id/best-path-recommendations`,
  ({ params }) =>
    HttpResponse.json(
      {
        ok: true,
        scenario_id: String(params.id),
        recommended_at: new Date().toISOString(),
        recommendation_mode: "DETERMINISTIC_POLICY_FIRST",
        recommended_candidate_key: "candkey-low-risk-0002",
        recommended_candidate_type: "LOW_RISK_INCREMENTAL",
        recommended_candidate_title: "Incremental low-risk step",
        recommendation_summary:
          "Low-risk incremental step is recommended for human review.",
        recommendation_reasons: [
          "FEWEST_BLOCKING_FINDINGS",
          "STRONGEST_GOVERNANCE_ALIGNMENT",
        ],
        evidence_refs: [
          "COMPARISON_MODE:DETERMINISTIC_RUBRIC",
          "RECOMMENDATION_MODE:DETERMINISTIC_POLICY_FIRST",
        ],
        governance_findings: ["HUMAN_REVIEW_REQUIRED"],
        required_reviews: ["POLICY_OWNER_REVIEW"],
        risk_findings: ["NO_NOTABLE_RISK"],
        dependency_findings: ["NO_BLOCKING_DEPENDENCY_IDENTIFIED"],
        blocked_by_policy: false,
        action_runtime_transition_hint: "MAY_PROPOSE_ACTION_LATER",
        action_transition_readiness: "REQUIRES_POLICY_REVIEW",
        alternatives_considered: [
          {
            candidate_key: "candkey-status-quo-0001",
            candidate_type: "STATUS_QUO",
            candidate_title: "Maintain current state",
            reason_not_recommended: "NOT_SELECTED_THIS_ROUND",
            blocking_findings: [],
            review_findings: ["HUMAN_OWNER_REVIEW"],
            confidence_label: "MEDIUM",
          },
        ],
        not_recommended_reasons: ["NOT_SELECTED_THIS_ROUND"],
        confidence_label: "HIGH",
        human_decision_required: true,
        honest_note: "Recommendation is advisory only and not a final decision.",
        audit_event_id: `aud-rec-${params.id}`,
        // ADR-0078 Stage 2 — approved-source signals fixture.
        // Two signals exercise distinct sources + the §6C.12
        // additive field surface; no raw transcript text /
        // raw payload / forbidden enum values.
        conversation_context_signals: [
          {
            signal_type: "APPROVAL_DEPENDENCY_IDENTIFIED",
            signal_confidence_label: "MEDIUM",
            signal_source_type: "ACTION_HISTORY",
            signal_scope: "ACTION_SCOPED",
            related_scenario_id: String(params.id),
            detected_at: new Date().toISOString(),
            evidence_label: "APPROVAL_NEED",
            safe_summary:
              "Action history indicates a prior governed action awaiting approval. Review approval posture before any transition.",
            requires_human_review: true,
            retention_class: "ACTION_CONTEXT_RETAINED",
            honest_note:
              "Advisory context signal only. Not a final decision, not legal or compliance certainty, not surveillance, not employee scoring. Derived from approved Foundation sources under governance.",
            conversation_relevance_class: "WORK_RELEVANT",
            capture_eligibility: "CAPTURE_ALLOWED",
            agent_playground_use: "ALLOWED_FOR_SIGNALS",
            redaction_applied: false,
            business_purpose_label: "APPROVAL_RELATED",
            scope_binding_type: "ACTION_SCOPED",
            review_required: true,
            personal_content_suppressed: false,
          },
          {
            signal_type: "PRIOR_DECISION_REFERENCED",
            signal_confidence_label: "LOW",
            signal_source_type: "CORRECTION_SIGNAL",
            signal_scope: "SELF_ONLY",
            related_scenario_id: String(params.id),
            detected_at: new Date().toISOString(),
            evidence_label: "PRIOR_DECISION",
            safe_summary:
              "A prior correction signal exists in the caller's scope. Consider whether the recommendation aligns with prior correction posture before proceeding.",
            requires_human_review: false,
            retention_class: "AUDIT_SAFE_METADATA_ONLY",
            honest_note:
              "Advisory context signal only. Not a final decision, not legal or compliance certainty, not surveillance, not employee scoring. Derived from approved Foundation sources under governance.",
            conversation_relevance_class: "WORK_RELEVANT",
            capture_eligibility: "CAPTURE_ALLOWED",
            agent_playground_use: "ALLOWED_FOR_SIGNALS",
            redaction_applied: false,
            business_purpose_label: "PROJECT_CONTEXT",
            scope_binding_type: "SCENARIO_SCOPED",
            review_required: false,
            personal_content_suppressed: false,
          },
        ],
      },
      { status: 200 },
    ),
);

const playgroundSimulationHandler = http.post(
  `${API_BASE}/playground/scenarios/:id/simulations`,
  async ({ params, request }) => {
    const body = (await request.json()) as { caller_confirmation?: unknown };
    if (body.caller_confirmation !== true) {
      return HttpResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          message: "caller_confirmation must be true",
          invalid_fields: ["caller_confirmation"],
        },
        { status: 422 },
      );
    }
    return HttpResponse.json(
      {
        ok: true,
        scenario_id: String(params.id),
        simulated_at: new Date().toISOString(),
        orchestration_mode: "DETERMINISTIC_BRANCH_ENUMERATION",
        branch_count: 2,
        branches: [
          {
            branch_id: "branch-0001",
            branch_definition: "RECOMMENDED_PATH",
            agent_role: "OWNER_OPERATOR",
            assumed_constraints: [
              "OWNER_COSMP_SCOPE_ONLY",
              "WAVE_8_TRANSITION_REQUIRED_BEFORE_ACTION",
            ],
            expected_outcomes: ["WAVE_7_RECOMMENDATION_PRODUCED"],
            governance_conflicts: ["NO_NOTABLE_CONFLICT"],
            branch_summary:
              "Branch RECOMMENDED_PATH viewed through the decision-owner / accountable-party lens surfaced LOW_RISK_INCREMENTAL as the recommended candidate.",
            branch_recommended_candidate_key: "candkey-low-risk-0002",
            branch_recommended_candidate_type: "LOW_RISK_INCREMENTAL",
            confidence_label: "HIGH",
          },
          {
            branch_id: "branch-0002",
            branch_definition: "COMPLIANCE_FIRST_PATH",
            agent_role: "COMPLIANCE_REVIEWER",
            assumed_constraints: [
              "OWNER_COSMP_SCOPE_ONLY",
              "LEGAL_COMPLIANCE_REVIEW_WHERE_APPLICABLE",
            ],
            expected_outcomes: [
              "WAVE_7_RECOMMENDATION_PRODUCED",
              "COMPLIANCE_REVIEW_RECOMMENDED",
            ],
            governance_conflicts: ["BRANCH_REQUIRES_COMPLIANCE_REVIEW"],
            branch_summary:
              "Branch COMPLIANCE_FIRST_PATH viewed through the compliance-review lens surfaced LOW_RISK_INCREMENTAL with compliance review recommended.",
            branch_recommended_candidate_key: "candkey-low-risk-0002",
            branch_recommended_candidate_type: "LOW_RISK_INCREMENTAL",
            confidence_label: "MEDIUM",
          },
        ],
        convergence_summary: {
          candidate_keys_agreed_upon: ["candkey-low-risk-0002"],
          governance_findings_all_branches_share: ["HUMAN_REVIEW_REQUIRED"],
          required_reviews_all_branches_share: [],
        },
        disagreement_summary: {
          candidate_types_diverged: ["LOW_RISK_INCREMENTAL"],
          recommendation_modes_diverged: [
            "DETERMINISTIC_POLICY_FIRST",
            "DETERMINISTIC_GOVERNANCE_FIRST",
          ],
          unresolved_branches: ["branch-0002"],
        },
        unresolved_questions: ["WHETHER_GOVERNANCE_REVIEW_IS_SUFFICIENT"],
        recommended_next_review: {
          next_review_label: "COMPLIANCE_REVIEW",
          rationale_summary:
            "At least one branch surfaced BRANCH_REQUIRES_COMPLIANCE_REVIEW; compliance review is recommended.",
          applies_to_branch_ids: ["branch-0002"],
        },
        enterprise_decision_posture: {
          primary_recommended_branch_id: "branch-0001",
          primary_recommendation_reasons: [
            "STRONGEST_GOVERNANCE_ALIGNMENT",
            "FEWEST_BLOCKING_FINDINGS",
          ],
          viable_alternative_branch_ids: ["branch-0002"],
          evidence_posture: [
            "AUDIT_HISTORY_SUPPORTS_PATH",
            "POLICY_SUPPORTS_PATH",
            "COMPLIANCE_REVIEW_REQUIRED",
          ],
          blockers_before_action: ["MISSING_COMPLIANCE_REVIEW"],
          safe_next_step: "REQUEST_COMPLIANCE_REVIEW",
          // ADR-0078 Stage 2 — scenario-wide sidecar at the
          // EnterpriseDecisionPosture per ADR-0078 §9 (NOT
          // per-branch — preserves ADR-0076 §11 budgets).
          conversation_context_signals: [
            {
              signal_type: "APPROVAL_DEPENDENCY_IDENTIFIED",
              signal_confidence_label: "MEDIUM",
              signal_source_type: "ACTION_HISTORY",
              signal_scope: "ACTION_SCOPED",
              related_scenario_id: String(params.id),
              detected_at: new Date().toISOString(),
              evidence_label: "APPROVAL_NEED",
              safe_summary:
                "Action history indicates a prior governed action awaiting approval. Review approval posture before any transition.",
              requires_human_review: true,
              retention_class: "ACTION_CONTEXT_RETAINED",
              honest_note:
                "Advisory context signal only. Not a final decision, not legal or compliance certainty, not surveillance, not employee scoring. Derived from approved Foundation sources under governance.",
              conversation_relevance_class: "WORK_RELEVANT",
              capture_eligibility: "CAPTURE_ALLOWED",
              agent_playground_use: "ALLOWED_FOR_SIGNALS",
              redaction_applied: false,
              business_purpose_label: "APPROVAL_RELATED",
              scope_binding_type: "ACTION_SCOPED",
              review_required: true,
              personal_content_suppressed: false,
            },
            {
              signal_type: "CONTEXT_INSUFFICIENT_FOR_RECOMMENDATION",
              signal_confidence_label: "LOW",
              signal_source_type: "MANUAL_USER_INPUT",
              signal_scope: "SELF_ONLY",
              related_scenario_id: String(params.id),
              detected_at: new Date().toISOString(),
              evidence_label: "INSUFFICIENT_CONTEXT",
              safe_summary:
                "Manual scenario context is incomplete. A goal summary is missing; review and complete scenario context before action.",
              requires_human_review: true,
              retention_class: "SCENARIO_CONTEXT_RETAINED",
              honest_note:
                "Advisory context signal only. Not a final decision, not legal or compliance certainty, not surveillance, not employee scoring. Derived from approved Foundation sources under governance.",
              conversation_relevance_class: "WORK_RELEVANT",
              capture_eligibility: "CAPTURE_ALLOWED",
              agent_playground_use: "ALLOWED_FOR_SIGNALS",
              redaction_applied: false,
              business_purpose_label: "PROJECT_CONTEXT",
              scope_binding_type: "SCENARIO_SCOPED",
              review_required: true,
              personal_content_suppressed: false,
            },
          ],
        },
        human_decision_required: true,
        honest_note:
          "This simulation is advisory only. Not autonomous agent debate.",
        simulation_audit_event_id: `aud-sim-${params.id}`,
      },
      { status: 200 },
    );
  },
);

const playgroundTransitionHandler = http.post(
  `${API_BASE}/playground/scenarios/:id/governed-transitions`,
  async ({ params, request }) => {
    const body = (await request.json()) as {
      caller_confirmation?: unknown;
      idempotency_key?: unknown;
    };
    if (body.caller_confirmation !== true) {
      return HttpResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          message: "caller_confirmation must be true",
          invalid_fields: ["caller_confirmation"],
        },
        { status: 422 },
      );
    }
    if (
      typeof body.idempotency_key !== "string" ||
      body.idempotency_key.length === 0
    ) {
      return HttpResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          message: "idempotency_key is required",
          invalid_fields: ["idempotency_key"],
        },
        { status: 422 },
      );
    }
    return HttpResponse.json(
      {
        ok: true,
        scenario_id: String(params.id),
        transitioned_at: new Date().toISOString(),
        transition_outcome: "ACTION_PROPOSED",
        recommended_candidate_key: "candkey-low-risk-0002",
        recommended_candidate_type: "LOW_RISK_INCREMENTAL",
        recommendation_summary:
          "Low-risk incremental step recommended for human review.",
        action_id: "act-0001",
        action_status: "PROPOSED",
        action_type: "SEND_INTERNAL_NOTIFICATION",
        action_risk_tier: "LOW",
        action_decision: "REQUIRE_DUAL_CONTROL",
        escalation_id: null,
        required_approvals: [],
        required_reviews: ["POLICY_OWNER_REVIEW"],
        human_decision_required: true,
        honest_note:
          "Action is in PROPOSED status only -- not executed by Wave 8.",
        playground_audit_event_id: `aud-trans-${params.id}`,
      },
      { status: 200 },
    );
  },
);

// ════════════════════════════════════════════════════════════════
// Section 2 Action Runtime — READ surface for Wave 10 cockpit
// lifecycle integration per ADR-0057 §9 + §10. In-memory store
// lets tests stage specific lifecycle states by action_id, then
// assert that the Agent Playground panel renders the closed-vocab
// summary correctly. Default fixture returns PROPOSED so tests
// that don't stage anything still get a useful default.
// ════════════════════════════════════════════════════════════════

interface ActionLifecycleRow {
  action_id: string;
  status:
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
  action_type: string;
  risk_tier: string;
  attempt_count: number;
  last_result_summary: string | null;
  decision_reason?: string;
  escalation_id?: string;
}

const actionLifecycleStore = new Map<string, ActionLifecycleRow>();

export function resetActionLifecycleStore(): void {
  actionLifecycleStore.clear();
}

export function seedActionLifecycle(
  row: Partial<ActionLifecycleRow> & { action_id: string },
): ActionLifecycleRow {
  const full: ActionLifecycleRow = {
    action_id: row.action_id,
    status: row.status ?? "PROPOSED",
    action_type: row.action_type ?? "SEND_INTERNAL_NOTIFICATION",
    risk_tier: row.risk_tier ?? "LOW",
    attempt_count: row.attempt_count ?? 0,
    last_result_summary: row.last_result_summary ?? null,
    ...(row.decision_reason !== undefined
      ? { decision_reason: row.decision_reason }
      : {}),
    ...(row.escalation_id !== undefined
      ? { escalation_id: row.escalation_id }
      : {}),
  };
  actionLifecycleStore.set(full.action_id, full);
  return full;
}

const actionDetailHandler = http.get(
  `${API_BASE}/actions/:id`,
  ({ params }) => {
    const id = String(params.id);
    const row = actionLifecycleStore.get(id);
    if (row === undefined) {
      // Default for un-seeded ids returned by the playground
      // transition fixture: render a PROPOSED row so the panel
      // can exercise the "proposed → refresh → still proposed"
      // path without each test having to seed.
      if (id.startsWith("act-")) {
        const now = new Date().toISOString();
        return HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: id,
              status: "PROPOSED",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              requires_approval: true,
              created_at: now,
              updated_at: now,
              attempt_count: 0,
              last_result_summary: null,
            },
          },
          { status: 200 },
        );
      }
      return HttpResponse.json(
        {
          ok: false,
          code: "ACTION_NOT_FOUND",
          message: "Action not found",
        },
        { status: 404 },
      );
    }
    const now = new Date().toISOString();
    return HttpResponse.json(
      {
        ok: true,
        action: {
          action_id: row.action_id,
          status: row.status,
          action_type: row.action_type,
          risk_tier: row.risk_tier,
          requires_approval: row.status === "PROPOSED",
          ...(row.escalation_id !== undefined
            ? { escalation_id: row.escalation_id }
            : {}),
          ...(row.decision_reason !== undefined
            ? { decision_reason: row.decision_reason }
            : {}),
          created_at: now,
          updated_at: now,
          attempt_count: row.attempt_count,
          last_result_summary: row.last_result_summary,
        },
      },
      { status: 200 },
    );
  },
);

// ════════════════════════════════════════════════════════════════
// Section 7 — full audit viewer fixtures. Foundation routes LIVE
// since ADR-0071 + earlier Section 7 waves:
//   GET /api/v1/audit/events
//   GET /api/v1/audit/events/:id
// Self-scope only at this slice (default when caller omits the
// scope param). The fixtures emit safe metadata only: no raw
// payload, no chain-of-thought, no secret_ref, no
// connector_payload, no embeddings. Mirrors Foundation
// SafeAuditEventView / SafeAuditEventDetailView verbatim.
// ════════════════════════════════════════════════════════════════
const SECTION_7_EVENT_FIXTURE_IDS = [
  "aud-7-001",
  "aud-7-002",
  "aud-7-003",
] as const;

const section7EventFixtures = [
  {
    audit_id: "aud-7-001",
    event_type: "LOGIN_SUCCESS",
    actor_entity_id: "ent-self",
    target_entity_id: "ent-self",
    target_capsule_id: null,
    session_id: "ses-001",
    outcome: "SUCCESS",
    denial_reason: null,
    details: { action: "LOGIN" },
    ip_address: "10.0.0.1",
    timestamp: "2026-05-31T18:30:00.000Z",
    previous_event_hash: null,
    event_hash:
      "0000000000000000000000000000000000000000000000000000000000000001",
    lawful_basis_id: null,
    lawful_basis_chain_hash: null,
    jurisdiction: null,
  },
  {
    audit_id: "aud-7-002",
    event_type: "CAPSULE_CREATED",
    actor_entity_id: "ent-self",
    target_entity_id: "ent-self",
    target_capsule_id: "cap-9001",
    session_id: "ses-001",
    outcome: "SUCCESS",
    denial_reason: null,
    details: { action: "CAPSULE_CREATED", capsule_type: "PREFERENCE" },
    ip_address: "10.0.0.1",
    timestamp: "2026-05-31T18:31:00.000Z",
    previous_event_hash:
      "0000000000000000000000000000000000000000000000000000000000000001",
    event_hash:
      "0000000000000000000000000000000000000000000000000000000000000002",
    lawful_basis_id: null,
    lawful_basis_chain_hash: null,
    jurisdiction: null,
  },
  {
    audit_id: "aud-7-003",
    event_type: "ADMIN_ACTION",
    actor_entity_id: "ent-self",
    target_entity_id: "ent-self",
    target_capsule_id: null,
    session_id: "ses-001",
    outcome: "SUCCESS",
    denial_reason: null,
    details: {
      action: "PLAYGROUND_BEST_PATH_RECOMMENDED",
      scenario_id: "scn-1",
      conversation_context_signals_count: 1,
      conversation_context_signal_sources: ["ACTION_HISTORY"],
    },
    ip_address: "10.0.0.1",
    timestamp: "2026-05-31T18:32:00.000Z",
    previous_event_hash:
      "0000000000000000000000000000000000000000000000000000000000000002",
    event_hash:
      "0000000000000000000000000000000000000000000000000000000000000003",
    lawful_basis_id: null,
    lawful_basis_chain_hash: null,
    jurisdiction: null,
  },
] as const;

const auditEventsListHandler = http.get(
  `${API_BASE}/audit/events`,
  ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("page_size") ?? "25");
    const scope = url.searchParams.get("scope") ?? "self";
    // CT D5 — minimum scope-aware default. Tests that need to
    // assert 403 on scope=org / scope=platform install their own
    // server.use(...) override; the default fixture simulates a
    // caller who has all capabilities so the happy path is the
    // baseline. Foundation enforces the real cap check on TAR.
    void scope;
    const eventTypeFilter = url.searchParams.get("event_type");
    const outcomeFilter = url.searchParams.get("outcome");
    const targetEntityFilter = url.searchParams.get("target_entity_id");
    const targetCapsuleFilter = url.searchParams.get("target_capsule_id");
    const startTimeFilter = url.searchParams.get("start_time");
    const endTimeFilter = url.searchParams.get("end_time");
    const startMs =
      startTimeFilter === null || startTimeFilter === ""
        ? null
        : Date.parse(startTimeFilter);
    const endMs =
      endTimeFilter === null || endTimeFilter === ""
        ? null
        : Date.parse(endTimeFilter);
    const filtered = section7EventFixtures.filter((e) => {
      if (
        eventTypeFilter !== null &&
        eventTypeFilter !== "" &&
        e.event_type !== eventTypeFilter
      ) {
        return false;
      }
      if (
        outcomeFilter !== null &&
        outcomeFilter !== "" &&
        e.outcome !== outcomeFilter
      ) {
        return false;
      }
      if (
        targetEntityFilter !== null &&
        targetEntityFilter !== "" &&
        e.target_entity_id !== targetEntityFilter
      ) {
        return false;
      }
      if (
        targetCapsuleFilter !== null &&
        targetCapsuleFilter !== "" &&
        e.target_capsule_id !== targetCapsuleFilter
      ) {
        return false;
      }
      const eventMs = Date.parse(e.timestamp);
      if (startMs !== null && Number.isFinite(startMs) && eventMs < startMs) {
        return false;
      }
      if (endMs !== null && Number.isFinite(endMs) && eventMs > endMs) {
        return false;
      }
      return true;
    });
    return HttpResponse.json(
      {
        ok: true,
        page,
        page_size: pageSize,
        total: filtered.length,
        events: filtered,
      },
      { status: 200 },
    );
  },
);

const auditEventDetailHandler = http.get(
  `${API_BASE}/audit/events/:id`,
  ({ params }) => {
    const id = String(params.id);
    const idx = (SECTION_7_EVENT_FIXTURE_IDS as readonly string[]).indexOf(id);
    if (idx === -1) {
      return HttpResponse.json(
        { ok: false, code: "AUDIT_EVENT_NOT_FOUND" },
        { status: 404 },
      );
    }
    const base = section7EventFixtures[idx]!;
    const prev = idx > 0 ? section7EventFixtures[idx - 1]! : null;
    const next =
      idx < section7EventFixtures.length - 1
        ? section7EventFixtures[idx + 1]!
        : null;
    return HttpResponse.json(
      {
        ok: true,
        event: {
          ...base,
          previous_event:
            prev === null
              ? null
              : {
                  audit_id: prev.audit_id,
                  event_hash: prev.event_hash,
                  timestamp: prev.timestamp,
                },
          next_event:
            next === null
              ? null
              : {
                  audit_id: next.audit_id,
                  event_hash: next.event_hash,
                  timestamp: next.timestamp,
                },
        },
      },
      { status: 200 },
    );
  },
);

const auditVerifyChainHandler = http.get(
  `${API_BASE}/audit/verify-chain`,
  ({ request }) => {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") ?? "self";
    if (
      scope !== "self" &&
      scope !== "org" &&
      scope !== "platform" &&
      scope !== "regulator"
    ) {
      return HttpResponse.json(
        { ok: false, code: "INVALID_SCOPE" },
        { status: 400 },
      );
    }
    const first = section7EventFixtures[0]!;
    const last = section7EventFixtures[section7EventFixtures.length - 1]!;
    return HttpResponse.json(
      {
        ok: true,
        scope,
        verified: true,
        checked_event_count: section7EventFixtures.length,
        chain_algorithm: "SHA-256/14-field-canonical-record",
        window_start: first.timestamp,
        window_end: last.timestamp,
        first_event_id: first.audit_id,
        last_event_id: last.audit_id,
        first_event_hash: first.event_hash,
        last_event_hash: last.event_hash,
        broken_at_event_id: null,
        failure_reason: null,
        lawful_basis_id: null,
        evidence_note:
          "verified=true means every checked row's hash recomputes to the stored event_hash and every previous_event_hash links to its predecessor. Empty windows return verified=true with checked_event_count=0 (vacuously). Failure reasons follow a closed vocabulary.",
        honest_note:
          "Self-scope verification: walks the caller's own audit chain only.",
      },
      { status: 200 },
    );
  },
);

const auditEventsExportHandler = http.get(
  `${API_BASE}/audit/events/export`,
  ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "ndjson";
    const scope = url.searchParams.get("scope") ?? "self";
    const eventTypeFilter = url.searchParams.get("event_type");
    const outcomeFilter = url.searchParams.get("outcome");
    if (format !== "ndjson" && format !== "csv") {
      return HttpResponse.json(
        {
          ok: false,
          code: "INVALID_FIELD",
          invalid_fields: ["format"],
        },
        { status: 422 },
      );
    }
    const filtered = section7EventFixtures.filter((e) => {
      if (
        eventTypeFilter !== null &&
        eventTypeFilter !== "" &&
        e.event_type !== eventTypeFilter
      ) {
        return false;
      }
      if (
        outcomeFilter !== null &&
        outcomeFilter !== "" &&
        e.outcome !== outcomeFilter
      ) {
        return false;
      }
      return true;
    });
    let body: string;
    let contentType: string;
    if (format === "csv") {
      const header =
        "audit_id,event_type,outcome,timestamp,event_hash\n";
      const rows = filtered
        .map(
          (e) =>
            `${e.audit_id},${e.event_type},${e.outcome},${e.timestamp},${e.event_hash}`,
        )
        .join("\r\n");
      body = header + rows;
      contentType = "text/csv; charset=utf-8";
    } else {
      body = filtered.map((e) => JSON.stringify(e)).join("\n");
      contentType = "application/x-ndjson; charset=utf-8";
    }
    return new HttpResponse(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "x-audit-row-count": String(filtered.length),
        "x-audit-truncated": "false",
        "x-audit-scope": scope,
        "x-audit-format": format,
      },
    });
  },
);

// ════════════════════════════════════════════════════════════════
// Section 9 — Compliance frameworks + live posture (Foundation
// ComplianceService LIVE). Read-only fixtures for the CT
// Policies page.
// ════════════════════════════════════════════════════════════════
const complianceFrameworksFixture = [
  {
    framework_id: "f1111111-1111-1111-1111-111111111111",
    framework_name: "HIPAA",
    jurisdiction: ["US"],
    applicable_entity_sectors: ["HEALTHCARE"],
    applicable_capsule_types: ["IDENTITY", "DOMAIN_KNOWLEDGE"],
    required_audit_events: [],
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-05-31T00:00:00.000Z",
  },
  {
    framework_id: "f2222222-2222-2222-2222-222222222222",
    framework_name: "FERPA",
    jurisdiction: ["US"],
    applicable_entity_sectors: ["EDUCATION"],
    applicable_capsule_types: ["IDENTITY"],
    required_audit_events: [],
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-05-31T00:00:00.000Z",
  },
  {
    framework_id: "f3333333-3333-3333-3333-333333333333",
    framework_name: "FedRAMP",
    jurisdiction: ["US"],
    applicable_entity_sectors: ["GOVERNMENT"],
    applicable_capsule_types: [],
    required_audit_events: [],
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-05-31T00:00:00.000Z",
  },
] as const;

const complianceFrameworksHandler = http.get(
  `${API_BASE}/compliance/frameworks`,
  () =>
    HttpResponse.json(
      { ok: true, frameworks: complianceFrameworksFixture },
      { status: 200 },
    ),
);

const complianceStateHandler = http.get(
  `${API_BASE}/compliance/state`,
  () =>
    HttpResponse.json(
      {
        ok: true,
        state: {
          org_entity_id: "org-entity-0001",
          frameworks: [
            {
              framework_name: "HIPAA",
              compliant: true,
              since: "2026-05-30T18:00:00.000Z",
              last_check: "2026-05-31T22:00:00.000Z",
              sample_failure_count_24h: 0,
            },
            {
              framework_name: "FERPA",
              compliant: false,
              since: null,
              last_check: "2026-05-31T22:00:00.000Z",
              sample_failure_count_24h: 2,
            },
          ],
          evaluated_at: "2026-05-31T22:30:00.000Z",
        },
      },
      { status: 200 },
    ),
);

// Phase 1273 — authority context (hierarchy/RBAC/ABAC). Default mirrors
// the live demo: the caller is an org admin (manager authority); known
// teammates resolve; an unknown name (Alex) is NOT_FOUND. Tests override
// with server.use for peer / ambiguous cases.
const KNOWN_TEAMMATES: Record<string, { id: string; name: string; role: string }> = {
  vishesh: { id: "ent-vishesh", name: "Vishesh Sharma", role: "AI UI ENGINEER" },
  samiksha: { id: "ent-samiksha", name: "Samiksha Sharma", role: "AI/NLP ENGINEER" },
  david: { id: "ent-david", name: "David Odie", role: "TECH LEAD" },
};
const workOsAuthorityHandler = http.post(
  `${API_BASE}/work-os/authority-context`,
  async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      target_name?: string;
      actions?: string[];
    };
    const key = (body.target_name ?? "").trim().toLowerCase();
    const hit = KNOWN_TEAMMATES[key];
    const resolved = hit !== undefined;
    const authority = {
      caller_can_admin_org: true,
      target_resolution: resolved ? "RESOLVED_INTERNAL_ENTITY" : "NOT_FOUND",
      target_entity_id: hit?.id ?? null,
      target_display_name: hit?.name ?? null,
      target_role_title: hit?.role ?? null,
      caller_is_manager_of_target: resolved,
      caller_can_view_target_calendar: resolved,
      caller_can_schedule_with_target: resolved,
      caller_can_assign_task_to_target: resolved,
      caller_timezone: "America/Los_Angeles",
      target_timezone: null,
      org_default_timezone: "America/Los_Angeles",
    };
    const policies = (body.actions ?? []).map((action) => {
      if (!resolved) {
        return {
          action,
          decision: "BLOCKED",
          reason_code: "TARGET_NOT_FOUND",
          reason: "The participant could not be resolved in your organization.",
        };
      }
      const decision =
        action === "CREATE_INTERNAL_MEETING" || action === "ASSIGN_TASK"
          ? "ALLOW_WITH_CONFIRMATION"
          : "ALLOW";
      return {
        action,
        decision,
        reason_code: "MANAGER_AUTHORITY",
        reason: "Manager authority allows internal action after you confirm.",
      };
    });
    return HttpResponse.json({ ok: true, authority, policies }, { status: 200 });
  },
);

// Phase 1277 — runtime fabric default: honest NOT_CONFIGURED (no live
// Python/BEAM in tests); env KEY NAMES only, never values.
function runtimeView(status: string, env_key: string | null, configured: boolean) {
  return { status, env_key, configured, capabilities: [], note: "", last_checked_at: null };
}
const runtimeCapabilitiesHandler = http.get(
  `${API_BASE}/system/runtime-capabilities`,
  () =>
    HttpResponse.json({
      ok: true,
      runtimes: {
        typescript_api: runtimeView("HEALTHY", null, true),
        python_worker: runtimeView("NOT_CONFIGURED", "PYTHON_INTELLIGENCE_RUNTIME_URL", false),
        beam_fabric: runtimeView("DISABLED", "BEAM_RUNTIME_URL", false),
        desktop_native: runtimeView("CONFIGURED_UNVERIFIED", null, true),
        queue_event_bus: runtimeView("NOT_CONFIGURED", null, false),
        fallback_active: true,
      },
    }),
);

// Phase 1279 — durable Work Ledger create default (echoes a saved entry).
const workLedgerCreateHandler = http.post(
  `${API_BASE}/work-os/ledger`,
  async ({ request }) => {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return HttpResponse.json(
      {
        ok: true,
        entry: {
          ledger_entry_id: "led-test-1",
          ledger_type: typeof b.ledger_type === "string" ? b.ledger_type : "TASK",
          source_type: "VOICE_COMMAND",
          source_command: typeof b.source_command === "string" ? b.source_command : null,
          work_plan_id: typeof b.work_plan_id === "string" ? b.work_plan_id : null,
          owner_entity_id: null,
          target_entity_id: typeof b.target_entity_id === "string" ? b.target_entity_id : null,
          title: typeof b.title === "string" ? b.title : "Work item",
          status: typeof b.status === "string" ? b.status : "PROPOSED",
          priority: "ROUTINE",
          extraction_source: "TYPESCRIPT_DETERMINISTIC",
          next_action: null,
          due_at: null,
          created_at: "2026-06-13T18:00:00.000Z",
          coordination_runtime: "BEAM_DISPATCHED",
          coordination_watcher: "none",
        },
      },
      { status: 201 },
    );
  },
);

export const handlers = [
  workOsAuthorityHandler,
  runtimeCapabilitiesHandler,
  workLedgerCreateHandler,
  // Section 2 Action read surface (ADR-0057 §9 + §10)
  actionDetailHandler,
  // Section 7 Full Audit Viewer (ADR-0071 + earlier Section 7 waves)
  auditEventsListHandler,
  auditEventDetailHandler,
  auditVerifyChainHandler,
  auditEventsExportHandler,
  // Section 9 Compliance (ComplianceService LIVE)
  complianceFrameworksHandler,
  complianceStateHandler,
  // Section 5 Agent Playground Wave 10 (ADR-0077)
  playgroundListScenariosHandler,
  playgroundCreateScenarioHandler,
  playgroundGetScenarioHandler,
  playgroundDeleteScenarioHandler,
  playgroundCandidatesHandler,
  playgroundComparisonHandler,
  playgroundRecommendationHandler,
  playgroundSimulationHandler,
  playgroundTransitionHandler,
  // 12B.1 / 12B.4 (extended)
  shareHandler,
  revokeHandler,
  // 12B.2
  membersCreateHandler,
  onboardingStartHandler,
  onboardingInviteHandler,
  entitiesListHandler,
  entitiesPatchHandler,
  auditListHandler,
  analyticsHandler,
  hierarchyHandler,
  permissionsHandler,
  // 12B.3
  aiTeammatesListHandler,
  aiTeammatesGetHandler,
  aiTeammatesCreateHandler,
  aiTeammatesPatchHandler,
  skillPackagesListHandler,
  aiTeammatesAddSkillHandler,
  // 12B.4
  capsulesHandler,
  // Employee Otzar MVP
  otzarConversationMessageHandler,
  otzarConversationCloseHandler,
  otzarConnectorAdaptersHandler,
  otzarProductionReadinessHandler,
  otzarDandelionGrowthHandler,
  otzarDandelionOnboardingHandler,
  otzarCalendarContextHandler,
  otzarObserveProvidersHandler,
  otzarCollaborationWorkspacesDefaultHandler,
  otzarObserveHandler,
  otzarVoiceNoteRevokePlanHandler,
  otzarVoiceNoteRevokeApplyHandler,
  otzarCorrectionHandler,
  // Employee Approvals / Escalations (pending before :id so the literal
  // path wins over the :id param matcher).
  escalationsPendingHandler,
  escalationsDetailHandler,
  escalationsApproveHandler,
  escalationsRejectHandler,
  // Employee My Twin + Conversations metadata (list before :id so the
  // literal path wins over the :id param matcher).
  otzarMyTwinHandler,
  otzarConversationsHandler,
  otzarConversationDetailHandler,
  otzarConversationCorrectionsHandler,
];
