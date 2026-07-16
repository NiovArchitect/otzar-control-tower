// FILE: AmbientWorkSurface.tsx
// PURPOSE: Default employee experience at /app. NOT a dashboard — an ambient
//          intelligence surface that answers in 5 seconds (ADHD test): what
//          needs me, what changed, what context Otzar holds, one next action.
//          Built ONLY from real rails. Design Law + PRD-01 + quality rubric.
//          [DGI-COHERENCE WAVE-2] Always-visible organizational intelligence
//          strip from GET /otzar/dgi-coherence (single server authority).
// CONNECTS TO: EmployeeLayout, GlassPanel, presence, myDayIntelligence,
//              api.otzar.dgiCoherence.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Mic,
  MoonStar,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { usePresenceStore } from "@/lib/stores/presence";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";
import { GlassPanel } from "@/components/ambient/GlassPanel";
import { OtzarMark } from "@/components/ambient/OtzarMark";
import { buildWorkNodes } from "@/lib/work-os/work-nodes";
import { GLASS_CTA, intensityDot } from "@/lib/ambient/glass";
import { nameFromEmail } from "@/lib/identity/person-name";
import type {
  DgiCoherenceSnapshot,
  DgiCollaborationPlanView,
  DgiTwinAuthorityPosture,
  MyDaySuggestion,
} from "@/lib/types/foundation";
import { triagePriority } from "@/lib/work-os/blind-spot-triage";

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

function dgiPanelIntensity(
  c: DgiCoherenceSnapshot | null,
): "ambient" | "working" | "attention" {
  if (c === null) return "ambient";
  if (
    c.coherence_status === "BLOCKED" ||
    c.coherence_status === "UNPAIRED" ||
    c.open_org_truth_conflicts_count > 0
  ) {
    return "attention";
  }
  if (c.coherence_status === "NEEDS_ATTENTION" || c.attention_count > 0) {
    return "working";
  }
  return "ambient";
}

