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

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, Slash, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
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

function friendlyActionType(action_type: string): string {
  switch (action_type) {
    case "SEND_INTERNAL_NOTIFICATION":
      return "Internal note";
    case "INVOKE_CONNECTOR":
      return "Connected tool call";
    case "RECORD_CAPSULE":
      return "Memory record";
    case "PROPOSE_PERMISSION_GRANT":
      return "Permission grant request";
    default:
      return action_type
        .split("_")
        .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
        .join(" ");
  }
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.actions
      .list({ page_size: 50 })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setItems(result.data.items);
          setError(null);
        } else {
          setError(result.code);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("NETWORK_ERROR");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
            return (
              <li key={a.action_id}>
                <Card
                  data-testid="action-center-card"
                  data-action-id={a.action_id}
                  data-action-status={a.status}
                  data-action-type={a.action_type}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-sm">
                      <span>{friendlyActionType(a.action_type)}</span>
                      <Badge variant={t === "blocked" ? "destructive" : "outline"}>
                        {friendlyStatus(a.status)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0 text-xs text-muted-foreground">
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
