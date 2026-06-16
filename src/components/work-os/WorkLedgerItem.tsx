// FILE: WorkLedgerItem.tsx
// PURPOSE: Phase 1279 cockpit item + Phase 1283 proof layer — one durable
//          Work Ledger entry rendered as an inspectable work item with a
//          View/Why drawer. Shows the honest ledger truth AND, on open, the
//          execution proof trail (lazily fetched): WORK_LEDGER_CREATE /
//          PYTHON_ENRICHMENT / BEAM_FANOUT attempts, persisted coordination,
//          internal watcher state, and any runtime/verification issue. Never
//          fakes work or execution; opening View/Why sends/executes nothing.
// CONNECTS TO: pages/app/MyWork, TeamWork, BlindSpots; foundation type
//          WorkLedgerEntryView + ExecutionAttemptView; api.workOs.executionAttempts.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { WorkLedgerEntryView, ExecutionAttemptView } from "@/lib/types/foundation";

function detail(label: string, value: string | null | undefined): JSX.Element | null {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span> {value}
    </div>
  );
}

// WHAT: client-side mirror of the backend proof taxonomy (kept in sync with
//        summarizeExecutionProof) so the badge + section agree.
type ProofStatus = "VERIFIED" | "PARTIAL" | "FAILED" | "MISSING";
function proofStatusOf(attempts: ExecutionAttemptView[]): ProofStatus {
  if (attempts.length === 0) return "MISSING";
  const hasCreate = attempts.some(
    (a) => a.attempt_type === "WORK_LEDGER_CREATE" && a.status === "VERIFIED",
  );
  const failed = attempts.filter((a) => a.status === "FAILED").length;
  const pending = attempts.filter((a) => a.status === "PENDING" || a.status === "UNVERIFIED").length;
  if (failed > 0) return hasCreate ? "PARTIAL" : "FAILED";
  if (pending > 0) return "PARTIAL";
  return hasCreate ? "VERIFIED" : "PARTIAL";
}

function attemptLabel(t: string): string {
  switch (t) {
    case "WORK_LEDGER_CREATE": return "Ledger create";
    case "PYTHON_ENRICHMENT": return "Python enrichment";
    case "BEAM_FANOUT": return "BEAM fanout";
    case "CONNECTOR_EXECUTION": return "External action";
    default: return t.replace(/_/g, " ").toLowerCase();
  }
}

function statusWord(s: string): string {
  if (s === "VERIFIED") return "verified";
  if (s === "FAILED") return "failed";
  if (s === "PENDING" || s === "UNVERIFIED") return "pending";
  return s.toLowerCase();
}

