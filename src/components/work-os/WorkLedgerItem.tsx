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
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type {
  ClarityAnswerView,
  ClarityProjectionView,
  ExecutionAttemptView,
  WorkLedgerEntryView,
} from "@/lib/types/foundation";
import { emitWorkStateChanged } from "@/lib/events/work-state";
import { ViewWhyPanel } from "@/components/work-os/ViewWhyPanel";
import { MeetingIntelligencePanel } from "@/components/work-os/MeetingIntelligencePanel";
import { viewWhyFromLedger } from "@/lib/work-os/view-why";
import { deriveWorkItemExecution } from "@/lib/work-os/work-item-execution";
import { routingLaneChip, routingLaneEdge, routingWhyLine } from "@/lib/work-os/routing-lane";
import { formatOwnedByLine } from "@/lib/identity/owner-display";
import { sourceLineageLabel } from "@/lib/labels/source-lineage";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";

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
  // PROD-UX-P0A — governed execution actions (Slice F rails).
  const [execBusy, setExecBusy] = useState(false);
  const [execMsg, setExecMsg] = useState<string | null>(null);
  // [CE-1] read-only clarifier suggestions, lazy-loaded with the Why detail.
  const [clarity, setClarity] = useState<ClarityProjectionView | null>(null);
  const [clarityLoaded, setClarityLoaded] = useState(false);
  // [CE-2] governed clarification request (per-candidate busy + honest error).
  const [clarifyBusy, setClarifyBusy] = useState<string | null>(null);
  const [clarifyErr, setClarifyErr] = useState<string | null>(null);

  // [CE-2] one governed call; the backend enforces that the clarifier is a
  // current candidate, dedupes, audits, and points the clarifier's inbox.
  async function requestClarification(entityId: string): Promise<void> {
    setClarifyBusy(entityId);
    setClarifyErr(null);
    const r = await api.workOs.ledgerClarify(entry.ledger_entry_id, entityId);
    setClarifyBusy(null);
    if (r.ok) {
      const name =
        clarity?.candidates.find((c) => c.entity_id === entityId)?.display_name ?? "them";
      setClarity((prev) =>
        prev === null
          ? prev
          : {
              ...prev,
              pending_clarification: {
                escalation_id: r.data.escalation_id,
                status: r.data.status,
                clarifier_entity_id: entityId,
                clarifier_display_name: name,
              },
            },
      );
    } else {
      setClarifyErr("Couldn't send the clarification request. Try again.");
    }
  }

  // [CE-3] quiet ask-about-this-work: read-only deterministic answer from
  // Work OS truth. Asking never mutates; the suggested action goes through
  // the EXISTING CE-2 request handler.
  const [askText, setAskText] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askAnswer, setAskAnswer] = useState<ClarityAnswerView | null>(null);

  async function askAboutWork(): Promise<void> {
    const q = askText.trim();
    if (q.length === 0 || askBusy) return;
    setAskBusy(true);
    const r = await api.workOs.ledgerClarityAnswer(entry.ledger_entry_id, q);
    setAskBusy(false);
    if (r.ok) {
      setAskAnswer({
        answer: r.data.answer,
        confidence: r.data.confidence,
        used_sources: r.data.used_sources,
        ...(r.data.suggested_next_action !== undefined
          ? { suggested_next_action: r.data.suggested_next_action }
          : {}),
      });
    } else {
      setAskAnswer({
        answer: "Otzar couldn't answer right now. Try again.",
        confidence: "low",
        used_sources: [],
      });
    }
  }

  // [CE-2] honest lifecycle copy for the asker's own clarification.
  function clarificationStateLine(p: NonNullable<ClarityProjectionView["pending_clarification"]>): string {
    switch (p.status) {
      case "PENDING":
        return `Clarification requested from ${p.clarifier_display_name} — waiting.`;
      case "APPROVED":
        return `Clarified by ${p.clarifier_display_name}.`;
      case "REJECTED":
        return `${p.clarifier_display_name} declined this clarification request.`;
      case "EXPIRED":
        return `The clarification request to ${p.clarifier_display_name} expired.`;
      default:
        return `Clarification with ${p.clarifier_display_name}: ${p.status.toLowerCase()}.`;
    }
  }
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ loading: boolean; text: string | null }>({ loading: false, text: null });
  const exec = deriveWorkItemExecution(entry);
  const sourceLabel = sourceLineageLabel(entry.source_lineage);
  // PROD-UX-P0R — the routing decision projection (attached by getMyWork).
  const laneChip = routingLaneChip(entry.routing);
  const laneWhy = routingWhyLine(entry.routing);

  // Mark complete — owner-only (server-computed entry.can_complete). PATCHes
  // the status to EXECUTED; the requester's waiting-on then clears. The backend
  // re-enforces authority, so this control never bypasses policy.
  async function markComplete(): Promise<void> {
    setCompleting(true);
    setCompleteErr(null);
    const r = await api.workOs.patchLedger(entry.ledger_entry_id, { status: "EXECUTED" });
    setCompleting(false);
    if (r.ok && r.data.ok) {
      onChanged?.(); // existing path (kept; build-forward)
      // Additive: a completed task clears the requester's waiting-on across
      // surfaces (e.g. Team Work) without each surface knowing about the other.
      emitWorkStateChanged({ type: "TASK_COMPLETED", ledger_entry_id: entry.ledger_entry_id });
      emitWorkStateChanged({ type: "LEDGER_UPDATED", ledger_entry_id: entry.ledger_entry_id });
      emitWorkStateChanged({ type: "WAITING_ON_CHANGED" });
    } else {
      setCompleteErr(
        r.ok && r.data.message ? r.data.message : "Couldn't mark complete right now.",
      );
    }
  }

  // Ask Otzar to handle it — promotes the commitment to a GOVERNED Action (never
  // auto-sends; the Action still runs only through the approved lifecycle). The
  // item then reflects "waiting on approval" / "handling" and, when done, a receipt.
  async function askOtzar(): Promise<void> {
    setExecBusy(true);
    setExecMsg(null);
    const r = await api.workOs.ledgerExecute(entry.ledger_entry_id);
    setExecBusy(false);
    if (r.ok && r.data.ok && r.data.outcome === "action_created") {
      setExecMsg("Otzar has this — it's routed for approval.");
      emitWorkStateChanged({ type: "LEDGER_UPDATED", ledger_entry_id: entry.ledger_entry_id });
      onChanged?.();
    } else if (r.ok && r.data.outcome === "blocked_setup_required") {
      setExecMsg(`Can't yet — ${exec.connectorLabel ?? "the tool"} needs connecting.`);
      onChanged?.();
    } else {
      setExecMsg(
        r.ok && r.data.code === "FEATURE_DISABLED"
          ? "Governed execution isn't enabled here yet."
          : r.ok && (r.data.reason ?? r.data.code)
            ? `Couldn't route this: ${r.data.reason ?? r.data.code}`
            : "Couldn't route this right now.",
      );
    }
  }

  // Refresh the ledger's execution state from its linked Action (EXECUTING → done).
  async function reconcile(): Promise<void> {
    setExecBusy(true);
    setExecMsg(null);
    const r = await api.workOs.ledgerReconcileExecution(entry.ledger_entry_id);
    setExecBusy(false);
    if (r.ok && r.data.ok) {
      emitWorkStateChanged({ type: "LEDGER_UPDATED", ledger_entry_id: entry.ledger_entry_id });
      onChanged?.();
    } else {
      setExecMsg("Couldn't refresh status right now.");
    }
  }

  // Show the real connector receipt (channel / ts / permalink) from the Action's
  // latest attempt — proof the write actually happened, never fabricated.
  async function loadReceipt(): Promise<void> {
    const next = !receiptOpen;
    setReceiptOpen(next);
    if (next && receipt.text === null && entry.proposed_action_id) {
      setReceipt({ loading: true, text: null });
      const r = await api.actions.getActionAttempts(entry.proposed_action_id);
      if (r.ok) {
        const latest = r.data.attempts[0] as
          | { result_metadata?: { connector_type?: string; delivery_metadata?: Record<string, unknown> } }
          | undefined;
        const d = latest?.result_metadata?.delivery_metadata ?? {};
        const parts: string[] = [];
        if (latest?.result_metadata?.connector_type) parts.push(String(latest.result_metadata.connector_type).replace(/_/g, " ").toLowerCase());
        if (typeof d["channel"] === "string") parts.push(`channel ${d["channel"]}`);
        if (typeof d["ts"] === "string" && d["ts"] !== "0000000000.000000") parts.push(`at ${d["ts"]}`);
        const permalink = typeof d["permalink"] === "string" ? d["permalink"] : null;
        setReceipt({ loading: false, text: parts.length > 0 ? parts.join(" · ") + (permalink ? `\n${permalink}` : "") : "Delivered." });
      } else {
        setReceipt({ loading: false, text: "Receipt unavailable." });
      }
    }
  }

  // Lazy-load execution proof only when the user opens View/Why — never
  // upfront for every card. Read-only; sends/executes nothing.
  async function toggle(): Promise<void> {
    const next = !open;
    setOpen(next);
    // [CE-AMBIENT] opening an item's View/Why is the deliberate "I'm looking
    // at this" act — provide it as the current work context so the ambient
    // bar can answer "why is this here?" about THIS item. Closing clears it
    // (only if it is still ours) so a stale "this" never resolves.
    const ctxStore = useCurrentSurfaceContextStore.getState();
    if (next) {
      ctxStore.provide({
        type: "work_item",
        title: entry.title,
        ledgerEntryId: entry.ledger_entry_id,
        sourceLabel: "Work item",
      });
    } else if (ctxStore.context?.ledgerEntryId === entry.ledger_entry_id) {
      ctxStore.clear();
    }
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
    // [CE-1] clarity suggestions load the same lazy way — read-only, only
    // inside the opened Why, never a fetch per card face.
    if (next && clarity === null && !clarityLoaded) {
      const c = await api.workOs.ledgerClarity(entry.ledger_entry_id);
      setClarityLoaded(true);
      if (c.ok) setClarity(c.data.clarity);
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
      // PROD-MODEL-P5 §19 — frosted card with a stateful left edge driven by
      // the routing lane (real state, never decoration): attention lanes come
      // forward, silent lanes recede.
      className={`rounded-xl border border-border/70 border-l-2 ${routingLaneEdge(entry.routing)} bg-background/60 p-2 text-xs backdrop-blur-sm`}
      data-lane-edge={entry.routing?.lane ?? "none"}
      data-testid="work-ledger-item"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-foreground">{entry.title}</div>
          <div className="text-[10px] text-muted-foreground">
            {entry.ledger_type}
            {/* PROD-UX-VIS-C — who owns it, on the card face (pronoun-guarded). */}
            {typeof entry.owner_display_name === "string" &&
            entry.owner_display_name.length > 0 ? (
              <span data-testid="work-ledger-item-owner">
                {" · "}
                {formatOwnedByLine(entry.owner_display_name)}
              </span>
            ) : null}
            {entry.next_action !== null ? ` · Next: ${entry.next_action}` : ""}
            {/* [GAP-J] calm source origin — one muted fragment, only when the
                source is a known system (unknown = silence, not clutter). */}
            {sourceLabel !== null ? (
              <span data-testid="work-ledger-item-source">
                {" · "}
                {sourceLabel}
              </span>
            ) : null}
          </div>
          {exec.state !== "tracking" ? (
            <div className="mt-0.5 text-[10px]" data-testid="work-ledger-item-exec-state" data-exec-state={exec.state}>
              <span
                className={
                  exec.state === "executed"
                    ? "text-emerald-600"
                    : exec.state === "blocked_setup" || exec.state === "needs_owner"
                      ? "text-amber-600"
                      : exec.state === "pending_approval" || exec.state === "otzar_can_handle"
                        ? "text-sky-600"
                        : "text-muted-foreground"
                }
              >
                {exec.stateLabel}
              </span>
              {exec.nextBestAction !== null && exec.state !== "executed" ? (
                <span className="text-muted-foreground"> · {exec.nextBestAction}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* PROD-UX-P0R — the routing decision Otzar made, as one calm chip.
              Silent lanes render nothing (the why still shows in View/Why). */}
          {laneChip !== null ? (
            <Badge
              variant="outline"
              className={`text-[9px] ${laneChip.cls}`}
              data-testid="work-ledger-item-routing-lane"
              data-lane={entry.routing?.lane}
              title={entry.routing?.reason}
            >
              {laneChip.label}
            </Badge>
          ) : null}
          {cardBadge !== null ? (
            <Badge variant="outline" className={`text-[9px] ${cardBadge.cls}`} data-testid="work-ledger-item-card-badge">
              {cardBadge.text}
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-[9px]">
            {/* PROD-MODEL-P5 — status in words, not a shouting enum; the lane
                chip beside it already carries the human state. */}
            {entry.status.replace(/_/g, " ").toLowerCase()}
          </Badge>
          {exec.actions.includes("ask_otzar") ? (
            <button
              type="button"
              className="rounded border border-sky-500/50 px-1 text-[10px] text-sky-600 hover:bg-sky-500/10 disabled:opacity-50"
              data-testid="work-ledger-item-ask-otzar"
              disabled={execBusy}
              onClick={() => void askOtzar()}
            >
              {execBusy ? "Routing…" : "Ask Otzar to handle"}
            </button>
          ) : null}
          {/* PROD-UX — setup_required work deep-links to the setup surface.
              The action was computed by the P0A map but never rendered:
              a missing wire, now closed. Admin destination; employees see
              the same link (the page itself explains who can connect). */}
          {exec.actions.includes("request_setup") ? (
            <Link
              to="/tools-connections"
              className="rounded border border-amber-500/50 px-1 text-[10px] text-amber-600 hover:bg-amber-500/10"
              data-testid="work-ledger-item-request-setup"
              title={
                exec.connectorLabel !== null
                  ? `Connect ${exec.connectorLabel} so Otzar can help with this`
                  : "Open Tools & Connections"
              }
            >
              {exec.connectorLabel !== null
                ? `Connect ${exec.connectorLabel}`
                : "Open setup"}
            </Link>
          ) : null}
          {exec.actions.includes("reconcile") ? (
            <button
              type="button"
              className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
              data-testid="work-ledger-item-reconcile"
              disabled={execBusy}
              onClick={() => void reconcile()}
            >
              {execBusy ? "…" : "Refresh"}
            </button>
          ) : null}
          {exec.actions.includes("view_receipt") ? (
            <button
              type="button"
              className="rounded px-1 text-[10px] text-emerald-600 hover:bg-emerald-500/10"
              data-testid="work-ledger-item-receipt"
              onClick={() => void loadReceipt()}
            >
              {receiptOpen ? "Hide receipt" : "Receipt"}
            </button>
          ) : null}
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
      {execMsg !== null ? (
        <p className="mt-1 text-[10px] text-muted-foreground" data-testid="work-ledger-item-exec-msg">
          {execMsg}
        </p>
      ) : null}
      {receiptOpen ? (
        <div className="mt-1 rounded border bg-muted/40 p-1.5 text-[10px]" data-testid="work-ledger-item-receipt-panel">
          {receipt.loading ? (
            <span className="text-muted-foreground">Loading receipt…</span>
          ) : (
            <pre className="whitespace-pre-wrap break-words text-emerald-700 dark:text-emerald-400">{receipt.text}</pre>
          )}
        </div>
      ) : null}
      {/* Phase 1286-C — read-only meeting intelligence, only when the row
          genuinely carries it (absent → nothing renders). */}
      <MeetingIntelligencePanel data={entry.meeting_intelligence} />
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
          {/* Phase 1285-J — shared View/Why model: identity (canonical labels,
              never UUIDs), work, and provenance rows render identically on My
              Work, Team Work, Thread, and People cockpit. */}
          <ViewWhyPanel model={viewWhyFromLedger(entry)} />

          {/* [CE-1] Who can clarify — read-only suggestions ranked from
              source lineage + org truth. Text only: nothing is created,
              sent, or escalated from here (that is CE-2). Honest empty
              state when Otzar lacks context; nothing while loading. */}
          {clarityLoaded ? (
            <div
              className="mt-1 border-t border-border/50 pt-1"
              data-testid="work-ledger-item-clarity"
            >
              <span className="text-muted-foreground">Who can clarify:</span>
              {clarity?.pending_clarification !== undefined ? (
                // [CE-2] the asker's own clarification lifecycle — one calm line.
                <div data-testid="work-ledger-item-clarification-state">
                  {clarificationStateLine(clarity.pending_clarification)}
                </div>
              ) : clarity !== null && clarity.candidates.length > 0 ? (
                clarity.candidates.map((c) => (
                  <div
                    key={c.entity_id}
                    className="flex items-center gap-2"
                    data-testid="work-ledger-item-clarifier"
                  >
                    <span>
                      Ask {c.display_name} —{" "}
                      {c.reason.charAt(0).toLowerCase() + c.reason.slice(1)}
                    </span>
                    {/* [CE-2] governed request — clarification, not approval. */}
                    <button
                      type="button"
                      className="rounded border border-border/70 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                      data-testid="work-ledger-item-clarify"
                      disabled={clarifyBusy !== null}
                      onClick={() => void requestClarification(c.entity_id)}
                    >
                      {clarifyBusy === c.entity_id ? "Requesting…" : "Request"}
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">
                  Otzar does not have enough context to suggest a clarifier yet.
                </div>
              )}
              {clarifyErr !== null ? (
                <div className="text-amber-600" data-testid="work-ledger-item-clarify-error">
                  {clarifyErr}
                </div>
              ) : null}

              {/* [CE-3] ask about this work — one quiet inline row inside the
                  already-open detail. Read-only truth answers; the suggested
                  action rides the existing governed CE-2 handler. */}
              <div className="mt-1 flex items-center gap-1" data-testid="work-ledger-item-ask-row">
                <input
                  type="text"
                  value={askText}
                  onChange={(e) => setAskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void askAboutWork();
                  }}
                  placeholder="Ask about this work — e.g. where did this come from?"
                  aria-label="Ask about this work"
                  className="w-full rounded border border-border/70 bg-background px-1.5 py-0.5 text-[11px]"
                  data-testid="work-ledger-item-ask-input"
                />
                <button
                  type="button"
                  className="rounded border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  data-testid="work-ledger-item-ask"
                  disabled={askBusy || askText.trim().length === 0}
                  onClick={() => void askAboutWork()}
                >
                  {askBusy ? "…" : "Ask"}
                </button>
              </div>
              {askAnswer !== null ? (
                <div className="mt-0.5" data-testid="work-ledger-item-ask-answer">
                  <span className="text-foreground">{askAnswer.answer}</span>
                  {askAnswer.suggested_next_action !== undefined ? (
                    <button
                      type="button"
                      className="ml-2 rounded border border-border/70 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                      data-testid="work-ledger-item-ask-suggested"
                      disabled={clarifyBusy !== null}
                      onClick={() =>
                        void requestClarification(
                          askAnswer.suggested_next_action!.clarifier_entity_id,
                        )
                      }
                    >
                      {askAnswer.suggested_next_action.label}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* PROD-UX-P0R — the routing decision + why, in plain language
              (present for EVERY lane here, including the silent ones). */}
          {laneWhy !== null ? (
            <div className="mt-1 border-t border-border/50 pt-1" data-testid="work-ledger-item-routing-why">
              <div>
                <span className="text-muted-foreground">Routing:</span> {laneWhy.reason}
              </div>
              <div className="text-muted-foreground">
                {laneWhy.risk}
                {laneWhy.nextBestAction !== null ? ` · Next: ${laneWhy.nextBestAction}` : ""}
              </div>
            </div>
          ) : null}

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

// The bucketFor / BUCKET_ORDER grouping helpers moved to
// src/lib/work-os/work-buckets.ts (shared lib logic, fast-refresh-safe).
