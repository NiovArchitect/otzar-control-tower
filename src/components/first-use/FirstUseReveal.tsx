// FILE: FirstUseReveal.tsx
// PURPOSE: Explicit step-index walkthrough coach (yc-demo-v6).
//          Step advances ONLY on Next/Back/Start over — never from route match.
//          Founder rejection fix: highest-matching ctaTo on /app jumped to step 8/11.
// LAYERS: content < coach z-45 < Talk z-70 < modals.
// CONNECTS TO: EmployeeLayout, first-use/state, walkthrough.ts.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Pause, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { nameFromEmail } from "@/lib/identity/person-name";
import {
  clearWalkthrough,
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
  walkthroughPathname,
  walkthroughStepsFor,
  WALKTHROUGH_VERSION,
} from "@/lib/first-use/walkthrough";
import {
  A08_DOCTRINE,
  a08JourneyOk,
  inventoryA08Journey,
} from "@/lib/first-use/cinematic-first-login";
import type { ContextHealthResponse } from "@/lib/types/foundation";

/** Coach interaction modes — never a full-screen click-capture layer. */
export type WalkthroughCoachMode = "anchored" | "compact" | "confirmation";

function openOrb(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("otzar:open"));
  }
}

function consumeForceStartFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.sessionStorage.getItem("otzar_walkthrough_force_start");
    if (v === WALKTHROUGH_VERSION || v === "1") {
      window.sessionStorage.removeItem("otzar_walkthrough_force_start");
      return true;
    }
  } catch {
    /* private mode */
  }
  return false;
}

