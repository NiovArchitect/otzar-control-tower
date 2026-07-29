// FILE: demo-persona-value.ts
// PURPOSE: Above-the-fold role value copy for YC demo personas.
//          Pure map - no hard-coded ledger IDs; product still loads real work.
// CONNECTS TO: DemoRoleValueCard, DemoPersonaLauncher sessionStorage key.

export interface DemoPersonaValue {
  key: string;
  roleLabel: string;
  /** One-line who / responsibility. */
  who: string;
  /** Current outcome they own. */
  outcome: string;
  /** What Otzar already handled (must map to live result, not theater). */
  otzarHandled: string;
  /** What still needs the human. */
  needsHuman: string;
  /** What their AI Teammate is doing now. */
  aiTeammateNow: string;
  /** Organization impact from this role's projection. */
  orgImpact: string;
  /** Suggested Talk question. */
  talkPrompt: string;
  /** Compact launcher benefit (one line). */
  launcherBenefit: string;
}

const FALLBACK: DemoPersonaValue = {
  key: "unknown",
  roleLabel: "Review role",
  who: "You are in the HelioGrid application review workspace.",
  outcome: "One current organization truth across roles.",
  otzarHandled: "Coordination, clarification, and evidence routing under policy.",
  needsHuman: "Only consequential judgment when it appears in Needs me.",
  aiTeammateNow: "Holding your scoped view of the review and next safe step.",
  orgImpact: "Same event, different responsibility - no status-meeting chase.",
  talkPrompt: "What was decided about HelioGrid?",
  launcherBenefit: "See how Otzar projects this review for your role.",
};

const BY_KEY: Record<string, DemoPersonaValue> = {
  organization_lead: {
    key: "organization_lead",
    roleLabel: "Organization lead",
    who: "You own the portfolio decision for the HelioGrid application review.",
    outcome: "Conditional interview - security gate still open.",
    otzarHandled:
      "Scattered review communication became owned work and AI collabs.",
    needsHuman:
      "Only high-stakes portfolio judgment - not specialist checklist tasks.",
    aiTeammateNow:
      "Preparing the management signal and tracking the open security condition.",
    orgImpact: "One management signal instead of status meetings.",
    talkPrompt: "What is the current recommendation for HelioGrid?",
    launcherBenefit:
      "See the current recommendation, material risk, what Otzar handled, and the one decision that may still need leadership.",
  },
  application_review_lead: {
    key: "application_review_lead",
    roleLabel: "Application review lead",
    who: "Ava owns interview readiness and the recommendation path.",
    outcome: "Invite waits on security green - not on vague follow-ups.",
    otzarHandled:
      "AI Teammate requested minimum security context; private memory excluded.",
    needsHuman: "Send invite only after the security condition clears.",
    aiTeammateNow:
      "Tracking Casey's gate and keeping the invite path concrete.",
    orgImpact: "Review moves without Ava chasing every dependency.",
    talkPrompt: "What is blocking the interview invitation?",
    launcherBenefit:
      "Own the review journey: recommendation, dependencies, and interview readiness.",
  },
  technical_diligence_lead: {
    key: "technical_diligence_lead",
    roleLabel: "Technical diligence lead",
    who: "Jordan owns architecture and evidence pack quality.",
    outcome: "Architecture evidence must be attached before advance.",
    otzarHandled: "Vague diligence asks became a concrete evidence pack request.",
    needsHuman: "Attach and confirm technical evidence - not organization selection.",
    aiTeammateNow:
      "Holding the evidence pack request and technical risk projection.",
    orgImpact: "Technical risk is visible to management without re-explaining.",
    talkPrompt: "What technical evidence is still missing?",
    launcherBenefit:
      "See technical work, evidence gaps, and what blocks advance.",
  },
  security_lead: {
    key: "security_lead",
    roleLabel: "Security lead",
    who: "Casey owns the encryption and data-rights gate.",
    outcome: "Security checklist is the open condition on the interview.",
    otzarHandled: "AI Teammate answered Ava's minimum authorized security ask.",
    needsHuman: "Finish remaining controls; you do not approve org selection.",
    aiTeammateNow:
      "Serving minimum authorized security context to Ava's AI Teammate.",
    orgImpact:
      "When you complete the gate, recommendation and work update together.",
    talkPrompt: "What security items remain before the invite?",
    launcherBenefit:
      "See the security gate, who is waiting, and the exact remaining controls.",
  },
  market_review_lead: {
    key: "market_review_lead",
    roleLabel: "Market review lead",
    who: "Riley owns customer evidence and market risk.",
    outcome: "Northline Ops evidence is in motion for the recommendation.",
    otzarHandled:
      "Customer-evidence collaboration updated review work under policy.",
    needsHuman: "Confirm reference customers - not security checklist ownership.",
    aiTeammateNow:
      "Keeping customer evidence current for the shared recommendation.",
    orgImpact: "Market proof lands in the same current truth as security.",
    talkPrompt: "What customer evidence supports HelioGrid?",
    launcherBenefit:
      "See customer evidence, market risk, and recommendation movement.",
  },
  program_coordinator: {
    key: "program_coordinator",
    roleLabel: "Program coordinator",
    who: "Sam owns scheduling, briefs, and ops delivery cadence.",
    outcome: "Competitive architecture brief has a clear delivery commitment.",
    otzarHandled: "Ops commitments are durable and visible without status pings.",
    needsHuman: "Deliver the brief - not security or interview authority.",
    aiTeammateNow:
      "Tracking handoffs and report delivery against the shared review truth.",
    orgImpact: "Program timing stays aligned to the same review truth.",
    talkPrompt: "What ops deliverables are still open?",
    launcherBenefit:
      "Keep scheduling, handoffs, and report delivery moving without noise.",
  },
  regular_reviewer: {
    key: "regular_reviewer",
    roleLabel: "Regular reviewer",
    who: "Morgan does focused narrative and media review work.",
    outcome:
      "Partner one-pager waits on an upstream brief - personal scope only.",
    otzarHandled: "Work is clarified without organization-level approvals.",
    needsHuman: "Draft when inputs arrive - no portfolio decision queue.",
    aiTeammateNow:
      "Holding your assignment and excluding organization-wide noise.",
    orgImpact: "Specialist work stays unblocked without management theater.",
    talkPrompt: "What is on my work list for this review?",
    launcherBenefit:
      "Receive a focused assignment without organization-wide noise.",
  },
  contractor: {
    key: "contractor",
    roleLabel: "Contractor researcher",
    who: "Quinn has bounded research access only.",
    outcome: "NovaGuard vendor control research for Casey - limited scope.",
    otzarHandled: "Work is scoped; company memory does not open by default.",
    needsHuman: "Research within bounds - never organization-level approval.",
    aiTeammateNow:
      "Keeping research inside authorized bounds for Casey's gate.",
    orgImpact: "External capacity helps without expanding authority.",
    talkPrompt: "What am I allowed to work on for this review?",
    launcherBenefit:
      "Contribute bounded expertise without broad internal access.",
  },
};

