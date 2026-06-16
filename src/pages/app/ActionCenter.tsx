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
import { viewWhyFromAction, actionTypeLabel } from "@/lib/work-os/view-why";
import { api } from "@/lib/api";
import { getActionDetails } from "@/lib/work-os/action-details-store";
import type { SafeActionView } from "@/lib/types/foundation";

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
      return "Blocked by policy";
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
    } else {
      setDecisionError(r.code);
    }
  }

  const current = grouped[tab];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Action Center"
        description="Decisions Otzar is making on your behalf. Confirm what matters, see what's done, learn what was blocked — and why."
      />

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Action lifecycle tabs"
        className="flex flex-wrap gap-2 border-b border-border"
      >
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => {
          const count = grouped[t].length;
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
                      <span>
                        {details?.recipientLabel !== undefined
                          ? `${friendlyActionType(a.action_type)} → ${details.recipientLabel}`
                          : friendlyActionType(a.action_type)}
                      </span>
                      <div className="flex items-center gap-2">
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
                                body: `${friendlyActionType(a.action_type)} — ${friendlyRisk(a.risk_tier).toLowerCase()}.`,
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
                    {/* Phase 1269 — full human-readable detail, available
                        for EVERY status (incl. approved/executed) so an
                        action is always inspectable, never a generic
                        "internal note". */}
                    {details !== null ? (
                      <div
                        className="rounded border border-border bg-muted/30 p-1.5 space-y-0.5"
                        data-testid="action-detail"
                      >
                        {details.recipientLabel !== undefined ? (
                          <div>
                            <span className="font-medium text-foreground">
                              Recipient:
                            </span>{" "}
                            {details.recipientLabel}
                            {details.channel !== undefined
                              ? ` · ${details.channel}`
                              : ""}
                          </div>
                        ) : null}
                        <div data-testid="action-detail-body">
                          <span className="font-medium text-foreground">
                            Message:
                          </span>{" "}
                          <span className="whitespace-pre-wrap break-words">
                            {details.body}
                          </span>
                        </div>
                        {details.sourceCommand !== undefined ? (
                          <div className="text-[10px] opacity-70 break-words">
                            From: “{details.sourceCommand}”
                          </div>
                        ) : null}
                      </div>
                    ) : null}
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
                    {/* Phase 1268 — real governed decision controls. A
                        pending action with a linked escalation can be
                        approved/rejected here (api.escalations). */}
                    {t === "pending" &&
                    a.escalation_id !== undefined &&
                    a.escalation_id.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          className="h-6 px-2 text-[11px]"
                          data-testid="action-approve"
                          disabled={busyId === a.escalation_id}
                          onClick={() =>
                            void decide(a.escalation_id as string, "approve")
                          }
                        >
                          {busyId === a.escalation_id ? "Approving…" : "Approve"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px]"
                          data-testid="action-reject"
                          disabled={busyId === a.escalation_id}
                          onClick={() =>
                            void decide(a.escalation_id as string, "reject")
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    ) : t === "pending" ? (
                      <p className="pt-1 text-[11px]">
                        Otzar is routing this through your organization's
                        approval policy.
                      </p>
                    ) : null}
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
