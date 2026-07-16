// FILE: MyDay.tsx
// PURPOSE: Phase 1212 — "My Day" landing page. Replaces the previous
//          EmployeeHome dashboard with a calmer Warmwind-OS-inspired
//          surface that shows the operator only what matters now:
//          greeting + role + pending confirmations + recent
//          notifications + Twin status + one big "Talk to Otzar"
//          primary action.
//
//          Per [FOUNDER — WARMWIND OS REFERENCE]: this is an AI
//          Work OS landing, not a technical dashboard. Foundation
//          governance still runs underneath — every confirmation
//          surface links into the existing approval card / Action
//          Center / notification bell from Phases 1208-1211.
//
// CONNECTS TO:
//   - api.otzar.contextHealth (Phase 1205) — greeting + role
//   - api.actions.list (Phase 1211) — pending confirmations
//   - api.notifications.list (Phase 1210) — recent inbox
//   - /app/voice (Talk to Otzar)
//   - /app/action-center (View all)
//   - /app/my-twin (My Twin)
//
// PRIVACY INVARIANT:
//   - Reads ONLY the SAFE projections Foundation already returns.
//   - Never surfaces TAR / wallet / clearance / permission / payload /
//     embedding / bearer in primary UI.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Mic,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type {
  ContextHealthResponse,
  DgiCoherenceSnapshot,
  DgiNextBestStep,
  MyDayIntelligenceView,
  MyDaySuggestionReason,
  SafeActionView,
  SafeNotificationView,
} from "@/lib/types/foundation";

interface State {
  identity: ContextHealthResponse | null;
  pending: SafeActionView[];
  notifications: SafeNotificationView[];
  intelligence: MyDayIntelligenceView | null;
  dgi: DgiCoherenceSnapshot | null;
  loading: boolean;
}

// Phase 1234 — friendly copy for the closed-vocab suggestion reasons.
// Calm language only; no developer vocabulary.
const REASON_COPY: Record<MyDaySuggestionReason, string> = {
  PENDING_APPROVALS_AWAITING_YOU: "Drafts are waiting on your decision",
  AUTHORITY_GRANT_EXPIRING_SOON: "A permission you granted expires soon",
  SENSITIVE_GRANT_REQUIRES_CASE_BY_CASE:
    "A sensitive permission needs your case-by-case review",
  COLLABORATION_INBOX_NEEDS_RESPONSE: "A teammate is waiting on your reply",
  COLLABORATION_NEEDS_YOUR_APPROVAL: "A collaboration needs your approval",
  COLLABORATION_BLOCKED_NEEDS_ATTENTION: "A collaboration is blocked",
  CHAT_NEEDS_APPROVAL: "Your last chat drafted something to approve",
  CHAT_NEEDS_CLARIFICATION: "Otzar needs one clarification from you",
  CHAT_COLLABORATION_SUGGESTED: "Otzar suggested looping in a teammate",
  PROJECT_ACTIVITY_RESUMING: "A project of yours is picking back up",
  TEACH_YOUR_TWIN_PREFERENCES: "Teach Otzar how you like things done",
  REVIEW_RECENT_ACTIONS: "Recent activity is ready for a quick review",
};

// Where each suggestion's "Open" affordance lands.
const REASON_LINK: Record<MyDaySuggestionReason, string> = {
  PENDING_APPROVALS_AWAITING_YOU: "/app/action-center",
  AUTHORITY_GRANT_EXPIRING_SOON: "/app/authority-grants",
  SENSITIVE_GRANT_REQUIRES_CASE_BY_CASE: "/app/authority-grants",
  COLLABORATION_INBOX_NEEDS_RESPONSE: "/app/collaboration",
  COLLABORATION_NEEDS_YOUR_APPROVAL: "/app/collaboration",
  COLLABORATION_BLOCKED_NEEDS_ATTENTION: "/app/collaboration",
  CHAT_NEEDS_APPROVAL: "/app/action-center",
  CHAT_NEEDS_CLARIFICATION: "/app/chat",
  CHAT_COLLABORATION_SUGGESTED: "/app/collaboration",
  PROJECT_ACTIVITY_RESUMING: "/app/work-projects",
  TEACH_YOUR_TWIN_PREFERENCES: "/app/my-twin",
  REVIEW_RECENT_ACTIONS: "/app/action-center",
};

