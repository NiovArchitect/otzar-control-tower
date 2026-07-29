// FILE: live-role-brief.ts
// PURPOSE: Compose first-fold role brief fields from live API truth
//          (DGI + My Work + collaboration), not static theater copy.
// CONNECTS TO: DemoRoleValueCard, api.otzar.dgiCoherence, api.workOs.myWork,
//              api.otzar.collaboration, demo-persona-value (identity only).

import type { DemoPersonaValue } from "@/lib/demo/demo-persona-value";
import { demoPersonaValueFor } from "@/lib/demo/demo-persona-value";

export type BriefFieldSource =
  | "live_dgi"
  | "live_work"
  | "live_collab"
  | "live_next"
  | "honest_idle"
  | "static_fallback";

export interface LiveRoleBriefField {
  text: string;
  source: BriefFieldSource;
  evidence?: string;
}

export interface LiveRoleBrief {
  key: string;
  roleLabel: string;
  who: string;
  outcome: LiveRoleBriefField;
  otzarHandled: LiveRoleBriefField;
  needsYou: LiveRoleBriefField;
  aiTeammateNow: LiveRoleBriefField;
  orgImpact: LiveRoleBriefField;
  talkPrompt: string;
  /** True when all five operational fields are live-backed (not static). */
  fullyLive: boolean;
  liveFieldCount: number;
}

export interface LiveBriefInputs {
  personaKey: string | null | undefined;
  /** DGI coherence snapshot (leak-safe). */
  dgi?: {
    open_active_work_titles?: string[] | null;
    open_active_work_count?: number | null;
    attention_count?: number | null;
    next_best_step?: {
      kind?: string | null;
      safe_title?: string | null;
      reason?: string | null;
    } | null;
    coherence_status?: string | null;
  } | null;
  /** My Work ledger rows. */
  workItems?: Array<{
    title?: string | null;
    safe_title?: string | null;
    status?: string | null;
    state?: string | null;
    ledger_type?: string | null;
  }> | null;
  /** Inbound + outbound collaboration receipts. */
  collabs?: Array<{
    state?: string | null;
    request_type?: string | null;
    safe_summary?: string | null;
    purpose?: string | null;
  }> | null;
}

function titleOf(item: {
  title?: string | null;
  safe_title?: string | null;
}): string {
  return (item.safe_title || item.title || "").trim();
}

function pickRecommendation(titles: string[]): string | null {
  const hit = titles.find((t) =>
    /recommendation|conditional interview|heliogrid/i.test(t),
  );
  return hit ?? null;
}

function pickNeedsYou(
  items: NonNullable<LiveBriefInputs["workItems"]>,
  personaKey: string,
): { text: string; evidence: string } | null {
  const open = items.filter((i) => {
    const st = (i.status || i.state || "").toUpperCase();
    return !["EXECUTED", "COMPLETED", "DONE", "CANCELLED", "CLOSED"].includes(st);
  });
  // Prefer open TASK/COMMITMENT owned in the title or generic first open.
  const ranked = [...open].sort((a, b) => {
    const score = (x: typeof a) => {
      const t = titleOf(x).toLowerCase();
      let s = 0;
      if ((x.ledger_type || "").toUpperCase() === "TASK") s += 2;
      if ((x.status || "").toUpperCase() === "BLOCKED") s += 3;
      if (/complete|finish|confirm|attach|send|draft|deliver|research/i.test(t))
        s += 1;
      // Leadership should not pick employee-owned Casey/Jordan tasks as "needs you"
      if (
        personaKey === "organization_lead" &&
        /^(casey|jordan|quinn|riley|morgan|sam):/i.test(t)
      ) {
        s -= 5;
      }
      return s;
    };
    return score(b) - score(a);
  });
  const first = ranked[0];
  if (!first) return null;
  const t = titleOf(first);
  if (!t) return null;
  return { text: t, evidence: `work:${first.ledger_type || "item"}` };
}