/**
 * Floating guided strip. Survives route changes when mounted in the shell.
 * Step index is the sole source of truth — route never rewrites the step.
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
  const [stepIndex, setStepIndex] = useState(0);
  /** Returning user with mid-walk local step — must choose, never silent resume. */
  const [resumeChoice, setResumeChoice] = useState(false);
  /** Corrupt / invalid stored step recovery banner. */
  const [corruptRecovery, setCorruptRecovery] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [pinFullWhileTalk, setPinFullWhileTalk] = useState(false);
  const [confirmNote, setConfirmNote] = useState<string | null>(null);
  const [navBusy, setNavBusy] = useState(false);
  const advancingRef = useRef(false);
  const reduceMotion = prefersReducedMotion();

  useEffect(() => {
    const onOpen = (): void => {
      setTalkOpen(true);
      setPinFullWhileTalk(false);
    };
    const onClose = (): void => {
      setTalkOpen(false);
      setPinFullWhileTalk(false);
    };
    window.addEventListener("otzar:open", onOpen);
    window.addEventListener("otzar:close", onClose);
    return () => {
      window.removeEventListener("otzar:open", onOpen);
      window.removeEventListener("otzar:close", onClose);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const serverDone = await hydrateWalkthroughFromServer(email);
      if (cancelled) return;
      if (serverDone || hasCompletedWalkthrough(email)) {
        setDismissed(true);
        setHydrating(false);
        return;
      }

      const forceStart = consumeForceStartFlag();
      if (forceStart) {
        clearWalkthrough(email);
        setStepIndex(0);
        setWalkthroughStepIndex(email, 0);
        setResumeChoice(false);
        setCorruptRecovery(false);
        setDismissed(false);
        setHydrating(false);
        return;
      }

      const stored = getWalkthroughStepIndex(email);
      if (!Number.isFinite(stored) || stored < 0) {
        setCorruptRecovery(true);
        setStepIndex(0);
        setHydrating(false);
        return;
      }
      if (stored > 0) {
        // Never silently resume mid-walk (founder rejection: step 8/11).
        setStepIndex(stored);
        setResumeChoice(true);
      } else {
        setStepIndex(0);
        setResumeChoice(false);
      }
      setDismissed(false);
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  useEffect(() => {
    if (dismissed || hydrating || paused || resumeChoice || corruptRecovery) {
      return;
    }
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
        } else if (
          c.next_best_step &&
          c.next_best_step.kind !== "IDLE_HEALTHY"
        ) {
          setSignal(c.next_best_step.safe_title);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dismissed, hydrating, paused, resumeChoice, corruptRecovery]);

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
  const stepPath = walkthroughPathname(step.ctaTo);
  const onTargetRoute =
    location.pathname === stepPath ||
    (stepPath !== "/app" && location.pathname.startsWith(stepPath));

  // Guard: if step index exceeds plan after version change, recover.
  useEffect(() => {
    if (hydrating || dismissed) return;
    if (stepIndex >= steps.length) {
      setCorruptRecovery(true);
    }
  }, [hydrating, dismissed, stepIndex, steps.length]);

  if (hydrating) return null;

  function startOver(): void {
    clearWalkthrough(email);
    setStepIndex(0);
    setWalkthroughStepIndex(email, 0);
    setResumeChoice(false);
    setCorruptRecovery(false);
    setPaused(false);
    setDismissed(false);
    setConfirmNote(null);
    advancingRef.current = false;
    setNavBusy(false);
    navigate("/app");
  }

  function continueFromSaved(): void {
    setResumeChoice(false);
    setCorruptRecovery(false);
    const idx = clampWalkthroughStep(stepIndex, steps.length);
    setStepIndex(idx);
    setWalkthroughStepIndex(email, idx);
    const target = walkthroughPathname(steps[idx]!.ctaTo);
    if (location.pathname !== target) {
      navigate(target);
    }
  }

  // Completed: calm restart chip (bottom-left; never covers Talk).
  if (dismissed) {
    return (
      <div
        className="pointer-events-none fixed bottom-4 left-4 z-[45] sm:bottom-6 sm:left-6"
        data-testid="first-use-reveal-restart"
        data-coach-mode="restart"
      >
        <button
          type="button"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-md backdrop-blur hover:border-indigo-200 hover:text-indigo-700"
          data-testid="walkthrough-restart"
          onClick={() => startOver()}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Restart walkthrough
        </button>
      </div>
    );
  }

  // Corrupt state recovery — never jump to an arbitrary mid step.
  if (corruptRecovery) {
    return (
      <div
        className="pointer-events-none fixed bottom-3 left-3 z-[45] w-[min(22rem,calc(100vw-1.5rem))] sm:bottom-6 sm:left-6"
        data-testid="first-use-reveal-corrupt"
        data-coach-mode="recovery"
      >
        <div className="pointer-events-auto rounded-2xl border border-amber-200/80 bg-white/95 px-3.5 py-3 shadow-lg backdrop-blur">
          <p className="text-sm font-medium text-slate-900">
            Let&apos;s restart the walkthrough so every step matches the current
            demo.
          </p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white"
            data-testid="walkthrough-corrupt-restart"
            onClick={() => startOver()}
          >
            Restart at step 1
          </button>
        </div>
      </div>
    );
  }

  // Returning user choice — never silent mid-walk resume.
  if (resumeChoice) {
    return (
      <div
        className="pointer-events-none fixed bottom-3 left-3 z-[45] w-[min(22rem,calc(100vw-1.5rem))] sm:bottom-6 sm:left-6"
        data-testid="first-use-reveal-resume-choice"
        data-coach-mode="resume-choice"
        data-saved-step={stepIndex}
      >
        <div className="pointer-events-auto rounded-2xl border border-indigo-200/70 bg-white/95 px-3.5 py-3 shadow-lg backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
            Walkthrough · saved progress
          </p>
          <p className="mt-1 text-sm text-slate-800">
            You left mid-guide (step {Math.min(stepIndex + 1, steps.length)} of{" "}
            {steps.length}). Continue where you left off, or start over at step
            1.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white"
              data-testid="walkthrough-continue-saved"
              onClick={() => continueFromSaved()}
            >
              Continue walkthrough
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700"
              data-testid="walkthrough-start-over"
              onClick={() => startOver()}
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  const coachMode: WalkthroughCoachMode =
    talkOpen && !pinFullWhileTalk
      ? "compact"
      : confirmNote
        ? "confirmation"
        : "anchored";

  if (paused) {
    return (
      <div
        className="pointer-events-none fixed bottom-4 left-4 z-[45] sm:bottom-6 sm:left-6"
        data-testid="first-use-reveal-paused"
        data-coach-mode="paused"
      >
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-lg backdrop-blur"
            data-testid="walkthrough-resume"
            onClick={() => setPaused(false)}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Continue walkthrough
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-md"
            data-testid="walkthrough-start-over"
            onClick={() => startOver()}
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  if (coachMode === "compact") {
    return (
      <div
        className="pointer-events-none fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[45] sm:left-4 sm:top-4"
        data-testid="first-use-reveal"
        data-coach-mode="compact"
        data-a08="true"
        data-a08-ok={a08Ok ? "true" : "false"}
        data-role={walkRole}
        data-walkthrough-version={WALKTHROUGH_VERSION}
        data-step={step.id}
        data-step-index={safeIndex}
        data-on-target-route={onTargetRoute ? "true" : "false"}
        data-talk-open="true"
        role="status"
        aria-label="Getting started guide (compact while Talk is open)"
        aria-live="polite"
      >
        <div className="pointer-events-auto flex max-w-[min(18rem,calc(100vw-1.5rem))] items-center gap-2 rounded-full border border-indigo-200/70 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur">
          <Sparkles
            className="h-3.5 w-3.5 shrink-0 text-indigo-600"
            aria-hidden
          />
          <span className="min-w-0 truncate text-[11px] font-medium text-slate-800">
            Guide · {safeIndex + 1}/{steps.length}: {step.title}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
            data-testid="walkthrough-expand-from-compact"
            onClick={() => setPinFullWhileTalk(true)}
          >
            Expand
          </button>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-slate-300 hover:bg-white/10 hover:text-slate-50"
            aria-label="Pause guide"
            data-testid="walkthrough-pause"
            onClick={() => setPaused(true)}
          >
            <Pause className="h-3 w-3" />
          </button>
        </div>
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

  /**
   * WHAT: Move to a step by index, navigate to its route, persist after set.
   * WHY: Next/Back must change both popup and route; never browser-history alone.
   */
  function goToStep(nextIdx: number): void {
    if (advancingRef.current) return;
    const clamped = clampWalkthroughStep(nextIdx, steps.length);
    const target = walkthroughPathname(steps[clamped]!.ctaTo);
    advancingRef.current = true;
    setNavBusy(true);
    setStepIndex(clamped);
    setConfirmNote(null);
    // Persist only after we commit the index (target readiness is best-effort).
    setWalkthroughStepIndex(email, clamped);
    if (location.pathname !== target) {
      navigate(target);
    }
    // Unlock after a short tick so double-clicks cannot double-advance.
    window.setTimeout(() => {
      advancingRef.current = false;
      setNavBusy(false);
    }, 400);
  }

  function next(): void {
    if (advancingRef.current || navBusy) return;
    if (safeIndex + 1 >= steps.length) {
      complete();
      return;
    }
    goToStep(safeIndex + 1);
  }

  function back(): void {
    if (advancingRef.current || navBusy) return;
    if (safeIndex <= 0) return;
    goToStep(safeIndex - 1);
  }

  function followCta(): void {
    setWalkthroughStepIndex(email, safeIndex);
    if (location.pathname !== stepPath) {
      navigate(step.ctaTo);
    }
  }

  const spatial = reduceMotion
    ? "shadow-md"
    : "shadow-[0_12px_40px_rgba(79,70,229,0.14)] ring-1 ring-indigo-100/70";

  const anchoredPos =
    talkOpen && pinFullWhileTalk
      ? "left-3 top-[max(0.75rem,env(safe-area-inset-top))] sm:left-4 sm:top-4"
      : "bottom-3 left-3 sm:bottom-6 sm:left-6";
  return (
    <div
      className={`pointer-events-none fixed z-[45] w-[min(22rem,calc(100vw-1.5rem))] ${anchoredPos} ${
        reduceMotion ? "" : "transition-all duration-300"
      }`}
      data-testid="first-use-reveal"
      data-coach-mode={
        talkOpen && pinFullWhileTalk ? "confirmation" : "anchored"
      }
      data-a08="true"
      data-a08-ok={a08Ok ? "true" : "false"}
      data-role={walkRole}
      data-walkthrough-version={WALKTHROUGH_VERSION}
      data-step={step.id}
      data-step-index={safeIndex}
      data-on-target-route={onTargetRoute ? "true" : "false"}
      data-step-facets={(step.facets ?? []).join(",")}
      data-talk-open={talkOpen ? "true" : "false"}
      role="region"
      aria-label="Getting started guide"
      aria-live="polite"
    >
      <p className="sr-only" data-testid="a08-doctrine">
        {A08_DOCTRINE}
      </p>
      <div
        className={`pointer-events-auto rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-white/95 via-white/90 to-indigo-50/80 px-3.5 py-3 backdrop-blur-md ${spatial}`}
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
              <p
                className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600/90"
                data-testid="walkthrough-progress"
              >
                Getting started · {safeIndex + 1}/{steps.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-slate-50"
                  aria-label="Pause guide"
                  data-testid="walkthrough-pause"
                  onClick={() => setPaused(true)}
                >
                  <Pause className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-slate-50"
                  aria-label="Skip for now"
                  title="Skip for now — you can continue later"
                  data-testid="first-use-review-work"
                  data-skip-for-now="true"
                  onClick={() => {
                    setWalkthroughStepIndex(email, safeIndex);
                    setPaused(true);
                  }}
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
            <p
              className="mt-1 text-[11px] text-slate-500"
              data-testid="walkthrough-why"
            >
              Why it matters: {step.why}
            </p>
            <p
              className="text-[11px] font-medium text-indigo-700"
              data-testid="walkthrough-do-next"
            >
              {onTargetRoute
                ? "You are here. Explore, then continue."
                : step.doNext}
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
              {safeIndex > 0 ? (
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white disabled:opacity-50"
                  data-testid="walkthrough-back"
                  disabled={navBusy}
                  onClick={() => back()}
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white disabled:opacity-50"
                data-testid="walkthrough-next"
                disabled={navBusy}
                onClick={() => next()}
              >
                {safeIndex + 1 >= steps.length ? "Finish" : "Next"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white"
                data-testid="walkthrough-skip-for-now"
                onClick={() => {
                  setWalkthroughStepIndex(email, safeIndex);
                  setPaused(true);
                }}
              >
                Skip for now
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-white"
                data-testid="walkthrough-start-over"
                onClick={() => startOver()}
              >
                Start over
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
                  setTalkOpen(true);
                  openOrb();
                  if (step.id === "final_outcome" || step.id === "ai_action") {
                    followCta();
                  }
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
