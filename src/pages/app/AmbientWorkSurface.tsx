// FILE: AmbientWorkSurface.tsx
// PURPOSE: [OTZAR-LIVE-6] The new default employee experience at /app. NOT a
//          dashboard — an ambient intelligence surface that answers, in 5
//          seconds: what needs me, what Otzar is handling, what context it holds,
//          and the one next action. Built ONLY from real rails (presence counts,
//          my-day intelligence, current context). Collapsed summaries, short
//          human language, calm hierarchy, mobile-first, non-blocking. Empty is
//          calm ("all caught up"), never blank, never a card wall. The orb is the
//          voice/text invocation; this surface invites it and reflects its state.
// CONNECTS TO: App.tsx (/app index), EmployeeLayout, GlassPanel,
//          src/lib/stores/presence.ts, useCurrentSurfaceContextStore,
//          api.otzar.myDayIntelligence, tests/unit/ambient-work-surface.test.tsx.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mic, MoonStar } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { usePresenceStore } from "@/lib/stores/presence";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";
import { GlassPanel } from "@/components/ambient/GlassPanel";

function greetingFor(hour: number, name: string | null): string {
  const base =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name === null ? base : `${base}, ${name.split(" ")[0]}`;
}

function openOrb(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("otzar:open"));
  }
}

export function AmbientWorkSurface(): JSX.Element {
  const entity = useAuthStore((s) => s.entity);
  const quiet = usePresenceStore((s) => s.quiet);
  const approvalsCount = usePresenceStore((s) => s.approvalsCount);
  const unreadCount = usePresenceStore((s) => s.unreadCount);
  const surfaceContext = useCurrentSurfaceContextStore((s) => s.context);
  const clearContext = useCurrentSurfaceContextStore((s) => s.clear);
  const [headline, setHeadline] = useState<string | null>(null);

  // One calm intelligence headline — "what changed". Silence on failure.
  useEffect(() => {
    let cancelled = false;
    api.otzar
      .myDayIntelligence()
      .then((r) => {
        if (!cancelled && r.ok) setHeadline(r.data.intelligence.headline);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const name = entity?.email ? entity.email.split("@")[0] ?? null : null;
  const ctxActive = surfaceContext !== null && surfaceContext.active;
  const ctxLabel = ctxActive
    ? surfaceContext.title ?? surfaceContext.summary ?? "Current context"
    : null;
  const nothingInFlight = approvalsCount === 0 && unreadCount === 0;

  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-col gap-4 px-1 pb-28 pt-6 sm:pt-10"
      data-testid="ambient-work-surface"
    >
      {/* Greeting — calm presence, one line. */}
      <div className="px-1">
        <h1 className="text-2xl font-light tracking-tight text-slate-900">
          {greetingFor(new Date().getHours(), name)}
        </h1>
        <p className="mt-1 text-sm text-slate-500" data-testid="ambient-presence-line">
          {quiet ? (
            <>
              <MoonStar className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Otzar is quiet while you focus.
            </>
          ) : (
            "Otzar is here, handling what it can and surfacing only what needs you."
          )}
        </p>
      </div>

      {/* WHAT NEEDS ME — only when the human must act. */}
      {approvalsCount > 0 ? (
        <GlassPanel
          intensity="attention"
          label="Needs you"
          testId="needs-me-panel"
        >
          <Link
            to="/app/action-center"
            className="flex items-center justify-between gap-3"
          >
            <span className="text-sm font-medium text-slate-900">
              {approvalsCount === 1
                ? "1 approval is waiting on you"
                : `${approvalsCount} decisions are waiting on you`}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-medium text-amber-800">
              Review <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
          </Link>
        </GlassPanel>
      ) : null}

      {/* WHAT OTZAR IS HANDLING — quiet tracked work + what changed. */}
      {(unreadCount > 0 || headline !== null) ? (
        <GlassPanel
          intensity={unreadCount > 0 ? "working" : "ambient"}
          label="Otzar is handling"
          testId="handling-panel"
        >
          <div className="space-y-1.5 text-sm">
            {unreadCount > 0 ? (
              <Link
                to="/app/comms"
                className="flex items-center justify-between gap-3 text-slate-800 hover:text-slate-900"
                data-testid="handling-replies"
              >
                <span>
                  {unreadCount === 1
                    ? "Tracking 1 reply from your team"
                    : `Tracking ${unreadCount} replies from your team`}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              </Link>
            ) : null}
            {headline !== null ? (
              <p className="text-slate-600" data-testid="handling-headline">
                {headline}
              </p>
            ) : null}
          </div>
        </GlassPanel>
      ) : null}

      {/* CURRENT CONTEXT — what Otzar is using, clearable. */}
      <GlassPanel intensity="ambient" label="Context" testId="context-panel">
        {ctxActive ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-800" data-testid="context-active">
              Working from {ctxLabel}
            </span>
            <button
              type="button"
              onClick={() => clearContext()}
              data-testid="context-clear"
              className="shrink-0 text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              Clear
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No context yet. Tell Otzar what you're working on and it remembers.
          </p>
        )}
      </GlassPanel>

      {/* ALL CAUGHT UP — calm, not blank, when nothing needs the human. */}
      {nothingInFlight ? (
        <p
          className="px-1 text-sm text-slate-400"
          data-testid="ambient-caught-up"
        >
          You're all caught up. Otzar is listening.
        </p>
      ) : null}

      {/* NEXT BEST ACTION — one primary invitation; the orb is the engine. */}
      <button
        type="button"
        onClick={openOrb}
        data-testid="ambient-talk"
        className="mt-1 flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-left text-sm text-slate-500 shadow-sm backdrop-blur-xl ring-1 ring-black/[0.04] transition-colors hover:text-slate-800"
      >
        <Mic className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span>Just talk — “what matters today?”, “did anyone reply?”, “send Sam an update”.</span>
      </button>

      <Link
        to="/app/my-day"
        className="px-1 text-xs font-medium text-slate-400 underline-offset-4 hover:text-slate-700 hover:underline"
        data-testid="ambient-open-workbench"
      >
        Open the full workbench →
      </Link>
    </div>
  );
}
