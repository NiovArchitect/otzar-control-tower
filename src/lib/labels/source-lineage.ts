// FILE: source-lineage.ts
// PURPOSE: [GAP-J] THE human source-origin label map — the single place a
//          backend source_system becomes customer copy ("From Slack"), so
//          work surfaces can say where something came from without leaking
//          backend enums, raw source ids, or connector tokens.
//          Quiet-by-default rule: the card face shows a label ONLY for a
//          known system (sourceLineageLabel → null otherwise — silence, not
//          noise); the Why panel always answers, including the honest
//          "Source not recorded yet" (sourceLineageWhyValue).
// CONNECTS TO: src/lib/work-os/view-why.ts (viewWhyFromLedger),
//          src/components/work-os/WorkLedgerItem.tsx,
//          FND work-ledger.service.ts SourceLineageProjection.

import type { SourceLineageView } from "@/lib/types/foundation";

// Customer copy per recorded source system. APPROVAL / ASSIGNMENT are mapped
// ahead of their writers so the copy is locked when those rails start
// recording lineage; until then no row carries them (lineage is never
// invented backend-side).
const SOURCE_SYSTEM_LABELS: Record<string, string> = {
  SLACK: "From Slack",
  ZOOM: "From Zoom recording",
  TRANSCRIPT: "From Comms transcript",
  COMMS: "From Comms transcript",
  MEETING: "From a meeting",
  MANUAL: "Added manually",
  APPROVAL: "From approval decision",
  ASSIGNMENT: "From org update",
};

// WHAT: the calm card-face label. Known system → short human label; unknown,
//       unmapped, or missing → null so the card stays QUIET (never a raw
//       token, never "Source not recorded yet" clutter on every row).
export function sourceLineageLabel(
  lineage: SourceLineageView | null | undefined,
): string | null {
  if (lineage == null) return null;
  return SOURCE_SYSTEM_LABELS[lineage.source_system] ?? null;
}

// WHAT: the Why-panel answer to "where did this come from?" — always a
//       human string, honestly "Source not recorded yet" when the row's
//       source was never recorded or is not a mapped system.
export function sourceLineageWhyValue(
  lineage: SourceLineageView | null | undefined,
): string {
  return sourceLineageLabel(lineage) ?? "Source not recorded yet";
}
