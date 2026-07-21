// FILE: FirstUseReveal.tsx
// PURPOSE: A-04/A-08 — versioned multi-step first-use walkthrough (≤3 steps).
//          A-08: cinematic role journey with org state, provider honesty, AI action;
//          restrained spatial depth; skip/replay; dual completion local+server.
// CONNECTS TO: AmbientWorkSurface, first-use/state, walkthrough.ts, cinematic-first-login.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { nameFromEmail } from "@/lib/identity/person-name";
import {
  hasCompletedWalkthrough,
  hydrateWalkthroughFromServer,
  markWalkthroughComplete,
} from "@/lib/first-use/state";
import {
  prefersReducedMotion,
  resolveWalkthroughRole,
  walkthroughStepsFor,
  WALKTHROUGH_VERSION,
} from "@/lib/first-use/walkthrough";
import {
  A08_DOCTRINE,
  a08JourneyOk,
  inventoryA08Journey,
} from "@/lib/first-use/cinematic-first-login";
import type { ContextHealthResponse } from "@/lib/types/foundation";

function openOrb(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("otzar:open"));
  }
}

/** Compact multi-step strip for Today — never a second dashboard. */
export function FirstUseReveal(): JSX.Element | null {
  const entity = useAuthStore((s) => s.entity);
  const capabilities = useAuthStore((s) => s.capabilities);
  const email = entity?.email ?? null;
  const admin = isOrgAdmin(capabilities);
  const [dismissed, setDismissed] = useState(() =>
    hasCompletedWalkthrough(email),
  );
  const [hydrating, setHydrating] = useState(true);
  const [ctx, setCtx] = useState<ContextHealthResponse | null>(null);
  const [signal, setSignal] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const reduceMotion = prefersReducedMotion();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const serverDone = await hydrateWalkthroughFromServer(email);
      if (cancelled) return;
      if (serverDone || hasCompletedWalkthrough(email)) {
        setDismissed(true);
      }
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  useEffect(() => {
    if (dismissed || hydrating) return;
    let cancelled = false;
    void (async () => {
      const [health, dgi] = await Promise.all([
        api.otzar.contextHealth(),
        api.otzar.dgiCoherence(),
      ]);
      if (cancelled) return;
      if (health.ok) setCtx(health.data);
      if (dgi.ok && dgi.data?.coherence) {
        const c = dgi.data.coherence;
        if (c.attention_count > 0) {
          setSignal(
            `${c.attention_count} item${c.attention_count === 1 ? "" : "s"} need attention`,
          );
        } else if (c.open_incoming_handoffs_count > 0) {
          setSignal(
            `${c.open_incoming_handoffs_count} handoff${c.open_incoming_handoffs_count === 1 ? "" : "s"} waiting`,
          );
        } else if (c.next_best_step && c.next_best_step.kind !== "IDLE_HEALTHY") {
          setSignal(c.next_best_step.safe_title);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dismissed, hydrating]);

  const identity = ctx?.identity;
  const roleTitle =
    identity?.viewer?.title || identity?.viewer?.org_role || null;
  const walkRole = useMemo(
    () =>
      resolveWalkthroughRole({
        isOrgAdmin: admin,
        title: identity?.viewer?.title ?? null,
        orgRole: identity?.viewer?.org_role ?? (admin ? "leader" : null),
      }),
    [admin, identity?.viewer?.title, identity?.viewer?.org_role],
  );
  const steps = useMemo(() => walkthroughStepsFor(walkRole), [walkRole]);
  const step = steps[Math.min(stepIndex, steps.length - 1)]!;
  const a08 = useMemo(() => inventoryA08Journey(walkRole), [walkRole]);
  const a08Ok = a08JourneyOk(a08);

  if (hydrating) return null;
  if (dismissed) return null;

  const displayName =
    identity?.viewer?.display_name || nameFromEmail(email) || "there";
  const firstName = displayName.split(" ")[0] ?? displayName;
  const orgName = identity?.org?.name ?? "your organization";

  function complete(): void {
    markWalkthroughComplete(email);
    setDismissed(true);
  }

  function next(): void {
    if (stepIndex + 1 >= steps.length) {
      complete();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  // A-08 restrained spatial depth (not a 3D toy) — soft layer + parallax-free lift
  const spatial = reduceMotion
    ? "shadow-sm"
    : "shadow-[0_8px_30px_rgba(79,70,229,0.08)] ring-1 ring-indigo-100/60";

  return (
    <div
      className={`mt-3 rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-white/70 via-white/55 to-indigo-50/40 px-3 py-2.5 backdrop-blur-sm ${spatial} ${
        reduceMotion ? "" : "transition-all duration-300"
      }`}
      data-testid="first-use-reveal"
      data-a08="true"
      data-a08-ok={a08Ok ? "true" : "false"}
      data-role={walkRole}
      data-walkthrough-version={WALKTHROUGH_VERSION}
      data-step={step.id}
      data-step-facets={(step.facets ?? []).join(",")}
      data-spatial-depth={reduceMotion ? "reduced" : "restrained"}
    >
      <p className="sr-only" data-testid="a08-doctrine">
        {A08_DOCTRINE}
      </p>
      <div className="flex items-start gap-2.5">
        <Sparkles
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-500/80">
            Getting started · {stepIndex + 1}/{steps.length}
          </p>
          <p
            className="mt-0.5 text-sm leading-snug text-slate-800"
            data-testid="first-use-recognition"
          >
            <span className="font-semibold">Welcome, {firstName}.</span>{" "}
            <span className="text-slate-500">
              {orgName}
              {roleTitle ? ` · ${roleTitle}` : ""}
            </span>
          </p>
          <p
            className="mt-1.5 text-sm font-medium text-slate-900"
            data-testid="walkthrough-step-title"
          >
            {step.title}
          </p>
          <p
            className="mt-0.5 text-xs leading-snug text-slate-500"
            data-testid="walkthrough-step-body"
          >
            {step.body}
          </p>
          {signal && stepIndex === 0 ? (
            <span
              className="mt-1 block text-xs text-slate-500"
              data-testid="first-use-org"
            >
              Live now: {signal}
            </span>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              to={step.ctaTo}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
              data-testid={step.testId}
              onClick={() => complete()}
            >
              {step.ctaLabel}
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
            {/* Primary legacy CTAs for e2e compatibility */}
            {walkRole === "administrator" && stepIndex === 0 ? (
              <Link
                to="/app/collaboration"
                className="sr-only"
                data-testid="first-use-see-org"
                onClick={() => complete()}
              >
                See my org
              </Link>
            ) : null}
            {walkRole === "employee" || walkRole === "contractor" ? (
              <Link
                to="/app/action-center"
                className="sr-only"
                data-testid="first-use-needs-me"
                onClick={() => complete()}
              >
                What needs me
              </Link>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-white"
              data-testid="walkthrough-next"
              onClick={() => next()}
            >
              {stepIndex + 1 >= steps.length ? "Finish" : "Next"}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-white"
              data-testid="first-use-start-day"
              onClick={() => complete()}
            >
              Start my day
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-white"
              data-testid="first-use-talk"
              onClick={() => {
                complete();
                openOrb();
              }}
            >
              Talk
            </button>
            <button
              type="button"
              className="text-[11px] font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              data-testid="first-use-review-work"
              onClick={() => complete()}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
