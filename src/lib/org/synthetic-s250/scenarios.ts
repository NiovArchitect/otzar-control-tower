// FILE: scenarios.ts
// PURPOSE: R-03 S250 — natural-language work scenarios + hidden oracles + failure seeds.

import { mulberry32, pick, pickN } from "./prng";
import type { HiddenOracle, SyntheticOrg, WorkScenario } from "./types";

const FAILURE_CLASSES = [
  "duplicate_event",
  "out_of_order",
  "stale_revision",
  "expired_permission",
  "revoked_membership",
  "manager_change",
  "project_owner_change",
  "provider_timeout_before",
  "provider_timeout_after",
  "response_persist_fail",
  "duplicate_collab",
  "circular_delegation",
  "missing_decision_owner",
  "unavailable_human",
  "conflicting_truth",
  "stale_cache",
  "cross_org_same_user",
  "rejected_date_reuse",
  "false_completion",
  "cross_tenant_probe",
] as const;

/**
 * Build natural language that is intentionally messy — not pre-labeled for extraction.
 */
function buildUtterance(args: {
  speakers: string[];
  projectName: string;
  agreeDate: string | null;
  rejectDate: string | null;
  correction: boolean;
  unavailable: string | null;
}): string {
  const [a, b, c] = args.speakers;
  const lines: string[] = [];
  lines.push(
    `${a}: can we move the ${args.projectName} checkpoint? I thought we said next Tuesday but maybe I misread.`,
  );
  if (args.rejectDate) {
    lines.push(
      `${b}: no — ${args.rejectDate} is out, finance already blocked that window.`,
    );
  }
  if (args.agreeDate) {
    lines.push(
      `${c ?? b}: ok, then we lock ${args.agreeDate} and I'll own the write-up. ${a} loops legal if needed.`,
    );
  } else {
    lines.push(`${b}: let's not lock a day yet — still waiting on capacity.`);
  }
  if (args.correction) {
    lines.push(
      `${a}: correction — I am not the owner; ${b} is. I only recommended.`,
    );
  }
  if (args.unavailable) {
    lines.push(
      `${b}: also ${args.unavailable} is OOO Thu/Fri so don't assign them the handoff.`,
    );
  }
  lines.push(
    `${c ?? a}: doc should capture the decision; calendar only if we actually agreed a date.`,
  );
  return lines.join("\n");
}

export function generateS250Scenarios(
  org: SyntheticOrg,
  count = 40,
): WorkScenario[] {
  const rng = mulberry32(org.seed + 99);
  const scenarios: WorkScenario[] = [];
  const ics = org.people.filter(
    (p) => p.kind === "employee" || p.kind === "manager",
  );
  const managers = org.people.filter((p) => p.kind === "manager");

  for (let s = 0; s < count; s++) {
    const project = org.projects[s % org.projects.length]!;
    const participants = pickN(rng, ics, 3).map((p) => p.id);
    // Prefer project members when possible
    const pm = project.member_ids
      .map((id) => org.people.find((p) => p.id === id)!)
      .filter(Boolean);
    const speakers =
      pm.length >= 2
        ? pickN(rng, pm, Math.min(3, pm.length)).map((p) => p.name)
        : participants.map(
            (id) => org.people.find((p) => p.id === id)?.name ?? id,
          );

    const agree =
      rng() > 0.25
        ? `2026-08-${String(10 + (s % 18)).padStart(2, "0")}`
        : null;
    const reject =
      rng() > 0.4
        ? `2026-08-${String(1 + (s % 9)).padStart(2, "0")}`
        : null;
    const owner = org.people.find((p) => p.id === project.owner_id)!;
    const manager =
      managers.find((m) => m.id === owner.manager_id) ?? managers[0] ?? null;
    const correction = rng() > 0.55;
    const unavailablePerson =
      rng() > 0.6 ? pick(rng, ics) : null;

    const injected: string[] = [];
    if (rng() > 0.55) {
      injected.push(pick(rng, FAILURE_CLASSES));
    }
    if (rng() > 0.85) {
      injected.push(pick(rng, FAILURE_CLASSES));
    }

    // Failure-shaped oracles for specific injections
    let falseCompletion = false;
    if (injected.includes("false_completion")) {
      falseCompletion = true;
    }

    const oracle: HiddenOracle = {
      scenario_id: `sc-${org.seed}-${s}`,
      participants,
      org_id: org.org_id,
      project_id: project.id,
      decision_owner_id: correction ? participants[1]! : project.owner_id,
      manager_id: manager?.id ?? null,
      commitments: agree
        ? [`lock checkpoint on ${agree}`, "write decision doc"]
        : ["defer date lock"],
      final_agreed_date: agree,
      rejected_dates: reject ? [reject] : [],
      obligations: ["publish decision note", "notify dependent team"],
      needs_document: true,
      needs_calendar: !!agree,
      conflicts: reject && agree ? [`rejected ${reject} vs agreed ${agree}`] : [],
      corrections: correction
        ? ["speaker is not owner; ownership reassigned"]
        : [],
      allowed_disclosures: ["project status", "agreed date"],
      ai_collab_expected: rng() > 0.4,
      report_role: owner.kind,
    };

    // Encode injected failure expectations into oracle conflicts for scoring
    if (falseCompletion) {
      oracle.conflicts.push("false_completion_injected");
    }
    if (injected.includes("cross_tenant_probe")) {
      oracle.conflicts.push("cross_tenant_probe");
    }
    if (injected.includes("circular_delegation")) {
      oracle.conflicts.push("circular_delegation");
    }
    if (injected.includes("missing_decision_owner")) {
      oracle.decision_owner_id = null;
      oracle.conflicts.push("missing_decision_owner");
    }

    const natural_language = buildUtterance({
      speakers: speakers.length >= 2 ? speakers : [owner.name, speakers[0] ?? "Teammate"],
      projectName: project.name,
      agreeDate: agree,
      rejectDate: reject,
      correction,
      unavailable: unavailablePerson?.name ?? null,
    });

    scenarios.push({
      id: oracle.scenario_id,
      day: 1 + (s % 10),
      natural_language,
      injected_failures: injected,
      oracle,
    });
  }

  return scenarios;
}

export { FAILURE_CLASSES };