function pickOtzarHandled(
  collabs: NonNullable<LiveBriefInputs["collabs"]>,
  workItems: NonNullable<LiveBriefInputs["workItems"]>,
  titles: string[],
): { text: string; evidence: string } | null {
  const completed = collabs.filter((c) =>
    /COMPLETED|ACCEPTED/i.test(c.state || ""),
  );
  if (completed[0]) {
    const sum = (completed[0].safe_summary || completed[0].purpose || "").trim();
    if (sum.length > 0) {
      return {
        text: sum.length > 140 ? `${sum.slice(0, 137)}…` : sum,
        evidence: `collab:${completed[0].state}:${completed[0].request_type || "CONTEXT"}`,
      };
    }
  }
  const clarified = [...titles, ...workItems.map(titleOf)].find((t) =>
    /otzar clarified|ai teammate|evidence updated|18% claim retired|collaboration/i.test(
      t,
    ),
  );
  if (clarified) {
    return { text: clarified, evidence: "work_or_dgi_title" };
  }
  return null;
}

function pickAiNow(
  collabs: NonNullable<LiveBriefInputs["collabs"]>,
  next: LiveBriefInputs["dgi"] extends infer D
    ? D extends { next_best_step?: infer N }
      ? N
      : null
    : null,
  workItems: NonNullable<LiveBriefInputs["workItems"]>,
  titles: string[],
): { text: string; source: BriefFieldSource; evidence: string } {
  const activeCollab = collabs.find((c) =>
    /ACCEPTED|IN_PROGRESS|PENDING|REQUESTED/i.test(c.state || ""),
  );
  if (activeCollab) {
    const sum = (
      activeCollab.safe_summary ||
      activeCollab.purpose ||
      "Coordinating authorized context"
    ).trim();
    return {
      text:
        sum.length > 120
          ? `Coordinating: ${sum.slice(0, 100)}…`
          : `Coordinating: ${sum}`,
      source: "live_collab",
      evidence: `collab:${activeCollab.state}`,
    };
  }
  const completed = collabs.filter((c) => /COMPLETED/i.test(c.state || ""));
  if (completed[0]) {
    return {
      text: "No active collab right now — last authorized context exchange completed.",
      source: "honest_idle",
      evidence: `collab:COMPLETED`,
    };
  }
  const waiting = workItems.find((i) =>
    /BLOCKED|WAITING|DETECTED|PROPOSED/i.test(i.status || i.state || ""),
  );
  if (waiting) {
    const t = titleOf(waiting);
    return {
      text: t
        ? `Tracking: ${t.length > 100 ? `${t.slice(0, 97)}…` : t}`
        : "Tracking open assigned work.",
      source: "live_work",
      evidence: `work:${waiting.status || waiting.state}`,
    };
  }
  if (next && typeof next === "object" && next !== null && "safe_title" in next) {
    const n = next as { safe_title?: string | null; reason?: string | null };
    if (n.safe_title) {
      return {
        text: n.reason
          ? `${n.safe_title} — ${String(n.reason).slice(0, 80)}`
          : n.safe_title,
        source: "live_next",
        evidence: "dgi:next_best_step",
      };
    }
  }
  if (titles[0]) {
    return {
      text: `Monitoring: ${titles[0].slice(0, 100)}`,
      source: "live_dgi",
      evidence: "dgi:active_titles",
    };
  }
  return {
    text: "No active work right now.",
    source: "honest_idle",
    evidence: "idle",
  };
}

/**
 * WHAT: Build a live-backed role brief for the first fold.
 * INPUT: persona key + optional DGI / work / collab payloads.
 * OUTPUT: LiveRoleBrief with per-field source tags.
 */
