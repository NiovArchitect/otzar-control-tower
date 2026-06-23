// FILE: ambient-visibility.ts
// PURPOSE: Phase 2.5 — the ambient attention / visibility policy, in CODE
//          (not just doctrine). Backend real ≠ frontend loud. Every surfaced
//          ambient outcome is classified into ONE level so the orb stays calm:
//          audit/proof is SILENT, a low-risk success is a quiet CONFIRMATION,
//          and only judgment / ambiguity / failure / approval INTERRUPTS.
//
// CONTRACT:
//   decideAmbientVisibility(event, userContext) → a decision the surfacing
//   layer applies: whether to announce (speak), notify (panel), badge, and how
//   the proof is recorded. The caller composes the human copy; this module
//   never invents backend wording and `findBackendTermLeak` guards that copy
//   stays human (no route names, rail names, request ids, policy codes).
// CONNECTS TO: AmbientOtzarBar (self / collaboration / message executors),
//          tests/unit/ambient-visibility.test.ts.

// Five ambient visibility levels (see doctrine: silent / confirmation /
// interrupt / digest / detail_on_demand).
export type AmbientVisibility =
  | "silent"
  | "confirmation"
  | "interrupt"
  | "digest"
  | "detail_on_demand";

// The ambient outcomes the orb can produce. Kept closed so the mapping is
// exhaustive at compile time.
export type AmbientEventKind =
  | "MESSAGE_SENT" // plain internal message delivered
  | "COLLABORATION_SENT" // governed work / review / approval request sent
  | "SELF_WORK_SAVED" // self note / task / reminder / memory recorded
  | "LEDGER_PROOF" // audit / Work Ledger proof — record, never announce
  | "APPROVAL_NEEDED" // higher-risk action queued for approval
  | "BLOCKED_DENIED" // policy / authority blocked the action
  | "AMBIGUOUS_TARGET" // recipient ambiguous — one focused clarification
  | "ACTION_FAILED" // transient / unexpected failure
  | "NEEDS_CLARIFICATION" // missing detail — one focused question
  | "DIGEST_READY"; // a summary (e.g. meeting decisions/blockers)

export interface AmbientEvent {
  kind: AmbientEventKind;
  // The human-facing copy the caller already composed (never a backend code).
  userFacingCopy?: string;
}

export interface AmbientUserContext {
  // Reserved for role-aware tuning (Phase 4/5). Unused in v1 routing but part
  // of the stable signature so callers can pass it without a later breaking
  // change.
  roleTitle?: string | null;
  // Voice-first quiet mode: suppress spoken confirmations for low-risk success
  // (still announce interrupts — the user needs those).
  quietMode?: boolean;
}

export interface AmbientVisibilityDecision {
  visibility: AmbientVisibility;
  reason: string;
  userFacingCopy?: string;
  shouldNotify: boolean; // surface in the action panel / conversation
  shouldBadge: boolean; // passive badge (e.g. bell) rather than interrupt
  shouldPersistToLedger: boolean; // a durable proof exists for this outcome
  shouldShowInAuditOnly: boolean; // visible only under "why" / "show proof"
  shouldAnnounce: boolean; // speak aloud (voice confirmation)
}

interface BaseRule {
  visibility: AmbientVisibility;
  reason: string;
  shouldNotify: boolean;
  shouldBadge: boolean;
  shouldPersistToLedger: boolean;
  shouldShowInAuditOnly: boolean;
  shouldAnnounce: boolean;
}

