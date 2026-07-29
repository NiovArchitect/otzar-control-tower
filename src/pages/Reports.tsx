// FILE: Reports.tsx
// PURPOSE: Slice 5 — executive, project, team, application-review, and
//          AI-Teammate report types. Daily executive brief schedule +
//          run-now is live inside Otzar (no email/Slack claims).
// CONNECTS TO: security-audit, setup, action-center, team-work,
//              /otzar/reports/executive-brief/*.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  ShieldCheck,
  CalendarClock,
  Users,
  Bot,
  Play,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const REPORT_TYPES: Array<{
  id: string;
  title: string;
  body: string;
  to: string;
  status: "available" | "live_surface" | "scheduled_later";
  source: string;
}> = [
  {
    id: "executive",
    title: "Executive readiness",
    body: "What is ready, blocked, or waiting — for organization judgment, not vanity activity.",
    to: "/setup",
    status: "available",
    source: "Organization setup + production readiness",
  },
  {
    id: "heliogrid",
    title: "HelioGrid review board",
    body: "Recommendation, evidence, work, AI collabs, risk, and proof for the active review.",
    to: "/app/heliogrid-report",
    status: "live_surface",
    source: "Governed work + collaboration receipts",
  },
  {
    id: "compliance",
    title: "Regulator & compliance packages",
    body: "Purpose-bound, redacted, revocable views for a regulator. Create, share, revoke with audit.",
    to: "/security-audit",
    status: "available",
    source: "Security & audit share packages",
  },
  {
    id: "activity",
    title: "Governed activity record",
    body: "Who did what, with outcome — technical proof on demand.",
    to: "/security-audit",
    status: "available",
    source: "Append-only audit chain",
  },
  {
    id: "team",
    title: "Team movement",
    body: "What the team owns, blocks, and waits on — for managers with real reporting lines.",
    to: "/app/team-work",
    status: "live_surface",
    source: "Work Ledger team-work (manager-gated)",
  },
  {
    id: "judgment",
    title: "Needs human judgment",
    body: "Sensitive actions and approvals waiting on a person.",
    to: "/app/action-center",
    status: "live_surface",
    source: "Action Center / approvals queue",
  },
  {
    id: "ai_teammates",
    title: "AI Teammate contribution",
    body: "Who has a teammate, readiness, and where policy limits automation.",
    to: "/ai-teammates",
    status: "live_surface",
    source: "AI Teammates admin list",
  },
];

interface BriefSchedule {
  schedule_id: string;
  report_type: string;
  cadence: string;
  recipient_entity_id: string;
  audience: string;
  delivery: string;
  created_at: string;
  last_run_at: string | null;
  last_delivery_id: string | null;
  active: boolean;
}

interface BriefBody {
  current_outcome: string;
  what_changed: string;
  material_risk: string;
  human_decision: string;
  work_otzar_handled: string;
  relevant_proof: string[];
}

interface BriefDelivery {
  notification_id: string;
  created_at: string;
  body_summary: string;
  brief: BriefBody | null;
}

function asSchedule(raw: Record<string, unknown> | undefined): BriefSchedule | null {
  if (raw === undefined) return null;
  if (typeof raw.schedule_id !== "string") return null;
  return {
    schedule_id: raw.schedule_id,
    report_type: String(raw.report_type ?? "daily_executive_brief"),
    cadence: String(raw.cadence ?? "daily"),
    recipient_entity_id: String(raw.recipient_entity_id ?? ""),
    audience: String(raw.audience ?? "organization_lead"),
    delivery: String(raw.delivery ?? "inside_otzar"),
    created_at: String(raw.created_at ?? ""),
    last_run_at:
      typeof raw.last_run_at === "string" ? raw.last_run_at : null,
    last_delivery_id:
      typeof raw.last_delivery_id === "string" ? raw.last_delivery_id : null,
    active: raw.active !== false,
  };
}

