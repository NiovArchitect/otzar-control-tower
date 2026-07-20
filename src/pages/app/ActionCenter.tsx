// FILE: ActionCenter.tsx
// PURPOSE: Phase 1211 — Action Center ("Needs me"). Lists the viewer's own
//          Action rows plus contextual work surfaces (C-04): open work,
//          blind spots, obligations, handoffs, decision evidence,
//          corrections entry — not as separate primary destinations.
//
//          The page surfaces the decisions Otzar has on behalf of
//          the operator -- what's pending, what was approved, what
//          succeeded, what was blocked.
//
// CONNECTS TO:
//   - src/lib/api.ts (api.actions.list)
//   - src/lib/types/foundation.ts (SafeActionView)
//   - src/lib/nav-employee.ts (nav entry)
//
// PRIVACY INVARIANT:
//   - Renders ONLY the SafeActionView projection (closed-vocab fields).
//   - Never renders payload_redacted, policy_envelope, TAR, wallet,
//     clearance, permission_id, embedding, vector, bearer.
//   - The body_summary that the user saw via chat / notification is
//     not surfaced here; this page is the *Action* surface (status,
//     timing, risk), not the *Notification* body. Body access stays
//     on the Notification surface (NotificationBell).
//
// WARMWIND LANGUAGE PASS:
//   - "Action Center" / "Pending" / "Approved" / "Completed" /
//     "Blocked" -- no developer terms. action_type / risk_tier are
//     translated to friendly labels.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, AlertTriangle, Slash, ListChecks, CalendarClock, ShieldAlert, Scale, ArrowRightLeft, Briefcase, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DecisionEvidenceDrawer } from "@/components/otzar/DecisionEvidenceDrawer";
import { OrgTruthReviewDrawer } from "@/components/otzar/OrgTruthReviewDrawer";
import { BlindSpots } from "@/pages/app/BlindSpots";
import type { ConflictSetWithCount } from "@/lib/types/foundation";
import {
  ORG_TRUTH_COPY,
  getConflictStateLabel,
  getConflictStateSeverity,
  humanizeOrgTruthClass,
} from "@/lib/labels/org-truth";
import {
  getBasisStatusHeadline,
  getBasisStatusSeverity,
} from "@/lib/labels/basis-status";
import type { ObligationWithBasis } from "@/lib/types/foundation";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIBreakdownButton } from "@/components/otzar/AIBreakdownButton";
import { ViewWhyPanel } from "@/components/work-os/ViewWhyPanel";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import {
  viewWhyFromAction,
  actionTypeLabel,
  actionExecutability,
  actionTargetLabel,
} from "@/lib/work-os/view-why";
import { api } from "@/lib/api";
import { getActionDetails } from "@/lib/work-os/action-details-store";
import type { ActionDetails } from "@/lib/work-os/action-details-store";
import type { SafeActionView, WorkLedgerEntryView } from "@/lib/types/foundation";
import { isActionablePending, actionClassLabel } from "@/lib/work-os/action-classify";
import { isStaleOpenWork, staleLabel } from "@/lib/today/stale-truth";
import { useWorkStateChanged, emitWorkStateChanged } from "@/lib/events/work-state";

type Tab = "pending" | "approved" | "completed" | "blocked";

const TAB_LABEL: Record<Tab, string> = {
  pending: "Needs decision",
  approved: "Approved",
  completed: "Completed",
  blocked: "Blocked",
};

const STATUS_TO_TAB: Record<string, Tab> = {
  PROPOSED: "pending",
  APPROVED: "approved",
  SCHEDULED: "approved",
  RUNNING: "approved",
  SUCCEEDED: "completed",
  FAILED: "blocked",
  CANCELLED: "blocked",
  TIMED_OUT: "blocked",
  REJECTED: "blocked",
  EXPIRED: "blocked",
};

// Delegates to the shared actionTypeLabel (Phase 1285-L) so a raw
// DUAL_CONTROL/colon-prefixed type is NEVER shown as the primary card title.
function friendlyActionType(action_type: string): string {
  return actionTypeLabel(action_type);
}

// WHAT: a specific, human-readable card title — "Approve internal note to David
//        Odie" / "Second approval needed: internal note to Samiksha" /
//        "Historical internal note approval, recipient unavailable" — built
//        from the action's executable state + the SAFE recipient label.
// WHY: BLOCKER 2 — a governed decision cockpit, not a pile of "Internal note"
//        cards. Never a raw DUAL_CONTROL string; never a raw UUID.
function buildCardTitle(a: SafeActionView, details: ActionDetails | null): string {
  const labelled = friendlyActionType(a.action_type); // may be "Second approval: …"
  const isDual = /^second approval:/i.test(labelled);
  const kind = labelled.replace(/^second approval:\s*/i, ""); // title-case, e.g. "Internal note"
  // Lower-cased first letter for mid-sentence use ("Approve internal note …").
  const midKind = kind.charAt(0).toLowerCase() + kind.slice(1);
  const target = actionTargetLabel(a, details);
  const to = target !== null ? ` to ${target}` : ", recipient unavailable";
  const exec = actionExecutability(a);

  if (TERMINAL_STATUSES.has(a.status)) {
    return `Historical ${midKind} approval${to}`;
  }
  if (exec.executable && isDual) {
    return `Second approval needed: ${midKind}${to}`;
  }
  if (exec.executable) {
    return `Approve ${midKind}${to}`;
  }
  // Pending-but-routing / in-flight — name it specifically, no fake verb.
  return `${kind}${to}`;
}

const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
  "REJECTED",
  "EXPIRED",
]);

