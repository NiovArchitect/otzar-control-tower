// FILE: view-why.ts
// PURPOSE: Phase 1285-J — the ONE shared View/Why model + adapters. Every
//          surface that explains an artifact (work item, thread message) builds
//          a ViewWhyModel from its object and renders it through the shared
//          ViewWhyPanel, so identity/work/communication/reasoning/provenance
//          read consistently everywhere. Identity is always a canonical label
//          (never a raw UUID); missing proof is an honest state, never a broken
//          panel.
// CONNECTS TO: src/components/work-os/ViewWhyPanel.tsx, WorkLedgerItem,
//          PersonCockpit, InboxThread; tests/unit/view-why.test.ts.

import type {
  WorkLedgerEntryView,
  DirectThreadMessageView,
  SafeNotificationView,
  SafeActionView,
  CommsSuggestedAction,
  BlindSpotFeedItem,
  WatcherFinding,
} from "@/lib/types/foundation";
import type { ActionDetails } from "@/lib/work-os/action-details-store";
import { entityLabel } from "@/lib/identity/canonical-entity";

// ── Shared label helpers (Phase 1285-L) ─────────────────────────────────────
// Title-case an UPPER_SNAKE token into human words.
function titleCase(s: string): string {
  return s
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

const NOTIFICATION_KIND_LABEL: Record<string, string> = {
  DIRECT_MESSAGE: "Direct message",
  ACTION_REQUIRED: "Needs your decision",
  APPROVAL_REQUIRED: "Approval needed",
  WORK_ASSIGNED: "Work assigned",
  SYSTEM: "System notice",
};
export function notificationKindLabel(c: string): string {
  return NOTIFICATION_KIND_LABEL[c] ?? titleCase(c);
}

// Human-readable action title — robust to DUAL_CONTROL / colon-prefixed types
// so a raw "DUAL_CONTROL:ACTION_CREATE_SEND_INTERNAL_NOTIFICATION" never shows
// as a primary label (Phase 1285-L).
export function actionTypeLabel(actionType: string): string {
  const dual = /^DUAL_CONTROL[:_]/i.test(actionType);
  const core = actionType
    .replace(/^DUAL_CONTROL[:_]/i, "")
    .replace(/^ACTION_CREATE_/i, "");
  const base = (() => {
    switch (core.toUpperCase()) {
      case "SEND_INTERNAL_NOTIFICATION":
        return "Internal note";
      case "INVOKE_CONNECTOR":
        return "Connected tool call";
      case "RECORD_CAPSULE":
        return "Memory record";
      case "PROPOSE_PERMISSION_GRANT":
        return "Permission grant request";
      default:
        return titleCase(core);
    }
  })();
  return dual ? `Second approval: ${base.toLowerCase()}` : base;
}

const RISK_LABEL: Record<string, string> = {
  LOW: "Low risk",
  MEDIUM: "Medium risk",
  HIGH: "High risk",
  CRITICAL: "Critical",
};
export function riskLabel(risk: string): string {
  return RISK_LABEL[risk] ?? risk;
}

const EXTRACTION_LABEL: Record<string, string> = {
  DEMO_SCRIPTED: "demo capture",
  LLM: "AI (Python/LLM)",
  LOCAL_FALLBACK: "deterministic fallback",
};
function extractionLabel(mode: string): string {
  return EXTRACTION_LABEL[mode] ?? mode;
}

export interface ViewWhyRow {
  label: string;
  // Already a human-readable value (canonical label for identity rows) — NEVER
  // a raw entity_id. Null/empty rows are dropped by the presenter.
  value: string | null | undefined;
}

export interface ViewWhySignal {
  signal_type: string;
  confidence?: string | null;
  extraction_source?: string | null;
  tracked?: boolean;
}

export interface ViewWhyModel {
  // identity / work / communication / provenance rows, in render order.
  rows: ViewWhyRow[];
  // reasoning (the detected signal), when present.
  signal?: ViewWhySignal;
  // Honest missing-proof note shown when this surface has no richer proof
  // sections (e.g. a thread message carries no execution attempts).
  proofNote?: string;
}

// WHAT: build the shared model from a Work Ledger entry. Identity rows use the
//        canonical label (never the UUID). Work/provenance fields included for
//        cross-surface consistency (My Work + Team Work both use this).
export function viewWhyFromLedger(entry: WorkLedgerEntryView): ViewWhyModel {
  const rows: ViewWhyRow[] = [
    { label: "Type", value: entry.ledger_type },
    { label: "Status", value: entry.status?.replace(/_/g, " ") },
    { label: "Priority", value: entry.priority },
    { label: "Source", value: entry.source_command !== null ? `“${entry.source_command}”` : null },
    {
      label: "Owner",
      value: entry.owner_entity_id !== null ? entityLabel(entry.owner_display_name) : null,
    },
    {
      label: "Requester",
      value: entry.requester_entity_id !== null ? entityLabel(entry.requester_display_name) : null,
    },
    {
      label: "Target",
      value: entry.target_entity_id !== null ? entityLabel(entry.target_display_name) : null,
    },
    { label: "Ledger id", value: entry.ledger_entry_id },
    { label: "Extraction", value: entry.extraction_source },
    { label: "Source message", value: entry.source_message_id },
    { label: "Plan", value: entry.work_plan_id },
    { label: "Due", value: entry.due_at },
  ];
  return { rows };
}

// WHAT: build the shared model from a direct thread message. Sender uses the
//        canonical label; carries direction + signal + source-message provenance.
export function viewWhyFromThreadMessage(m: DirectThreadMessageView): ViewWhyModel {
  const rows: ViewWhyRow[] = [
    { label: "From", value: m.from_me ? "You" : entityLabel(m.sender_display_name) },
    { label: "Direction", value: m.from_me ? "outbound" : "inbound" },
    { label: "Message id", value: m.message_id },
    { label: "Sent", value: m.created_at },
  ];
  const model: ViewWhyModel = { rows };
  if (m.signal !== undefined) {
    model.signal = {
      signal_type: m.signal.signal_type,
      confidence: m.signal.confidence,
      extraction_source: m.signal.evidence_phrase, // the deterministic/Python evidence
      tracked: m.signal.tracked ?? false,
    };
  } else {
    model.proofNote = "No work signal detected on this message.";
  }
  return model;
}

// WHAT: shared View/Why for a notification. Sender via canonical label; carries
//        type, route destination, ids, read state. Adds an internal-only policy
//        note for direct messages (Phase 1285-L).
export function viewWhyFromNotification(
  n: SafeNotificationView,
  routeDestination?: string,
): ViewWhyModel {
  const isDirect =
    n.notification_class.toLowerCase().includes("direct") ||
    n.notification_class.toLowerCase().includes("message");
  const rows: ViewWhyRow[] = [
    { label: "Type", value: notificationKindLabel(n.notification_class) },
    { label: "From", value: n.sender != null ? entityLabel(n.sender.display_name) : null },
    { label: "Sender role", value: n.sender?.role_title ?? null },
    {
      label: "Source",
      value:
        n.sender != null && n.sender.source_kind !== "HUMAN" ? n.sender.authority_label : null,
    },
    { label: "Status", value: n.status ?? (n.read_at !== null ? "Read" : "Unread") },
    { label: "Route", value: routeDestination ?? null },
    { label: "Policy", value: isDirect ? "Internal Otzar inbox only — no external send" : null },
    { label: "Notification id", value: n.notification_id },
    { label: "Action id", value: n.action_id },
    { label: "Created", value: n.created_at },
  ];
  return { rows };
}

// WHAT: shared View/Why for a governed Action (Action Center). Uses ONLY the
//        SAFE projection fields + the locally-stored human detail; requester/
//        target/policy-envelope are deliberately governed (secrecy allowlist),
//        so an honest note states that instead of leaking or showing a blank.
// WHAT: terminal Action statuses — the action can no longer be approved/run.
const TERMINAL_ACTION_STATUSES: ReadonlySet<string> = new Set([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
  "REJECTED",
  "EXPIRED",
]);

export interface ActionExecutability {
  executable: boolean;
  reason: string;
}

// WHAT: decide whether an Action can be approved/rejected right now, and the
//        honest reason when it cannot — so the UI never shows a dead button.
// INPUT: a SafeActionView.
// OUTPUT: { executable, reason }.
// WHY: A pending action with a linked escalation is the only executable case;
//      terminal actions are historical; a pending action without an escalation
//      is routing through policy (no human decision available here).
export function actionExecutability(a: SafeActionView): ActionExecutability {
  if (TERMINAL_ACTION_STATUSES.has(a.status)) {
    return { executable: false, reason: "This approval is historical or no longer executable." };
  }
  if (a.status === "PROPOSED" && a.escalation_id != null && a.escalation_id.length > 0) {
    return { executable: true, reason: "Awaiting your approval." };
  }
  if (a.status === "PROPOSED") {
    return { executable: false, reason: "Otzar is routing this through your organization's approval policy." };
  }
  return { executable: false, reason: "In flight — no decision needed from you right now." };
}

// WHAT: the recipient/target display label for an action, preferring the SAFE
//        server-resolved target_label, then the locally-authored recipient,
//        else null (→ "recipient unavailable"). NEVER a raw UUID.
export function actionTargetLabel(
  a: SafeActionView,
  details?: ActionDetails | null,
): string | null {
  if (a.target_label != null && a.target_label.length > 0) return entityLabel(a.target_label);
  if (details?.recipientLabel != null && details.recipientLabel.length > 0) {
    return entityLabel(details.recipientLabel);
  }
  return null;
}

export function viewWhyFromAction(
  a: SafeActionView,
  details?: ActionDetails | null,
): ViewWhyModel {
  const exec = actionExecutability(a);
  const target = actionTargetLabel(a, details);
  // Body is local-only draft context (never server-exposed per ADR-0057 §10).
  const bodyValue =
    details?.body != null && details.body.length > 0
      ? details.body
      : "Message preview is not in the safe view.";
  const rows: ViewWhyRow[] = [
    { label: "Kind", value: actionTypeLabel(a.action_type) },
    { label: "Status", value: titleCase(a.status) },
    { label: "Risk", value: riskLabel(a.risk_tier) },
    { label: "Requires approval", value: a.requires_approval ? "Yes" : "No" },
    { label: "Executable", value: exec.executable ? "Yes — approve or reject below" : `No — ${exec.reason}` },
    // Recipient: SAFE server label first, then local draft context.
    { label: "Recipient", value: target ?? "Recipient unavailable" },
    { label: "Requester", value: a.requester_label != null ? entityLabel(a.requester_label) : null },
    { label: "Channel", value: details?.channel ?? null },
    { label: "Message", value: bodyValue },
    { label: "Policy reason", value: a.decision_reason != null ? titleCase(a.decision_reason) : null },
    { label: "Approval id", value: a.escalation_id ?? null },
    { label: "Action id", value: a.action_id },
    { label: "Created", value: a.created_at },
    { label: "Updated", value: a.updated_at },
  ];
  return {
    rows,
    proofNote:
      "Recipient and requester are shown as safe display names. The message body shown here is local draft context only; the raw payload and policy envelope are governed and never exposed on this surface.",
  };
}

// WHAT: shared View/Why for a Comms extracted follow-up. Surfaces the source
//        excerpt, confidence, resolution, and extraction mode (Phase 1285-L).
export function viewWhyFromCommsFollowUp(
  s: CommsSuggestedAction,
  extractionMode: string,
): ViewWhyModel {
  const rows: ViewWhyRow[] = [
    { label: "Kind", value: "Follow-up (internal note)" },
    { label: "Target", value: entityLabel(s.target.display_name) },
    { label: "Reason", value: s.reason },
    { label: "Source", value: s.source_excerpt !== null ? `“${s.source_excerpt}”` : null },
    { label: "Confidence", value: s.confidence.toLowerCase() },
    { label: "Resolution", value: titleCase(s.resolution_status) },
    { label: "Extraction", value: extractionLabel(extractionMode) },
  ];
  const model: ViewWhyModel = { rows };
  if (s.source_excerpt === null) {
    model.proofNote = "No source excerpt captured for this follow-up.";
  }
  return model;
}

const BLIND_SPOT_TYPE_LABEL: Record<string, string> = {
  OVERDUE_WORK: "Overdue work",
  STALE_WAITING_ON: "Stale waiting-on",
  UNRESOLVED_BLOCKER: "Unresolved blocker",
  NO_NEXT_ACTION: "No next action",
};

const WATCHER_TYPE_LABEL: Record<string, string> = {
  OVERDUE_WORK: "Overdue work",
  STALE_WAITING_ON: "Stale waiting-on",
  UNRESOLVED_BLOCKER: "Unresolved blocker",
  NO_NEXT_ACTION: "No next action",
  UNANSWERED_ASK: "Unanswered ask",
  STALE_COMMITMENT: "Stale commitment",
};

// WHAT: shared View/Why for a governed watcher finding (Phase 1285-P) — why
//        Otzar flagged it, the deterministic rule, participants (canonical),
//        age/due/threshold, source proof, and the recommended next action.
//        Uses the SAME ViewWhyPanel as every other surface (no one-off
//        renderer). Identity is always a canonical label, never a raw UUID.
export function viewWhyFromWatcher(w: WatcherFinding): ViewWhyModel {
  const personLabel = (p: WatcherFinding["owner"]): string | null =>
    p !== null ? entityLabel(p.display_name) : null;
  const rows: ViewWhyRow[] = [
    { label: "Type", value: WATCHER_TYPE_LABEL[w.watcher_type] ?? w.watcher_type },
    { label: "Severity", value: w.severity },
    { label: "Why flagged", value: w.summary },
    { label: "Owner", value: personLabel(w.owner) },
    { label: "Requester", value: personLabel(w.requester) },
    { label: "Target", value: personLabel(w.target) },
    { label: "Related person", value: personLabel(w.related_person) },
    { label: "Due", value: w.detection.due_at },
    {
      label: "Age",
      value: w.detection.age_hours !== null ? `${Math.floor(w.detection.age_hours / 24)}d` : null,
    },
    {
      label: "Threshold",
      value: w.detection.threshold_hours !== null ? `${w.detection.threshold_hours}h` : null,
    },
    { label: "Source", value: w.source.source_system.replace(/_/g, " ") },
    { label: "Source message", value: w.source.source_message_id },
    { label: "Ledger id", value: w.source.ledger_entry_id },
    { label: "Recommended", value: w.recommendation.next_action },
    { label: "Detection rule", value: w.detection.rule_id },
  ];
  return {
    rows,
    signal: {
      signal_type: w.watcher_type,
      extraction_source: w.detection.reason,
    },
    proofNote:
      "Detected by a governed Foundation watcher over your durable work — scoped to you, audit-aware, never external.",
  };
}

// WHAT: shared View/Why for a Blind Spot — why Otzar flagged it, severity, the
//        participants (canonical), age/due, source proof, recommended action,
//        and the deterministic detection rule (Phase 1285-N).
export function viewWhyFromBlindSpot(b: BlindSpotFeedItem): ViewWhyModel {
  const rows: ViewWhyRow[] = [
    { label: "Type", value: BLIND_SPOT_TYPE_LABEL[b.type] ?? b.type },
    { label: "Severity", value: b.severity },
    { label: "Why flagged", value: b.summary },
    { label: "Owner", value: b.owner_entity_id !== null ? entityLabel(b.owner_display_name) : null },
    { label: "Requester", value: b.requester_entity_id !== null ? entityLabel(b.requester_display_name) : null },
    { label: "Status", value: b.status?.replace(/_/g, " ") },
    { label: "Due", value: b.due_at },
    { label: "Age", value: `${b.age_days}d` },
    { label: "Source message", value: b.source_message_id },
    { label: "Ledger id", value: b.ledger_entry_id },
    { label: "Recommended", value: b.recommended_action },
    { label: "Detection rule", value: b.detection_rule },
  ];
  return { rows };
}
