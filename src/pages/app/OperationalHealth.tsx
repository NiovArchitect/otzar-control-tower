// FILE: OperationalHealth.tsx
// PURPOSE: Phase 1286-A — surface the advisory execution-health intelligence from
//          Phase 1285-Z (GET /work-os/operational-health) and the advisory risk
//          scoring from Phase 1285-X (GET /work-os/risk/assessment) inside
//          Control Tower. DETERMINISTIC numbers (health_score, execution_status,
//          counts) are PRIMARY and always shown; the Python narrative is labeled
//          advisory and only trusted when the envelope is FOUNDATION_VALIDATED.
//          When Python is down the deterministic health still renders with an
//          honest status. Deterministic Blind Spots / Watchers remain primary —
//          this page links to them and never replaces them. No raw UUID labels.
// CONNECTS TO: api.workOs.operationalHealth + api.workOs.riskAssessment,
//          entityLabel, work-state events, route /app/operational-health.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type {
  OperationalHealthAssessment,
  PythonAdvisoryEnvelope,
  RiskAssessedFinding,
} from "@/lib/types/foundation";
import { entityLabel } from "@/lib/identity/canonical-entity";
import { useWorkStateChanged } from "@/lib/events/work-state";

const STATUS_CLASS: Record<string, string> = {
  HEALTHY: "border-emerald-500/60 text-emerald-600",
  WATCH: "border-amber-400/60 text-amber-600",
  AT_RISK: "border-amber-500/70 text-amber-700",
  CRITICAL: "border-rose-500/60 text-rose-600",
};

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "border-rose-500/60 text-rose-600",
  HIGH: "border-amber-500/60 text-amber-600",
  MEDIUM: "border-amber-400/50 text-amber-600",
  LOW: "border-border text-muted-foreground",
};

// WHAT: is the advisory narrative genuinely Python-validated?
// WHY: only then do we label it "Advisory (Python)". Otherwise the deterministic
//      Foundation narrative is what is on screen — we say so honestly.
function isPythonValidated(env: PythonAdvisoryEnvelope | undefined, provenance: string): boolean {
  return env?.authority === "FOUNDATION_VALIDATED" && provenance.startsWith("python:");
}

