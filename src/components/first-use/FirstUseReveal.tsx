// FILE: FirstUseReveal.tsx
// PURPOSE: Persistent, route-aware first-use walkthrough.
//          CTA navigation does NOT dismiss the walkthrough.
//          Progress is stored (local + server) and resumes after refresh.
// CONNECTS TO: EmployeeLayout (global mount), first-use/state, walkthrough.ts.

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Pause, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { nameFromEmail } from "@/lib/identity/person-name";
import {
  getWalkthroughStepIndex,
  hasCompletedWalkthrough,
  hydrateWalkthroughFromServer,
  markWalkthroughComplete,
  setWalkthroughStepIndex,
} from "@/lib/first-use/state";
import {
  clampWalkthroughStep,
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

/**
 * Floating guided strip. Survives route changes when mounted in the shell.
 * Clicking a CTA navigates and keeps the current step active.
 */
export function FirstUseReveal(): JSX.Element | null {
  const entity = useAuthStore((s) => s.entity);
  const capabilities = useAuthStore((s) => s.capabilities);
  const email = entity?.email ?? null;
  const admin = isOrgAdmin(capabilities);
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() =>
    hasCompletedWalkthrough(email),
  );
  const [paused, setPaused] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [ctx, setCtx] = useState<ContextHealthResponse | null>(null);
  const [signal, setSignal] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(() =>
    getWalkthroughStepIndex(email),
  );
  const reduceMotion = prefersReducedMotion();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const serverDone = await hydrateWalkthroughFromServer(email);
      if (cancelled) return;
      if (serverDone || hasCompletedWalkthrough(email)) {
        setDismissed(true);
      } else {
        setStepIndex(getWalkthroughStepIndex(email));
      }
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  useEffect(() => {
    if (dismissed || hydrating || paused) return;
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
  }, [dismissed, hydrating, paused]);

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
  const safeIndex = clampWalkthroughStep(stepIndex, steps.length);
  const step = steps[safeIndex]!;
  const a08 = useMemo(() => inventoryA08Journey(walkRole), [walkRole]);
  const a08Ok = a08JourneyOk(a08);
  const onTargetRoute =
    location.pathname === step.ctaTo ||
    (step.ctaTo !== "/app" && location.pathname.startsWith(step.ctaTo));

  if (hydrating) return null;
  if (dismissed) return null;
  if (paused) {
    return (
      <div
        className="fixed bottom-4 right-4 z-[60] sm:bottom-6 sm:right-6"
        data-testid="first-use-reveal-paused"
      >
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-lg backdrop-blur"
          data-testid="walkthrough-resume"
          onClick={() => setPaused(false)}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Continue guide
        </button>
      </div>
    );
  }

  const displayName =
    identity?.viewer?.display_name || nameFromEmail(email) || "there";
  const firstName = displayName.split(" ")[0] ?? displayName;
  const orgName = identity?.org?.name ?? "your organization";

  function complete(): void {
    markWalkthroughComplete(email);
    setDismissed(true);
  }

  function goToStep(nextIdx: number): void {
    const clamped = clampWalkthroughStep(nextIdx, steps.length);
    setStepIndex(clamped);
    setWalkthroughStepIndex(email, clamped);
  }

  function next(): void {
    if (safeIndex + 1 >= steps.length) {
      complete();
      return;
    }
    goToStep(safeIndex + 1);
  }

  function back(): void {
    if (safeIndex <= 0) return;
    goToStep(safeIndex - 1);
  }

  /** Navigate to the step target without ending the walkthrough. */
  function followCta(): void {
    // Keep current step active while user explores the target surface.
    setWalkthroughStepIndex(email, safeIndex);
    if (location.pathname !== step.ctaTo) {
      navigate(step.ctaTo);
    }
  }

  const spatial = reduceMotion
    ? "shadow-md"
    : "shadow-[0_12px_40px_rgba(79,70,229,0.14)] ring-1 ring-indigo-100/70";

  return (
    <div
      className={`fixed bottom-3 left-3 right-3 z-[60] mx-auto max-w-lg sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0 ${
        reduceMotion ? "" : "transition-all duration-300"
      }`}
      data-testid="first-use-reveal"
      data-a08="true"
      data-a08-ok={a08Ok ? "true" : "false"}
      data-role={walkRole}
      data-walkthrough-version={WALKTHROUGH_VERSION}
      data-step={step.id}
      data-step-index={safeIndex}
      data-on-target-route={onTargetRoute ? "true" : "false"}
      data-step-facets={(step.facets ?? []).join(",")}
      role="dialog"
      aria-label="Getting started guide"
      aria-live="polite"
    >
      <p className="sr-only" data-testid="a08-doctrine">
        {A08_DOCTRINE}
      </p>
      <div
        className={`rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-white/95 via-white/90 to-indigo-50/80 px-3.5 py-3 backdrop-blur-md ${spatial}`}
      >
        <div className="flex items-start gap-2.5">
          <div
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white ${
              reduceMotion ? "" : "animate-pulse"
            }`}
            aria-hidden
          >
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600/90">
                Getting started · {safeIndex + 1}/{steps.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Pause guide"
                  data-testid="walkthrough-pause"
                  onClick={() => setPaused(true)}
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Skip guide"
                  data-testid="first-use-review-work"
                  onClick={() => complete()}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
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
              className="mt-0.5 text-xs leading-snug text-slate-600"
              data-testid="walkthrough-step-body"
            >
              {step.body}
            </p>
            <p className="mt-1 text-[11px] text-slate-500" data-testid="walkthrough-why">
              Why it matters: {step.why}
            </p>
            <p className="text-[11px] font-medium text-indigo-700" data-testid="walkthrough-do-next">
              {onTargetRoute ? "You are here. Explore, then continue." : step.doNext}
            </p>
            {signal && safeIndex === 0 ? (
              <span
                className="mt-1 block text-xs text-slate-500"
                data-testid="first-use-org"
              >
                Live now: {signal}
              </span>
            ) : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800"
                data-testid={step.testId}
                onClick={() => followCta()}
              >
                {onTargetRoute ? "Open again" : step.ctaLabel}
                <ArrowRight className="h-3 w-3" aria-hidden />
              </button>
              {/* Keep Link for e2e deep targets without completing */}
              <Link
                to={step.ctaTo}
                className="sr-only"
                data-testid={`${step.testId}-link`}
                onClick={(e) => {
                  e.preventDefault();
                  followCta();
                }}
              >
                {step.ctaLabel}
              </Link>
              {walkRole === "administrator" && safeIndex === 0 ? (
                <Link
                  to="/app/collaboration"
                  className="sr-only"
                  data-testid="first-use-see-org"
                  onClick={(e) => {
                    e.preventDefault();
                    followCta();
                  }}
                >
                  See my org
                </Link>
              ) : null}
              {walkRole === "employee" || walkRole === "contractor" ? (
                <Link
                  to="/app/action-center"
                  className="sr-only"
                  data-testid="first-use-needs-me"
                  onClick={(e) => {
                    e.preventDefault();
                    followCta();
                  }}
                >
                  What needs me
                </Link>
              ) : null}
              {safeIndex > 0 ? (
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white"
                  data-testid="walkthrough-back"
                  onClick={() => back()}
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white"
                data-testid="walkthrough-next"
                onClick={() => next()}
              >
                {safeIndex + 1 >= steps.length ? "Finish" : "Next"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white"
                data-testid="first-use-start-day"
                onClick={() => complete()}
              >
                Start my day
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white"
                data-testid="first-use-talk"
                onClick={() => {
                  followCta();
                  if (step.id === "ai_action") openOrb();
                }}
              >
                Talk
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
