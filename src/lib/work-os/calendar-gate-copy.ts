// FILE: calendar-gate-copy.ts
// PURPOSE: Phase 1274/1275 — gate-AWARE copy for a meeting proposal's
//          event-create state. Replaces the stale blanket "Event creation
//          is not enabled yet" with the EXACT current blocker. A gated
//          create path exists; this names which gate is unmet, never
//          claims the feature is missing, and always ends with the
//          standing safety line. Pure + deterministic so it is testable.
// CONNECTS TO: AmbientOtzarBar meeting flow (artifact.runtimeNote),
//          WorkArtifactCard render.

// Minimal shape — the gate-relevant fields of a meeting WorkArtifact.
export interface CalendarGateInput {
  status?: string;
  prerequisite?: string;
  explicitTime?: string;
  proposedTime?: string;
  targetLabel?: string;
}

const SAFETY = "No event created. No invite sent.";

// WHAT: The precise event-create gate copy for a meeting proposal.
// INPUT: the gate-relevant artifact fields.
// OUTPUT: one human sentence naming the highest-priority unmet gate,
//         always ending in the safety line.
// WHY: The UI must show the exact blocker (unresolved participant /
//      missing time / normalization-not-wired / pending confirmation /
//      scope / target-calendar), not a generic "not enabled yet" — a
//      gated create path DOES exist.
export function getCalendarCreateGateCopy(a: CalendarGateInput): string {
  // 1. Unresolved participant — blocks the whole lifecycle.
  if (a.status === "Participant unresolved") {
    return `Resolve the participant before Otzar can check availability or create the event. ${SAFETY}`;
  }
  // 2. Prerequisite confirmation pending (earliest post-resolution gate).
  if (a.prerequisite !== undefined) {
    // Strip a leading "Requires " so we extract the person, not the verb.
    const who = a.prerequisite
      .replace(/^Requires\s+/i, "")
      .match(/([A-Z][a-z]+)/)?.[1];
    const subject = who !== undefined ? `${who} confirmation` : "confirmation";
    return `Waiting for ${subject} before event creation can proceed. ${SAFETY}`;
  }
  // 3. Explicit time captured — N-04 normalizes on Confirm; surface readiness.
  if (a.explicitTime !== undefined) {
    const t = a.proposedTime ?? a.explicitTime;
    return `Time captured: ${t}. Confirm to use the final agreed datetime (timezone-aware). ${SAFETY}`;
  }
  // 4. No time at all.
  // (No selected slot and no explicit time → the user must pick a time.)
  // Falls through to the generic gate ladder only when a time exists but
  // a later gate (scope/authority) is the blocker — surfaced post-Confirm.
  return `Choose a time before Otzar can create the event. ${SAFETY}`;
}

// WHAT: Generic gate-ladder fallback (when no single field dominates).
// WHY: Used post-Confirm or for edge states — names the full ladder
//      honestly instead of "not enabled".
export function calendarCreateGenericGateCopy(): string {
  return (
    "Calendar creation is gated. Otzar will only create the event after " +
    "participant resolution, selected time, required confirmations, Google " +
    `event-write scope, and policy/authority gates pass. ${SAFETY}`
  );
}
