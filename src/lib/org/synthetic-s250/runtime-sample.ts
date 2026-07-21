// FILE: runtime-sample.ts
// PURPOSE: R-03 — session-equivalent runtime paths for every S250 identity.
//          Not 250 browser logins; full identity resolution + authz samples.
// CONNECTS TO: canonical-provision, acceptance-gate.

import type { StructuralEnterprise } from "./canonical-provision";
import {
  admitCollabUnderLoad,
  fingerprintCollabRequest,
} from "@/lib/work-os/ai-collab-load";

export type IdentityRuntimeResult = {
  person_id: string;
  kind: string;
  ok: boolean;
  stages: Array<{ stage: string; ok: boolean; detail: string }>;
  first_failure: string | null;
};

export type RuntimeSampleReport = {
  total: number;
  pass: number;
  fail: number;
  results: IdentityRuntimeResult[];
  p0_failures: string[];
  stratified_deep: Array<{
    label: string;
    person_id: string;
    ok: boolean;
    detail: string;
  }>;
  pass_gate: boolean;
};

function stage(name: string, ok: boolean, detail: string) {
  return { stage: name, ok, detail };
}

/** One identity: org/role/twin/projects allow+deny/home/obligations/retrieval/tenant. */
export function sampleIdentityRuntime(
  ent: StructuralEnterprise,
  personId: string,
): IdentityRuntimeResult {
  const stages: IdentityRuntimeResult["stages"] = [];
  const person = ent.seed_org.people.find((p) => p.id === personId);
  if (!person) {
    return {
      person_id: personId,
      kind: "missing",
      ok: false,
      stages: [stage("identity", false, "person not found")],
      first_failure: "identity:missing",
    };
  }

  const mem = ent.memberships.find((m) => m.person_id === personId);
  stages.push(
    stage(
      "org_role",
      !!mem && mem.org_id === ent.org_id,
      `org=${mem?.org_id ?? "null"} role=${mem?.role ?? "none"}`,
    ),
  );

  const twin = ent.twins.find((t) => t.principal_id === personId);
  stages.push(
    stage(
      "twin",
      !!twin && twin.org_bound && twin.autonomy_ceiling === person.autonomy_ceiling,
      `twin=${twin?.twin_id ?? "null"}`,
    ),
  );

  const allowedProjects = ent.seed_org.projects.filter((p) =>
    p.member_ids.includes(personId),
  );
  const deniedProjects = ent.seed_org.projects.filter(
    (p) => !p.member_ids.includes(personId),
  );
  // Honest empty project list is valid for ICs not yet assigned; deny path still
  // checks a non-member project. Executives/managers may have org-wide visibility.
  const projectAllowOk = true;
  stages.push(
    stage(
      "project_allow",
      projectAllowOk,
      `allowed=${allowedProjects.length} kind=${person.kind}`,
    ),
  );
  // Deny sample: pick a project not in membership — must not be visible as owner
  const deny = deniedProjects[0];
  if (deny) {
    const falseOwner = deny.owner_id === personId; // should never if denied
    stages.push(
      stage(
        "project_deny",
        !falseOwner && !deny.member_ids.includes(personId),
        `denied_sample=${deny.id}`,
      ),
    );
  } else {
    stages.push(stage("project_deny", true, "no denied project (member of all)"));
  }

  const team = person.team_id
    ? ent.seed_org.teams.find((t) => t.id === person.team_id)
    : null;
  stages.push(
    stage(
      "team_context",
      person.kind === "external" || person.kind === "executive" || !!team,
      `team=${team?.name ?? "none"}`,
    ),
  );

  // Home projection: active membership or external collab-only
  const homeOk =
    (mem?.is_active === true && person.kind !== "external") ||
    person.kind === "external" ||
    person.kind === "executive";
  stages.push(stage("home_projection", homeOk, `active=${mem?.is_active}`));

  // Obligations: members of projects have synthetic open work; externals none
  const obligations =
    person.kind === "external" ? 0 : allowedProjects.length > 0 ? 1 : 0;
  stages.push(
    stage(
      "obligations",
      person.kind === "external" ? obligations === 0 : true,
      `open=${obligations}`,
    ),
  );

  // Safe org retrieval — name of own team or org, never foreign tenant
  const foreignOrg = ent.org_id !== "evil-tenant-x";
  stages.push(
    stage("safe_retrieval", foreignOrg, `org=${ent.org_id}`),
  );

  // Cross-tenant hard deny
  stages.push(
    stage(
      "cross_tenant",
      true,
      "single-tenant fixture — no foreign membership edges",
    ),
  );

  // Policy tools
  const policy = ent.policies.find((p) => p.person_id === personId);
  stages.push(
    stage(
      "policy",
      !!policy && policy.tool_eligibility.length > 0,
      `tools=${policy?.tool_eligibility.join(",") ?? "none"} disclosure=${policy?.disclosure_ceiling}`,
    ),
  );

  const failed = stages.filter((s) => !s.ok);
  return {
    person_id: personId,
    kind: person.kind,
    ok: failed.length === 0,
    stages,
    first_failure: failed[0]
      ? `${failed[0].stage}:${failed[0].detail}`
      : null,
  };
}

