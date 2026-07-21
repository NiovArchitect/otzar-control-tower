// FILE: provider-intent-resume.ts
// PURPOSE: Deterministic resume rules for Google Doc/Calendar intents while
//          WAITING_FOR_PROVIDER_AUTH. Used by harness + future auto-resume
//          after OAuth reconnect. Pure — no secrets, no network.
//
// Contract: one reconnect must not double-create; superseded dates win;
//          auth revoke leaves intent blocked with honest status.
//
// Control flow:
// 1) Handle EXECUTED pre-state (reconcile / metadata; never re-create).
// 2) Handle CANCELLED / SUPERSEDED terminals.
// 3) Active statuses never compare to EXECUTED (narrowing forbids it).

export type ProviderIntentStatus =
  | "WAITING_FOR_PROVIDER_AUTH"
  | "READY_TO_EXECUTE"
  | "EXECUTING"
  | "EXECUTED"
  | "BLOCKED"
  | "SUPERSEDED"
  | "CANCELLED";

export interface DocumentIntent {
  kind: "DOCUMENT";
  idempotency_key: string;
  project_id: string;
  status: ProviderIntentStatus;
  provider_object_id?: string | null;
  owner_entity_id: string;
}

export interface CalendarIntent {
  kind: "CALENDAR";
  idempotency_key: string;
  project_id: string;
  status: ProviderIntentStatus;
  final_date: string; // YYYY-MM-DD
  rejected_dates: string[];
  provider_object_id?: string | null;
  attendees: string[];
}

export type ProviderIntent = DocumentIntent | CalendarIntent;

export type ResumeEvent =
  | { type: "AUTH_AVAILABLE" }
  | { type: "AUTH_REVOKED" }
  | { type: "DUPLICATE_RECONNECT" }
  | { type: "PROVIDER_SUCCESS"; provider_object_id: string }
  | { type: "PROVIDER_ALREADY_EXISTS"; provider_object_id: string }
  | { type: "DATE_SUPERSEDED"; new_final_date: string; reject_old?: boolean }
  | { type: "OWNER_CHANGED"; owner_entity_id: string }
  | { type: "ATTENDEE_REMOVED"; entity_id: string }
  | { type: "PROJECT_CHANGED"; project_id: string }
  | { type: "PARTIAL_SHARE_FAILURE" }
  | { type: "RESPONSE_LOST_AFTER_SUCCESS"; provider_object_id: string };

export interface ResumeResult {
  intent: ProviderIntent;
  action:
    | "WAIT"
    | "EXECUTE_ONCE"
    | "SKIP_ALREADY_DONE"
    | "RECONCILE_EXISTING"
    | "BLOCK"
    | "SUPERSEDE";
  reason: string;
}

function assertNever(x: never): never {
  throw new Error(`unexpected provider-intent value: ${String(x)}`);
}

/**
 * EXECUTED pre-state only. Never starts a second create.
 * Owner / attendee metadata may update; project/date supersede marks SUPERSEDED.
 */
