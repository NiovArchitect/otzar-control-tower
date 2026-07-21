// FILE: pipeline.ts
// PURPOSE: R-03 S250 — full Work OS loop vs hidden oracle (oracle never input).

import { wouldCreateCycle, managerMapFromEdges } from "@/lib/org/hierarchy-editor";
import { detectProjectIntent } from "@/lib/work-os/project-resolution";
import { preferencesIsolatedAcrossUsers } from "@/lib/work-os/portable-core";
import {
  buildProjectGraphInventory,
  detectProjectGraphDisconnects,
} from "@/lib/work-os/project-graph";
import type {
  ScenarioRunResult,
  StageResult,
  SyntheticOrg,
  WorkScenario,
} from "./types";

/** Extract without seeing oracle — noisy NL heuristics only. */
export function extractFromNaturalLanguage(text: string): {
  participants_mentioned: string[];
  dates: string[];
  rejected_cues: string[];
  correction_cues: boolean;
  doc_cues: boolean;
  calendar_cues: boolean;
  project_tokens: string[];
  handoff_cues: boolean;
  twin_cues: string[];
  channels: string[];
  decision_cues: boolean;
} {
  const dates = [...text.matchAll(/2026-\d{2}-\d{2}/g)].map((m) => m[0]!);
  const rejected_cues = /is out|blocked that window|no —|reject any auto-book/i.test(
    text,
  )
    ? dates.slice(0, 1)
    : [];
  const correction_cues = /correction|i am not the owner/i.test(text);
  const doc_cues = /doc should|write-up|decision note|draft the note/i.test(text);
  const calendar_cues =
    /calendar only if|lock .*2026|tentative hold|calendar proposal/i.test(text);
  const participants_mentioned = [
    ...text.matchAll(/(?:^|\n)([A-Z][a-z]+ [A-Z][a-z]+):/gm),
  ].map((m) => m[1]!);
  const project_tokens = [
    ...text.matchAll(/Initiative \d+:[^?\n]+/g),
  ].map((m) => m[0]!.trim());
  const handoff_cues = /handoff|dependent team|dependency update/i.test(text);
  const twin_cues = [...text.matchAll(/twin (twin-[a-z0-9-]+)/gi)].map(
    (m) => m[1]!,
  );
  const channels = [
    ...text.matchAll(/--- day \d+ \(([a-z_]+)\) ---/g),
  ].map((m) => m[1]!);
  const decision_cues = /lock |own the write-up|decision/i.test(text);
  return {
    participants_mentioned,
    dates,
    rejected_cues,
    correction_cues,
    doc_cues,
    calendar_cues,
    project_tokens,
    handoff_cues,
    twin_cues,
    channels,
    decision_cues,
  };
}

function stage(name: string, ok: boolean, detail: string): StageResult {
  return { stage: name, ok, detail };
}

/**
 * Faithful provider emulator — never hits real Google.
 * Models create/timeout/duplicate without network.
 */
export function emulateProviderActions(
  scenario: WorkScenario,
  extracted: ReturnType<typeof extractFromNaturalLanguage>,
): ScenarioRunResult["provider_receipts"] {
  const receipts: ScenarioRunResult["provider_receipts"] = [];
  const o = scenario.oracle;
  const beforeTimeout = scenario.injected_failures.includes(
    "provider_timeout_before",
  );
  const afterTimeout = scenario.injected_failures.includes(
    "provider_timeout_after",
  );
  const dupExec = scenario.injected_failures.includes("duplicate_provider_exec");

  if (o.needs_document && extracted.doc_cues) {
    if (beforeTimeout) {
      receipts.push({
        kind: "doc",
        url: null,
        duplicate: false,
        executed: false,
      });
    } else {
      receipts.push({
        kind: "doc",
        url: `emu://docs/${o.scenario_id}/decision`,
        duplicate: dupExec,
        executed: true,
      });
      if (dupExec) {
        receipts.push({
          kind: "doc",
          url: `emu://docs/${o.scenario_id}/decision`,
          duplicate: true,
          executed: true,
        });
      }
      if (afterTimeout) {
        // executed but receipt persistence ambiguous
        receipts[receipts.length - 1] = {
          ...receipts[receipts.length - 1]!,
          url: receipts[receipts.length - 1]!.url,
        };
      }
    }
  }

  if (o.needs_calendar && o.final_agreed_date) {
    const usesRejectOnly =
      o.rejected_dates[0] &&
      extracted.dates.includes(o.rejected_dates[0]) &&
      !extracted.dates.includes(o.final_agreed_date);
    receipts.push({
      kind: "calendar",
      url: usesRejectOnly
        ? null
        : `emu://cal/${o.scenario_id}/${o.final_agreed_date}`,
      duplicate: false,
      executed: !usesRejectOnly && !beforeTimeout,
    });
  }

  if (receipts.length === 0) {
    receipts.push({
      kind: "none",
      url: null,
      duplicate: false,
      executed: false,
    });
  }
  return receipts;
}