function friendlyActionType(action_type: string): string {
  switch (action_type) {
    case "SEND_INTERNAL_NOTIFICATION":
      return "Internal note";
    case "INVOKE_CONNECTOR":
      return "Connected tool call";
    case "RECORD_CAPSULE":
      return "Memory record";
    default:
      return action_type
        .split("_")
        .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
        .join(" ");
  }
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const delta = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function humanizeTitle(title: string): string {
  switch (title.toUpperCase()) {
    case "FOUNDER":
      return "Founder & CEO";
    case "TECH LEAD":
      return "Tech Lead";
    case "AI UI ENGINEER":
      return "AI UI Engineer";
    case "AI/NLP ENGINEER":
      return "AI/NLP Engineer";
    case "GO-TO-MARKET LEAD":
      return "Go-to-Market Lead";
    case "PRODUCT LEAD":
      return "Product Lead";
    case "RISK & COMPLIANCE LEAD":
      return "Risk & Compliance Lead";
    case "MEDIA LEAD":
      return "Media Lead";
    case "MEMBER":
      return "team member";
    default:
      return title;
  }
}

export function MyDay(): JSX.Element {
  const [state, setState] = useState<State>({
    identity: null,
    pending: [],
    notifications: [],
    intelligence: null,
    dgi: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    Promise.all([
      api.otzar.contextHealth(),
      api.actions.list({ status: "PROPOSED", page_size: 5 }),
      api.notifications.list({ unread_only: true, page_size: 5 }),
      // Phase 1234 — non-blocking: when this fails the card simply
      // does not render; the rest of My Day works unchanged.
      api.otzar.myDayIntelligence(),
      // Same DGI authority Today uses — single next-step story.
      api.otzar.dgiCoherence(),
    ]).then(
      ([healthResult, actionsResult, notifsResult, intelResult, dgiResult]) => {
        if (cancelled) return;
        setState({
          identity: healthResult.ok ? healthResult.data : null,
          pending: actionsResult.ok ? actionsResult.data.items : [],
          notifications: notifsResult.ok
            ? notifsResult.data.notifications
            : [],
          intelligence: intelResult.ok ? intelResult.data.intelligence : null,
          dgi: dgiResult.ok ? dgiResult.data.coherence : null,
          loading: false,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = state.identity?.identity.viewer.display_name ?? "there";
  const title = state.identity?.identity.viewer.title ?? null;
  const orgName = state.identity?.identity.org.name ?? null;
  const twinName = state.identity?.identity.twin.display_name ?? null;
  const twinActive = state.identity?.identity.twin.active === true;

  return (
    <div className="space-y-6" data-testid="my-day-page">
      <PageHeader
        title={
          state.loading
            ? "Loading your day…"
            : `${greeting()}, ${displayName}`
        }
        description={
          state.loading
            ? "Otzar is preparing your workspace."
            : "Here's what needs your attention today."
        }
      />

      {!state.loading && title !== null ? (
        <div
          className="flex flex-wrap items-center gap-2 text-xs"
          data-testid="my-day-role-chip"
        >
          <Badge variant="outline">{humanizeTitle(title)}</Badge>
          {orgName !== null ? <Badge variant="outline">{orgName}</Badge> : null}
          {twinName !== null && twinActive ? (
            <Badge variant="outline" className="gap-1">
              <Bot className="h-3 w-3" aria-hidden /> Twin: {twinName}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {/* Primary action: Talk to Otzar */}
      <Card
        className="border-primary/30 bg-primary/5"
        data-testid="my-day-talk-cta"
      >
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-sm font-medium">Talk to Otzar</p>
            <p className="text-xs text-muted-foreground">
              Ask, draft, decide. Voice or text. Nothing leaves without your
              approval.
            </p>
          </div>
          <Button asChild>
            <Link to="/app/voice">
              <Mic className="mr-1 h-4 w-4" aria-hidden />
              Start
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* What needs attention — DGI next-best-step first (same authority as
          Today ambient), then My Day intelligence suggestions. One story. */}
      {!state.loading &&
      (state.dgi !== null || state.intelligence !== null) ? (
        <Card
          data-testid="my-day-intelligence"
          data-provider-status={
            state.intelligence?.provider_status ?? "DGI_ONLY"
          }
          data-dgi-status={state.dgi?.coherence_status ?? "unknown"}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" aria-hidden /> What needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {(() => {
              const step: DgiNextBestStep | null | undefined =
                state.dgi?.next_best_step &&
                state.dgi.next_best_step.kind !== "IDLE_HEALTHY"
                  ? state.dgi.next_best_step
                  : null;
              const headline =
                step?.reason ??
                state.intelligence?.headline ??
                "Nothing urgent on your governed record.";
              return (
                <p
                  className="text-muted-foreground"
                  data-testid="my-day-intelligence-headline"
                  data-source={step ? "dgi" : "my-day"}
                >
                  {headline}
                </p>
              );
            })()}
            {state.dgi?.next_best_step &&
            state.dgi.next_best_step.kind !== "IDLE_HEALTHY" ? (
              <div
                className="flex items-center justify-between gap-2 rounded border border-violet-400/30 bg-violet-500/5 p-2"
                data-testid="my-day-dgi-next-step"
                data-kind={state.dgi.next_best_step.kind}
              >
                <div>
                  <p className="font-medium text-foreground">
                    {state.dgi.next_best_step.safe_title}
                  </p>
                  <p className="text-muted-foreground">
                    From organizational intelligence — same next step as Today.
                  </p>
                </div>
                <Button asChild variant="default" size="sm">
                  <Link
                    to={
                      state.dgi.next_best_step.route_hint || "/app/action-center"
                    }
                  >
                    Open{" "}
                    <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                  </Link>
                </Button>
              </div>
            ) : null}
            {state.intelligence !== null &&
            state.intelligence.suggestions.length > 0 ? (
              <ul
                className="space-y-1"
                data-testid="my-day-intelligence-list"
              >
                {state.intelligence.suggestions.slice(0, 3).map((s) => (
                  <li
                    key={`${s.rank}-${s.reason}`}
                    data-testid="my-day-intelligence-item"
                    className="flex items-center justify-between gap-2 rounded border bg-card p-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {s.safe_title}
                      </p>
                      <p className="text-muted-foreground">
                        {REASON_COPY[s.reason]}
                        {s.risk === "APPROVAL_REQUIRED"
                          ? " — ready for your approval."
                          : s.risk === "PROJECT_BLOCKER"
                            ? " — currently blocking progress."
                            : ""}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={REASON_LINK[s.reason]}>
                        Open{" "}
                        <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            {state.intelligence !== null &&
            state.intelligence.waiting_on_external.they_owe_us_count > 0 ? (
              <p
                className="text-muted-foreground"
                data-testid="my-day-intelligence-external"
              >
                Waiting on{" "}
                {state.intelligence.waiting_on_external.they_owe_us_count}{" "}
                {state.intelligence.waiting_on_external.they_owe_us_count === 1
                  ? "item"
                  : "items"}{" "}
                from outside your organization.{" "}
                <Link
                  to="/app/collaboration-workspaces"
                  className="underline-offset-2 hover:underline"
                >
                  See who →
                </Link>
              </p>
            ) : null}
            <p className="text-[10px] text-muted-foreground">
              {state.dgi !== null
                ? "Organizational next step from governed intelligence; suggestions ranked by Otzar."
                : state.intelligence?.provider_status === "PYTHON_CONFIGURED"
                  ? "Ranked by Otzar's intelligence service."
                  : "Ranked by Otzar's built-in assistant."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Pending confirmations */}
      <Card data-testid="my-day-pending">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" aria-hidden /> Needs your decision
            <Badge variant="outline">{state.pending.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {state.pending.length === 0 ? (
            <p
              className="text-muted-foreground"
              data-testid="my-day-pending-empty"
            >
              Nothing waiting on you. Otzar will surface decisions here when
              they come up.
            </p>
          ) : (
            <ul className="space-y-1" data-testid="my-day-pending-list">
              {state.pending.map((a) => (
                <li
                  key={a.action_id}
                  data-testid="my-day-pending-item"
                  data-action-id={a.action_id}
                  className="flex items-center justify-between gap-2 rounded border bg-card p-2"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {friendlyActionType(a.action_type)}
                    </p>
                    <p className="text-muted-foreground">
                      Drafted {formatRelative(a.created_at)}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/app/action-center">
                      Review <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end pt-1">
            <Link
              to="/app/action-center"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              View Action Center →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent notifications */}
      <Card data-testid="my-day-inbox">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4" aria-hidden /> Recent notes for you
            <Badge variant="outline">{state.notifications.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {state.notifications.length === 0 ? (
            <p
              className="text-muted-foreground"
              data-testid="my-day-inbox-empty"
            >
              You're all caught up — no unread notes.
            </p>
          ) : (
            <ul className="space-y-1" data-testid="my-day-inbox-list">
              {state.notifications.map((n) => (
                <li
                  key={n.notification_id}
                  data-testid="my-day-inbox-item"
                  data-notification-id={n.notification_id}
                  className="rounded border bg-amber-500/5 p-2"
                >
                  <p className="line-clamp-2 text-foreground">{n.body_summary}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatRelative(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Org pulse: lightweight */}
      {!state.loading && state.identity !== null ? (
        <Card data-testid="my-day-org-pulse">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" aria-hidden /> At a glance
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Stat
              label="Memory summaries"
              value={state.identity.identity.context_signals.memory_capsules_count}
            />
            <Stat
              label="Transcript summaries"
              value={
                state.identity.identity.context_signals.transcript_summaries_count
              }
            />
            <Stat
              label="Collabs inbound"
              value={
                state.identity.identity.context_signals.collaboration_inbound_count
              }
            />
            <Stat
              label="Collabs outbound"
              value={
                state.identity.identity.context_signals.collaboration_outbound_count
              }
            />
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground">
        <CheckCircle2 className="mr-1 inline h-3 w-3" aria-hidden />
        Everything Otzar does for you is governed by your organization's policy
        and recorded in the audit trail.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}): JSX.Element {
  return (
    <div className="rounded border bg-card p-2">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}
