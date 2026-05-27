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
    return HttpResponse.json(
      {
        ok: true,
        capsule_ids: ["cap-obs-1", "cap-obs-2"],
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

const otzarCorrectionHandler = http.post(
  `${API_BASE}/otzar/correction`,
  async () => {
    return HttpResponse.json(
      { ok: true, correction_capsule_id: "cap-correction-0001" },
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

export const handlers = [
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
  otzarObserveHandler,
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
];
