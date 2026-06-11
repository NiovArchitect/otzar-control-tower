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

  async function refresh(): Promise<void> {
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
    refresh();
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
            The onboarding readiness page is for admins (clearance_level ≥ 4).
            If you're not an admin, ask your org owner.
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
        title="Production readiness"
        description="Walk through the steps required to take this Otzar deployment from demo to a real client handoff. Admins only."
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
              DEMO mode
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
              PRODUCTION mode
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            DEMO mode lets you seed canonical fixtures (Launch Collaboration /
            MICE Event). PRODUCTION mode disables demo seeding and surfaces the
            production schema migration step as required.
          </p>
        </CardContent>
      </Card>

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
            Schema migration:{" "}
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