function resumeWhenAlreadyExecuted(
  intent: ProviderIntent,
  event: ResumeEvent,
): ResumeResult {
  switch (event.type) {
    case "AUTH_AVAILABLE":
    case "DUPLICATE_RECONNECT":
      return {
        intent,
        action: intent.provider_object_id
          ? "RECONCILE_EXISTING"
          : "SKIP_ALREADY_DONE",
        reason: intent.provider_object_id
          ? "already EXECUTED with provider object — reconcile, do not create"
          : "already EXECUTED — skip duplicate create",
      };

    case "AUTH_REVOKED":
      return {
        intent,
        action: "BLOCK",
        reason:
          "auth revoked after EXECUTED — retain provider proof; do not re-create",
      };

    case "PROVIDER_SUCCESS":
    case "PROVIDER_ALREADY_EXISTS":
    case "RESPONSE_LOST_AFTER_SUCCESS":
      return {
        intent: {
          ...intent,
          status: "EXECUTED",
          provider_object_id: event.provider_object_id,
        },
        action: "RECONCILE_EXISTING",
        reason: "EXECUTED intent reconciled to provider object",
      };

    case "OWNER_CHANGED":
      if (intent.kind !== "DOCUMENT") {
        return {
          intent,
          action: "SKIP_ALREADY_DONE",
          reason: "owner change not applicable to calendar intent",
        };
      }
      return {
        intent: {
          ...intent,
          owner_entity_id: event.owner_entity_id,
          status: "EXECUTED",
        },
        action: "RECONCILE_EXISTING",
        reason: "owner updated on EXECUTED document — no re-create",
      };

    case "DATE_SUPERSEDED": {
      if (intent.kind !== "CALENDAR") {
        return {
          intent,
          action: "SKIP_ALREADY_DONE",
          reason: "date supersede not applicable to document intent",
        };
      }
      const rejected = [
        ...new Set([
          ...intent.rejected_dates,
          ...(event.reject_old !== false ? [intent.final_date] : []),
        ]),
      ].filter((d) => d !== event.new_final_date);
      return {
        intent: {
          ...intent,
          final_date: event.new_final_date,
          rejected_dates: rejected,
          status: "SUPERSEDED",
        },
        action: "SUPERSEDE",
        reason: `EXECUTED calendar superseded → ${event.new_final_date}; create fresh intent if needed`,
      };
    }

    case "ATTENDEE_REMOVED":
      if (intent.kind !== "CALENDAR") {
        return {
          intent,
          action: "SKIP_ALREADY_DONE",
          reason: "attendee change not applicable to document intent",
        };
      }
      return {
        intent: {
          ...intent,
          attendees: intent.attendees.filter((a) => a !== event.entity_id),
          status: "EXECUTED",
        },
        action: "RECONCILE_EXISTING",
        reason: "attendee list updated on EXECUTED calendar — no re-create",
      };

    case "PROJECT_CHANGED":
      return {
        intent: {
          ...intent,
          project_id: event.project_id,
          status: "SUPERSEDED",
        },
        action: "SUPERSEDE",
        reason:
          "project changed on EXECUTED intent — supersede; do not re-bind silently",
      };

    case "PARTIAL_SHARE_FAILURE":
      return {
        intent,
        action: "BLOCK",
        reason:
          "partial share failure on EXECUTED doc — retry share only, not recreate",
      };

    default:
      return assertNever(event);
  }
}