function friendlyStatus(status: string): string {
  switch (status) {
    case "PROPOSED":
      return "Needs decision";
    case "APPROVED":
      return "Approved";
    case "SCHEDULED":
      return "Scheduled";
    case "RUNNING":
      return "Running";
    case "SUCCEEDED":
      return "Sent";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "TIMED_OUT":
      return "Timed out";
    case "REJECTED":
      // [PROD-UX-APPROVAL-LOOP] A REJECTED action usually means an approver
      // declined it (dual-control verdict now reconciles onto the Action);
      // policy denials land here too — "Not approved" covers both honestly.
      return "Not approved";
    case "EXPIRED":
      return "Expired";
    default:
      return status;
  }
}

function friendlyRisk(risk_tier: string): string {
  switch (risk_tier) {
    case "LOW":
      return "Low risk";
    case "MEDIUM":
      return "Medium risk";
    case "HIGH":
      return "High risk";
    case "CRITICAL":
      return "Critical";
    default:
      return risk_tier;
  }
}

function statusIcon(tab: Tab): JSX.Element {
  switch (tab) {
    case "pending":
      return <Clock className="h-4 w-4" aria-hidden />;
    case "approved":
      return <ListChecks className="h-4 w-4" aria-hidden />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4" aria-hidden />;
    case "blocked":
      return <Slash className="h-4 w-4" aria-hidden />;
  }
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const delta = Math.max(0, Math.floor((now - t) / 1000));
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

export function ActionCenter(): JSX.Element {
  const [items, setItems] = useState<SafeActionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  // Phase 1268 — per-action approve/reject busy + error so the
  // Action Center is a real execution control plane.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  // Phase 1285-L — which action's structured View/Why is expanded.
  const [whyId, setWhyId] = useState<string | null>(null);
  const focusCardRef = useRef<HTMLLIElement | null>(null);
  const tabPinnedRef = useRef(false);

  // Phase 1268 — the action to focus/highlight, from the WorkArtifactCard
  // "Open" route (?focus=<action_id> / ?action_id=<id>). Read from the
  // URL directly so the page works in any render context.
  const focusId = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get("focus") ?? p.get("action_id") ?? "";
    } catch {
      return "";
    }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    return api.actions
      .list({ page_size: 50 })
      .then((result) => {
        if (result.ok) {
          setItems(result.data.items);
          setError(null);
        } else {
          setError(result.code);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("NETWORK_ERROR");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Phase 1285-S — refresh when work changes (a new action proposed, a task
  // completed, a notification-linked action) so the cockpit is never stale.
  useWorkStateChanged(
    ["LEDGER_UPDATED", "TASK_COMPLETED", "NOTIFICATION_CREATED", "SIGNAL_TRACKED"],
    () => void load(),
  );

  const grouped: Record<Tab, SafeActionView[]> = {
    pending: [],
    approved: [],
    completed: [],
    blocked: [],
  };
  for (const item of items) {
    const t = STATUS_TO_TAB[item.status] ?? "blocked";
    grouped[t].push(item);
  }

  // When a focused action loads, switch to the tab that contains it and
  // scroll/highlight it — so an opened draft is never "lost".
  useEffect(() => {
    if (focusId.length === 0 || tabPinnedRef.current) return;
    const focused = items.find((a) => a.action_id === focusId);
    if (focused === undefined) return;
    tabPinnedRef.current = true;
    setTab(STATUS_TO_TAB[focused.status] ?? "blocked");
  }, [focusId, items]);

  useEffect(() => {
    if (focusId.length > 0 && focusCardRef.current !== null) {
      focusCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId, tab, items]);

  async function decide(
    escalationId: string,
    decision: "approve" | "reject",
  ): Promise<void> {
    setBusyId(escalationId);
    setDecisionError(null);
    const r =
      decision === "approve"
        ? await api.escalations.approve(escalationId)
        : await api.escalations.reject(escalationId);
    setBusyId(null);
    if (r.ok) {
      await load();
      // Phase 1287-C — a resolved decision drops out of the Needs-decision count
      // AND refreshes the notification feed + ambient popup across the shell.
      emitWorkStateChanged({ type: "LEDGER_UPDATED" });
      emitWorkStateChanged({ type: "WAITING_ON_CHANGED" });
    } else {
      setDecisionError(r.code);
    }
  }

  // Phase 1285-S — the "Needs decision" tab leads with truly actionable items
  // (a real approve/reject); non-actionable proposals (routing/stuck) sort
  // below and are labeled, but never inflate the actionable count.
  const current =
    tab === "pending"
      ? [...grouped.pending].sort(
          (x, y) => Number(isActionablePending(y)) - Number(isActionablePending(x)),
        )
      : grouped[tab];
  // The pending badge counts ONLY actionable items.
  const tabCount = (t: Tab): number =>
    t === "pending"
      ? grouped.pending.filter(isActionablePending).length
      : grouped[t].length;

  return (
    <div
      className="space-y-6"
      data-testid="action-center"
      data-contextual-work="true"
      data-c04-host="true"
    >
      <PageHeader
        eyebrow="Needs you"
        title="Needs me"
        description="Decisions, open work, blind spots, handoffs, obligations, and evidence — act here instead of hunting separate pages."
      />

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Action lifecycle tabs"
        className="flex flex-wrap gap-2 border-b border-border"
      >
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const count = tabCount(t);
          const active = t === tab;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`action-tab-${t}`}
              data-count={count}
              onClick={() => setTab(t)}
              className={
                "flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors " +
                (active
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {statusIcon(t)}
              <span>{TAB_LABEL[t]}</span>
              <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="action-center-loading"
        >
          Loading your actions…
        </p>
      ) : error !== null ? (
        <Card
          className="border-rose-400/40 bg-rose-500/5"
          data-testid="action-center-error"
        >
          <CardContent className="py-4 text-sm">
            <AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden />
            Couldn't load your actions. ({error})
          </CardContent>
        </Card>
      ) : current.length === 0 ? (
        <Card data-testid="action-center-empty">
          <CardContent className="py-6 text-sm text-muted-foreground">
            {tab === "pending"
              ? "Nothing waiting on you right now. When Otzar drafts an action, it'll show up here."
              : tab === "approved"
                ? "No approved actions in flight."
                : tab === "completed"
                  ? "Nothing completed yet."
                  : "Nothing blocked. Otzar's recent work passed policy."}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2" data-testid="action-center-list">
          {current.map((a) => {
            const t = STATUS_TO_TAB[a.status] ?? "blocked";
            const isFocused = focusId.length > 0 && a.action_id === focusId;
            // Phase 1269 — the human-readable artifact detail the user
            // authored (recipient/channel/body/source), if we have it.
            const details = getActionDetails(a.action_id);
            return (
              <li
                key={a.action_id}
                ref={isFocused ? focusCardRef : undefined}
              >
                <Card
                  data-testid="action-center-card"
                  data-action-id={a.action_id}
                  data-action-status={a.status}
                  data-action-type={a.action_type}
                  data-focused={isFocused ? "true" : "false"}
                  className={
                    isFocused ? "ring-2 ring-primary ring-offset-2" : undefined
                  }
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-sm">
                      {/* Whole title is a clickable affordance that opens the
                          structured View/Why detail (BLOCKER 2). */}
                      <button
                        type="button"
                        className="flex-1 text-left hover:underline"
                        data-testid="action-open-details"
                        onClick={() =>
                          setWhyId((id) => (id === a.action_id ? null : a.action_id))
                        }
                      >
                        {buildCardTitle(a, details)}
                      </button>
                      <div className="flex items-center gap-2">
                        {actionTargetLabel(a, details) === null ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/50 text-amber-600 text-[9px]"
                            data-testid="action-recipient-unavailable"
                          >
                            recipient unavailable
                          </Badge>
                        ) : null}
                        {/* Phase 1285-S — honest class label so historical /
                            low-risk / non-actionable items never read as
                            requiring action. Actionable items show no label
                            (they have Approve / Reject controls below). */}
                        {actionClassLabel(a) !== null ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] text-muted-foreground"
                            data-testid="action-class-label"
                          >
                            {actionClassLabel(a)}
                          </Badge>
                        ) : null}
                        <Badge variant={t === "blocked" ? "destructive" : "outline"}>
                          {friendlyStatus(a.status)}
                        </Badge>
                        <AIBreakdownButton
                          triggerTestId="action-ai-breakdown"
                          breakdown={{
                            title: "Why this is in your Action Center",
                            points: [
                              {
                                label: "What this is",
                                body: `${friendlyActionType(a.action_type)} (${friendlyRisk(a.risk_tier).toLowerCase()}).`,
                              },
                              {
                                label: "Current state",
                                body: `${friendlyStatus(a.status)}. ${
                                  a.decision_reason !== undefined &&
                                  a.decision_reason.length > 0
                                    ? humanDecisionReason(a.decision_reason)
                                    : "Otzar will move this forward through your organization's policy and audit trail."
                                }`,
                              },
                              {
                                label: "What's protected",
                                body:
                                  "Every transition is recorded in the audit trail. No external write happens unless your org has explicitly enabled a connector and policy allowed it.",
                              },
                            ],
                          }}
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0 text-xs text-muted-foreground">
                    {/* BLOCKER 2 — specific, inspectable detail for EVERY
                        action (incl. approved/executed/historical). Recipient
                        prefers the SAFE server label (target_label), then the
                        locally-authored draft; message body is local-only draft
                        context and is honestly marked unavailable otherwise. */}
                    {(() => {
                      const recipient = actionTargetLabel(a, details);
                      return (
                        <div
                          className="rounded border border-border bg-muted/30 p-1.5 space-y-0.5"
                          data-testid="action-detail"
                        >
                          <div>
                            <span className="font-medium text-foreground">Recipient:</span>{" "}
                            {recipient !== null ? (
                              <>
                                {recipient}
                                {details?.channel !== undefined ? ` · ${details.channel}` : ""}
                              </>
                            ) : (
                              <span className="italic">recipient unavailable</span>
                            )}
                          </div>
                          {a.requester_label != null && a.requester_label.length > 0 ? (
                            <div>
                              <span className="font-medium text-foreground">Requester:</span>{" "}
                              {a.requester_label}
                            </div>
                          ) : null}
                          {/* Phase 1287-C — honest, class-aware message line.
                              The body is local-only draft context (never in the
                              safe projection, ADR-0057 §10). For a non-actionable
                              / historical item we do NOT present a scary
                              "unavailable" line as if it were approvable. */}
                          {details?.body != null && details.body.length > 0 ? (
                            <div data-testid="action-detail-body">
                              <span className="font-medium text-foreground">Message:</span>{" "}
                              <span className="whitespace-pre-wrap break-words">{details.body}</span>
                            </div>
                          ) : actionExecutability(a).executable ? (
                            <div data-testid="action-detail-body">
                              <span className="font-medium text-foreground">Message:</span>{" "}
                              <span className="italic">
                                Message preview is not in the safe view. Open to review before approving.
                              </span>
                            </div>
                          ) : (
                            <div data-testid="action-detail-body" className="italic">
                              No message to act on here.
                            </div>
                          )}
                          {details?.sourceCommand !== undefined ? (
                            <div className="text-[10px] opacity-70 break-words">
                              From: “{details.sourceCommand}”
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                    <div className="flex flex-wrap gap-2">
                      <span>{friendlyRisk(a.risk_tier)}</span>
                      <span aria-hidden>·</span>
                      <span>Created {formatRelative(a.created_at)}</span>
                      <span aria-hidden>·</span>
                      <span>Updated {formatRelative(a.updated_at)}</span>
                      {/* B-03: open work older than a week is labeled Stale — still open. */}
                      {tab === "pending" && isStaleOpenWork(a.updated_at) ? (
                        <span
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
                          data-testid="action-stale-badge"
                          title={staleLabel(a.updated_at) ?? undefined}
                        >
                          Stale
                        </span>
                      ) : null}
                    </div>
                    {a.decision_reason !== undefined && a.decision_reason.length > 0 ? (
                      <p data-testid="action-decision-reason">
                        Reason:{" "}
                        <span className="text-foreground">
                          {humanDecisionReason(a.decision_reason)}
                        </span>
                      </p>
                    ) : null}
                    {/* [GAP-E] The approver's own words on a declined request —
                        the sender learns WHY here, without visiting an admin
                        surface. Server-projected safe scalar; renders only
                        when a real reason exists on a not-approved item. */}
                    {a.status === "REJECTED" &&
                    typeof a.not_approved_reason === "string" &&
                    a.not_approved_reason.length > 0 ? (
                      <p data-testid="action-not-approved-reason">
                        From your approver:{" "}
                        <span className="text-foreground">
                          &ldquo;{a.not_approved_reason}&rdquo;
                        </span>
                      </p>
                    ) : null}
                    {/* Phase 1285-L — consistent structured View/Why via the
                        shared panel (safe SafeActionView fields only; governed
                        requester/target/policy-envelope stay restricted). */}
                    <button
                      type="button"
                      className="pt-1 text-[11px] text-muted-foreground hover:text-foreground"
                      data-testid="action-view-why"
                      onClick={() =>
                        setWhyId((id) => (id === a.action_id ? null : a.action_id))
                      }
                    >
                      {whyId === a.action_id ? "Hide details" : "View / Why"}
                    </button>
                    {whyId === a.action_id ? (
                      <div
                        className="rounded border border-border bg-muted/30 p-1.5"
                        data-testid="action-view-why-panel"
                      >
                        <ViewWhyPanel model={viewWhyFromAction(a, details)} />
                      </div>
                    ) : null}
                    {/* Phase 1268 + BLOCKER 2 — real governed decision
                        controls, gated on executable state so there are NEVER
                        dead buttons. Only an executable action (pending +
                        linked escalation) shows Approve/Reject; otherwise an
                        honest non-executable explanation. */}
                    {(() => {
                      const exec = actionExecutability(a);
                      if (exec.executable && a.escalation_id != null) {
                        const esc = a.escalation_id;
                        return (
                          <div className="flex flex-wrap gap-1 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="h-6 px-2 text-[11px]"
                              data-testid="action-approve"
                              disabled={busyId === esc}
                              onClick={() => void decide(esc, "approve")}
                            >
                              {busyId === esc ? "Approving…" : "Approve"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[11px]"
                              data-testid="action-reject"
                              disabled={busyId === esc}
                              onClick={() => void decide(esc, "reject")}
                            >
                              Reject
                            </Button>
                          </div>
                        );
                      }
                      return (
                        <p
                          className="pt-1 text-[11px] italic"
                          data-testid="action-not-executable"
                        >
                          {exec.reason}
                        </p>
                      );
                    })()}
                    {isFocused && decisionError !== null ? (
                      <p
                        className="pt-1 text-destructive"
                        data-testid="action-decision-error"
                      >
                        Couldn't complete that decision. ({decisionError})
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* [OPEN-WORK-LANE] Wave-1 redirected /app/my-work here but only
          rendered Action rows — owned ledger work was invisible. Compose
          open work on Needs me so counts open exact underlying items. */}
      <OpenWorkLane />

      {/* [SCHEDULED-LANE] A distinct, calm, READ-ONLY lane for the caller's
          terminal calendar meetings. It reads the caller-scoped MEETING ledger
          (NOT the Action queue), lives outside the tab ternary, and never feeds
          the "Needs decision" count — a scheduled meeting is done, not a task. */}
      <ScheduledLane />

      {/* [DECISION-EVIDENCE-LANE] A calm, mostly-quiet lane that surfaces any
          completed decision whose recorded evidence has since changed —
          proactive review, never an accusation. Read-only except an explicit
          recheck inside the drawer. Lives outside the tab ternary. */}
      <OpenObligationsLane />
      <IncomingHandoffsLane />
      <DecisionEvidenceLane />
      <OrgTruthReviewLane />

      {/* C-04 — blind spots + corrections live here, not as primary destinations */}
      <BlindSpots variant="lane" />
      <CorrectionsContextLane />
    </div>
  );
}

/** C-04 — teach/correct entry on Needs me; full form remains deep-link. */
function CorrectionsContextLane(): JSX.Element {
  return (
    <section
      className="space-y-2 border-t border-border pt-4"
      data-testid="corrections-context-lane"
      data-contextual-kind="corrections"
      aria-label="Corrections"
    >
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <PencilLine className="h-4 w-4 text-muted-foreground" aria-hidden />
        Corrections
      </h2>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-xs text-muted-foreground">
            Teach Otzar what it got wrong — personal learning for this org, not
            global model retrain.
          </p>
          <Button asChild size="sm" variant="outline" data-testid="corrections-open-form">
            <Link to="/app/corrections">Open correction form</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

// ── [OPEN-WORK-LANE] owned work ledger on Needs me ──────────────────────────
// Wave-1 IA: /app/my-work → action-center. Without this lane the redirect hid
// durable owned work (commitments, tasks, follow-ups) while the API still
// returned them. Terminal meetings stay in ScheduledLane only.

const TERMINAL_LEDGER = new Set([
  "EXECUTED",
  "COMPLETED",
  "CANCELLED",
  "SUCCEEDED",
  "CLOSED",
  "DONE",
]);

function isOpenOwnedWork(entry: WorkLedgerEntryView): boolean {
  // ScheduledLane owns terminal meetings.
  if (
    entry.ledger_type === "MEETING" &&
    (entry.status === "EXECUTED" || entry.status === "CANCELLED")
  ) {
    return false;
  }
  if (TERMINAL_LEDGER.has(entry.status)) return false;
  return true;
}

function OpenWorkLane(): JSX.Element {
  const [items, setItems] = useState<WorkLedgerEntryView[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    return api.workOs
      .myWork({ take: 50 })
      .then((result) => {
        if (result.ok) {
          const rows = result.data.items ?? result.data.entries ?? [];
          setItems(rows.filter(isOpenOwnedWork));
          setFailed(false);
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useWorkStateChanged(
    ["LEDGER_UPDATED", "TASK_COMPLETED", "SIGNAL_TRACKED"],
    () => void load(),
  );

  const count = items?.length ?? 0;

  return (
    <section
      className="space-y-2 border-t border-border pt-4"
      data-testid="open-work-lane"
      data-count={count}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span>Open work</span>
        {items !== null ? (
          <span
            className="rounded-full bg-muted px-2 text-xs text-muted-foreground"
            data-testid="open-work-count"
          >
            {count}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Commitments and tasks Otzar extracted for you — open any row for the
        exact item and its source.
      </p>
      {failed ? (
        <Card data-testid="open-work-error">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Couldn&apos;t load your open work right now.
          </CardContent>
        </Card>
      ) : items === null ? (
        <p className="text-sm text-muted-foreground" data-testid="open-work-loading">
          Loading your open work…
        </p>
      ) : items.length === 0 ? (
        <Card data-testid="open-work-empty">
          <CardContent className="py-6 text-sm text-muted-foreground">
            No open work items right now. When Otzar extracts a commitment or
            task for you, it shows up here.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2" data-testid="open-work-list">
          {items.map((entry) => (
            <li key={entry.ledger_entry_id}>
              <WorkLedgerItem entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── [SCHEDULED-LANE] read-only calendar meeting lane ────────────────────────
// A MEETING/EXECUTED Work Ledger row is terminal: no execute/approve/cancel
// here. `details` carries raw scalars/enums (event_id, calendar_id, role enums)
// that MUST be mapped to customer copy — this lane reads it defensively and
// projects ONLY safe, friendly fields (never a UUID / event_id / raw enum).

interface MeetingParticipant {
  /** Display label (a person's name) — the only participant field we surface. */
  label: string;
  /** Raw role string from Foundation (e.g. "optional_attendee"); mapped, never shown. */
  role: string;
  /** Raw required flag; the fallback when the role enum is unrecognized. */
  required: boolean;
}

// WHAT: map a raw attendee role to customer copy (Required / Optional / Informed).
// WHY: NEVER leak a raw enum like `optional_attendee`. The input is a free
//      string (the enum lives in a parallel Foundation change), so this is a
//      total defensive function, not a Record — unknown roles fall back to the
//      `required` boolean and still resolve to friendly copy.
function friendlyRole(role: string, required: boolean): string {
  const r = role.toLowerCase();
  if (r.includes("inform")) return "Informed";
  if (r.includes("optional")) return "Optional";
  if (r.includes("required") || r.includes("organizer") || r.includes("owner")) {
    return "Required";
  }
  return required ? "Required" : "Optional";
}

// WHAT: read the safe `scheduled_meeting.participants` projection into
//       {label, role, required}. Foundation already stripped ids; we defend
//       anyway and drop any entry without a display label.
function parseParticipants(
  meeting: { participants?: unknown } | undefined,
): MeetingParticipant[] {
  if (meeting === undefined) return [];
  const raw = meeting.participants;
  if (!Array.isArray(raw)) return [];
  const out: MeetingParticipant[] = [];
  for (const p of raw) {
    if (typeof p !== "object" || p === null) continue;
    const o = p as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (label.length === 0) continue; // no name → skip (never fall back to an id)
    const role = typeof o.role === "string" ? o.role : "";
    const required = typeof o.required === "boolean" ? o.required : false;
    out.push({ label, role, required });
  }
  return out;
}

// WHAT: "Required: Elena · Optional: Aisha" from the safe participants.
// WHY: a brief, calm roster using friendly role labels only.
function rosterSummary(parts: MeetingParticipant[]): string | null {
  if (parts.length === 0) return null;
  const groups = new Map<string, string[]>();
  for (const p of parts) {
    const key = friendlyRole(p.role, p.required);
    const names = groups.get(key) ?? [];
    names.push(p.label);
    groups.set(key, names);
  }
  const segs: string[] = [];
  for (const key of ["Required", "Optional", "Informed"]) {
    const names = groups.get(key);
    if (names !== undefined && names.length > 0) {
      segs.push(`${key}: ${names.join(", ")}`);
    }
  }
  return segs.length > 0 ? segs.join(" · ") : null;
}

// WHAT: the calm status line for a terminal MEETING row.
// WHY: EXECUTED reads as "Scheduled — no action needed"; a historical
//      CANCELLED row reads as "Cancelled". No raw status enum ever shown.
function meetingStatusLine(status: string): string {
  return status === "CANCELLED" ? "Cancelled" : "Scheduled — no action needed";
}

function ScheduledLane(): JSX.Element | null {
  const [meetings, setMeetings] = useState<WorkLedgerEntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    return api.workOs
      .meetings()
      .then((result) => {
        if (result.ok) {
          const rows = result.data.items ?? result.data.entries ?? [];
          // Self-enforcing lane contract: MEETING rows only (never trust the
          // query param alone on a general ledger endpoint), and terminal
          // states only — EXECUTED (scheduled) + CANCELLED (historical).
          setMeetings(
            rows.filter(
              (r) =>
                r.ledger_type === "MEETING" &&
                (r.status === "EXECUTED" || r.status === "CANCELLED"),
            ),
          );
          setFailed(false);
        } else {
          setFailed(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setFailed(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A newly created meeting lands as a ledger row; refresh quietly so the lane
  // is never stale. Calm — no toast, no count, no nag.
  useWorkStateChanged(["LEDGER_UPDATED", "TASK_COMPLETED"], () => void load());

  // On failure, render nothing noisy — the lane simply stays quiet.
  if (failed) return null;

  return (
    <section className="space-y-2 border-t border-border pt-4" data-testid="scheduled-lane">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span>Scheduled</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Meetings on your calendar. Nothing to do here — just so you know.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground" data-testid="scheduled-lane-loading">
          Loading your calendar…
        </p>
      ) : meetings.length === 0 ? (
        <Card data-testid="scheduled-lane-empty">
          <CardContent className="py-6 text-sm text-muted-foreground">
            No meetings scheduled yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2" data-testid="scheduled-lane-list">
          {meetings.map((m) => {
            const participants = parseParticipants(m.scheduled_meeting);
            const roster = rosterSummary(participants);
            const onGoogle = m.scheduled_meeting?.provider === "google_calendar_event";
            return (
              <li key={m.ledger_entry_id}>
                <Card
                  data-testid="scheduled-meeting-card"
                  data-meeting-status={m.status}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex-1">{m.title}</span>
                      <Badge variant="outline" className="text-muted-foreground">
                        {meetingStatusLine(m.status)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0 text-xs text-muted-foreground">
                    {roster !== null ? (
                      <div data-testid="scheduled-meeting-roster">{roster}</div>
                    ) : null}
                    {onGoogle ? <div>On Google Calendar.</div> : null}
                    {participants.length > 0 ? (
                      <div>Attendees were notified.</div>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── [PHENOMENAL-FLOW] Incoming handoffs — one-tap ambient acknowledge.
// Deep-link from Today next-best-step (?handoff=<id> or ?lane=handoffs).
function IncomingHandoffsLane(): JSX.Element | null {
  const [items, setItems] = useState<
    Array<{
      handoff_id: string;
      title: string;
      state: string;
      summary: string | null;
      version: number;
      priority?: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);
  const [ackDone, setAckDone] = useState<string | null>(null);
  const focusRef = useRef<HTMLLIElement | null>(null);

  const focusHandoffId = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      return new URLSearchParams(window.location.search).get("handoff") ?? "";
    } catch {
      return "";
    }
  }, []);

  const [acked, setAcked] = useState<
    Array<{
      handoff_id: string;
      title: string;
      state: string;
      summary: string | null;
      version: number;
    }>
  >([]);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([
      api.otzar.handoffs.list({
        role: "incoming",
        state: "SENT,RECEIVED,CLARIFICATION_REQUIRED",
        limit: 20,
      }),
      api.otzar.handoffs.list({
        role: "incoming",
        state: "ACKNOWLEDGED",
        limit: 20,
      }),
    ])
      .then(([openR, ackR]) => {
        if (openR.ok) setItems(openR.data.handoffs ?? []);
        else setFailed(true);
        if (ackR.ok) setAcked(ackR.data.handoffs ?? []);
        setLoading(false);
      })
      .catch(() => {
        setFailed(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (focusHandoffId.length === 0 || loading) return;
    focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusHandoffId, loading, items, acked]);

  const acknowledge = async (h: (typeof items)[number]) => {
    setBusyId(h.handoff_id);
    setAckError(null);
    try {
      const r = await api.otzar.handoffs.acknowledge(h.handoff_id, {
        expected_version: h.version,
      });
      if (r.ok) {
        setAckDone(h.handoff_id);
        setItems((prev) => prev.filter((x) => x.handoff_id !== h.handoff_id));
        setAcked((prev) => [
          {
            handoff_id: r.data.handoff.handoff_id,
            title: r.data.handoff.title,
            state: r.data.handoff.state,
            summary: r.data.handoff.summary,
            version: r.data.handoff.version,
          },
          ...prev.filter((x) => x.handoff_id !== r.data.handoff.handoff_id),
        ]);
      } else {
        const code =
          "code" in r && typeof r.code === "string" ? r.code : "ACK_FAILED";
        const msg =
          code === "OTZAR_HANDOFF_PRECONDITION"
            ? "This handoff was rebound for you — try Acknowledge again. If it still fails, open Chat and acknowledge there."
            : `Couldn't acknowledge (${code}). Try again.`;
        setAckError(msg);
        void load();
      }
    } catch {
      setAckError("Network error — try again.");
    } finally {
      setBusyId(null);
    }
  };

  const complete = async (h: (typeof acked)[number]) => {
    setBusyId(h.handoff_id);
    setAckError(null);
    try {
      const r = await api.otzar.handoffs.completeAmbient(h.handoff_id, {
        expected_version: h.version,
      });
      if (r.ok) {
        setAcked((prev) => prev.filter((x) => x.handoff_id !== h.handoff_id));
      } else {
        const code =
          "code" in r && typeof r.code === "string" ? r.code : "COMPLETE_FAILED";
        setAckError(`Couldn't complete (${code}). Try again.`);
        void load();
      }
    } catch {
      setAckError("Network error — try again.");
    } finally {
      setBusyId(null);
    }
  };

  if (failed) return null;
  if (!loading && items.length === 0 && acked.length === 0 && ackDone === null) {
    return null;
  }

  return (
    <section
      className="space-y-2 border-t border-border pt-4"
      data-testid="incoming-handoffs-lane"
      aria-label="Incoming handoffs"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span>Incoming handoffs</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Acknowledge ownership, then complete when linked work is accepted —
        one path from receipt to done.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading handoffs…</p>
      ) : items.length === 0 && acked.length === 0 ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="incoming-handoffs-clear"
        >
          All caught up on handoffs.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="incoming-handoffs-list">
          {items.map((h) => {
            const focused = h.handoff_id === focusHandoffId;
            return (
              <li
                key={h.handoff_id}
                ref={focused ? focusRef : undefined}
                data-testid="incoming-handoff-card"
                data-focused={focused ? "true" : "false"}
              >
                <Card
                  className={
                    focused
                      ? "border-violet-400/50 ring-2 ring-violet-400/30"
                      : undefined
                  }
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex-1">{h.title}</span>
                      <Badge variant="outline">{h.state}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {h.summary ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {h.summary}
                      </p>
                    ) : null}
                    {focused ? (
                      <p className="text-xs text-muted-foreground">
                        Opened from Today — this is the handoff Otzar named next.
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      className="h-8"
                      data-testid="handoff-acknowledge-btn"
                      disabled={busyId === h.handoff_id}
                      onClick={() => void acknowledge(h)}
                    >
                      {busyId === h.handoff_id
                        ? "Acknowledging…"
                        : "Acknowledge ownership"}
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
          {acked.map((h) => (
            <li key={h.handoff_id} data-testid="acked-handoff-card">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1">{h.title}</span>
                    <Badge variant="secondary">ACKNOWLEDGED</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-xs text-muted-foreground">
                    Ownership accepted. Complete when you&apos;ve absorbed linked
                    work (pending items are accepted for you).
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    data-testid="handoff-complete-btn"
                    disabled={busyId === h.handoff_id}
                    onClick={() => void complete(h)}
                  >
                    {busyId === h.handoff_id ? "Completing…" : "Complete handoff"}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {ackError !== null && busyId === null ? (
        <p
          className="text-xs text-destructive"
          data-testid="handoff-acknowledge-error"
        >
          {ackError}
        </p>
      ) : null}
    </section>
  );
}

// ── [COHERENCE-RECOVERY] Open obligations — deep-link from Today next-best-step
// (?obligation=<id>). Surfaces real open work so Home counts match a place to act.
function OpenObligationsLane(): JSX.Element | null {
  const [items, setItems] = useState<
    Array<{ obligation_id: string; title: string; state: string; priority?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const focusRef = useRef<HTMLLIElement | null>(null);

  const focusObligationId = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      return new URLSearchParams(window.location.search).get("obligation") ?? "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.otzar.obligations
      .list({ open_only: true, limit: 20 })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          const list =
            (r.data as { obligations?: typeof items }).obligations ?? [];
          setItems(list);
          setFailed(false);
        } else {
          setFailed(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (focusObligationId.length === 0 || loading) return;
    focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusObligationId, loading, items]);

  if (failed) return null;
  if (!loading && items.length === 0) return null;

  return (
    <section
      className="space-y-2 border-t border-border pt-4"
      data-testid="open-obligations-lane"
      aria-label="Open obligations"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span>Open work</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Obligations that still need progress — same objects Today counts.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading open work…</p>
      ) : (
        <ul className="space-y-2" data-testid="open-obligations-list">
          {items.map((o) => {
            const focused = o.obligation_id === focusObligationId;
            return (
              <li
                key={o.obligation_id}
                ref={focused ? focusRef : undefined}
                data-testid="open-obligation-card"
                data-focused={focused ? "true" : "false"}
              >
                <Card
                  className={
                    focused
                      ? "border-indigo-400/50 ring-2 ring-indigo-400/30"
                      : undefined
                  }
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex-1">{o.title}</span>
                      <Badge variant="outline">{o.state}</Badge>
                    </CardTitle>
                  </CardHeader>
                  {focused ? (
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      Opened from Today — this is the next-best step Otzar named.
                    </CardContent>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── [DECISION-EVIDENCE-LANE] proactive stale-basis surfacing ────────────────
// A completed decision's captured evidence can go stale after the fact
// (source changed / superseded / retracted / removed). This lane surfaces the
// stale ones prominently and keeps the current ones quiet — it NEVER says the
// decision was wrong. Read-only here; the evidence drawer holds the one
// explicit recheck action. Reuses the with_basis obligation list.
function DecisionEvidenceLane(): JSX.Element | null {
  const [decisions, setDecisions] = useState<ObligationWithBasis[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<ObligationWithBasis | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(() => {
    return api.otzar.obligations
      .list({ with_basis: true })
      .then((result) => {
        if (result.ok) {
          setDecisions(result.data.obligations);
          setFailed(false);
        } else {
          setFailed(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setFailed(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A recheck or new remediation changes obligation state — refresh quietly.
  useWorkStateChanged(["TASK_COMPLETED", "LEDGER_UPDATED"], () => void load());

  // On failure, stay quiet — this is an ambient safety lane, never noisy.
  if (failed) return null;

  const stale = decisions.filter((d) => d.basis_status === "stale");
  const currentCount = decisions.filter((d) => d.basis_status === "current").length;

  // Nothing recorded + nothing to review → render nothing (no empty-state noise).
  if (!loading && stale.length === 0 && currentCount === 0) return null;

  const openDrawer = (d: ObligationWithBasis): void => {
    setSelected(d);
    setDrawerOpen(true);
  };

  return (
    <section
      className="space-y-2 border-t border-border pt-4"
      data-testid="decision-evidence-lane"
      aria-label="Decision evidence"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span>Decision evidence</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Completed decisions whose supporting evidence has since changed. Reviewing
        keeps your record accurate — a change here doesn't mean the decision was
        wrong.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground" data-testid="decision-evidence-lane-loading">
          Checking your decisions…
        </p>
      ) : stale.length === 0 ? (
        <Card data-testid="decision-evidence-lane-allclear">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Decision basis remains current
            {currentCount > 0 ? ` for ${currentCount} completed ${currentCount === 1 ? "decision" : "decisions"}` : ""}.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2" data-testid="decision-evidence-lane-list">
          {stale.map((d) => {
            const severity = getBasisStatusSeverity(d.basis_status ?? "none");
            return (
              <li key={d.obligation_id}>
                <Card
                  data-testid="decision-evidence-lane-card"
                  data-basis-status={d.basis_status}
                  className={severity === "red" ? "border-destructive/40" : "border-amber-500/40"}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex-1">{d.title}</span>
                      <Badge
                        variant="outline"
                        className="text-amber-600 dark:text-amber-400"
                        data-testid="decision-evidence-lane-badge"
                      >
                        Review required
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 pt-0 text-xs text-muted-foreground">
                    <span data-testid="decision-evidence-lane-headline">
                      {getBasisStatusHeadline(d.basis_status ?? "none")}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openDrawer(d)}
                      data-testid="decision-evidence-lane-review"
                      aria-label={`Review the evidence for ${d.title}`}
                    >
                      Review evidence
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <DecisionEvidenceDrawer
        decision={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRechecked={() => void load()}
      />
    </section>
  );
}

// [SECTION-10 ORG-TRUTH REVIEW] The authorized reviewer's lane: open
// organizational-truth conflicts the server returns for THIS caller (server is
// authoritative — the lane is silent when none/unauthorized, never revealing
// existence). A governed review record, never merged into the action cards.
function OrgTruthReviewLane(): JSX.Element | null {
  const [conflicts, setConflicts] = useState<ConflictSetWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<ConflictSetWithCount | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // [COHERENCE-RECOVERY] Deep-link from Today next-best-step: ?conflict=<id>
  const focusConflictId = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      return new URLSearchParams(window.location.search).get("conflict") ?? "";
    } catch {
      return "";
    }
  }, []);

  const load = useCallback(() => {
    return api.otzar.orgTruth
      .listConflicts()
      .then((r) => {
        if (r.ok) {
          setConflicts(r.data.conflicts);
          setFailed(false);
        } else {
          setFailed(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setFailed(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useWorkStateChanged(["TASK_COMPLETED", "LEDGER_UPDATED"], () => void load());

  // Auto-open drawer when deep-linked to a specific conflict.
  useEffect(() => {
    if (focusConflictId.length === 0 || loading) return;
    const hit = conflicts.find((c) => c.conflict_set_id === focusConflictId);
    if (hit) {
      setSelected(hit);
      setDrawerOpen(true);
      return;
    }
    // Conflict may be missing from list filter — still open by id shell.
    if (focusConflictId.length > 0) {
      setSelected({
        conflict_set_id: focusConflictId,
        org_entity_id: "",
        truth_key: "",
        decision_domain: "review",
        subject_ref: null,
        state: "OPEN",
        version: 0,
        review_obligation_id: null,
        candidate_set_fingerprint: null,
        resulting_truth_record_id: null,
        resolution_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        candidate_count: 0,
      } as ConflictSetWithCount);
      setDrawerOpen(true);
    }
  }, [focusConflictId, conflicts, loading]);

  // Silent on failure/unauthorized — an ambient governance lane, never noisy.
  if (failed && focusConflictId.length === 0) return null;
  const open = conflicts.filter((c) => c.state === "OPEN" || c.state === "UNDER_REVIEW");
  if (!loading && open.length === 0 && focusConflictId.length === 0) return null;

  const openDrawer = (c: ConflictSetWithCount): void => {
    setSelected(c);
    setDrawerOpen(true);
  };

  return (
    <section
      className="space-y-2 border-t border-border pt-4"
      data-testid="org-truth-review-lane"
      aria-label="Organizational truth review"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Scale className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span>Organizational truth review</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Conflicting sources need an authorized decision on the organizational
        answer. {ORG_TRUTH_COPY.reviewerSelects}
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground" data-testid="org-truth-review-lane-loading">
          {ORG_TRUTH_COPY.loading}
        </p>
      ) : (
        <ul className="space-y-2" data-testid="org-truth-review-lane-list">
          {open.map((c) => (
            <li key={c.conflict_set_id}>
              <Card
                data-testid="org-truth-review-lane-card"
                data-conflict-state={c.state}
                className={`border-amber-500/40 ${getConflictStateSeverity(c.state) === "red" ? "border-destructive/40" : ""}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1">{humanizeOrgTruthClass(c.decision_domain)}</span>
                    <Badge variant="outline" className="text-amber-600 dark:text-amber-400" data-testid="org-truth-review-lane-badge">
                      {getConflictStateLabel(c.state)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 pt-0 text-xs text-muted-foreground">
                  <span>
                    {c.candidate_count} competing {c.candidate_count === 1 ? "source" : "sources"}
                    {c.review_obligation_id !== null ? " · review assigned" : ""}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openDrawer(c)}
                    data-testid="org-truth-review-lane-review"
                    aria-label={`Review the organizational truth conflict for ${c.decision_domain}`}
                  >
                    Review conflict
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <OrgTruthReviewDrawer
        conflict={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onResolved={() => void load()}
      />
    </section>
  );
}

function humanDecisionReason(code: string): string {
  switch (code) {
    case "no-eligible-target":
      return "No one in your organization is configured to approve this type of action yet.";
    case "approval-required-explicit-auto-approve":
      return "Your organization's policy auto-approves this type of action.";
    case "policy-forbidden":
      return "Blocked by organization policy.";
    case "observe-only-twin":
      return "Your AI Teammate is in observe mode and can't execute this yet.";
    case "org-require-human-approval":
      return "Your organization requires a human to approve this action.";
    default:
      return code;
  }
}
