// FILE: handlers.ts
// PURPOSE: MSW request handlers for Foundation endpoints invoked by
//          tests. Each test sub-box (12B.1, 12B.2, ...) extends this
//          file with handlers for the new endpoints it consumes.
// CONNECTS TO: tests/msw/server.ts (uses these handlers), every
//              unit test that exercises real API client paths.

import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:3000/api/v1";

// ════════════════════════════════════════════════════════════════
// 12B.1 baseline
// ════════════════════════════════════════════════════════════════

const shareHandler = http.post(
  `${API_BASE}/cosmp/share`,
  async () => {
    return HttpResponse.json(
      {
        ok: true,
        bridge_id: "00000000-1111-2222-3333-444444444444",
        permissions_created: ["aaa-perm-1"],
        audit_event_id: "11111111-2222-3333-4444-555555555555",
      },
      { status: 201 },
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

const permissionsHandler = http.get(
  `${API_BASE}/org/permissions`,
  async () => {
    return HttpResponse.json(
      { ok: true, items: [], total: 0, skip: 0, take: 25 },
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
  // 12B.1
  shareHandler,
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
];
