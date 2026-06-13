// FILE: WorkLedgerItem.tsx
// PURPOSE: Phase 1279 cockpit — one durable Work Ledger entry rendered as
//          an inspectable work item with a View/Why drawer. Shared by the
//          My Work, Team Work, and Blind Spots cockpits. Shows the honest
//          ledger truth (id, source command, extraction source, status,
//          owner/requester/target, next action, context) — never fakes
//          work or execution.
// CONNECTS TO: pages/app/MyWork, TeamWork, BlindSpots; foundation type
//          WorkLedgerEntryView.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";

function detail(label: string, value: string | null | undefined): JSX.Element | null {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span> {value}
    </div>
  );
}

export function WorkLedgerItem({
  entry,
}: {
  entry: WorkLedgerEntryView;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-md border border-border bg-background/70 p-2 text-xs"
      data-testid="work-ledger-item"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-foreground">{entry.title}</div>
          <div className="text-[10px] text-muted-foreground">
            {entry.ledger_type}
            {entry.next_action !== null ? ` · Next: ${entry.next_action}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline" className="text-[9px]">
            {entry.status.replace(/_/g, " ")}
          </Badge>
          <button
            type="button"
            className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
            data-testid="work-ledger-item-view"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide" : "View / Why"}
          </button>
        </div>
      </div>
      {open ? (
        <div
          className="mt-1 space-y-0.5 rounded bg-muted/40 p-1.5 text-[11px] text-muted-foreground"
          data-testid="work-ledger-item-detail"
        >
          {detail("Ledger id", entry.ledger_entry_id)}
          {detail("Source", entry.source_command !== null ? `“${entry.source_command}”` : null)}
          {detail("Extraction", entry.extraction_source)}
          {detail("Priority", entry.priority)}
          {detail("Owner", entry.owner_entity_id)}
          {detail("Requester", entry.requester_entity_id)}
          {detail("Target", entry.target_entity_id)}
          {detail("Plan", entry.work_plan_id)}
          {detail("Due", entry.due_at)}
          {entry.python_enrichment !== undefined ? (
            <div className="mt-1 border-t border-border/50 pt-1" data-testid="work-ledger-item-enrichment">
              <div>
                <span className="text-muted-foreground">Python enrichment:</span>{" "}
                {entry.python_enrichment.status === "PYTHON_ENRICHED"
                  ? `advisory · ${entry.python_enrichment.signals.length} signal${
                      entry.python_enrichment.signals.length === 1 ? "" : "s"
                    }${entry.python_enrichment.multi_intent ? " · multi-intent" : ""}`
                  : `not used (${entry.python_enrichment.status.replace(/_/g, " ").toLowerCase()})`}
              </div>
              {entry.python_enrichment.signals.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {entry.python_enrichment.signals.map((s) => (
                    <Badge key={`${s.signal_type}-${s.evidence_phrase}`} variant="outline" className="text-[9px]">
                      {s.signal_type.replace(/_/g, " ").toLowerCase()} · {s.confidence.toLowerCase()}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <div className="text-[10px] italic">Advisory only — Foundation decides ownership and policy.</div>
            </div>
          ) : null}
          <div className="italic">Inspect only — nothing is sent or executed.</div>
        </div>
      ) : null}
    </div>
  );
}

// Group helper: small, honest buckets shared by the cockpits.
export function bucketFor(entry: WorkLedgerEntryView): string {
  if (entry.status === "BLOCKED" || entry.status === "RUNTIME_MISSING") return "Blocked";
  if (entry.status.startsWith("NEEDS_")) return "Needs action";
  if (entry.ledger_type === "FOLLOW_UP" || entry.ledger_type === "COMMITMENT") return "Follow-ups";
  if (entry.ledger_type === "TASK") return "Tasks";
  if (entry.ledger_type === "MEETING") return "Meetings / confirmations";
  return "Recently created";
}

export const BUCKET_ORDER = [
  "Needs action",
  "Blocked",
  "Follow-ups",
  "Tasks",
  "Meetings / confirmations",
  "Recently created",
] as const;