function StatChip({ label, value, tone }: { label: string; value: number; tone?: string }): JSX.Element {
  return (
    <div className="rounded-md border border-border bg-background/70 p-2" data-testid="ops-stat" data-stat={label}>
      <div className={`text-base font-semibold ${tone ?? "text-foreground"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ProvenanceLine({ env, provenance, advisory }: { env: PythonAdvisoryEnvelope | undefined; provenance: string; advisory: boolean }): JSX.Element {
  return (
    <p className="text-[10px] text-muted-foreground" data-testid="ops-provenance">
      {advisory ? "Advisory analysis by Python, validated by Foundation." : "Deterministic Foundation analysis."}
      {env ? ` Source ${provenance}; analysis ${env.status.toLowerCase()}.` : ""}
      {env?.latency_ms != null ? ` (${env.latency_ms}ms)` : ""}
    </p>
  );
}

function RiskCard({ finding }: { finding: RiskAssessedFinding }): JSX.Element {
  const [open, setOpen] = useState(false);
  const r = finding.risk_assessment;
  const owner = finding.owner !== null ? entityLabel(finding.owner.display_name) : null;
  const related = finding.related_person !== null ? entityLabel(finding.related_person.display_name) : null;
  return (
    <div className="rounded-md border border-border bg-background/70 p-2 text-xs" data-testid="ops-risk-card" data-watcher-type={finding.watcher_type}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-foreground">{finding.title}</div>
          <div className="text-[11px] text-muted-foreground">{finding.summary}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline" className="text-[9px] text-muted-foreground" data-testid="ops-risk-score">
            risk {r.risk_score}
          </Badge>
          <Badge variant="outline" className={`text-[9px] ${SEVERITY_CLASS[r.severity] ?? ""}`} data-testid="ops-risk-severity">
            {r.severity.toLowerCase()}
          </Badge>
          <button
            type="button"
            className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
            data-testid="ops-risk-why"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide" : "Why"}
          </button>
        </div>
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {owner !== null ? `Owner: ${owner}` : ""}
        {related !== null && related !== owner ? `${owner !== null ? " · " : ""}With ${related}` : ""}
      </div>
      <div className="mt-0.5 text-[11px]" data-testid="ops-risk-next">
        <span className="text-muted-foreground">Suggested:</span> {r.suggested_next_action}
      </div>
      {open ? (
        <div className="mt-1 rounded bg-muted/40 p-1.5 text-[11px] text-muted-foreground" data-testid="ops-risk-detail">
          <div>{r.reason}</div>
          {r.contributing_signals.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1" data-testid="ops-risk-signals">
              {r.contributing_signals.map((s) => (
                <Badge key={s} variant="outline" className="text-[9px] text-muted-foreground">
                  {s.toLowerCase().replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-1 text-[10px]">
            {r.provenance.startsWith("python:") ? "Advisory (Python)" : "Deterministic (Foundation)"}
            {r.human_review_needed ? " · needs review" : ""}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function List({ title, items, testid }: { title: string; items: string[]; testid: string }): JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1" data-testid={testid}>
      <h3 className="text-[11px] font-semibold text-muted-foreground">{title}</h3>
      <ul className="space-y-0.5">
        {items.map((it, i) => (
          <li key={`${testid}-${i}`} className="text-[11px] text-foreground">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OperationalHealth(): JSX.Element {
  const [health, setHealth] = useState<OperationalHealthAssessment | null>(null);
  const [healthEnv, setHealthEnv] = useState<PythonAdvisoryEnvelope | undefined>(undefined);
  const [risks, setRisks] = useState<RiskAssessedFinding[] | null>(null);
  const [failed, setFailed] = useState(false);

  async function load(): Promise<void> {
    const [h, r] = await Promise.all([api.workOs.operationalHealth(), api.workOs.riskAssessment()]);
    if (h.ok && h.data.health) {
      setHealth(h.data.health);
      setHealthEnv(h.data.envelope);
    } else {
      setFailed(true);
    }
    setRisks(r.ok ? (r.data.findings ?? []) : []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [h, r] = await Promise.all([api.workOs.operationalHealth(), api.workOs.riskAssessment()]);
      if (cancelled) return;
      if (h.ok && h.data.health) {
        setHealth(h.data.health);
        setHealthEnv(h.data.envelope);
      } else {
        setFailed(true);
      }
      setRisks(r.ok ? (r.data.findings ?? []) : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Health changes when work changes — refresh ambiently.
  useWorkStateChanged(
    ["LEDGER_UPDATED", "TASK_COMPLETED", "WAITING_ON_CHANGED", "SIGNAL_TRACKED", "THREAD_UPDATED"],
    () => void load(),
  );

  const loading = health === null && risks === null && !failed;

  if (failed && health === null) {
    return (
      <div className="space-y-4" data-testid="operational-health-page">
        <h1 className="text-lg font-semibold">Operational Health</h1>
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400" data-testid="operational-health-error">
          Couldn't load operational health right now. Refresh to try again.
        </div>
      </div>
    );
  }

  const advisory = health !== null && isPythonValidated(healthEnv, health.provenance);
  const riskList = risks ?? [];

  return (
    <div className="space-y-4" data-testid="operational-health-page">
      <div>
        <h1 className="text-lg font-semibold">Operational Health</h1>
        <p className="text-xs text-muted-foreground">
          A governed read of your execution health from durable work. The score and counts are
          deterministic; the narrative is advisory and labeled as such.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground" data-testid="operational-health-loading">
          Reading your execution health…
        </p>
      ) : health !== null ? (
        <>
          {/* Deterministic header — PRIMARY. */}
          <div className="rounded-md border border-border bg-background/70 p-3" data-testid="ops-health-header">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold text-foreground" data-testid="ops-health-score">
                  {health.health_score}
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {health.scope} scope · deterministic health score
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${STATUS_CLASS[health.execution_status] ?? ""}`}
                data-testid="ops-execution-status"
              >
                {health.execution_status.replace(/_/g, " ").toLowerCase()}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              <StatChip label="total work" value={health.total_work} />
              <StatChip label="overdue" value={health.overdue_count} tone={health.overdue_count > 0 ? "text-amber-600" : "text-foreground"} />
              <StatChip label="blocked" value={health.blocked_count} tone={health.blocked_count > 0 ? "text-rose-600" : "text-foreground"} />
              <StatChip label="waiting on" value={health.waiting_on_count} />
              <StatChip label="no next action" value={health.no_next_action_count} />
              <StatChip label="high risk" value={health.high_risk_count} tone={health.high_risk_count > 0 ? "text-amber-600" : "text-foreground"} />
              <StatChip label="critical risk" value={health.critical_risk_count} tone={health.critical_risk_count > 0 ? "text-rose-600" : "text-foreground"} />
              <StatChip label="stale" value={health.stale_work_count} />
              <StatChip label="completed 7d" value={health.recent_completed_count} tone="text-emerald-600" />
              <StatChip label="failed 7d" value={health.recent_failed_count} tone={health.recent_failed_count > 0 ? "text-rose-600" : "text-foreground"} />
            </div>
          </div>

          {/* Narrative — advisory when Python-validated, else deterministic. */}
          <div className="rounded-md border border-border bg-background/70 p-3 space-y-2" data-testid="ops-narrative">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Summary</h2>
              <Badge variant="outline" className="text-[9px] text-muted-foreground" data-testid="ops-narrative-label">
                {advisory ? "Advisory (Python)" : "Foundation (deterministic)"}
              </Badge>
            </div>
            <p className="text-xs text-foreground" data-testid="ops-summary">
              {health.summary}
            </p>
            {health.human_review_needed ? (
              <Badge variant="outline" className="text-[9px] border-amber-500/60 text-amber-600" data-testid="ops-needs-review">
                needs review
              </Badge>
            ) : null}
            <List title="Top risks" items={health.top_risks} testid="ops-top-risks" />
            <List title="Recurring blockers" items={health.recurring_blockers} testid="ops-recurring-blockers" />
            <List title="Appears overloaded" items={health.overloaded_people} testid="ops-overloaded" />
            <List title="Suggested focus" items={health.suggested_focus} testid="ops-focus" />
            <List title="Recommended next actions" items={health.recommended_next_actions} testid="ops-recommended" />
            <ProvenanceLine env={healthEnv} provenance={health.provenance} advisory={advisory} />
          </div>

          {/* Advisory risk — never replaces Blind Spots / Watchers. */}
          <div className="rounded-md border border-border bg-background/70 p-3 space-y-2" data-testid="ops-risk-section">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Risk assessment</h2>
              <Badge variant="outline" className="text-[9px] text-muted-foreground">advisory</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Advisory scoring over your watcher findings. Deterministic{" "}
              <Link to="/app/blind-spots" className="underline hover:text-foreground">Blind Spots</Link>{" "}
              remain the primary view.
            </p>
            {riskList.length === 0 ? (
              <div className="rounded-md border border-border p-2 text-[11px] text-muted-foreground" data-testid="ops-risk-empty">
                No active risks right now.
              </div>
            ) : (
              <div className="space-y-1.5" data-testid="ops-risk-list">
                {riskList.map((f) => (
                  <RiskCard key={f.finding_id} finding={f} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
