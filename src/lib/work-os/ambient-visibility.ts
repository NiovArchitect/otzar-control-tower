// FILE: ambient-visibility.ts
// PURPOSE: Phase 2.5 (deepened) — the ambient attention / visibility policy, in
//          CODE. Visibility IS intelligence, not decoration: it decides whether
//          Otzar feels like another app to operate, or a calm teammate that
//          carries work forward without distracting people. The real question is
//          never "what text do we show?" but "what does the human actually need
//          to see, feel, approve, know, or do RIGHT NOW?" — everything else is
//          handled silently / summarized / grouped / deferred / tracked / shown
//          only on demand. Backend real ≠ frontend loud.
//
// CONTRACT:
//   decideAmbientVisibility(event, userContext) → a decision the surfacing layer
//   applies: speak? show inline? notify/badge? group into a digest? interrupt
//   focus? ask one clarification? record proof silently? The caller composes the
//   human copy; this module never invents backend wording, and findBackendTermLeak
//   guards that copy stays human (no route names / ids / policy codes / hand-offs).
// CONNECTS TO: AmbientOtzarBar (self / collaboration / message executors),
//          tests/unit/ambient-visibility.test.ts.

// Five ambient visibility levels.
export type AmbientVisibility =
  | "silent"
  | "confirmation"
  | "interrupt"
  | "digest"
  | "detail_on_demand";

// How much the event matters — drives the level + whether focus is broken.
export type AmbientEventImportance =
  | "routine"
  | "useful"
  | "requires_attention"
  | "urgent"
  | "blocked"
  | "approval_required"
  | "sensitive";

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
  | "MISSING_CONTEXT" // referenced object unresolved — one focused clarification
  | "ACTION_FAILED" // transient / unexpected failure
  | "NEEDS_CLARIFICATION" // missing detail — one focused question
  | "DIGEST_READY"; // a summary (e.g. meeting decisions/blockers)

export interface AmbientEvent {
  kind: AmbientEventKind;
  // The human-facing copy the caller already composed (never a backend code).
  userFacingCopy?: string;
  // The focused question to ask, when the event needs one.
  clarificationQuestion?: string;
}

export interface AmbientUserContext {
  // Role-aware tuning (digest grouping / what reaches a given role). Reserved
  // hook — present in the stable signature so callers pass it without a later
  // breaking change.
  roleTitle?: string | null;
  // Voice-first quiet mode: suppress spoken low-risk confirmations (still speak
  // interrupts — the user needs those).
  quietMode?: boolean;
  // The user is in a focus session: hold routine confirmations into a digest;
  // only true interrupts break focus.
  focusMode?: boolean;
}

export interface AmbientVisibilityDecision {
  visibility: AmbientVisibility;
  importance: AmbientEventImportance;
  reason: string;
  userFacingCopy?: string;
  shouldSpeak: boolean; // voice confirmation aloud
  shouldShowInline: boolean; // show in the orb panel / conversation
  shouldNotify: boolean; // a passive inbox notification (not the active panel)
  shouldBadge: boolean; // a passive badge (e.g. bell count)
  shouldGroupIntoDigest: boolean; // fold into a "what changed" digest
  shouldPersistToLedger: boolean; // a durable proof exists for this outcome
  shouldShowInAuditOnly: boolean; // visible only under "why" / "show proof"
  shouldInterruptFocus: boolean; // break a focus session
  shouldAskClarification: boolean; // the user must answer one focused question
  clarificationQuestion?: string;
  detailLabel?: "Why" | "Show proof" | "What changed" | "View thread";
}

interface BaseRule {
  visibility: AmbientVisibility;
  importance: AmbientEventImportance;
  reason: string;
  shouldSpeak: boolean;
  shouldShowInline: boolean;
  shouldNotify: boolean;
  shouldBadge: boolean;
  shouldGroupIntoDigest: boolean;
  shouldPersistToLedger: boolean;
  shouldShowInAuditOnly: boolean;
  shouldInterruptFocus: boolean;
  shouldAskClarification: boolean;
  detailLabel?: AmbientVisibilityDecision["detailLabel"];
}

