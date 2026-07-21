// FILE: investor-journey.ts
// PURPOSE: S-02 — investor / YC-style browser journey contract: real product
//          surfaces only, no staged frontend-only fakes, honest empties OK.
// CONNECTS TO: otzar-live-investor-journey-s02 deep smoke, FOUNDER S-02.

/** Ordered steps a founder/investor must survive unscripted on live. */
export const INVESTOR_JOURNEY_STEPS = [
  "Login lands product shell (Today / Home)",
  "Today shows real work language or honest empty",
  "Needs me is live (queue or honest empty — not coming soon)",
  "Projects open with composition (people / work / context)",
  "Comms / sources surface without fake connected claims",
  "AI Teammate is role-context, not empty chatbot",
  "Memory / Teach Otzar / portable core is real",
  "Authority / graduated autonomy is real",
  "People & collaboration envelope is real",
  "No staged demo-only or coming-soon primary dead ends",
] as const;

/** Copy that must never appear as a primary product completion claim. */
export const INVESTOR_BANNED_FAKES = [
  /coming soon/i,
  /not implemented/i,
  /placeholder only/i,
  /demo mode only/i,
  /staged for investors/i,
  /fake data for demo/i,
  /lorem ipsum/i,
  /todo: wire/i,
  /start chatting with nothing/i,
  /empty chat box only/i,
] as const;

/** Soft product language that proves the surface is the real Work OS. */
export const INVESTOR_PRODUCT_SIGNALS = [
  /Today|Needs me|Talk|Otzar|Work OS|AI Teammate/i,
  /project|approval|handoff|waiting|work/i,
  /memory|preference|authority|collaboration/i,
] as const;

export function claimsStagedFrontendFake(text: string): boolean {
  return INVESTOR_BANNED_FAKES.some((re) => re.test(text));
}

export function hasInvestorProductSignal(text: string): boolean {
  return INVESTOR_PRODUCT_SIGNALS.some((re) => re.test(text));
}

export interface JourneyStepResult {
  id: string;
  ok: boolean;
  detail: string;
}

export function scoreInvestorJourney(
  steps: JourneyStepResult[],
): { pass: number; fail: number; all_ok: boolean } {
  const pass = steps.filter((s) => s.ok).length;
  const fail = steps.filter((s) => !s.ok).length;
  return { pass, fail, all_ok: fail === 0 && pass >= 5 };
}
