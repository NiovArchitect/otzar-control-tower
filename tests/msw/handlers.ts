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
];