/** Story order for the launcher (one connected review process). */
export const DEMO_PERSONA_STORY_ORDER: readonly string[] = [
  "organization_lead",
  "application_review_lead",
  "technical_diligence_lead",
  "security_lead",
  "market_review_lead",
  "program_coordinator",
  "regular_reviewer",
  "contractor",
] as const;

export type DemoPersonaGroupId =
  | "leadership"
  | "review_ownership"
  | "specialist_diligence"
  | "operations"
  | "contributors";

export interface DemoPersonaGroup {
  id: DemoPersonaGroupId;
  label: string;
  keys: readonly string[];
}

export const DEMO_PERSONA_GROUPS: readonly DemoPersonaGroup[] = [
  {
    id: "leadership",
    label: "Leadership",
    keys: ["organization_lead"],
  },
  {
    id: "review_ownership",
    label: "Review ownership",
    keys: ["application_review_lead"],
  },
  {
    id: "specialist_diligence",
    label: "Specialist diligence",
    keys: [
      "technical_diligence_lead",
      "security_lead",
      "market_review_lead",
    ],
  },
  {
    id: "operations",
    label: "Operations",
    keys: ["program_coordinator"],
  },
  {
    id: "contributors",
    label: "Contributors",
    keys: ["regular_reviewer", "contractor"],
  },
] as const;

export function demoPersonaValueFor(
  key: string | null | undefined,
): DemoPersonaValue {
  if (key === null || key === undefined || key.length === 0) return FALLBACK;
  return BY_KEY[key] ?? { ...FALLBACK, key };
}

export function readDemoPersonaKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem("otzar_demo_persona_key");
  } catch {
    return null;
  }
}

/**
 * WHAT: Sort persona cards into the connected review story order.
 * INPUT: personas from the API (any order).
 * OUTPUT: stable story order; unknown keys last.
 */
export function orderPersonasForStory<T extends { key: string }>(
  personas: T[],
): T[] {
  const rank = new Map(DEMO_PERSONA_STORY_ORDER.map((k, i) => [k, i]));
  return [...personas].sort((a, b) => {
    const ra = rank.get(a.key) ?? 999;
    const rb = rank.get(b.key) ?? 999;
    return ra - rb;
  });
}

/**
 * WHAT: Neutral immersive banner - never shows banned demo words.
 * INPUT: server banner and role title.
 * OUTPUT: short orientation suitable for chrome.
 */
export function demoRoleBanner(roleTitle: string | null | undefined): string {
  const role = (roleTitle ?? "review role").trim();
  return `Y Combinator Labs · Viewing as ${role}`;
}

/** Strip banned immersive-breaker words from any server string. */
export function sanitizeDemoFacingCopy(text: string): string {
  return text
    .replace(/\b[Ff]ictional\b/g, "")
    .replace(/\b[Ff]ake\b/g, "")
    .replace(/\b[Pp]retend\b/g, "")
    .replace(/\b[Mm]ock\b/g, "")
    .replace(/\b[Ss]ynthetic\b/g, "")
    .replace(/\b[Dd]ummy\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+·/g, " ·")
    .replace(/·\s*·/g, "·")
    .trim();
}