export function AmbientWorkSurface(): JSX.Element {
  const entity = useAuthStore((s) => s.entity);
  const quiet = usePresenceStore((s) => s.quiet);
  const approvalsCount = usePresenceStore((s) => s.approvalsCount);
  const unreadCount = usePresenceStore((s) => s.unreadCount);
  const actionUnreadCount = usePresenceStore((s) => s.actionUnreadCount);
  const surfaceContext = useCurrentSurfaceContextStore((s) => s.context);
  const clearContext = useCurrentSurfaceContextStore((s) => s.clear);
  const [headline, setHeadline] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MyDaySuggestion[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.otzar
      .myDayIntelligence()
      .then((r) => {
        if (!cancelled && r.ok) {
          setHeadline(r.data.intelligence.headline);
          setSuggestions(r.data.intelligence.suggestions);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const name = nameFromEmail(entity?.email ?? null);
  const ctxActive = surfaceContext !== null && surfaceContext.active;
  const ctxLabel = ctxActive
    ? surfaceContext.title ?? surfaceContext.summary ?? "Current context"
    : null;

  const [urgentBlindSpots, setUrgentBlindSpots] = useState(0);
  // [DGI WAVE-2/4] Single server authority for collaborative organizational
  // intelligence (pairing + work + truth + handoffs + collab plan + authority).
  const [dgi, setDgi] = useState<DgiCoherenceSnapshot | null>(null);
  const [collabPlan, setCollabPlan] = useState<DgiCollaborationPlanView | null>(
    null,
  );
  const [authorityPosture, setAuthorityPosture] =
    useState<DgiTwinAuthorityPosture | null>(null);
  const [dgiLoaded, setDgiLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.workOs
      .blindSpots()
      .then((r) => {
        if (cancelled || !r.ok) return;
        const items = r.data.items ?? r.data.entries ?? [];
        setUrgentBlindSpots(items.filter((e) => triagePriority(e) <= 2).length);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.otzar
      .dgiCoherence()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setDgi(r.data.coherence);
          setCollabPlan(r.data.collaboration_plan ?? null);
          setAuthorityPosture(r.data.twin_authority_posture ?? null);
        }
        setDgiLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setDgiLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nothingInFlight =
    approvalsCount === 0 && actionUnreadCount === 0 && urgentBlindSpots === 0;

  const workNodes = buildWorkNodes({
    recipients: [],
    awaitingRecipient: false,
    draft: null,
    contextTitle: ctxLabel,
    approvalsCount,
    unreadCount,
    correctionsActive: dgi?.active_personal_corrections_count ?? 0,
  });

  const dgiIntensity = dgiPanelIntensity(dgi);

  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col gap-5 px-1 pb-32 pt-4 sm:max-w-xl sm:pt-8"
      data-testid="ambient-work-surface"
    >
      {/* Hero presence stage — glanceable identity + intent (Design Law §1). */}
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 px-5 py-7 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:px-8 sm:py-9">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="otzar-aurora-layer opacity-70" />
        </div>
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
          <OtzarMark size="lg" active={!quiet} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-light tracking-tight text-slate-900 sm:text-3xl">
              {greetingFor(new Date().getHours(), name)}
            </h1>
            <p
              className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500"
              data-testid="ambient-presence-line"
            >
              {quiet ? (
                <>
                  <MoonStar className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                  Otzar is quiet while you focus.
                </>
              ) : (
                "I'm here. I'll stay out of your way unless something needs your attention."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* DGI COHERENCE — always-visible trust surface (server authority). */}
      {dgiLoaded ? (
        <GlassPanel
          intensity={dgiIntensity}
          label="Organizational intelligence"
          testId="dgi-coherence-panel"
        >
          <div className="space-y-2.5 text-sm text-slate-700">
            <p className="text-xs leading-relaxed text-slate-500">
              Your AI Teammate keeps private context private. Shared
              organizational answers only appear after governed promotion —
              never from chat alone.
            </p>

            {/* Next-best-step — server-derived action, not a dashboard tile. */}
            {dgi?.next_best_step &&
            dgi.next_best_step.kind !== "IDLE_HEALTHY" ? (
              <Link
                to={dgi.next_best_step.route_hint || "/app/action-center"}
                className="flex items-center justify-between gap-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.06] px-3 py-2.5 transition-colors hover:bg-violet-500/[0.1]"
                data-testid="dgi-next-best-step"
                data-kind={dgi.next_best_step.kind}
                data-autonomy={dgi.next_best_step.autonomy_ceiling}
              >
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900">
                    {dgi.next_best_step.safe_title}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {dgi.next_best_step.reason}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-900">
                  Next <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
              </Link>
            ) : null}

            {/* Pairing posture — fail-closed multi-Twin / unpaired recovery. */}
            {dgi?.coherence_status === "BLOCKED" ? (
              <div
                className="flex items-start gap-2.5 rounded-xl bg-amber-400/15 px-3 py-2.5"
                data-testid="dgi-twin-blocked"
              >
                <ShieldAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-800"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {dgi.eligible_twin_count} AI Teammates are linked — Otzar
                    will not blend them
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Resolve to a single active Twin before collaborative
                    intelligence continues.
                  </p>
                  <Link
                    to="/app/my-twin"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline"
                    data-testid="dgi-resolve-twin"
                  >
                    Open My Twin <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </div>
            ) : null}

            {dgi?.coherence_status === "UNPAIRED" ? (
              <div
                className="flex items-start gap-2.5 rounded-xl bg-slate-900/5 px-3 py-2.5"
                data-testid="dgi-twin-unpaired"
              >
                <Users
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    No AI Teammate is paired yet
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Pair a Twin to unlock governed organizational intelligence.
                  </p>
                  <Link
                    to="/app/my-twin"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-slate-800 underline-offset-2 hover:underline"
                    data-testid="dgi-pair-twin"
                  >
                    Set up My Twin <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </div>
            ) : null}

            {dgi?.coherence_status === "HEALTHY" ? (
              <p
                className="flex items-center gap-2 text-xs text-slate-500"
                data-testid="dgi-healthy"
              >
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"
                />
                Coherence is healthy — no open organizational pressure.
              </p>
            ) : null}

            {dgi !== null && dgi.open_obligations_count > 0 ? (
              <Link
                to="/app/action-center"
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/50"
                data-testid="dgi-open-obligations"
              >
                <span>
                  {dgi.open_obligations_count === 1
                    ? "1 open obligation in your work"
                    : `${dgi.open_obligations_count} open obligations in your work`}
                  {dgi.open_obligation_titles[0] ? (
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      e.g. {dgi.open_obligation_titles[0]}
                    </span>
                  ) : null}
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden
                />
              </Link>
            ) : null}

            {dgi !== null && dgi.open_incoming_handoffs_count > 0 ? (
              <Link
                to="/app/action-center"
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/50"
                data-testid="dgi-incoming-handoffs"
              >
                <span>
                  {dgi.open_incoming_handoffs_count === 1
                    ? "1 incoming handoff needs acknowledgment"
                    : `${dgi.open_incoming_handoffs_count} incoming handoffs need acknowledgment`}
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden
                />
              </Link>
            ) : null}

            {dgi !== null && dgi.open_org_truth_conflicts_count > 0 ? (
              <Link
                to="/app/action-center"
                className="flex items-center justify-between gap-3 rounded-xl bg-amber-400/10 px-3 py-2.5 transition-colors hover:bg-amber-400/15"
                data-testid="dgi-org-truth-conflicts"
              >
                <span className="font-medium text-slate-900">
                  {dgi.open_org_truth_conflicts_count === 1
                    ? "1 organizational truth conflict needs review"
                    : `${dgi.open_org_truth_conflicts_count} organizational truth conflicts need review`}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/25 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                  Review <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
              </Link>
            ) : null}

            {/* Collaboration plan — top deterministic recommendation (WAVE-4). */}
            {collabPlan !== null &&
            collabPlan.recommendation_count > 0 &&
            collabPlan.recommendations[0] ? (
              <div
                className="rounded-xl border border-white/50 bg-white/40 px-3 py-2 text-xs text-slate-600"
                data-testid="dgi-collab-plan"
                data-kind={collabPlan.recommendations[0].kind}
              >
                <p className="font-medium text-slate-800">
                  Collaboration plan · {collabPlan.recommendations[0].kind}
                </p>
                <p className="mt-0.5 leading-relaxed">
                  {collabPlan.recommendations[0].safe_summary}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Ceiling: {collabPlan.recommendations[0].autonomy_ceiling}
                  {collabPlan.metrics.fail_closed_count > 0
                    ? ` · ${collabPlan.metrics.fail_closed_count} fail-closed`
                    : ""}
                </p>
              </div>
            ) : null}

            {/* Quiet capacity strip — corrections + authority (not pressure). */}
            {dgi !== null &&
            (dgi.active_personal_corrections_count > 0 ||
              dgi.active_twin_authority_grants_count > 0 ||
              authorityPosture !== null) &&
            dgi.coherence_status !== "BLOCKED" &&
            dgi.coherence_status !== "UNPAIRED" ? (
              <div
                className="flex flex-wrap gap-2 border-t border-white/50 pt-2 text-[11px] text-slate-500"
                data-testid="dgi-capacity-strip"
              >
                {dgi.active_personal_corrections_count > 0 ? (
                  <span data-testid="dgi-corrections-count">
                    {dgi.active_personal_corrections_count} personal correction
                    {dgi.active_personal_corrections_count === 1 ? "" : "s"}
                  </span>
                ) : null}
                {dgi.active_twin_authority_grants_count > 0 ? (
                  <span data-testid="dgi-authority-count">
                    {dgi.active_twin_authority_grants_count} Twin authorit
                    {dgi.active_twin_authority_grants_count === 1 ? "y" : "ies"}{" "}
                    granted
                  </span>
                ) : null}
                {authorityPosture !== null &&
                !authorityPosture.has_active_grants ? (
                  <Link
                    to="/app/authority-grants"
                    className="underline-offset-2 hover:underline"
                    data-testid="dgi-authority-missing"
                  >
                    No Twin authority grants — material actions need approval
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </GlassPanel>
      ) : null}

      {/* NEEDS YOU — only when the human must act. Category-specific copy. */}
      {approvalsCount > 0 || actionUnreadCount > 0 || urgentBlindSpots > 0 ? (
        <GlassPanel
          intensity="attention"
          label="Needs you"
          testId="needs-me-panel"
        >
          <div className="space-y-2 text-sm">
            {approvalsCount > 0 ? (
              <Link
                to="/app/action-center"
                className="flex items-center justify-between gap-3 rounded-xl bg-amber-400/10 px-3 py-2.5 transition-colors hover:bg-amber-400/15"
                data-testid="needs-approvals"
              >
                <span className="font-medium text-slate-900">
                  {approvalsCount === 1
                    ? "1 approval is waiting"
                    : `${approvalsCount} approvals are waiting`}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/25 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                  Review <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
              </Link>
            ) : null}
            {urgentBlindSpots > 0 ? (
              <Link
                to="/app/blind-spots"
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-slate-800 transition-colors hover:bg-white/50"
                data-testid="needs-blind-spots"
              >
                <span>
                  {urgentBlindSpots === 1
                    ? "1 item is stuck and needs a decision"
                    : `${urgentBlindSpots} items are stuck and need a decision`}
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden
                />
              </Link>
            ) : null}
            {actionUnreadCount > 0 ? (
              <Link
                to="/app/comms"
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-slate-800 transition-colors hover:bg-white/50"
                data-testid="needs-replies"
              >
                <span>
                  {actionUnreadCount === 1
                    ? "1 reply to review"
                    : `${actionUnreadCount} replies to review`}
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden
                />
              </Link>
            ) : null}
          </div>
        </GlassPanel>
      ) : null}

      {/* WHAT CHANGED — one calm headline + deep-linked suggestions. */}
      {headline !== null ? (
        <GlassPanel
          intensity={suggestions.length > 0 ? "attention" : "ambient"}
          label="What changed"
          testId="changed-panel"
        >
          <p
            className="text-sm leading-relaxed text-slate-600"
            data-testid="changed-headline"
          >
            {headline}
          </p>
          {suggestions.length > 0 ? (
            <ul className="mt-3 space-y-1.5" data-testid="changed-suggestions">
              {suggestions.slice(0, 3).map((s) => (
                <li key={`${s.rank}-${s.reason}`}>
                  <Link
                    to="/app/my-day"
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/60 bg-white/50 px-3 py-2.5 text-sm text-slate-800 transition-colors hover:border-indigo-200/80 hover:bg-white/80"
                    data-testid="changed-suggestion"
                  >
                    <span className="truncate">{s.safe_title}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-slate-400"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </GlassPanel>
      ) : null}

      {/* CONTEXT — what Otzar is using. */}
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
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-800"
            >
              Clear
            </button>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-slate-500">
            No context yet. Tell Otzar what you&apos;re working on and it
            remembers.
          </p>
        )}
      </GlassPanel>

      {/* CONNECTED NOW — collapsed real-node strip. */}
      {workNodes.length > 0 ? (
        <details className="group px-1" data-testid="surface-work-nodes">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400"
            />
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
                <span
                  aria-hidden
                  className={`inline-block h-1 w-1 rounded-full ${intensityDot(n.intensity)}`}
                />
                {n.label}
              </span>
            ))}
          </div>
        </details>
      ) : null}

      {/* ALL CAUGHT UP — calm, not blank. */}
      {nothingInFlight &&
      (dgi === null || dgi.attention_count === 0) &&
      dgi?.coherence_status !== "BLOCKED" &&
      dgi?.coherence_status !== "UNPAIRED" ? (
        <div
          className="flex items-start gap-2.5 px-1"
          data-testid="ambient-caught-up"
        >
          <Sparkles
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300"
            aria-hidden
          />
          <p className="text-sm leading-relaxed text-slate-400">
            You&apos;re all caught up. Otzar is listening.
          </p>
        </div>
      ) : null}

      {/* Primary invitation — the orb is the engine. */}
      <button
        type="button"
        onClick={openOrb}
        data-testid="ambient-talk"
        className={`${GLASS_CTA} mt-1 flex items-center gap-3 px-4 py-3.5 text-left text-sm text-slate-600 hover:text-slate-900`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900/5">
          <Mic className="h-4 w-4 text-slate-500" aria-hidden />
        </span>
        <span className="leading-snug">
          Just talk — &ldquo;what matters today?&rdquo;, &ldquo;what needs my
          approval?&rdquo;, &ldquo;open my workspace&rdquo;.
        </span>
      </button>

      <Link
        to="/app/my-day"
        className="px-1 text-xs font-medium text-slate-400 underline-offset-4 transition-colors hover:text-slate-700 hover:underline"
        data-testid="ambient-open-workbench"
      >
        Open the full workbench →
      </Link>
    </div>
  );
}