// The policy table. Proof/audit silent by default; low-risk success quiet
// confirmation; approval / blocked / ambiguous / failure clear interrupt.
const RULES: Record<AmbientEventKind, BaseRule> = {
  MESSAGE_SENT: {
    visibility: "confirmation",
    reason: "low-risk delivery — quiet confirmation",
    shouldNotify: true,
    shouldBadge: false,
    shouldPersistToLedger: true,
    shouldShowInAuditOnly: false,
    shouldAnnounce: true,
  },
  COLLABORATION_SENT: {
    visibility: "confirmation",
    reason: "governed request sent — quiet confirmation, tracked",
    shouldNotify: true,
    shouldBadge: false,
    shouldPersistToLedger: true,
    shouldShowInAuditOnly: false,
    shouldAnnounce: true,
  },
  SELF_WORK_SAVED: {
    visibility: "confirmation",
    reason: "self work recorded — quiet confirmation",
    shouldNotify: true,
    shouldBadge: false,
    shouldPersistToLedger: true,
    shouldShowInAuditOnly: false,
    shouldAnnounce: true,
  },
  LEDGER_PROOF: {
    visibility: "silent",
    reason: "audit / proof — record silently, available on demand",
    shouldNotify: false,
    shouldBadge: false,
    shouldPersistToLedger: true,
    shouldShowInAuditOnly: true,
    shouldAnnounce: false,
  },
  APPROVAL_NEEDED: {
    visibility: "interrupt",
    reason: "needs human approval — surface clearly with the reason",
    shouldNotify: true,
    shouldBadge: true,
    shouldPersistToLedger: true,
    shouldShowInAuditOnly: false,
    shouldAnnounce: true,
  },
  BLOCKED_DENIED: {
    visibility: "interrupt",
    reason: "blocked by authority / policy — explain in human terms",
    shouldNotify: true,
    shouldBadge: false,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldAnnounce: true,
  },
  AMBIGUOUS_TARGET: {
    visibility: "interrupt",
    reason: "recipient ambiguous — one focused clarification",
    shouldNotify: true,
    shouldBadge: false,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldAnnounce: true,
  },
  ACTION_FAILED: {
    visibility: "interrupt",
    reason: "action failed — surface clearly, offer to retry",
    shouldNotify: true,
    shouldBadge: false,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldAnnounce: true,
  },
  NEEDS_CLARIFICATION: {
    visibility: "interrupt",
    reason: "missing detail — one focused question",
    shouldNotify: true,
    shouldBadge: false,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldAnnounce: true,
  },
  DIGEST_READY: {
    visibility: "digest",
    reason: "summary ready — surface compactly, not as raw dump",
    shouldNotify: true,
    shouldBadge: true,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldAnnounce: false,
  },
};

// WHAT: Classify one ambient outcome into a single visibility decision.
// INPUT: the event (+ optional copy) and the user's ambient context.
// OUTPUT: the decision the surfacing layer applies (announce / notify / badge /
//         record). Quiet mode suppresses spoken low-risk confirmations but
//         never silences an interrupt.
export function decideAmbientVisibility(
  event: AmbientEvent,
  userContext?: AmbientUserContext,
): AmbientVisibilityDecision {
  const rule = RULES[event.kind];
  // Quiet mode: keep the panel confirmation but don't speak a low-risk success.
  const announce =
    rule.shouldAnnounce &&
    !(userContext?.quietMode === true && rule.visibility === "confirmation");
  return {
    visibility: rule.visibility,
    reason: rule.reason,
    ...(event.userFacingCopy !== undefined
      ? { userFacingCopy: event.userFacingCopy }
      : {}),
    shouldNotify: rule.shouldNotify,
    shouldBadge: rule.shouldBadge,
    shouldPersistToLedger: rule.shouldPersistToLedger,
    shouldShowInAuditOnly: rule.shouldShowInAuditOnly,
    shouldAnnounce: announce,
  };
}

// Backend terms / route names / policy codes that must NEVER reach normal UX
// copy. Human words that legitimately appear in copy ("needs approval first",
// "review request", "outside your organization") are intentionally NOT matched
// — only the machine forms (UPPER_SNAKE codes, hyphenated route segments,
// id/type field names, page-handoff phrasing).
const BACKEND_TERM_PATTERNS: ReadonlyArray<RegExp> = [
  /\bCROSS_ORG_DENIED\b/,
  /\bRUNTIME_MISSING\b/,
  /\bNEEDS_APPROVAL\b/,
  /\bNOT_FOUND\b/,
  /\bRESOLVED_INTERNAL_ENTITY\b/,
  /\bEMPLOYEE_TWIN\b/,
  /\bREVIEW_REQUEST\b/,
  /\bAPPROVAL_REQUEST\b/,
  /\bentity[_-]id\b/i,
  /\brequest[_-]type\b/i,
  /\brequest[_-]id\b/i,
  /\btarget[_-]entity\b/i,
  /\brequester[_-]twin\b/i,
  /collaboration-request/i, // the route segment, not the human phrase
  /internal-message/i,
  /\bwork-os\b/i,
  /\/(?:work-os|otzar|notifications|actions)\//i,
  /\bOpen Collaboration\b/i,
  /\bgo to (?:the )?\w+ page\b/i,
  /\bopen the \w+ (?:page|tab)\b/i,
];

// WHAT: Return the first backend-term leak found in user-facing copy, or null
//        when the copy is clean. Used by tests (and callable in dev) to enforce
//        that ambient copy stays human — no route names / ids / policy codes /
//        page hand-offs.
export function findBackendTermLeak(copy: string): string | null {
  for (const re of BACKEND_TERM_PATTERNS) {
    const m = copy.match(re);
    if (m !== null) return m[0];
  }
  return null;
}
