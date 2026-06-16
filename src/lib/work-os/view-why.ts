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

import type { WorkLedgerEntryView, DirectThreadMessageView } from "@/lib/types/foundation";
import { entityLabel } from "@/lib/identity/canonical-entity";

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
