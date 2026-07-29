// FILE: demo-persona-value.ts
// PURPOSE: Above-the-fold role value copy for YC demo personas.
//          Pure map - no hard-coded ledger IDs; product still loads real work.
// CONNECTS TO: DemoRoleValueCard, DemoPersonaLauncher sessionStorage key.

export interface DemoPersonaValue {
  key: string;
  roleLabel: string;
  who: string;
  outcome: string;
  otzarHandled: string;
  needsHuman: string;
  orgImpact: string;
  talkPrompt: string;
}

const FALLBACK: DemoPersonaValue = {
  key: "unknown",
  roleLabel: "Demo role",
  who: "You are viewing the fictional Y Combinator Labs HelioGrid review.",
  outcome: "One current organization truth across roles.",
  otzarHandled: "Coordination, clarification, and evidence routing under policy.",
  needsHuman: "Only consequential judgment when it appears in Needs me.",
  orgImpact: "Same event, different responsibility - no status-meeting chase.",
  talkPrompt: "What was decided about HelioGrid?",
};

const BY_KEY: Record<string, DemoPersonaValue> = {
  organization_lead: {
    key: "organization_lead",
    roleLabel: "Organization lead",
    who: "You own the portfolio decision for HelioGrid (fictional).",
    outcome: "Conditional interview - security gate still open.",
    otzarHandled:
      "Scattered review communication became owned work and AI collabs.",
    needsHuman:
      "Only high-stakes portfolio judgment - not Casey's checklist tasks.",
    orgImpact: "One management signal instead of status meetings.",
    talkPrompt: "What is the current recommendation for HelioGrid?",
  },
  application_review_lead: {
    key: "application_review_lead",
    roleLabel: "Application review lead",
    who: "Ava owns interview readiness and the recommendation path.",
    outcome: "Invite waits on security green - not on vague follow-ups.",
    otzarHandled:
      "AI Teammate requested minimum security context; private memory excluded.",
    needsHuman: "Send invite only after the security condition clears.",
    orgImpact: "Review moves without Ava chasing every dependency.",
    talkPrompt: "What is blocking the interview invitation?",
  },
  technical_diligence_lead: {
    key: "technical_diligence_lead",
    roleLabel: "Technical diligence lead",
    who: "Jordan owns architecture and evidence pack quality.",
    outcome: "Architecture evidence must be attached before advance.",
    otzarHandled: "Vague diligence asks became a concrete evidence pack request.",
    needsHuman: "Attach and confirm technical evidence - not organization selection.",
    orgImpact: "Technical risk is visible to management without re-explaining.",
    talkPrompt: "What technical evidence is still missing?",
  },
  security_lead: {
    key: "security_lead",
    roleLabel: "Security lead",
    who: "Casey owns the encryption and data-rights gate.",
    outcome: "Security checklist is the open condition on the interview.",
    otzarHandled: "AI Teammate answered Ava's minimum authorized security ask.",
    needsHuman: "Finish remaining controls; you do not approve org selection.",
    orgImpact:
      "When you complete the gate, recommendation and work update together.",
    talkPrompt: "What security items remain before the invite?",
  },
  market_review_lead: {
    key: "market_review_lead",
    roleLabel: "Market review lead",
    who: "Riley owns customer evidence and market risk.",
    outcome: "Northline Ops evidence is in motion for the recommendation.",
    otzarHandled:
      "Customer-evidence collaboration updated review work under policy.",
    needsHuman: "Confirm reference customers - not security checklist ownership.",
    orgImpact: "Market proof lands in the same current truth as security.",
    talkPrompt: "What customer evidence supports HelioGrid?",
  },
  regular_reviewer: {
    key: "regular_reviewer",
    roleLabel: "Regular reviewer",
    who: "Morgan does focused narrative and media review work.",
    outcome:
      "Partner one-pager waits on an upstream brief - personal scope only.",
    otzarHandled: "Work is clarified without organization-level approvals.",
    needsHuman: "Draft when inputs arrive - no portfolio decision queue.",
    orgImpact: "Specialist work stays unblocked without management theater.",
    talkPrompt: "What is on my work list for this review?",
  },
  program_coordinator: {
    key: "program_coordinator",
    roleLabel: "Program coordinator",
    who: "Sam owns scheduling, briefs, and ops delivery cadence.",
    outcome: "Competitive architecture brief has a clear delivery commitment.",
    otzarHandled: "Ops commitments are durable and visible without status pings.",
    needsHuman: "Deliver the brief - not security or interview authority.",
    orgImpact: "Program timing stays aligned to the same review truth.",
    talkPrompt: "What ops deliverables are still open?",
  },
  contractor: {
    key: "contractor",
    roleLabel: "Contractor researcher",
    who: "Quinn has bounded research access only.",
    outcome: "NovaGuard vendor control research for Casey - limited scope.",
    otzarHandled: "Work is scoped; company memory does not open by default.",
    needsHuman: "Research within bounds - never organization-level approval.",
    orgImpact: "External capacity helps without expanding authority.",
    talkPrompt: "What am I allowed to work on for this review?",
  },
};

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
