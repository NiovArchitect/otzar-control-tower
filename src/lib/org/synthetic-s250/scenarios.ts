// FILE: scenarios.ts
// PURPOSE: R-03 S250 — multi-day multi-channel NL work + hidden oracles + failure seeds.

import { mulberry32, pick, pickN } from "./prng";
import type {
  HiddenOracle,
  SyntheticOrg,
  WorkChannel,
  WorkDayEvent,
  WorkScenario,
} from "./types";

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
  "duplicate_provider_exec",
  "orphan_obligation",
  "private_memory_leak",
] as const;

const CHANNELS: WorkChannel[] = [
  "chat",
  "email",
  "meeting",
  "doc_comment",
  "calendar",
  "handoff",
  "ai_collab",
];

function channelPrefix(channel: WorkChannel): string {
  switch (channel) {
    case "chat":
      return "[slack-ish]";
    case "email":
      return "[email thread]";
    case "meeting":
      return "[meeting notes]";
    case "doc_comment":
      return "[doc discussion]";
    case "calendar":
      return "[calendar proposal]";
    case "handoff":
      return "[handoff]";
    case "ai_collab":
      return "[ai teammate]";
  }
}

/**
 * Multi-day messy NL — not pre-labeled for extraction.
 * Pronouns, corrections, rejected dates, partial info.
 */
