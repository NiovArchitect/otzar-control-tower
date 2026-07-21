// FILE: provider-intent-resume.ts
// PURPOSE: Deterministic resume rules for Google Doc/Calendar intents while
//          WAITING_FOR_PROVIDER_AUTH. Used by harness + future auto-resume
//          after OAuth reconnect. Pure — no secrets, no network.
//
// Contract: one reconnect must not double-create; superseded dates win;
//          auth revoke leaves intent blocked with honest status.

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

/** Pure state machine for post-reauth resume. */
export function resumeProviderIntent(
  intent: ProviderIntent,
  event: ResumeEvent,
): ResumeResult {
  // Terminal states: no re-execution.
  if (intent.status === "EXECUTED" || intent.status === "CANCELLED") {
    return {
      intent,
      action: "SKIP_ALREADY_DONE",
      reason: `intent already ${intent.status}`,
    };
  }
  if (intent.status === "SUPERSEDED") {
    return {
      intent,
      action: "SUPERSEDE",
      reason: "intent superseded; create fresh intent if needed",
    };
  }

  switch (event.type) {
    case "AUTH_AVAILABLE":
      if (intent.provider_object_id) {
        return {
          intent: { ...intent, status: "EXECUTED" },
          action: "RECONCILE_EXISTING",
          reason: "provider object already linked — reconcile, do not create",
        };
      }
      if (intent.status === "WAITING_FOR_PROVIDER_AUTH" || intent.status === "BLOCKED") {
        return {
          intent: { ...intent, status: "READY_TO_EXECUTE" },
          action: "EXECUTE_ONCE",
          reason: "auth restored — execute pending intent once",
        };
      }
      return {
        intent,
        action: "WAIT",
        reason: `no transition from ${intent.status}`,
      };

    case "DUPLICATE_RECONNECT":
      if (intent.provider_object_id || intent.status === "EXECUTED") {
        return {
          intent,
          action: "SKIP_ALREADY_DONE",
          reason: "duplicate reconnect — no second create",
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
      return {
        intent: {
          ...intent,
          owner_entity_id: event.owner_entity_id,
          status:
            intent.status === "EXECUTED"
              ? "EXECUTED"
              : "WAITING_FOR_PROVIDER_AUTH",
        },
        action: intent.status === "EXECUTED" ? "RECONCILE_EXISTING" : "WAIT",
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
      return { intent, action: "WAIT", reason: "unknown event" };
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