function asDelivery(raw: Record<string, unknown>): BriefDelivery {
  const briefRaw =
    raw.brief !== null && typeof raw.brief === "object"
      ? (raw.brief as Record<string, unknown>)
      : null;
  return {
    notification_id: String(raw.notification_id ?? ""),
    created_at: String(raw.created_at ?? ""),
    body_summary: String(raw.body_summary ?? ""),
    brief:
      briefRaw === null
        ? null
        : {
            current_outcome: String(briefRaw.current_outcome ?? ""),
            what_changed: String(briefRaw.what_changed ?? ""),
            material_risk: String(briefRaw.material_risk ?? ""),
            human_decision: String(briefRaw.human_decision ?? ""),
            work_otzar_handled: String(briefRaw.work_otzar_handled ?? ""),
            relevant_proof: Array.isArray(briefRaw.relevant_proof)
              ? briefRaw.relevant_proof.map(String)
              : [],
          },
  };
}

export default function Reports(): JSX.Element {
  const [schedule, setSchedule] = useState<BriefSchedule | null>(null);
  const [deliveries, setDeliveries] = useState<BriefDelivery[]>([]);
  const [busy, setBusy] = useState<"idle" | "schedule" | "run">("idle");
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [schedRes, delRes] = await Promise.all([
      api.otzar.listExecutiveBriefSchedules(),
      api.otzar.listExecutiveBriefDeliveries(),
    ]);
    if (schedRes.ok) {
      const list = (schedRes.data.schedules ?? []) as Array<
        Record<string, unknown>
      >;
      setSchedule(asSchedule(list[0]));
    }
    if (delRes.ok) {
      const list = (delRes.data.deliveries ?? []) as Array<
        Record<string, unknown>
      >;
      setDeliveries(list.map(asDelivery));
    }
    if (!schedRes.ok && !delRes.ok) {
      setError(schedRes.message || delRes.message || "Could not load brief");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreateSchedule(): Promise<void> {
    setBusy("schedule");
    setError(null);
    setStatusNote(null);
    const res = await api.otzar.createExecutiveBriefSchedule();
    if (!res.ok) {
      setError(res.message);
      setBusy("idle");
      return;
    }
    setSchedule(asSchedule(res.data.schedule as Record<string, unknown>));
    setStatusNote("Daily executive brief schedule is active inside Otzar.");
    await refresh();
    setBusy("idle");
  }

  async function handleRunNow(forceRetry = false): Promise<void> {
    if (schedule === null) return;
    setBusy("run");
    setError(null);
    setStatusNote(null);
    const res = await api.otzar.runExecutiveBriefNow({
      schedule_id: schedule.schedule_id,
      force_retry: forceRetry,
    });
    if (!res.ok) {
      if (res.code === "DUPLICATE_DELIVERY" || res.status === 409) {
        setStatusNote(
          "Already delivered for this UTC day — duplicate blocked. Use retry only if a failed run needs re-delivery.",
        );
      } else {
        setError(res.message);
      }
      await refresh();
      setBusy("idle");
      return;
    }
    const outcome = String(
      (res.data.brief as Record<string, unknown> | undefined)
        ?.current_outcome ?? "",
    );
    setStatusNote(
      outcome.length > 0
        ? `Brief delivered inside Otzar: ${outcome.slice(0, 100)}`
        : "Brief delivered inside Otzar.",
    );
    await refresh();
    setBusy("idle");
  }

  const latest = deliveries[0] ?? null;

  return (
    <div className="space-y-5" data-testid="reports-page" data-slice5-reports="true">
      <PageHeader
        title="Reports"
        description="Outcome reports for your organization. Every report is org-scoped, permission-aware, and never sent silently outside Otzar unless you connect a channel later."
      />

      <Card data-testid="executive-brief-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4" aria-hidden /> Daily executive
            brief
            <Badge variant="outline" className="text-[9px]">
              Inside Otzar
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p className="text-muted-foreground" data-testid="executive-brief-blurb">
            Organization lead audience. Content is built from current work,
            risk, human decisions, AI-handled collaboration, and proof — not a
            static template. Delivery is an in-Otzar notification only (no email
            or Slack claim).
          </p>
          {schedule === null ? (
            <Button
              size="sm"
              disabled={busy !== "idle"}
              onClick={() => void handleCreateSchedule()}
              data-testid="executive-brief-create-schedule"
            >
              {busy === "schedule" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Create daily schedule
            </Button>
          ) : (
            <div className="space-y-2" data-testid="executive-brief-schedule-active">
              <p>
                <span className="font-medium text-foreground">Scheduled</span>
                {" · "}
                daily · recipient is you · delivery inside Otzar
              </p>
              <p className="text-[10px] text-muted-foreground">
                Schedule id {schedule.schedule_id.slice(0, 8)}… · last run{" "}
                {schedule.last_run_at
                  ? new Date(schedule.last_run_at).toLocaleString()
                  : "never"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy !== "idle"}
                  onClick={() => void handleRunNow(false)}
                  data-testid="executive-brief-run-now"
                >
                  {busy === "run" ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="mr-1 h-3.5 w-3.5" aria-hidden />
                  )}
                  Run now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== "idle"}
                  onClick={() => void handleRunNow(true)}
                  data-testid="executive-brief-retry"
                >
                  Retry failed run
                </Button>
              </div>
            </div>
          )}
          {statusNote !== null ? (
            <p
              className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-[11px]"
              data-testid="executive-brief-status"
            >
              {statusNote}
            </p>
          ) : null}
          {error !== null ? (
            <p
              className="text-[11px] text-destructive"
              data-testid="executive-brief-error"
            >
              {error}
            </p>
          ) : null}
          {latest?.brief !== null && latest?.brief !== undefined ? (
            <div
              className="space-y-1 rounded-xl border border-border/70 p-3"
              data-testid="executive-brief-latest"
            >
              <p className="font-medium text-foreground">Latest delivery</p>
              <p>
                <span className="text-muted-foreground">Outcome:</span>{" "}
                {latest.brief.current_outcome}
              </p>
              <p>
                <span className="text-muted-foreground">Changed:</span>{" "}
                {latest.brief.what_changed}
              </p>
              <p>
                <span className="text-muted-foreground">Risk:</span>{" "}
                {latest.brief.material_risk}
              </p>
              <p>
                <span className="text-muted-foreground">Human decision:</span>{" "}
                {latest.brief.human_decision}
              </p>
              <p>
                <span className="text-muted-foreground">Otzar handled:</span>{" "}
                {latest.brief.work_otzar_handled}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Proof: {latest.brief.relevant_proof.join(" · ")}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground" data-testid="executive-brief-empty">
              No brief delivered yet. Create a schedule and run now.
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="reports-available-now">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Report types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {REPORT_TYPES.map((r) => (
            <Link
              key={r.id}
              to={r.to}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/70 p-3 hover:border-primary/40"
              data-testid="report-type-row"
              data-report={r.id}
            >
              <span>
                <span className="font-medium text-foreground">{r.title}</span>
                {" — "}
                {r.body}
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  Source: {r.source}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Badge variant="outline" className="text-[9px]">
                  {r.status === "available"
                    ? "Available"
                    : r.status === "live_surface"
                      ? "Live view"
                      : "Later"}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="reports-coming">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4" aria-hidden /> Delivery honesty
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p data-testid="scheduled-reports-honesty">
            Daily executive brief runs inside Otzar with duplicate protection
            per UTC day. Email and Slack delivery are not claimed here.
          </p>
          <p className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Duplicate automatic deliveries for the same day are blocked.
          </p>
          <p className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Team reports require real manager reporting lines.
          </p>
          <p className="flex items-center gap-1">
            <Bot className="h-3.5 w-3.5" aria-hidden />
            AI Teammate reports never expose prompts, models, or tokens.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
