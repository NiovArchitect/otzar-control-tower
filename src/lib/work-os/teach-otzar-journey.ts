// FILE: teach-otzar-journey.ts
// PURPOSE: H-01 — Teach Otzar how you work end-to-end: org policy → consent →
//          visible session → signals → candidates → approve/reject →
//          approved preferences (revocable). Pure contract for product + deep smoke.
// CONNECTS TO: MyMemory ObservationConsentCard, CompanyProfile policy card,
//          FOUNDER H-01 / H-02.

export type TeachPhase =
  | "org_disabled"
  | "idle"
  | "consenting"
  | "active"
  | "review"
  | "complete";

export interface TeachJourneyState {
  phase: TeachPhase;
  org_policy_enabled: boolean;
  consent_given: boolean;
  session_id: string | null;
  signal_count: number;
  pending_candidates: number;
  approved_preferences: number;
}

/** Ordered human steps for the teach journey. */
export const TEACH_OTZAR_STEPS = [
  "Organization enables professional learning (admin policy)",
  "Employee consents to a visible learning session",
  "Session runs with bounded professional signals only",
  "Employee stops session and reviews candidates",
  "Employee approves or rejects each preference",
  "Approved preferences stay personal and revocable",
] as const;

export const TEACH_NEVER = [
  "Company confidential documents or records",
  "Raw file or message contents",
  "New permissions or decision rights",
  "Silent capture without a visible session",
] as const;

export const TEACH_BOUNDARY_COPY =
  "Preference proposes behavior. Organization policy authorizes it. " +
  "Portable preferences never include company projects, customers, or confidential patterns.";

export function initialTeachState(orgEnabled: boolean): TeachJourneyState {
  return {
    phase: orgEnabled ? "idle" : "org_disabled",
    org_policy_enabled: orgEnabled,
    consent_given: false,
    session_id: null,
    signal_count: 0,
    pending_candidates: 0,
    approved_preferences: 0,
  };
}

export function canStartSession(s: TeachJourneyState): boolean {
  return (
    s.org_policy_enabled &&
    s.consent_given &&
    (s.phase === "idle" || s.phase === "consenting" || s.phase === "complete")
  );
}

export function afterStart(
  s: TeachJourneyState,
  sessionId: string,
): TeachJourneyState {
  if (!canStartSession(s) && s.phase !== "idle") {
    // allow start from idle when consent already given
  }
  if (!s.org_policy_enabled || !s.consent_given) return s;
  return {
    ...s,
    phase: "active",
    session_id: sessionId,
    signal_count: 0,
  };
}

export function afterSignals(
  s: TeachJourneyState,
  count: number,
): TeachJourneyState {
  if (s.phase !== "active") return s;
  return { ...s, signal_count: Math.max(0, count) };
}

export function afterStop(
  s: TeachJourneyState,
  pendingCandidates: number,
): TeachJourneyState {
  if (s.phase !== "active") return s;
  return {
    ...s,
    phase: "review",
    session_id: null,
    pending_candidates: pendingCandidates,
  };
}

export function afterApproveReject(
  s: TeachJourneyState,
  pendingLeft: number,
  approvedTotal: number,
): TeachJourneyState {
  if (s.phase !== "review" && s.phase !== "complete") return s;
  const next: TeachJourneyState = {
    ...s,
    pending_candidates: pendingLeft,
    approved_preferences: approvedTotal,
  };
  if (pendingLeft === 0) {
    return { ...next, phase: approvedTotal > 0 ? "complete" : "idle" };
  }
  return { ...next, phase: "review" };
}

/** Isolation: personal work-style vs org-bound memory must not blend. */
export function isPersonalPreferenceSummary(summary: string): boolean {
  const t = summary.toLowerCase();
  // Hard reject org-confidential markers in personal preference text
  if (
    /\b(customer secret|ssn|salary band confidential|api key|password)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  return true;
}

export function journeyProgressLabel(s: TeachJourneyState): string {
  switch (s.phase) {
    case "org_disabled":
      return "Waiting for organization policy";
    case "idle":
    case "consenting":
      return "Ready to start (consent required)";
    case "active":
      return `Learning session active · ${s.signal_count} signals`;
    case "review":
      return `Review ${s.pending_candidates} candidate${s.pending_candidates === 1 ? "" : "s"}`;
    case "complete":
      return `${s.approved_preferences} preference${s.approved_preferences === 1 ? "" : "s"} teaching Otzar`;
  }
}
