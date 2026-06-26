// FILE: OnboardingReadiness.tsx
// PURPOSE: Phase 1230 — admin-only onboarding readiness checklist
//          page. Renders the 11-step checklist + facts panel +
//          DEMO/PRODUCTION mode toggle.

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Cog,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { HandoffReadinessResponse } from "@/lib/types/foundation";
import type {
  OnboardingChecklist,
  OnboardingStep,
  OnboardingStepStatus,
} from "@/lib/types/foundation";

function statusBadge(status: OnboardingStepStatus): JSX.Element {
  switch (status) {
    case "READY":
      return (
        <Badge variant="outline" className="text-[9px]">
          <CheckCircle2
            className="mr-0.5 inline h-2.5 w-2.5 text-emerald-500"
            aria-hidden
          />
          Ready
        </Badge>
      );
    case "MISSING_KEYS":
      return (
        <Badge variant="outline" className="text-[9px]">
          <KeyRound
            className="mr-0.5 inline h-2.5 w-2.5 text-amber-500"
            aria-hidden
          />
          Missing keys
        </Badge>
      );
    case "ATTENTION":
      return (
        <Badge variant="outline" className="text-[9px]">
          <AlertCircle
            className="mr-0.5 inline h-2.5 w-2.5 text-rose-500"
            aria-hidden
          />
          Attention
        </Badge>
      );
    case "PENDING":
    default:
      return (
        <Badge variant="outline" className="text-[9px]">
          Pending
        </Badge>
      );
  }
}

