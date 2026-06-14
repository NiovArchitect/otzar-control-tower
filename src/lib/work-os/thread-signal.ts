// FILE: thread-signal.ts
// PURPOSE: Phase 1285 slice 3 — present a POSSIBLE work signal detected on a
//          thread message conservatively, and map a confirmed signal to a
//          Work Ledger entry type. Pure + unit-tested so the "message → work"
//          mapping can't silently drift. No auto-creation — the user confirms.
// CONNECTS TO: src/components/otzar/ThreadSignalChip.tsx,
//          tests/unit/thread-signal.test.ts.

export interface ThreadSignal {
  signal_type: string; // TASK_REQUEST | BLOCKER | DECISION | COMMITMENT | FOLLOW_UP | APPROVAL_LIKE | QUESTION
  confidence: string; // HIGH | MEDIUM | LOW
  evidence_phrase: string;
}

// WHAT: human-readable "Otzar detected" label for a signal.
export function signalLabel(type: string): string {
  switch (type) {
    case "TASK_REQUEST": return "Possible task";
    case "BLOCKER": return "Possible blocker";
    case "DECISION": return "Possible decision";
    case "COMMITMENT": return "Possible commitment";
    case "FOLLOW_UP": return "Possible follow-up";
    case "APPROVAL_LIKE": return "Possible approval request";
    case "QUESTION": return "Question";
    default: return "Possible signal";
  }
}

// WHAT: the Work Ledger type a confirmed signal becomes, or null when it is
//        not addable as work (a QUESTION is informational, not work).
export function ledgerTypeForSignal(type: string): string | null {
  switch (type) {
    case "TASK_REQUEST": return "TASK";
    case "BLOCKER": return "BLOCKER";
    case "DECISION": return "DECISION";
    case "COMMITMENT": return "FOLLOW_UP";
    case "FOLLOW_UP": return "FOLLOW_UP";
    case "APPROVAL_LIKE": return "APPROVAL";
    default: return null; // QUESTION / unknown → not auto-addable
  }
}

// WHAT: whether to offer an "Add to Work Ledger" action for this signal.
export function isAddable(type: string): boolean {
  return ledgerTypeForSignal(type) !== null;
}
