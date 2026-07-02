// FILE: consent-session.ts
// PURPOSE: CX-SLICE-5 — the TRUST layer for future workflow observation.
//          This is NOT screen recording and captures NOTHING. It is the pure
//          consent + session-review state model that must exist BEFORE any
//          capture is ever built: an employee explicitly starts a session,
//          sees it is active, can stop it, and reviews what it WOULD learn
//          before anything becomes memory. Org policy gates the whole thing;
//          an employee can never bypass it.
// CONNECTS TO: src/pages/app/MyMemory.tsx (the portable-work-identity home),
//              tests/unit/consent-session.test.ts.

/** Whether observation is even offered — decided by ORG POLICY, never by the
 *  employee. No such policy field is wired yet, so the honest default is
 *  "not enabled by your organization"; the employee cannot flip this. */
export type ObservationPolicy = "enabled_by_org" | "not_enabled_by_org";

export type ConsentSessionState =
  | "unavailable" // org has not enabled observation — nothing is offered
  | "idle" // enabled, no session running
  | "active" // employee consented + started; the visible indicator shows
  | "review"; // session stopped; the employee reviews before anything is kept

export interface ConsentSession {
  state: ConsentSessionState;
  /** True ONLY while a session is active — drives the on-screen indicator. */
  indicatorVisible: boolean;
}

// WHAT: the starting session for a given org policy.
export function initialSession(policy: ObservationPolicy): ConsentSession {
  return policy === "enabled_by_org"
    ? { state: "idle", indicatorVisible: false }
    : { state: "unavailable", indicatorVisible: false };
}

// WHAT: begin a consented session. Requires explicit consent AND an
//       org-enabled policy; refuses (no-op) otherwise. Nothing is captured —
//       this only moves the trust state to "active" and lights the indicator.
export function startSession(
  session: ConsentSession,
  input: { consentGiven: boolean; policy: ObservationPolicy },
): ConsentSession {
  if (input.policy !== "enabled_by_org") return session; // cannot bypass org policy
  if (!input.consentGiven) return session; // explicit consent is mandatory
  if (session.state !== "idle") return session;
  return { state: "active", indicatorVisible: true };
}

// WHAT: the employee stops the session → move to review (indicator OFF).
export function stopSession(session: ConsentSession): ConsentSession {
  if (session.state !== "active") return session;
  return { state: "review", indicatorVisible: false };
}

// WHAT: finish review. keep=false discards everything (nothing was real
//       anyway in this prototype); keep=true is where a FUTURE capture would
//       hand reviewed METHODS (never company data) to portable memory.
export function completeReview(
  session: ConsentSession,
  _keep: boolean,
): ConsentSession {
  if (session.state !== "review") return session;
  return { state: "idle", indicatorVisible: false };
}

/** What observation would learn vs never touch — the customer-facing promise. */
export const OBSERVATION_LEARNS = [
  "Your work methods and the steps you take",
  "Your writing style and tone",
  "Which tools you use for which tasks",
  "Repeatable patterns worth reusing",
] as const;

export const OBSERVATION_NEVER = [
  "Your employer's confidential documents or records",
  "Raw file or message contents",
  "Anything you didn't consent to in this session",
] as const;

/** The single honesty line: this is the trust model, not live capture. */
export const OBSERVATION_STATUS_NOTE =
  "Otzar isn't recording anything yet. This is how observation will work when your organization enables it — always with your consent, always visible, always yours to review first.";