export function OnboardingReadiness(): JSX.Element {
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Phase 1242 — the enterprise handoff aggregate. Failure is
  // non-blocking: the checklist surface works unchanged.
  const [handoff, setHandoff] = useState<
    HandoffReadinessResponse["readiness"] | null
  >(null);

  async function refreshHandoff(): Promise<void> {
    const r = await api.otzar.productionReadiness();
    if (r.ok) setHandoff(r.data.readiness);
  }

  async function refresh(): Promise<void> {
    void refreshHandoff();
    const r = await api.onboarding.checklist();
    if (r.ok) {
      setChecklist(r.data.checklist);
      setError(null);
    } else {
      setError(r.code);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Mount-only initial load; refresh reads only stable setters and
    // the api singleton, so re-running on identity change adds nothing.
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function completeStep(step: OnboardingStep): Promise<void> {
    setBusy(step.step_id);
    const r = await api.onboarding.completeStep(step.step_id);
    setBusy(null);
    if (r.ok) {
      setChecklist(r.data.checklist);
    } else {
      setError(r.code);
    }
  }

  async function flipMode(mode: "DEMO" | "PRODUCTION"): Promise<void> {
    setBusy("MODE");
    const r = await api.onboarding.setMode(mode);
    setBusy(null);
    if (r.ok) setChecklist(r.data.checklist);
    else setError(r.code);
  }

  if (loading) {
    return (
      <Card data-testid="onboarding-readiness-loading">
        <CardContent className="py-4 text-xs text-muted-foreground">
          Loading checklist…
        </CardContent>
      </Card>
    );
  }

  if (error !== null || checklist === null) {
    return (
      <Card
        className="border-rose-400/40 bg-rose-500/5"
        data-testid="onboarding-readiness-error"
      >
        <CardContent className="py-3 text-xs">
          <AlertCircle className="mr-1 inline h-3 w-3" aria-hidden /> Couldn't
          load the checklist ({error ?? "UNKNOWN"}).
          <p className="mt-2 text-[10px] text-muted-foreground">
            This page is for org admins. If you're not an admin, ask your org
            owner for access.
          </p>
        </CardContent>
      </Card>
    );
  }

  const readyCount = checklist.steps.filter((s) => s.status === "READY").length;
  const pending = checklist.steps.length - readyCount;

  return (
    <div className="space-y-5" data-testid="onboarding-readiness-page">
      <PageHeader
        title="Launch readiness"
        description="Walk through the steps required to take this Otzar workspace from demo to a real client handoff. Admins only."
      />

      <Card data-testid="onboarding-readiness-mode-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cog className="h-4 w-4" aria-hidden /> Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p>
            Current mode:{" "}
            <Badge variant="outline" className="text-[10px]">
              {checklist.mode}
            </Badge>{" "}
            · {readyCount}/{checklist.steps.length} steps ready · {pending}{" "}
            outstanding
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={checklist.mode === "DEMO" ? "default" : "outline"}
              disabled={busy === "MODE"}
              onClick={() => flipMode("DEMO")}
              data-testid="onboarding-readiness-set-demo"
            >
              {busy === "MODE" ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
              ) : null}
              Demo mode
            </Button>
            <Button
              size="sm"
              variant={checklist.mode === "PRODUCTION" ? "default" : "outline"}
              disabled={busy === "MODE"}
              onClick={() => flipMode("PRODUCTION")}
              data-testid="onboarding-readiness-set-production"
            >
              {busy === "MODE" ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
              ) : null}
              Live mode
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Demo mode lets you load sample data (Launch Collaboration / MICE
            Event). Live mode turns off demo data and shows the platform update
            step as required.
          </p>
        </CardContent>
      </Card>

      {handoff !== null ? (
        <HandoffSection readiness={handoff} />
      ) : null}

      <Card data-testid="onboarding-readiness-facts-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Facts</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-1 text-[10px] md:grid-cols-3">
          <p>
            Total members:{" "}
            <span className="font-medium">{checklist.facts.total_members}</span>
          </p>
          <p>
            Admins:{" "}
            <span className="font-medium">{checklist.facts.admin_members}</span>
          </p>
          <p>
            Role archetypes assigned:{" "}
            <span className="font-medium">
              {checklist.facts.role_archetypes_assigned}
            </span>
          </p>
          <p>
            Action policies configured:{" "}
            <span className="font-medium">
              {checklist.facts.action_policies_configured}
            </span>
          </p>
          <p>
            Connector bindings:{" "}
            <span className="font-medium">{checklist.facts.connector_bindings}</span>
          </p>
          <p>
            STT providers available:{" "}
            <span className="font-medium">
              {checklist.facts.stt_providers_available}
            </span>
          </p>
          <p>
            STT providers missing keys:{" "}
            <span className="font-medium">
              {checklist.facts.stt_providers_missing_keys}
            </span>
          </p>
          <p>
            Audit chain active:{" "}
            <span className="font-medium">
              {checklist.facts.has_open_audit_chain ? "yes" : "no"}
            </span>
          </p>
          <p>
            Platform update:{" "}
            <span className="font-medium">
              {checklist.facts.schema_migration_state.replace(/_/g, " ").toLowerCase()}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card data-testid="onboarding-readiness-steps-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs">
            {checklist.steps.map((s) => (
              <li
                key={s.step_id}
                className="rounded border bg-card p-2"
                data-testid="onboarding-step-row"
                data-step-id={s.step_id}
                data-status={s.status}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.summary}
                    </p>
                    {s.action_required !== undefined ? (
                      <p className="mt-1 text-[10px] text-amber-500">
                        {s.action_required}
                      </p>
                    ) : null}
                    {s.completed_at !== null ? (
                      <p className="mt-1 text-[10px] text-emerald-500">
                        Completed{" "}
                        {new Date(s.completed_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {statusBadge(s.status)}
                    {s.status !== "READY" || s.completed_at === null ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-5 text-[10px]"
                        disabled={busy === s.step_id}
                        onClick={() => completeStep(s)}
                        data-testid="onboarding-step-complete"
                      >
                        {busy === s.step_id ? (
                          <Loader2
                            className="mr-1 h-3 w-3 animate-spin"
                            aria-hidden
                          />
                        ) : null}
                        Mark complete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p
        className="text-[10px] text-muted-foreground"
        data-testid="onboarding-readiness-footer"
      >
        This checklist is audited. Each completion emits an
        ONBOARDING_STEP_COMPLETED event; the final READY_FOR_PRODUCTION step
        emits ONBOARDING_READY_FOR_PRODUCTION. Otzar never sends messages
        outside your org unless an approved connector is configured.
      </p>
    </div>
  );
}


// Phase 1242 — "What's ready vs blocked", in plain admin English.
// Groups the capability truth table into four calm buckets and
// surfaces the schema-approval gate explicitly.
const CLASS_LABEL: Record<string, string> = {
  PROD: "Ready now",
  PROD_READY_PENDING_SCHEMA_PUSH: "Ready after platform update",
  PROD_READY_PENDING_CREDENTIALS: "Needs credentials",
  BLOCKED_BY_CREDENTIALS: "Needs credentials",
  BLOCKED_BY_APP_REVIEW: "Needs app review",
  DEMO_ONLY: "Demo only",
  PARTIAL: "Partially ready",
  NOT_STARTED: "Not started",
};

function HandoffSection({
  readiness,
}: {
  readiness: HandoffReadinessResponse["readiness"];
}): JSX.Element {
  const buckets: Array<{ title: string; classes: string[] }> = [
    { title: "Ready now", classes: ["PROD"] },
    {
      title: "Ready after your platform update",
      classes: ["PROD_READY_PENDING_SCHEMA_PUSH"],
    },
    {
      title: "Needs credentials or app review",
      classes: [
        "PROD_READY_PENDING_CREDENTIALS",
        "BLOCKED_BY_CREDENTIALS",
        "BLOCKED_BY_APP_REVIEW",
      ],
    },
    // Phase 1250: DEMO_ONLY (e.g. the mock settlement rail) and
    // PARTIAL must be visible — a capability the admin can't see is
    // a truth gap, not a simplification.
    {
      title: "Demo / development only (safe by design)",
      classes: ["DEMO_ONLY", "PARTIAL"],
    },
    { title: "Not started (by design)", classes: ["NOT_STARTED"] },
  ];

  return (
    <Card data-testid="handoff-readiness-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">What's ready vs blocked</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p
          className="text-muted-foreground"
          data-testid="handoff-readiness-headline"
        >
          {readiness.headline}
        </p>

        {readiness.schema.pending_push ? (
          <div
            className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2"
            data-testid="handoff-schema-callout"
          >
            <p className="font-medium">
              A platform update is waiting for Founder approval.
            </p>
            <p className="text-muted-foreground">
              {readiness.schema.note} To approve, the Founder types:{" "}
              <span className="font-mono">
                {readiness.schema.approval_phrase}
              </span>
            </p>
          </div>
        ) : null}

        {buckets.map((bucket) => {
          const rows = readiness.capabilities.filter((c) =>
            bucket.classes.includes(c.classification),
          );
          if (rows.length === 0) return null;
          return (
            <div key={bucket.title} data-testid="handoff-bucket">
              <p className="font-medium">{bucket.title}</p>
              <ul className="mt-1 space-y-0.5">
                {rows.map((c) => (
                  <li
                    key={c.capability}
                    className="flex items-start gap-2"
                    data-testid="handoff-capability"
                    data-class={c.classification}
                  >
                    <Badge variant="outline" className="shrink-0 text-[9px]">
                      {CLASS_LABEL[c.classification] ?? c.classification}
                    </Badge>
                    <span>
                      <span className="text-foreground">{c.capability}</span>{" "}
                      <span className="text-muted-foreground">— {c.note}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <div data-testid="handoff-runtimes">
          <p className="font-medium">Runtimes</p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {readiness.runtimes.map((rt) => (
              <li key={rt.runtime}>
                <span className="text-foreground">{rt.runtime}:</span>{" "}
                {rt.note}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[10px] text-muted-foreground">
          {readiness.audit_compliance.note}
        </p>
      </CardContent>
    </Card>
  );
}