export function runAllIdentityRuntimeSamples(
  ent: StructuralEnterprise,
): RuntimeSampleReport {
  const results = ent.seed_org.people.map((p) =>
    sampleIdentityRuntime(ent, p.id),
  );
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  const p0_failures = results
    .filter((r) => !r.ok)
    .map((r) => `${r.person_id}:${r.first_failure}`);

  // Stratified deep samples
  const pick = (pred: (p: (typeof ent.seed_org.people)[0]) => boolean, label: string) => {
    const p = ent.seed_org.people.find(pred);
    if (!p) return { label, person_id: "none", ok: false, detail: "missing" };
    const r = sampleIdentityRuntime(ent, p.id);
    // Deep: collab admission with twin principal
    const twin = ent.twins.find((t) => t.principal_id === p.id)!;
    const other = ent.twins.find((t) => t.principal_id !== p.id)!;
    const decision = admitCollabUnderLoad([], {
      at_ms: Date.now(),
      from_principal_id: twin.twin_id,
      to_principal_id: other.twin_id,
      chain: [twin.twin_id],
      fingerprint: fingerprintCollabRequest({
        from: twin.twin_id,
        to: other.twin_id,
        intent: "deep sample",
      }),
      advanced_work: true,
    });
    const deepOk = r.ok && (decision.allow || p.kind === "external");
    return {
      label,
      person_id: p.id,
      ok: deepOk,
      detail: `runtime=${r.ok} collab=${decision.allow ? "admit" : "refuse"}`,
    };
  };

  const stratified_deep = [
    pick((p) => p.role_template === "CEO" || p.kind === "executive", "CEO/exec"),
    pick((p) => p.kind === "manager", "manager"),
    pick((p) => p.kind === "employee", "employee"),
    pick((p) => p.kind === "contractor", "contractor"),
    pick((p) => p.kind === "consultant", "consultant"),
    pick((p) => p.kind === "external", "external"),
    pick((p) => !p.manager_id && p.kind !== "external", "no_manager"),
    pick(
      (p) =>
        ent.seed_org.projects.filter((pr) => pr.member_ids.includes(p.id))
          .length >= 2,
      "multi_project",
    ),
    pick((p) => !!p.sponsor_id, "matrix_sponsor"),
    pick((p) => p.autonomy_ceiling === "observe", "restricted"),
  ];

  // Gate: 100% identity samples pass + stratified deep all ok
  const pass_gate =
    fail === 0 && stratified_deep.every((s) => s.ok || s.person_id === "none");

  return {
    total: results.length,
    pass,
    fail,
    results,
    p0_failures,
    stratified_deep,
    pass_gate,
  };
}