/** Pure state machine for post-reauth resume. */
export function resumeProviderIntent(
  intent: ProviderIntent,
  event: ResumeEvent,
): ResumeResult {
  // ── Pre-state: EXECUTED ──────────────────────────────────────────────
  // Handle first so later active branches never need status === "EXECUTED".
  if (intent.status === "EXECUTED") {
    return resumeWhenAlreadyExecuted(intent, event);
  }

  // ── Pre-state: other terminals ───────────────────────────────────────
  if (intent.status === "CANCELLED") {
    return {
      intent,
      action: "SKIP_ALREADY_DONE",
      reason: "intent already CANCELLED",
    };
  }
  if (intent.status === "SUPERSEDED") {
    return {
      intent,
      action: "SUPERSEDE",
      reason: "intent superseded; create fresh intent if needed",
    };
  }

  // ── Pre-state: active (WAITING | READY | EXECUTING | BLOCKED) ────────
  // TypeScript has narrowed status away from EXECUTED/CANCELLED/SUPERSEDED.
  // Do not compare to EXECUTED here — it is unreachable by construction.
  switch (event.type) {
    case "AUTH_AVAILABLE":
      if (intent.provider_object_id) {
        return {
          intent: { ...intent, status: "EXECUTED" },
          action: "RECONCILE_EXISTING",
          reason: "provider object already linked — reconcile, do not create",
        };
      }
      if (
        intent.status === "WAITING_FOR_PROVIDER_AUTH" ||
        intent.status === "BLOCKED"
      ) {
        return {
          intent: { ...intent, status: "READY_TO_EXECUTE" },
          action: "EXECUTE_ONCE",
          reason: "auth restored — execute pending intent once",
        };
      }
      if (intent.status === "READY_TO_EXECUTE") {
        return {
          intent,
          action: "EXECUTE_ONCE",
          reason: "already READY_TO_EXECUTE — execute once",
        };
      }
      // EXECUTING: do not start another mutation.
      return {
        intent,
        action: "WAIT",
        reason: "no create transition from EXECUTING — reconcile in-flight",
      };

    case "DUPLICATE_RECONNECT":
      // Not EXECUTED here. Skip only when object already linked.
      if (intent.provider_object_id) {
        return {
          intent: { ...intent, status: "EXECUTED" },
          action: "SKIP_ALREADY_DONE",
          reason:
            "duplicate reconnect with existing provider object — no second create",
        };
      }
      return resumeProviderIntent(intent, { type: "AUTH_AVAILABLE" });

    case "AUTH_REVOKED":
      return {
        intent: { ...intent, status: "WAITING_FOR_PROVIDER_AUTH" },
        action: "BLOCK",
        reason: "auth revoked — return to WAITING_FOR_PROVIDER_AUTH",
      };

    case "PROVIDER_SUCCESS":
      return {
        intent: {
          ...intent,
          status: "EXECUTED",
          provider_object_id: event.provider_object_id,
        },
        action: "SKIP_ALREADY_DONE",
        reason: "provider success recorded",
      };

    case "PROVIDER_ALREADY_EXISTS":
    case "RESPONSE_LOST_AFTER_SUCCESS":
      return {
        intent: {
          ...intent,
          status: "EXECUTED",
          provider_object_id: event.provider_object_id,
        },
        action: "RECONCILE_EXISTING",
        reason: "provider object exists — link idempotently",
      };

    case "DATE_SUPERSEDED": {
      if (intent.kind !== "CALENDAR") {
        return { intent, action: "WAIT", reason: "not a calendar intent" };
      }
      const rejected = [
        ...new Set([
          ...intent.rejected_dates,
          ...(event.reject_old !== false ? [intent.final_date] : []),
        ]),
      ].filter((d) => d !== event.new_final_date);
      return {
        intent: {
          ...intent,
          final_date: event.new_final_date,
          rejected_dates: rejected,
          status: "WAITING_FOR_PROVIDER_AUTH",
          provider_object_id: null,
        },
        action: "SUPERSEDE",
        reason: `final date superseded → ${event.new_final_date}; old date rejected`,
      };
    }

    case "OWNER_CHANGED":
      if (intent.kind !== "DOCUMENT") {
        return { intent, action: "WAIT", reason: "not a document intent" };
      }
      // Active document: re-validate before execute (EXECUTED handled above).
      return {
        intent: {
          ...intent,
          owner_entity_id: event.owner_entity_id,
          status: "WAITING_FOR_PROVIDER_AUTH",
        },
        action: "WAIT",
        reason: "owner updated on pending intent",
      };

    case "ATTENDEE_REMOVED":
      if (intent.kind !== "CALENDAR") {
        return { intent, action: "WAIT", reason: "not a calendar intent" };
      }
      return {
        intent: {
          ...intent,
          attendees: intent.attendees.filter((a) => a !== event.entity_id),
        },
        action: "WAIT",
        reason: "attendee removed while waiting",
      };

    case "PROJECT_CHANGED":
      return {
        intent: {
          ...intent,
          project_id: event.project_id,
          status: "WAITING_FOR_PROVIDER_AUTH",
          provider_object_id: null,
        },
        action: "SUPERSEDE",
        reason: "project changed — re-validate before execute",
      };

    case "PARTIAL_SHARE_FAILURE":
      return {
        intent: { ...intent, status: "BLOCKED" },
        action: "BLOCK",
        reason: "partial sharing failure — retry share only, not full recreate",
      };

    default:
      return assertNever(event);
  }
}

/** Calendar must never schedule a rejected date as current truth. */
export function calendarDateIsAllowed(
  intent: CalendarIntent,
  candidateDate: string,
): boolean {
  if (intent.rejected_dates.includes(candidateDate)) return false;
  return candidateDate === intent.final_date;
}

/**
 * Batch summary helper — counts by pre-state without impossible comparisons.
 * Pure; used by harnesses and Action Center projections.
 */
export function summarizeProviderIntents(intents: readonly ProviderIntent[]): {
  total: number;
  executed: number;
  waiting_auth: number;
  ready: number;
  executing: number;
  blocked: number;
  superseded: number;
  cancelled: number;
  resumable: number;
} {
  let executed = 0;
  let waiting_auth = 0;
  let ready = 0;
  let executing = 0;
  let blocked = 0;
  let superseded = 0;
  let cancelled = 0;
  for (const i of intents) {
    switch (i.status) {
      case "EXECUTED":
        executed += 1;
        break;
      case "WAITING_FOR_PROVIDER_AUTH":
        waiting_auth += 1;
        break;
      case "READY_TO_EXECUTE":
        ready += 1;
        break;
      case "EXECUTING":
        executing += 1;
        break;
      case "BLOCKED":
        blocked += 1;
        break;
      case "SUPERSEDED":
        superseded += 1;
        break;
      case "CANCELLED":
        cancelled += 1;
        break;
      default:
        assertNever(i.status);
    }
  }
  return {
    total: intents.length,
    executed,
    waiting_auth,
    ready,
    executing,
    blocked,
    superseded,
    cancelled,
    resumable: waiting_auth + blocked + ready,
  };
}
