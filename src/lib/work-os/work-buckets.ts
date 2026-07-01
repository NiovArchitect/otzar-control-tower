// FILE: work-buckets.ts
// PURPOSE: PROD-UX — the small, honest work-item grouping shared by the
//          My Work / Team Work cockpits. Buckets read from the entry's
//          REAL status/type signals only (never invented categories), and
//          BUCKET_ORDER puts what needs a human first. Lives in lib (not
//          the WorkLedgerItem component file) so shared grouping logic
//          stays fast-refresh-safe and unit-testable on its own.
// CONNECTS TO: src/pages/app/MyWork.tsx, src/pages/app/TeamWork.tsx,
//          src/components/work-os/WorkLedgerItem.tsx (the card the
//          buckets group).

import type { WorkLedgerEntryView } from "@/lib/types/foundation";

// Group helper: small, honest buckets shared by the cockpits.
export function bucketFor(entry: WorkLedgerEntryView): string {
  if (entry.blind_spot_reason !== undefined) return "Runtime / verification issues";
  if (entry.status === "BLOCKED" || entry.status === "RUNTIME_MISSING") return "Blocked";
  if (entry.status.startsWith("NEEDS_")) return "Needs action";
  if (entry.ledger_type === "FOLLOW_UP" || entry.ledger_type === "COMMITMENT") return "Follow-ups";
  if (entry.ledger_type === "TASK") return "Tasks";
  if (entry.ledger_type === "MEETING") return "Meetings / confirmations";
  return "Recently created";
}

export const BUCKET_ORDER = [
  "Runtime / verification issues",
  "Needs action",
  "Blocked",
  "Follow-ups",
  "Tasks",
  "Meetings / confirmations",
  "Recently created",
] as const;
