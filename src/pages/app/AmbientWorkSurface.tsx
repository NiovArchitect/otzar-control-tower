// FILE: AmbientWorkSurface.tsx
// PURPOSE: Default employee experience at /app. NOT a dashboard — an ambient
//          intelligence surface that answers in 5 seconds (ADHD test): what
//          needs me, what changed, what context Otzar holds, one next action.
//          Built ONLY from real rails. Design Law + PRD-01 + quality rubric.
//          [DGI-COHERENCE WAVE-2] Always-visible organizational intelligence
//          strip from GET /otzar/dgi-coherence (single server authority).
//          [C.3] Twin-claimed EXECUTING work from GET /work-os/my-work so
//          humans see "Your AI Teammate is working on this" without dual effort.
// CONNECTS TO: EmployeeLayout, GlassPanel, presence, myDayIntelligence,
//              api.otzar.dgiCoherence, api.workOs.myWork + twin_work.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Mic,
  MoonStar,
  ShieldAlert,
  Sparkles,
  Users,
  Handshake,
  FileText,
  Bot,
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
  CollaborationRequestSafeView,
  DgiCoherenceSnapshot,
  DgiCollaborationPlanView,
  DgiTwinAuthorityPosture,
  MyDaySuggestion,
  SafeHandoffView,
  WorkLedgerEntryView,
} from "@/lib/types/foundation";
import { triagePriority } from "@/lib/work-os/blind-spot-triage";
import {
  activeTwinWorkItems,
  twinAccuracyLabel,
  twinWorkStateLabel,
} from "@/lib/work-os/twin-work";

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
  const [teamPeople, setTeamPeople] = useState<
    Array<{
      display_name: string;
      open_obligation_count: number;
      open_incoming_handoff_count: number;
      sample_titles: string[];
    }>
  >([]);
  // [GOOGLE-DOCS-WRITE] One-tap create a real Google Doc from Today.
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docLink, setDocLink] = useState<string | null>(null);
  const [incomingHandoffs, setIncomingHandoffs] = useState<SafeHandoffView[]>(
    [],
  );
  const [inboundCollab, setInboundCollab] = useState<
    CollaborationRequestSafeView[]
  >([]);
  const [ackBusyId, setAckBusyId] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);
  const [collabBusyId, setCollabBusyId] = useState<string | null>(null);
  // [C.3] AI Teammate claims currently in flight (my-work twin_work projection).
  const [twinWorking, setTwinWorking] = useState<WorkLedgerEntryView[]>([]);

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
    api.workOs
      .myWork({ take: 50 })
      .then((r) => {
        if (cancelled || !r.ok) return;
        const items = r.data.items ?? r.data.entries ?? [];
        setTwinWorking(activeTwinWorkItems(items).slice(0, 5));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshDgi = useCallback(() => {
    return api.otzar
      .dgiCoherence()
      .then((r) => {
        if (r.ok) {
          setDgi(r.data.coherence);
          setCollabPlan(r.data.collaboration_plan ?? null);
          setAuthorityPosture(r.data.twin_authority_posture ?? null);
        }
        setDgiLoaded(true);
      })
      .catch(() => {
        setDgiLoaded(true);
      });
  }, []);

  useEffect(() => {
    void refreshDgi();
  }, [refreshDgi]);

  const refreshHandoffs = useCallback(() => {
    return api.otzar.handoffs
      .list({
        role: "incoming",
        state: "SENT,RECEIVED,CLARIFICATION_REQUIRED",
        limit: 5,
      })
      .then((r) => {
        if (r.ok) setIncomingHandoffs(r.data.handoffs ?? []);
      })
      .catch(() => undefined);
  }, []);

  const refreshInboundCollab = useCallback(() => {
    return api.otzar.collaboration
      .inbound({ take: 12 })
      .then((r) => {
        if (!r.ok) return;
        const actionable = (r.data.collaborations ?? []).filter(
          (c) =>
            c.state === "REQUESTED" ||
            c.state === "NEEDS_APPROVAL" ||
            c.state === "IN_PROGRESS",
        );
        setInboundCollab(actionable.slice(0, 5));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void refreshHandoffs();
    void refreshInboundCollab();
  }, [refreshHandoffs, refreshInboundCollab]);

  useEffect(() => {
    let cancelled = false;
    api.otzar
      .teamWork()
      .then((r) => {
        if (cancelled || !r.ok) return;
        setTeamPeople(r.data.team_work.people ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const acknowledgeHandoff = async (h: SafeHandoffView) => {
    setAckBusyId(h.handoff_id);
    setAckError(null);
    try {
      const r = await api.otzar.handoffs.acknowledge(h.handoff_id, {
        expected_version: h.version,
      });
      if (r.ok) {
        setIncomingHandoffs((prev) =>
          prev.filter((x) => x.handoff_id !== h.handoff_id),
        );
        void refreshDgi();
      } else {
        setAckError("code" in r ? String(r.code) : "ACK_FAILED");
        void refreshHandoffs();
      }
    } catch {
      setAckError("NETWORK_ERROR");
    } finally {
      setAckBusyId(null);
    }
  };

  const acceptCollab = async (c: CollaborationRequestSafeView) => {
    setCollabBusyId(c.collaboration_id);
    try {
      const r = await api.otzar.collaboration.accept(c.collaboration_id);
      if (r.ok) {
        setInboundCollab((prev) =>
          prev.filter((x) => x.collaboration_id !== c.collaboration_id),
        );
      } else {
        void refreshInboundCollab();
      }
    } catch {
      void refreshInboundCollab();
    } finally {
      setCollabBusyId(null);
    }
  };

  // [GOOGLE-DOCS-WRITE] One-tap: create a real Google Doc after explicit confirm.
  // Honest gates surface reconnect / missing scope — never a fake success.
  const createWorkingDoc = async () => {
    setDocBusy(true);
    setDocError(null);
    setDocLink(null);
    const day = new Date().toISOString().slice(0, 10);
    try {
      const r = await api.connectorData.googleDocCreate({
        title: `Working notes · ${day}`,
        body_text:
          "Started from Otzar Today. Capture owners, decisions, and next steps here.",
        caller_confirmed: true,
        source_command: "ambient_today_create_doc",
      });
      if (r.ok && r.data.web_view_link) {
        setDocLink(r.data.web_view_link);
      } else if (r.ok) {
        setDocLink(
          `https://docs.google.com/document/d/${r.data.document_id}/edit`,
        );
      } else {
        const code = "code" in r ? String(r.code) : "CREATE_FAILED";
        if (code === "GOOGLE_RECONNECT_REQUIRED" || code === "DOC_WRITE_SCOPE_MISSING") {
          setDocError(
            "Reconnect Google in Tools & Connections and allow document create.",
          );
        } else if (code === "SESSION_INVALID") {
          setDocError("Sign in again to create a document.");
        } else {
          setDocError(code);
        }
      }
    } catch {
      setDocError("NETWORK_ERROR");
    } finally {
      setDocBusy(false);
    }
  };

  const nothingInFlight =
    approvalsCount === 0 &&
    actionUnreadCount === 0 &&
    urgentBlindSpots === 0 &&
    twinWorking.length === 0;

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
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/45 px-5 py-7 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:px-8 sm:py-9">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="otzar-aurora-layer opacity-80" />
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
                  Quiet mode — I&apos;m present, not interrupting.
                </>
              ) : dgi?.coherence_status === "NEEDS_ATTENTION" ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 motion-safe:animate-pulse"
                  />
                  I&apos;m with you — one thing needs you; the rest stays quiet.
                </span>
              ) : dgi?.coherence_status === "BLOCKED" ||
                dgi?.coherence_status === "UNPAIRED" ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                  />
                  I&apos;m here, but collaborative intelligence is paused until
                  pairing is clear.
                </span>
              ) : dgi?.coherence_status === "HEALTHY" ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/90"
                  />
                  Present. Working alongside you — not another dashboard.
                </span>
              ) : (
                "I'm with you across your work. Speak, act, or leave me quiet."
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

            {(dgi !== null && dgi.open_incoming_handoffs_count > 0) ||
            incomingHandoffs.length > 0 ? (
              <div
                className="space-y-2 rounded-xl border border-violet-400/15 bg-violet-500/[0.04] px-3 py-2.5"
                data-testid="dgi-incoming-handoffs"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    {(dgi?.open_incoming_handoffs_count ??
                      incomingHandoffs.length) === 1
                      ? "1 incoming handoff needs you"
                      : `${dgi?.open_incoming_handoffs_count ?? incomingHandoffs.length} incoming handoffs need you`}
                  </p>
                  <Link
                    to="/app/action-center?lane=handoffs"
                    className="text-[11px] font-semibold text-violet-900 underline-offset-2 hover:underline"
                  >
                    Open all
                  </Link>
                </div>
                {incomingHandoffs.slice(0, 2).map((h) => (
                  <div
                    key={h.handoff_id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-white/50 px-2.5 py-2"
                    data-testid="ambient-handoff-row"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-800">
                        {h.title}
                      </p>
                      {h.summary ? (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                          {h.summary}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      data-testid="ambient-handoff-ack"
                      disabled={ackBusyId === h.handoff_id}
                      onClick={() => void acknowledgeHandoff(h)}
                      className="shrink-0 rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                    >
                      {ackBusyId === h.handoff_id ? "…" : "Acknowledge"}
                    </button>
                  </div>
                ))}
                {ackError !== null ? (
                  <p
                    className="text-[11px] text-rose-700"
                    data-testid="ambient-handoff-ack-error"
                  >
                    Couldn&apos;t acknowledge ({ackError}). Try again or open
                    Action Center.
                  </p>
                ) : null}
              </div>
            ) : null}

            {inboundCollab.length > 0 ? (
              <div
                className="space-y-2 rounded-xl border border-sky-400/15 bg-sky-500/[0.04] px-3 py-2.5"
                data-testid="ambient-inbound-collab"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    <Handshake className="h-3.5 w-3.5 text-sky-700" aria-hidden />
                    {inboundCollab.length === 1
                      ? "1 collaboration waiting on you"
                      : `${inboundCollab.length} collaborations waiting on you`}
                  </p>
                  <Link
                    to="/app/collaboration"
                    className="text-[11px] font-semibold text-sky-900 underline-offset-2 hover:underline"
                  >
                    Inbox
                  </Link>
                </div>
                {inboundCollab.slice(0, 2).map((c) => (
                  <div
                    key={c.collaboration_id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-white/50 px-2.5 py-2"
                    data-testid="ambient-collab-row"
                  >
                    <p className="min-w-0 truncate text-xs text-slate-800">
                      {c.safe_summary}
                    </p>
                    {c.state === "REQUESTED" || c.state === "NEEDS_APPROVAL" ? (
                      <button
                        type="button"
                        data-testid="ambient-collab-accept"
                        disabled={collabBusyId === c.collaboration_id}
                        onClick={() => void acceptCollab(c)}
                        className="shrink-0 rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
                      >
                        {collabBusyId === c.collaboration_id ? "…" : "Accept"}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
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

      {/* TWIN WORKING — AI Teammate claimed work so you don't duplicate it. */}
      {twinWorking.length > 0 ? (
        <GlassPanel
          intensity="working"
          label="Your AI Teammate"
          testId="twin-working-panel"
        >
          <div className="space-y-2 text-sm text-slate-700">
            <p className="text-xs leading-relaxed text-slate-500">
              Your AI Teammate is handling this from communication — no need to
              start it yourself unless you want to take over.
            </p>
            <ul className="space-y-1.5" data-testid="twin-working-list">
              {twinWorking.map((e) => {
                const tw = e.twin_work!;
                const acc = twinAccuracyLabel(tw.accuracy_class);
                const needsHuman =
                  tw.state === "NEEDS_CLARITY" || tw.state === "COLLAB_REQUESTED";
                return (
                  <li
                    key={e.ledger_entry_id}
                    className="rounded-xl border border-violet-400/15 bg-violet-500/[0.04] px-3 py-2.5"
                    data-testid="twin-working-row"
                    data-twin-state={tw.state}
                    data-accuracy={tw.accuracy_class}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium text-slate-900">
                          <Bot
                            className="h-3.5 w-3.5 shrink-0 text-violet-700"
                            aria-hidden
                          />
                          <span className="truncate">{e.title}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {twinWorkStateLabel(tw.state)}
                          {acc !== null ? ` · ${acc}` : ""}
                          {tw.requires_verification
                            ? " · verification posture"
                            : ""}
                        </p>
                        {tw.state === "NEEDS_CLARITY" &&
                        tw.clarity_question !== null ? (
                          <p className="mt-1 text-xs text-slate-600">
                            {tw.clarity_question}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {tw.web_view_link !== null ? (
                          <a
                            href={tw.web_view_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-semibold text-violet-900 underline-offset-2 hover:underline"
                            data-testid="twin-working-open-doc"
                          >
                            Open doc
                          </a>
                        ) : null}
                        {needsHuman ? (
                          <Link
                            to="/app/my-work"
                            className="inline-flex items-center gap-1 rounded-full bg-amber-400/25 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
                            data-testid="twin-working-needs-you"
                          >
                            Needs you
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link
              to="/app/my-work"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-900 underline-offset-2 hover:underline"
              data-testid="twin-working-open-my-work"
            >
              All my work <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
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
                to="/app/action-center"
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

      {/* WHAT CHANGED — prefer DGI next-best-step when org pressure is live,
          otherwise My Day intelligence. One calm headline, no dual stories. */}
      {(() => {
        const dgiStep =
          dgi?.next_best_step && dgi.next_best_step.kind !== "IDLE_HEALTHY"
            ? dgi.next_best_step
            : null;
        const displayHeadline =
          dgiStep !== null
            ? dgiStep.reason
            : headline;
        const displaySuggestions =
          dgiStep !== null
            ? [
                {
                  rank: 1,
                  reason: dgiStep.kind,
                  safe_title: dgiStep.safe_title,
                  route: dgiStep.route_hint || "/app/action-center",
                },
                ...suggestions.slice(0, 2).map((s) => ({
                  rank: s.rank + 1,
                  reason: s.reason,
                  safe_title: s.safe_title,
                  route: "/app/my-day",
                })),
              ]
            : suggestions.slice(0, 3).map((s) => ({
                rank: s.rank,
                reason: s.reason,
                safe_title: s.safe_title,
                route: "/app/my-day",
              }));
        if (displayHeadline === null && displaySuggestions.length === 0) {
          return null;
        }
        return (
          <GlassPanel
            intensity={
              dgiStep !== null || suggestions.length > 0 ? "attention" : "ambient"
            }
            label="What needs attention"
            testId="changed-panel"
          >
            {displayHeadline !== null ? (
              <p
                className="text-sm leading-relaxed text-slate-600"
                data-testid="changed-headline"
                data-source={dgiStep !== null ? "dgi" : "my-day"}
              >
                {displayHeadline}
              </p>
            ) : null}
            {displaySuggestions.length > 0 ? (
              <ul className="mt-3 space-y-1.5" data-testid="changed-suggestions">
                {displaySuggestions.map((s) => (
                  <li key={`${s.rank}-${s.reason}`}>
                    <Link
                      to={s.route}
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
        );
      })()}

      {/* TEAM — capacity-only "what is my team working on?" */}
      {teamPeople.length > 0 ? (
        <GlassPanel
          intensity="working"
          label="Your team"
          testId="team-work-panel"
        >
          <ul className="space-y-2 text-sm text-slate-700">
            {teamPeople.slice(0, 5).map((p) => (
              <li
                key={p.display_name}
                className="rounded-xl px-3 py-2 hover:bg-white/40"
                data-testid="team-work-person"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {p.display_name}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {p.open_obligation_count + p.open_incoming_handoff_count} open
                  </span>
                </div>
                {p.sample_titles[0] ? (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {p.sample_titles[0]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </GlassPanel>
      ) : null}

      {/* Communication — Relay is the channel; Otzar is presence. */}
      <GlassPanel intensity="working" label="Messages" testId="relay-presence-panel">
        <div className="space-y-2 text-sm text-slate-700">
          <p className="text-xs leading-relaxed text-slate-500">
            Real-time conversation lives in Otzar Relay — not another
            dashboard tab. Otzar stays with you; messages feed governed work.
          </p>
          <a
            href={
              (import.meta as ImportMeta & { env?: { VITE_RELAY_URL?: string } })
                .env?.VITE_RELAY_URL ?? "https://github.com/NiovArchitect/otzar-relay"
            }
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.06] px-3 py-2.5 transition-colors hover:bg-violet-500/[0.1]"
            data-testid="open-relay"
          >
            <span className="font-medium text-slate-900">Open Otzar Relay</span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-900">
              Messages <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
          </a>
        </div>
      </GlassPanel>

      {/* Working doc — one-tap real Google Doc (gated; never fabricated). */}
      <GlassPanel intensity="working" label="Working document" testId="google-doc-panel">
        <div className="space-y-2 text-sm text-slate-700">
          <p className="text-xs leading-relaxed text-slate-500">
            Land shared writing in Google Docs — not a maze of admin screens.
            Otzar creates the doc only when you ask.
          </p>
          {docLink !== null ? (
            <a
              href={docLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-3 py-2.5 transition-colors hover:bg-emerald-500/[0.12]"
              data-testid="google-doc-open"
            >
              <span className="flex min-w-0 items-center gap-2 font-medium text-slate-900">
                <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden />
                <span className="truncate">Open your working doc</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">
                Open <ArrowRight className="h-3 w-3" aria-hidden />
              </span>
            </a>
          ) : (
            <button
              type="button"
              data-testid="google-doc-create"
              disabled={docBusy}
              onClick={() => void createWorkingDoc()}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-emerald-500/[0.1] disabled:opacity-60"
            >
              <span className="flex items-center gap-2 font-medium text-slate-900">
                <FileText className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
                {docBusy ? "Creating…" : "Create a Google Doc"}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">
                One tap
              </span>
            </button>
          )}
          {docError !== null ? (
            <p
              className="text-[11px] text-amber-800"
              data-testid="google-doc-create-error"
            >
              {docError}{" "}
              <Link
                to="/app/tools-connections"
                className="font-semibold underline-offset-2 hover:underline"
              >
                Tools & Connections
              </Link>
            </p>
          ) : null}
        </div>
      </GlassPanel>

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