// The policy table. Proof/audit silent; low-risk success calm confirmation;
// approval / blocked / ambiguous / missing-context / failure clear interrupt;
// summaries fold into a digest.
const RULES: Record<AmbientEventKind, BaseRule> = {
  MESSAGE_SENT: {
    visibility: "confirmation",
    importance: "useful",
    reason: "low-risk delivery — calm confirmation",
    shouldSpeak: true,
    shouldShowInline: true,
    shouldNotify: false,
    shouldBadge: false,
    shouldGroupIntoDigest: false,
    shouldPersistToLedger: true,
    shouldShowInAuditOnly: false,
    shouldInterruptFocus: false,
    shouldAskClarification: false,
    detailLabel: "Show proof",
  },
  COLLABORATION_SENT: {
    visibility: "confirmation",
    importance: "useful",
    reason: "governed request sent — calm confirmation, tracked to endpoint",
    shouldSpeak: true,
    shouldShowInline: true,
    shouldNotify: false,
    shouldBadge: false,
    shouldGroupIntoDigest: false,
    shouldPersistToLedger: true,
    shouldShowInAuditOnly: false,
    shouldInterruptFocus: false,
    shouldAskClarification: false,
    detailLabel: "Show proof",
  },
  SELF_WORK_SAVED: {
    visibility: "confirmation",
    importance: "useful",
    reason: "self work recorded — calm confirmation",
    shouldSpeak: true,
    shouldShowInline: true,
    shouldNotify: false,
    shouldBadge: false,
    shouldGroupIntoDigest: false,
    shouldPersistToLedger: true,
    shouldShowInAuditOnly: false,
    shouldInterruptFocus: false,
    shouldAskClarification: false,
  },
  LEDGER_PROOF: {
    visibility: "silent",
    importance: "routine",
    reason: "audit / proof — record silently, available on demand",
    shouldSpeak: false,
    shouldShowInline: false,
    shouldNotify: false,
    shouldBadge: false,
    shouldGroupIntoDigest: false,
    shouldPersistToLedger: true,
    shouldShowInAuditOnly: true,
    shouldInterruptFocus: false,
    shouldAskClarification: false,
    detailLabel: "Show proof",
  },
  APPROVAL_NEEDED: {
    visibility: "interrupt",
    importance: "approval_required",
    reason: "needs human approval — surface clearly with the reason",
    shouldSpeak: true,
    shouldShowInline: true,
    shouldNotify: true,
    shouldBadge: true,
    shouldGroupIntoDigest: false,
    shouldPersistToLedger: true,
    shouldShowInAuditOnly: false,
    shouldInterruptFocus: true,
    shouldAskClarification: false,
    detailLabel: "Why",
  },
  BLOCKED_DENIED: {
    visibility: "interrupt",
    importance: "blocked",
    reason: "blocked by authority / policy — explain in human terms",
    shouldSpeak: true,
    shouldShowInline: true,
    shouldNotify: false,
    shouldBadge: false,
    shouldGroupIntoDigest: false,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldInterruptFocus: true,
    shouldAskClarification: false,
    detailLabel: "Why",
  },
  AMBIGUOUS_TARGET: {
    visibility: "interrupt",
    importance: "requires_attention",
    reason: "recipient ambiguous — one focused clarification",
    shouldSpeak: true,
    shouldShowInline: true,
    shouldNotify: false,
    shouldBadge: false,
    shouldGroupIntoDigest: false,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldInterruptFocus: true,
    shouldAskClarification: true,
  },
  MISSING_CONTEXT: {
    visibility: "interrupt",
    importance: "requires_attention",
    reason: "referenced object unresolved — one focused clarification",
    shouldSpeak: true,
    shouldShowInline: true,
    shouldNotify: false,
    shouldBadge: false,
    shouldGroupIntoDigest: false,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldInterruptFocus: true,
    shouldAskClarification: true,
  },
  ACTION_FAILED: {
    visibility: "interrupt",
    importance: "requires_attention",
    reason: "action failed — surface clearly, offer the best next step",
    shouldSpeak: true,
    shouldShowInline: true,
    shouldNotify: false,
    shouldBadge: false,
    shouldGroupIntoDigest: false,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldInterruptFocus: true,
    shouldAskClarification: false,
  },
  NEEDS_CLARIFICATION: {
    visibility: "interrupt",
    importance: "requires_attention",
    reason: "missing detail — one focused question",
    shouldSpeak: true,
    shouldShowInline: true,
    shouldNotify: false,
    shouldBadge: false,
    shouldGroupIntoDigest: false,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldInterruptFocus: true,
    shouldAskClarification: true,
  },
  DIGEST_READY: {
    visibility: "digest",
    importance: "useful",
    reason: "summary ready — surface compactly, not as a raw dump",
    shouldSpeak: false,
    shouldShowInline: true,
    shouldNotify: false,
    shouldBadge: true,
    shouldGroupIntoDigest: true,
    shouldPersistToLedger: false,
    shouldShowInAuditOnly: false,
    shouldInterruptFocus: false,
    shouldAskClarification: false,
    detailLabel: "What changed",
  },
};

// WHAT: Classify one ambient outcome into a single visibility decision.
// INPUT: the event (+ optional copy / clarification) and the user's ambient
//        context (role / quiet mode / focus mode).
// OUTPUT: the decision the surfacing layer applies. Quiet mode suppresses a
//         spoken low-risk success; focus mode folds a routine confirmation into
//         a digest instead of showing it inline — but neither EVER silences an
//         interrupt the human must act on.
export function decideAmbientVisibility(
  event: AmbientEvent,
  userContext?: AmbientUserContext,
): AmbientVisibilityDecision {
  const rule = RULES[event.kind];
  const isInterrupt = rule.visibility === "interrupt";

  // Quiet mode: keep the panel confirmation but don't speak a low-risk success.
  const shouldSpeak =
    rule.shouldSpeak &&
    !(userContext?.quietMode === true && rule.visibility === "confirmation");

  // Focus mode: a routine confirmation folds into a digest rather than showing
  // inline mid-focus; interrupts always still show.
  const foldForFocus =
    userContext?.focusMode === true && rule.visibility === "confirmation";
  const shouldShowInline = foldForFocus ? false : rule.shouldShowInline;
  const shouldGroupIntoDigest = foldForFocus
    ? true
    : rule.shouldGroupIntoDigest;

  return {
    visibility: rule.visibility,
    importance: rule.importance,
    reason: rule.reason,
    ...(event.userFacingCopy !== undefined
      ? { userFacingCopy: event.userFacingCopy }
      : {}),
    shouldSpeak,
    shouldShowInline,
    shouldNotify: rule.shouldNotify,
    shouldBadge: rule.shouldBadge,
    shouldGroupIntoDigest,
    shouldPersistToLedger: rule.shouldPersistToLedger,
    shouldShowInAuditOnly: rule.shouldShowInAuditOnly,
    // An interrupt always breaks focus, regardless of focus mode.
    shouldInterruptFocus: rule.shouldInterruptFocus || isInterrupt,
    shouldAskClarification: rule.shouldAskClarification,
    ...(rule.shouldAskClarification && event.clarificationQuestion !== undefined
      ? { clarificationQuestion: event.clarificationQuestion }
      : {}),
    ...(rule.detailLabel !== undefined ? { detailLabel: rule.detailLabel } : {}),
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
