// FILE: ActionCenter.tsx
// PURPOSE: Phase 1211 — Action Center page. Lists the viewer's own
//          Action rows (source_entity_id = caller) in human terms
//          per [FOUNDER — WARMWIND OS REFERENCE]. Reads
//          api.actions.list() (GET /api/v1/actions, self-scoped at
//          Foundation tier).
//
//          The page surfaces the decisions Otzar has on behalf of
//          the operator -- what's pending, what was approved, what
//          succeeded, what was blocked. NO inline Approve/Deny in
//          this slice (that arrives with the "AI breakdown" /
//          Action Center detail drawer in a follow-on); the focus
//          here is making the lifecycle visible.
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
import { CheckCircle2, Clock, AlertTriangle, Slash, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIBreakdownButton } from "@/components/otzar/AIBreakdownButton";
import { ViewWhyPanel } from "@/components/work-os/ViewWhyPanel";
import {
  viewWhyFromAction,
  actionTypeLabel,
  actionExecutability,
  actionTargetLabel,
} from "@/lib/work-os/view-why";
import { api } from "@/lib/api";
import { getActionDetails } from "@/lib/work-os/action-details-store";
import type { ActionDetails } from "@/lib/work-os/action-details-store";
import type { SafeActionView } from "@/lib/types/foundation";
import { isActionablePending, actionClassLabel } from "@/lib/work-os/action-classify";
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
    <div className="space-y-6">
      <PageHeader
        title="Action Center"
        description="Decisions Otzar is making on your behalf. Confirm what matters, see what's done, and learn what was blocked and why."
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
    </div>
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
      return "Twin is set to observe mode; cannot execute.";
    case "org-require-human-approval":
      return "Your organization requires a human to approve this action.";
    default:
      return code;
  }
}
