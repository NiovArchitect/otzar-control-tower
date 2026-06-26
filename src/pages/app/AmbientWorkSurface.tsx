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
import { buildWorkNodes } from "@/lib/work-os/work-nodes";
import { intensityDot } from "@/lib/ambient/glass";
import { nameFromEmail } from "@/lib/identity/person-name";

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

  // The auth entity carries only an email today — humanize its local-part into
  // a friendly first/full name ("samiksha.sharma@…" → "Samiksha Sharma") rather
  // than greeting "samiksha.sharma". Never invents a name; null when unusable.
  const name = nameFromEmail(entity?.email ?? null);
  const ctxActive = surfaceContext !== null && surfaceContext.active;
  const ctxLabel = ctxActive
    ? surfaceContext.title ?? surfaceContext.summary ?? "Current context"
    : null;
  const nothingInFlight = approvalsCount === 0 && unreadCount === 0;

  // [OTZAR-LIVE-6] Real work nodes — what Otzar is connected to RIGHT NOW, built
  // only from current home state (context, approvals, replies). No node without
  // its backing state; no demo names; no graph. Collapsed strip below.
  const workNodes = buildWorkNodes({
    recipients: [],
    awaitingRecipient: false,
    draft: null,
    contextTitle: ctxLabel,
    approvalsCount,
    unreadCount,
    correctionsActive: 0,
  });

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

      {/* NEEDS YOU — only when the human must act: approvals to decide and
          replies that arrived for them to read. Category-specific copy, never
          "items"/"things"/vague counts. */}
      {(approvalsCount > 0 || unreadCount > 0) ? (
        <GlassPanel
          intensity="attention"
          label="Needs you"
          testId="needs-me-panel"
        >
          <div className="space-y-1.5 text-sm">
            {approvalsCount > 0 ? (
              <Link
                to="/app/action-center"
                className="flex items-center justify-between gap-3"
                data-testid="needs-approvals"
              >
                <span className="font-medium text-slate-900">
                  {approvalsCount === 1
                    ? "1 approval is waiting"
                    : `${approvalsCount} approvals are waiting`}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                  Review <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
              </Link>
            ) : null}
            {unreadCount > 0 ? (
              <Link
                to="/app/comms"
                className="flex items-center justify-between gap-3 text-slate-800 hover:text-slate-900"
                data-testid="needs-replies"
              >
                <span>
                  {unreadCount === 1
                    ? "1 reply to review"
                    : `${unreadCount} replies to review`}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              </Link>
            ) : null}
          </div>
        </GlassPanel>
      ) : null}

      {/* WHAT CHANGED — Otzar's one calm "what changed" headline. NOT labeled
          "Otzar is handling": arrived replies are the human's to read (above),
          and the genuine Otzar-is-handling state (drafts / routing / tracking)
          lives in the orb and is not bridged to this surface yet — so we never
          overclaim it here. (Bridge deferred per the handling-panel decision.) */}
      {headline !== null ? (
        <GlassPanel intensity="ambient" label="What changed" testId="changed-panel">
          <p className="text-sm text-slate-600" data-testid="changed-headline">
            {headline}
          </p>
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

      {/* CONNECTED NOW — a small, collapsed real-node strip. Each chip is real
          state (context / approval / reply); nothing renders when there is no
          real node. Not a graph, not technical mechanics. */}
      {workNodes.length > 0 ? (
        <details className="group px-1" data-testid="surface-work-nodes">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
            Connected now
            <span className="opacity-60">· {workNodes.length}</span>
          </summary>
          <div
            className="mt-2 flex flex-wrap gap-1.5"
            data-testid="surface-work-nodes-list"
          >
            {workNodes.map((n) => (
              <span
                key={n.id}
                data-testid="surface-work-node"
                data-kind={n.kind}
                data-intensity={n.intensity}
                title={n.detail}
                className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/60 px-2.5 py-0.5 text-[11px] text-slate-700 backdrop-blur-xl"
              >
                <span aria-hidden className={`inline-block h-1 w-1 rounded-full ${intensityDot(n.intensity)}`} />
                {n.label}
              </span>
            ))}
          </div>
        </details>
      ) : null}

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