export function WorkLedgerItem({
  entry,
  onChanged,
}: {
  entry: WorkLedgerEntryView;
  /** Called after a status change (e.g. Mark complete) so the parent reloads. */
  onChanged?: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [attempts, setAttempts] = useState<ExecutionAttemptView[] | null>(null);
  const [proofState, setProofState] = useState<"idle" | "loading" | "error" | "loaded">("idle");
  const [completing, setCompleting] = useState(false);
  const [completeErr, setCompleteErr] = useState<string | null>(null);

  // Mark complete — owner-only (server-computed entry.can_complete). PATCHes
  // the status to EXECUTED; the requester's waiting-on then clears. The backend
  // re-enforces authority, so this control never bypasses policy.
  async function markComplete(): Promise<void> {
    setCompleting(true);
    setCompleteErr(null);
    const r = await api.workOs.patchLedger(entry.ledger_entry_id, { status: "EXECUTED" });
    setCompleting(false);
    if (r.ok && r.data.ok) {
      onChanged?.();
    } else {
      setCompleteErr(
        r.ok && r.data.message ? r.data.message : "Couldn't mark complete right now.",
      );
    }
  }

  // Lazy-load execution proof only when the user opens View/Why — never
  // upfront for every card. Read-only; sends/executes nothing.
  async function toggle(): Promise<void> {
    const next = !open;
    setOpen(next);
    if (next && proofState === "idle") {
      setProofState("loading");
      const r = await api.workOs.executionAttempts(entry.ledger_entry_id);
      if (r.ok) {
        setAttempts(r.data.attempts ?? []);
        setProofState("loaded");
      } else {
        setProofState("error");
      }
    }
  }

  // Cheap main-card badge derived from the entry alone (no fetch).
  const cardBadge: { text: string; cls: string } | null =
    entry.blind_spot_reason !== undefined
      ? { text: "Verification issue", cls: "border-amber-500/60 text-amber-600" }
      : entry.coordination?.runtime === "BEAM_DISPATCHED"
        ? { text: "Coordinated", cls: "border-emerald-500/50 text-emerald-600" }
        : null;

  const activeWatchers = (entry.watchers ?? []).filter((w) => w.status === "ACTIVE");

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
          {cardBadge !== null ? (
            <Badge variant="outline" className={`text-[9px] ${cardBadge.cls}`} data-testid="work-ledger-item-card-badge">
              {cardBadge.text}
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-[9px]">
            {entry.status.replace(/_/g, " ")}
          </Badge>
          {entry.can_complete === true ? (
            <button
              type="button"
              className="rounded border border-emerald-500/50 px-1 text-[10px] text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50"
              data-testid="work-ledger-item-complete"
              disabled={completing}
              onClick={() => void markComplete()}
            >
              {completing ? "Marking…" : "Mark complete"}
            </button>
          ) : null}
          <button
            type="button"
            className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
            data-testid="work-ledger-item-view"
            onClick={() => void toggle()}
          >
            {open ? "Hide" : "View / Why"}
          </button>
        </div>
      </div>
      {completeErr !== null ? (
        <p className="mt-1 text-[10px] text-amber-600" data-testid="work-ledger-item-complete-error">
          {completeErr}
        </p>
      ) : null}
      {open ? (
        <div
          className="mt-1 space-y-0.5 rounded bg-muted/40 p-1.5 text-[11px] text-muted-foreground"
          data-testid="work-ledger-item-detail"
        >
          {detail("Ledger id", entry.ledger_entry_id)}
          {detail("Source", entry.source_command !== null ? `“${entry.source_command}”` : null)}
          {detail("Extraction", entry.extraction_source)}
          {detail("Priority", entry.priority)}
          {detail("Owner", entry.owner_display_name ?? entry.owner_entity_id)}
          {detail("Requester", entry.requester_display_name ?? entry.requester_entity_id)}
          {detail("Target", entry.target_display_name ?? entry.target_entity_id)}
          {detail("Source message", entry.source_message_id)}
          {detail("Plan", entry.work_plan_id)}
          {detail("Due", entry.due_at)}

          {/* Python enrichment truth */}
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

          {/* Persisted coordination + internal watchers */}
          {entry.coordination !== undefined ? (
            <div className="mt-1 border-t border-border/50 pt-1" data-testid="work-ledger-item-coordination">
              <div>
                <span className="text-muted-foreground">Coordination:</span>{" "}
                {entry.coordination.runtime === "BEAM_DISPATCHED"
                  ? `BEAM dispatched${entry.coordination.watcher ? ` · watcher: ${entry.coordination.watcher}` : ""}`
                  : entry.coordination.runtime.replace(/_/g, " ").toLowerCase()}
              </div>
              {activeWatchers.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-0.5" data-testid="work-ledger-item-watchers">
                  {activeWatchers.map((w) => (
                    <Badge key={w.watcher_id} variant="outline" className="text-[9px]">
                      watching: {w.watcher_type.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Execution proof trail (lazy) */}
          <div className="mt-1 border-t border-border/50 pt-1" data-testid="work-ledger-item-proof">
            <div className="font-medium text-foreground/80">Execution proof</div>
            {proofState === "loading" ? <div>Loading proof…</div> : null}
            {proofState === "error" ? <div>Execution proof unavailable.</div> : null}
            {proofState === "loaded" && attempts !== null ? (
              attempts.length === 0 ? (
                <div>No execution attempts recorded.</div>
              ) : (
                <>
                  <div className="pb-0.5">
                    Proof: <span className="font-medium">{proofStatusOf(attempts).toLowerCase()}</span>
                  </div>
                  {attempts.map((a) => (
                    <div key={a.attempt_id} className="flex items-center gap-1">
                      <span
                        className={
                          a.status === "VERIFIED"
                            ? "text-emerald-600"
                            : a.status === "FAILED"
                              ? "text-amber-600"
                              : "text-muted-foreground"
                        }
                        data-testid={`attempt-${a.attempt_type}`}
                      >
                        {a.status === "VERIFIED" ? "✓" : a.status === "FAILED" ? "⚠" : "•"} {attemptLabel(a.attempt_type)}: {statusWord(a.status)}
                      </span>
                      {a.status === "FAILED" && a.error_code !== null ? (
                        <span className="text-[10px] text-muted-foreground">({a.error_code})</span>
                      ) : null}
                    </div>
                  ))}
                  {!attempts.some((a) => a.attempt_type === "CONNECTOR_EXECUTION") ? (
                    <div className="text-[10px] italic">No external action attempted.</div>
                  ) : null}
                </>
              )
            ) : null}
          </div>

          <div className="italic">Inspect only — nothing is sent or executed.</div>
        </div>
      ) : null}
    </div>
  );
}

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