function buildMultiDayEvents(args: {
  speakers: string[];
  projectName: string;
  agreeDate: string | null;
  rejectDate: string | null;
  correction: boolean;
  unavailable: string | null;
  startDay: number;
  channels: WorkChannel[];
  handoffTeam: string | null;
  twinHint: string | null;
}): WorkDayEvent[] {
  const [a, b, c] = args.speakers;
  const events: WorkDayEvent[] = [];
  const d0 = args.startDay;

  // Day 0 — chat ambiguity
  events.push({
    day: d0,
    channel: args.channels[0] ?? "chat",
    natural_language: [
      `${channelPrefix(args.channels[0] ?? "chat")}`,
      `${a}: can we move the ${args.projectName} checkpoint? I thought we said next Tuesday but maybe I misread.`,
      `${b}: which one — theirs or ours? pronouns are messy; I mean the customer checkpoint.`,
    ].join("\n"),
  });

  // Day 1 — email / rejection
  events.push({
    day: d0 + 1,
    channel: args.channels[1] ?? "email",
    natural_language: [
      `${channelPrefix(args.channels[1] ?? "email")}`,
      `From: ${b}`,
      args.rejectDate
        ? `Subject: re checkpoint — no, ${args.rejectDate} is out, finance already blocked that window.`
        : `Subject: re checkpoint — still fuzzy on capacity.`,
      `${c ?? a}: partial info only; legal has not replied.`,
    ].join("\n"),
  });

  // Day 2 — meeting / agreement or defer
  events.push({
    day: d0 + 2,
    channel: "meeting",
    natural_language: [
      `[meeting notes] ${args.projectName}`,
      args.agreeDate
        ? `${c ?? b}: ok, then we lock ${args.agreeDate} and I'll own the write-up. ${a} loops legal if needed.`
        : `${b}: let's not lock a day yet — still waiting on capacity.`,
      args.correction
        ? `${a}: correction — I am not the owner; ${b} is. I only recommended.`
        : `${a}: sounds right from my side.`,
    ].join("\n"),
  });

  // Day 3 — doc + calendar + optional handoff
  events.push({
    day: d0 + 3,
    channel: "doc_comment",
    natural_language: [
      `[doc discussion]`,
      `${b}: doc should capture the decision; calendar only if we actually agreed a date.`,
      args.unavailable
        ? `${c ?? a}: also ${args.unavailable} is OOO Thu/Fri so don't assign them the handoff.`
        : `${c ?? a}: keep the draft short.`,
    ].join("\n"),
  });

  if (args.agreeDate) {
    events.push({
      day: d0 + 3,
      channel: "calendar",
      natural_language: [
        `[calendar proposal]`,
        `${b}: tentative hold for ${args.agreeDate} — reject any auto-book of ${args.rejectDate ?? "prior windows"}.`,
      ].join("\n"),
    });
  }

  if (args.handoffTeam) {
    events.push({
      day: d0 + 4,
      channel: "handoff",
      natural_language: [
        `[handoff]`,
        `${b}: hand the dependency update to ${args.handoffTeam} — they still think the old date is live.`,
      ].join("\n"),
    });
  }

  if (args.twinHint) {
    events.push({
      day: d0 + 4,
      channel: "ai_collab",
      natural_language: [
        `[ai teammate]`,
        `${a}: ask my twin to draft the note under my principal — twin ${args.twinHint} — not as a free-floating bot.`,
      ].join("\n"),
    });
  }

  return events;
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
    const unavailablePerson = rng() > 0.6 ? pick(rng, ics) : null;
    const startDay = 1 + (s % 7);
    const channelPick = pickN(rng, CHANNELS, 3);
    const depTeam =
      org.teams.find((t) => !project.team_ids.includes(t.id)) ??
      org.teams[0] ??
      null;
    const handoffTeam =
      rng() > 0.45 && depTeam ? depTeam.name : null;

    const injected: string[] = [];
    if (rng() > 0.5) {
      injected.push(pick(rng, FAILURE_CLASSES));
    }
    if (rng() > 0.82) {
      injected.push(pick(rng, FAILURE_CLASSES));
    }

    let falseCompletion = false;
    if (injected.includes("false_completion")) {
      falseCompletion = true;
    }

    const twin = org.twins.find((t) => t.human_id === owner.id) ?? null;

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
      obligations: injected.includes("orphan_obligation")
        ? ["publish decision note"]
        : ["publish decision note", "notify dependent team"],
      needs_document: true,
      needs_calendar: !!agree,
      conflicts: reject && agree ? [`rejected ${reject} vs agreed ${agree}`] : [],
      corrections: correction
        ? ["speaker is not owner; ownership reassigned"]
        : [],
      allowed_disclosures: ["project status", "agreed date"],
      ai_collab_expected: rng() > 0.4,
      report_role: owner.kind,
      expected_report_cues: [
        project.name.slice(0, 18),
        agree ?? "deferred",
        owner.role_template,
      ],
      handoff_team_id: handoffTeam ? depTeam?.id ?? null : null,
      expected_twin_id: twin?.id ?? null,
    };

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
    if (injected.includes("orphan_obligation")) {
      oracle.project_id = null;
      oracle.conflicts.push("orphan_obligation");
    }
    if (injected.includes("duplicate_provider_exec")) {
      oracle.conflicts.push("duplicate_provider_exec");
    }

    const day_events = buildMultiDayEvents({
      speakers:
        speakers.length >= 2
          ? speakers
          : [owner.name, speakers[0] ?? "Teammate"],
      projectName: project.name,
      agreeDate: agree,
      rejectDate: reject,
      correction,
      unavailable: unavailablePerson?.name ?? null,
      startDay,
      channels: channelPick,
      handoffTeam,
      twinHint: twin?.id ?? null,
    });

    // Inject out-of-order day swap
    if (injected.includes("out_of_order") && day_events.length >= 2) {
      const tmp = day_events[0]!;
      day_events[0] = day_events[1]!;
      day_events[1] = tmp;
    }

    // Duplicate event injection
    if (injected.includes("duplicate_event") && day_events[0]) {
      day_events.push({ ...day_events[0], day: day_events[0].day });
    }

    const natural_language = day_events
      .map((e) => `--- day ${e.day} (${e.channel}) ---\n${e.natural_language}`)
      .join("\n\n");

    scenarios.push({
      id: oracle.scenario_id,
      day: startDay,
      natural_language,
      day_events,
      injected_failures: injected,
      oracle,
    });
  }

  return scenarios;
}

export { FAILURE_CLASSES };