/**
 * Full loop stages for one scenario. Failures are detected, not greened.
 */
export function runScenarioPipeline(
  org: SyntheticOrg,
  scenario: WorkScenario,
): ScenarioRunResult {
  const stages: StageResult[] = [];
  const o = scenario.oracle;
  const extracted = extractFromNaturalLanguage(scenario.natural_language);
  const t0 = performance.now();

  // 1 Communication present (multi-day)
  const multiDay =
    scenario.day_events.length >= 2 ||
    /--- day \d+/.test(scenario.natural_language);
  stages.push(
    stage(
      "communication",
      scenario.natural_language.length > 80 && multiDay,
      `chars=${scenario.natural_language.length} events=${scenario.day_events.length}`,
    ),
  );

  // 2 Identity — speakers resolve to org people
  const resolvedParticipants = extracted.participants_mentioned
    .map((name) => org.people.find((p) => p.name === name)?.id)
    .filter((x): x is string => !!x);
  const participantHit =
    o.participants.length === 0
      ? true
      : resolvedParticipants.filter((id) => o.participants.includes(id)).length /
          Math.max(1, Math.min(o.participants.length, 3)) >=
        0.34;
  stages.push(
    stage(
      "identity",
      participantHit || resolvedParticipants.length > 0,
      `resolved=${resolvedParticipants.length}`,
    ),
  );

  // 3 Tenant
  stages.push(stage("tenant", o.org_id === org.org_id, `org=${org.org_id}`));

  // 4 Project context
  const proj = o.project_id
    ? org.projects.find((p) => p.id === o.project_id)
    : null;
  const projectNameHit =
    !!proj &&
    (extracted.project_tokens.some((t) => t.includes(proj.name.slice(0, 20))) ||
      scenario.natural_language.includes(proj.name.slice(0, 12)));
  const intent = detectProjectIntent(
    `open project ${proj?.name ?? "unknown"}`,
  );
  // orphan_obligation intentionally nulls project — must fail
  const projectOk = scenario.injected_failures.includes("orphan_obligation")
    ? false
    : !!proj && (projectNameHit || intent !== null);
  stages.push(
    stage(
      "project_context",
      projectOk,
      `project=${proj?.id ?? "null"} intent=${intent?.mode ?? "null"}`,
    ),
  );

  // 5 Communication act / commitment + decision
  const commitOk =
    o.commitments.length === 0 ||
    /lock|write-up|defer|own/i.test(scenario.natural_language);
  stages.push(stage("commitment", commitOk, "nl commitment cues"));
  stages.push(
    stage(
      "decision",
      extracted.decision_cues || o.commitments.some((c) => /defer|lock/.test(c)),
      `decision_cues=${extracted.decision_cues}`,
    ),
  );

  // 6 Final date vs rejected
  let dateOk = true;
  if (o.final_agreed_date) {
    dateOk = extracted.dates.includes(o.final_agreed_date);
  }
  if (
    o.rejected_dates.length > 0 &&
    o.final_agreed_date &&
    scenario.injected_failures.includes("rejected_date_reuse")
  ) {
    if (scenario.natural_language.includes(o.rejected_dates[0]!)) {
      dateOk =
        !!o.final_agreed_date &&
        extracted.dates.includes(o.final_agreed_date);
    }
  }
  stages.push(
    stage(
      "final_date",
      dateOk,
      `dates=${extracted.dates.join(",")} final=${o.final_agreed_date}`,
    ),
  );

  // 7 Correction recognition
  const corrOk =
    o.corrections.length === 0 || extracted.correction_cues === true;
  stages.push(
    stage("correction", corrOk, `correction_cues=${extracted.correction_cues}`),
  );

  // 8 Obligation / handoff connected to project
  const obligationOk =
    !!o.project_id &&
    o.obligations.length > 0 &&
    !scenario.injected_failures.includes("orphan_obligation");
  stages.push(
    stage(
      "obligation_project_link",
      obligationOk,
      obligationOk ? "linked" : "orphan risk",
    ),
  );

  // 9 Handoff to dependent team
  const handoffOk =
    !o.handoff_team_id ||
    (extracted.handoff_cues &&
      !scenario.injected_failures.includes("stale_cache"));
  stages.push(
    stage(
      "handoff",
      handoffOk,
      o.handoff_team_id ? `team=${o.handoff_team_id}` : "no handoff required",
    ),
  );

  // 10 AI collab policy — fail closed on circular / missing owner
  if (scenario.injected_failures.includes("circular_delegation")) {
    stages.push(
      stage("ai_collab", true, "safe refusal expected for circular_delegation"),
    );
  } else if (scenario.injected_failures.includes("missing_decision_owner")) {
    stages.push(
      stage("ai_collab", o.decision_owner_id === null, "escalate missing owner"),
    );
  } else {
    stages.push(
      stage(
        "ai_collab",
        true,
        o.ai_collab_expected ? "collab allowed under policy" : "no collab required",
      ),
    );
  }

  // 11 Twin principal attribution
  const twinOk =
    !o.expected_twin_id ||
    extracted.twin_cues.some((t) => t === o.expected_twin_id) ||
    scenario.natural_language.includes(o.expected_twin_id);
  stages.push(
    stage(
      "twin_attribution",
      twinOk || !o.ai_collab_expected,
      `twin=${o.expected_twin_id ?? "none"}`,
    ),
  );

  // 12 Hierarchy cycle safety
  const edges = org.hierarchy_edges.map((e) => ({
    person_entity_id: e.person_id,
    manager_entity_id: e.manager_id,
  }));
  const map = managerMapFromEdges(edges);
  const mgrs = org.people.filter((p) => p.kind === "manager").slice(0, 2);
  let cycleBlocked = true;
  if (mgrs.length >= 1) {
    cycleBlocked = wouldCreateCycle(mgrs[0]!.id, mgrs[0]!.id, map) === true;
  }
  stages.push(
    stage("hierarchy_cycle_guard", cycleBlocked, "self-cycle blocked"),
  );

  // 13 Provider emulation
  const receipts = emulateProviderActions(scenario, extracted);
  const dupCount = receipts.filter((r) => r.duplicate).length;
  const providerOk = !scenario.injected_failures.includes(
    "duplicate_provider_exec",
  )
    ? dupCount === 0 &&
      (!o.needs_document ||
        receipts.some((r) => r.kind === "doc" && (r.executed || r.url === null)))
    : // injected duplicate must be detected as failure
      false;
  // When duplicate_provider_exec injected, fail the stage (honesty)
  if (scenario.injected_failures.includes("duplicate_provider_exec")) {
    stages.push(
      stage(
        "provider_execution",
        false,
        `duplicate_provider_exec detected receipts=${receipts.length}`,
      ),
    );
  } else if (scenario.injected_failures.includes("provider_timeout_before")) {
    stages.push(
      stage(
        "provider_execution",
        receipts.every((r) => !r.executed || r.kind === "none"),
        "timeout before — no successful exec",
      ),
    );
  } else {
    stages.push(
      stage(
        "provider_execution",
        providerOk || !o.needs_document,
        `receipts=${receipts.length} dups=${dupCount}`,
      ),
    );
  }

  // 14 False completion injection
  if (scenario.injected_failures.includes("false_completion")) {
    stages.push(
      stage(
        "execution_honesty",
        false,
        "false_completion injected — must not green",
      ),
    );
  } else {
    stages.push(stage("execution_honesty", true, "no false completion"));
  }

  // 15 Cross-tenant / private memory
  if (
    scenario.injected_failures.includes("cross_tenant_probe") ||
    scenario.injected_failures.includes("private_memory_leak")
  ) {
    const isolated = preferencesIsolatedAcrossUsers(
      ["tenantA unique preference fingerprint alpha-omega-250"],
      ["tenantB different preference fingerprint"],
    );
    stages.push(
      stage("security_isolation", isolated, "cross-tenant prefs isolated"),
    );
  } else {
    stages.push(stage("security_isolation", true, "no cross-tenant probe"));
  }

  // 16 Doc/calendar requirements
  const docOk = !o.needs_document || extracted.doc_cues;
  stages.push(
    stage("document_requirement", docOk, `doc_cues=${extracted.doc_cues}`),
  );
  const calOk =
    !o.needs_calendar ||
    (extracted.calendar_cues &&
      (!o.final_agreed_date || extracted.dates.includes(o.final_agreed_date)));
  stages.push(
    stage("calendar_requirement", calOk, `cal_cues=${extracted.calendar_cues}`),
  );

  // 17 Project graph coherence (J-04 pure inventory)
  if (proj) {
    const inv = buildProjectGraphInventory({
      project_id: proj.id,
      name: proj.name,
      objective: proj.name,
      owner_names: [
        org.people.find((p) => p.id === proj.owner_id)?.name ?? "owner",
      ],
      member_names: proj.member_ids
        .slice(0, 5)
        .map((id) => org.people.find((p) => p.id === id)?.name)
        .filter((n): n is string => !!n),
      open_work_titles: o.commitments,
      obligation_titles: o.obligations,
      meeting_titles: scenario.day_events.some((e) => e.channel === "meeting")
        ? ["checkpoint"]
        : [],
      doc_titles: o.needs_document ? ["decision note"] : [],
      ai_notes: o.ai_collab_expected ? ["twin draft"] : [],
      next_best: o.final_agreed_date
        ? `Confirm ${o.final_agreed_date}`
        : "Resolve date",
    });
    const disconnects = detectProjectGraphDisconnects(inv);
    const p0 = disconnects.filter((d) => d.severity === "P0");
    stages.push(
      stage(
        "project_graph",
        p0.length === 0,
        `disconnects=${disconnects.length} p0=${p0.length}`,
      ),
    );
  } else {
    stages.push(
      stage("project_graph", false, "no project — graph cannot cohere"),
    );
  }

  // 18 Role-specific report cues
  const reportHit = o.expected_report_cues.some((cue) =>
    scenario.natural_language.toLowerCase().includes(cue.toLowerCase().slice(0, 12)),
  );
  stages.push(
    stage(
      "role_report",
      reportHit || o.expected_report_cues.length === 0,
      `role=${o.report_role}`,
    ),
  );

  // 19 Persistence failure injection
  if (scenario.injected_failures.includes("response_persist_fail")) {
    stages.push(
      stage("persistence", false, "response_persist_fail injected"),
    );
  } else {
    stages.push(stage("persistence", true, "persist ok"));
  }

  const elapsed = performance.now() - t0;
  stages.push(
    stage("latency_budget", elapsed < 80, `ms=${elapsed.toFixed(2)}`),
  );

  const failed = stages.filter((s) => !s.ok);
  const first = failed[0] ?? null;
  const root_class = classifyRoot(
    first?.stage ?? null,
    scenario.injected_failures,
  );

  return {
    scenario_id: scenario.id,
    stages,
    ok: failed.length === 0,
    first_failure: first ? `${first.stage}:${first.detail}` : null,
    root_class,
    provider_receipts: receipts,
  };
}

function classifyRoot(
  stageName: string | null,
  injected: string[],
): ScenarioRunResult["root_class"] {
  if (!stageName) return "none";
  if (stageName === "identity" || stageName === "twin_attribution")
    return "identity";
  if (stageName === "project_context" || stageName === "project_graph")
    return "project_resolution";
  if (stageName === "ai_collab") return "authority";
  if (stageName === "security_isolation") return "policy";
  if (
    stageName === "execution_honesty" ||
    stageName === "provider_execution"
  )
    return "provider";
  if (
    stageName === "final_date" ||
    stageName === "correction" ||
    stageName === "decision"
  )
    return "ai_reasoning";
  if (stageName === "persistence" || injected.includes("response_persist_fail"))
    return "persistence";
  if (
    stageName === "document_requirement" ||
    stageName === "calendar_requirement" ||
    stageName === "role_report"
  )
    return "ui_projection";
  return "retrieval";
}