export function composeLiveRoleBrief(input: LiveBriefInputs): LiveRoleBrief {
  const base: DemoPersonaValue = demoPersonaValueFor(input.personaKey);
  const titles = (input.dgi?.open_active_work_titles ?? []).filter(
    (t): t is string => typeof t === "string" && t.trim().length > 0,
  );
  const workItems = input.workItems ?? [];
  const collabs = input.collabs ?? [];

  const rec =
    pickRecommendation(titles) ||
    pickRecommendation(workItems.map(titleOf).filter(Boolean));

  const outcome: LiveRoleBriefField = rec
    ? { text: rec, source: "live_dgi", evidence: "dgi_or_work:recommendation" }
    : titles[0]
      ? { text: titles[0], source: "live_dgi", evidence: "dgi:active_titles[0]" }
      : workItems[0] && titleOf(workItems[0])
        ? {
            text: titleOf(workItems[0]),
            source: "live_work",
            evidence: "work:first",
          }
        : {
            text: base.outcome,
            source: "static_fallback",
            evidence: "persona_map",
          };

  const handledPick = pickOtzarHandled(collabs, workItems, titles);
  const otzarHandled: LiveRoleBriefField = handledPick
    ? {
        text: handledPick.text,
        source: handledPick.evidence.startsWith("collab")
          ? "live_collab"
          : "live_work",
        evidence: handledPick.evidence,
      }
    : {
        text: base.otzarHandled,
        source: "static_fallback",
        evidence: "persona_map",
      };

  const needsPick = pickNeedsYou(workItems, base.key);
  // For org lead prefer recommendation decision language if employee tasks dominate
  let needsYou: LiveRoleBriefField;
  if (base.key === "organization_lead") {
    const decision = workItems.find((i) =>
      /recommendation|interview|portfolio|decision/i.test(titleOf(i)),
    );
    if (decision && titleOf(decision)) {
      needsYou = {
        text: titleOf(decision),
        source: "live_work",
        evidence: "work:decision",
      };
    } else if (needsPick && !/^(casey|jordan|quinn):/i.test(needsPick.text)) {
      needsYou = {
        text: needsPick.text,
        source: "live_work",
        evidence: needsPick.evidence,
      };
    } else {
      needsYou = {
        text: "No high-stakes decision in Needs me right now — routine work stays with owners.",
        source: titles.length > 0 ? "live_dgi" : "honest_idle",
        evidence: "leadership_filter",
      };
    }
  } else {
    needsYou = needsPick
      ? {
          text: needsPick.text,
          source: "live_work",
          evidence: needsPick.evidence,
        }
      : {
          text: base.needsHuman,
          source: "static_fallback",
          evidence: "persona_map",
        };
  }

  const aiPick = pickAiNow(
    collabs,
    input.dgi?.next_best_step ?? null,
    workItems,
    titles,
  );
  const aiTeammateNow: LiveRoleBriefField = {
    text: aiPick.text,
    source: aiPick.source,
    evidence: aiPick.evidence,
  };

  // Org impact: dependency / who waits language from titles
  const impactTitle = titles.find((t) =>
    /before|waiting|gate|invite|recommendation|brief/i.test(t),
  );
  const orgImpact: LiveRoleBriefField = impactTitle
    ? {
        text: impactTitle,
        source: "live_dgi",
        evidence: "dgi:dependency_title",
      }
    : needsPick
      ? {
          text: `Blocks or advances: ${needsPick.text}`,
          source: "live_work",
          evidence: needsPick.evidence,
        }
      : {
          text: base.orgImpact,
          source: "static_fallback",
          evidence: "persona_map",
        };

  const fields = [outcome, otzarHandled, needsYou, aiTeammateNow, orgImpact];
  const liveFieldCount = fields.filter(
    (f) => f.source !== "static_fallback",
  ).length;

  return {
    key: base.key,
    roleLabel: base.roleLabel,
    who: base.who.replace(/\bfictional\b/gi, "").replace(/\s{2,}/g, " ").trim(),
    outcome,
    otzarHandled,
    needsYou,
    aiTeammateNow,
    orgImpact,
    talkPrompt: base.talkPrompt,
    fullyLive: liveFieldCount === 5,
    liveFieldCount,
  };
}

/** Minutes past midnight → human "8:00 AM". */
export function formatMinutesAsClock(min: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.floor(min)));
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const am = h24 < 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm.toString().padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

export function formatWorkingHoursLine(policy: {
  work_start_min?: number | null;
  work_end_min?: number | null;
  timezone?: string | null;
}): string | null {
  if (
    policy.work_start_min == null ||
    policy.work_end_min == null ||
    !Number.isFinite(policy.work_start_min) ||
    !Number.isFinite(policy.work_end_min)
  ) {
    return null;
  }
  const tz = policy.timezone ? ` ${policy.timezone}` : "";
  return `${formatMinutesAsClock(policy.work_start_min)}–${formatMinutesAsClock(policy.work_end_min)}${tz}`;
}
