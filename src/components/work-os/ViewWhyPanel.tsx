// FILE: ViewWhyPanel.tsx
// PURPOSE: Phase 1285-J — the ONE shared View/Why presenter. Renders a
//          ViewWhyModel the same way on every surface (work items, thread
//          messages): identity/work/communication/provenance rows, the detected
//          signal, and an honest missing-proof note. Identity values are
//          canonical labels (never raw UUIDs); empty rows are dropped; a surface
//          with no richer proof shows the honest note instead of a blank panel.
// CONNECTS TO: src/lib/work-os/view-why.ts, WorkLedgerItem, PersonCockpit,
//          InboxThread; tests/unit/view-why.test.tsx.

import type { ViewWhyModel } from "@/lib/work-os/view-why";

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span> {value}
    </div>
  );
}

// WHAT: render the shared View/Why model. No outer test id / container — the
//        caller wraps it (so each surface keeps its own panel testid).
export function ViewWhyPanel({ model }: { model: ViewWhyModel }): JSX.Element {
  const rows = model.rows.filter(
    (r): r is { label: string; value: string } =>
      typeof r.value === "string" && r.value.length > 0,
  );
  return (
    <div className="space-y-0.5" data-testid="view-why">
      {rows.map((r) => (
        <Row key={r.label} label={r.label} value={r.value} />
      ))}
      {model.signal !== undefined ? (
        <div className="pt-0.5" data-testid="view-why-signal">
          <span className="text-muted-foreground">Signal:</span>{" "}
          {model.signal.signal_type.replace(/_/g, " ").toLowerCase()}
          {typeof model.signal.confidence === "string" && model.signal.confidence.length > 0
            ? ` · ${model.signal.confidence.toLowerCase()} confidence`
            : ""}
          {typeof model.signal.extraction_source === "string" &&
          model.signal.extraction_source.length > 0
            ? ` · "${model.signal.extraction_source}"`
            : ""}
          {model.signal.tracked === true ? " · tracked" : ""}
        </div>
      ) : null}
      {model.proofNote !== undefined ? (
        <div className="pt-0.5 italic text-muted-foreground" data-testid="view-why-proof-note">
          {model.proofNote}
        </div>
      ) : null}
    </div>
  );
}
