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
  FolderKanban,
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
  WorkProjectSafeView,
} from "@/lib/types/foundation";
import { triagePriority } from "@/lib/work-os/blind-spot-triage";
import {
  activeTwinWorkItems,
  twinAccuracyLabel,
  twinWorkDocClaimIds,
  twinWorkEditDetected,
  twinWorkNeedsVerification,
  twinWorkStateLabel,
} from "@/lib/work-os/twin-work";
import { FirstUseReveal } from "@/components/first-use/FirstUseReveal";

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
  const [verifyBusyId, setVerifyBusyId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  // A.2 — projects you are on (Work OS coherence anchor).
  const [myProjects, setMyProjects] = useState<WorkProjectSafeView[]>([]);
  // A.3 ambient — manager-only soft signal (reports without a first project).
  const [managerGapCount, setManagerGapCount] = useState(0);

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
    api.otzar.workProjects
      .list({ state: "ACTIVE", take: 8 })
      .then((r) => {
        if (cancelled || !r.ok) return;
        setMyProjects(r.data.projects ?? []);
      })
      .catch(() => undefined);
    api.otzar.workProjects
      .managerStructureGaps()
      .then((r) => {
        if (cancelled || !r.ok) return;
        setManagerGapCount(r.data.reports?.length ?? 0);
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
      .then(async (r) => {
        if (cancelled || !r.ok) return;
        const items = r.data.items ?? r.data.entries ?? [];
        const active = activeTwinWorkItems(items).slice(0, 5);
        setTwinWorking(active);
        // [C.3b] Best-effort edit check for claimed docs (honest NO_DOCUMENT skips).
        const docIds = twinWorkDocClaimIds(active).slice(0, 5);
        if (docIds.length === 0) return;
        try {
          const d = await api.otzar.twinWorkDetectEditsBatch(docIds);
          if (cancelled || !d.ok) return;
          const edited = new Set(
            d.data.results
              .filter(
                (x): x is {
                  ledger_entry_id: string;
                  ok: true;
                  edit_detected: boolean;
                  edit_signal: string;
                } => x.ok === true && x.edit_detected === true,
              )
              .map((x) => x.ledger_entry_id),
          );
          if (edited.size === 0) return;
          setTwinWorking((prev) =>
            prev.map((e) => {
              if (!edited.has(e.ledger_entry_id) || e.twin_work === undefined) {
                return e;
              }
              return {
                ...e,
                twin_work: {
                  ...e.twin_work,
                  edit_detected: true,
                  edit_signal: "MODIFIED_AFTER_CLAIM",
                },
              };
            }),
          );
        } catch {
          // edit detect is best-effort; panel still shows claims
        }
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

  const verifyTwinWork = async (ledgerEntryId: string) => {
    setVerifyBusyId(ledgerEntryId);
    setVerifyError(null);
    try {
      const r = await api.otzar.twinWorkVerify(ledgerEntryId, {
        note: "Verified from Today",
        complete_after: true,
      });
      if (r.ok) {
        setTwinWorking((prev) =>
          prev.filter((e) => e.ledger_entry_id !== ledgerEntryId),
        );
      } else {
        setVerifyError("code" in r ? String(r.code) : "VERIFY_FAILED");
      }
    } catch {
      setVerifyError("NETWORK_ERROR");
    } finally {
      setVerifyBusyId(null);
    }
  };

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

  // One-shot Focus: at most a few actions that need the human now.
  // Everything else is glance chips — users do not live in Otzar.
  type FocusItem = {
    key: string;
    title: string;
    detail?: string;
    to?: string;
    tone: "attention" | "working" | "ambient";
    actionLabel?: string;
    onAction?: () => void;
    actionBusy?: boolean;
    testId: string;
  };
  const focusItems: FocusItem[] = [];
  if (dgi?.coherence_status === "BLOCKED") {
    focusItems.push({
      key: "blocked",
      title: `${dgi.eligible_twin_count} AI Teammates linked — pick one`,
      detail: "Otzar will not blend them.",
      to: "/app/my-twin",
      tone: "attention",
      testId: "dgi-twin-blocked",
    });
  } else if (dgi?.coherence_status === "UNPAIRED") {
    focusItems.push({
      key: "unpaired",
      title: "No AI Teammate paired yet",
      detail: "Pair a Twin for governed organizational intelligence.",
      to: "/app/my-twin",
      tone: "working",
      testId: "dgi-twin-unpaired",
    });
  }
  if (
    dgi?.next_best_step &&
    dgi.next_best_step.kind !== "IDLE_HEALTHY" &&
    focusItems.length < 3
  ) {
    focusItems.push({
      key: "nbs",
      title: dgi.next_best_step.safe_title,
      detail: dgi.next_best_step.reason,
      to: dgi.next_best_step.route_hint || "/app/action-center",
      tone: "attention",
      testId: "dgi-next-best-step",
    });
  }
  if (approvalsCount > 0 && focusItems.length < 3) {
    focusItems.push({
      key: "approvals",
      title:
        approvalsCount === 1
          ? "1 approval is waiting"
          : `${approvalsCount} approvals are waiting`,
      to: "/app/action-center",
      tone: "attention",
      testId: "needs-approvals",
    });
  }
  if (urgentBlindSpots > 0 && focusItems.length < 3) {
    focusItems.push({
      key: "blind",
      title:
        urgentBlindSpots === 1
          ? "1 item is stuck and needs a decision"
          : `${urgentBlindSpots} items are stuck and need a decision`,
      to: "/app/action-center",
      tone: "attention",
      testId: "needs-blind-spots",
    });
  }
  if (actionUnreadCount > 0 && focusItems.length < 3) {
    focusItems.push({
      key: "replies",
      title:
        actionUnreadCount === 1
          ? "1 reply to review"
          : `${actionUnreadCount} replies to review`,
      to: "/app/comms",
      tone: "working",
      testId: "needs-replies",
    });
  }
  for (const h of incomingHandoffs.slice(0, 2)) {
    if (focusItems.length >= 3) break;
    focusItems.push({
      key: `handoff-${h.handoff_id}`,
      title: h.title,
      detail: h.summary ?? undefined,
      tone: "working",
      actionLabel: "Acknowledge",
      onAction: () => void acknowledgeHandoff(h),
      actionBusy: ackBusyId === h.handoff_id,
      testId: "ambient-handoff-row",
    });
  }
  for (const e of twinWorking) {
    if (focusItems.length >= 3) break;
    const tw = e.twin_work;
    if (tw === undefined) continue;
    const needsVerify = twinWorkNeedsVerification(tw);
    if (!needsVerify && tw.state !== "NEEDS_CLARITY" && tw.state !== "COLLAB_REQUESTED") {
      continue;
    }
    focusItems.push({
      key: `twin-${e.ledger_entry_id}`,
      title: e.title,
      detail: twinWorkStateLabel(tw.state),
      tone: "working",
      to: needsVerify ? undefined : "/app/my-work",
      actionLabel: needsVerify ? "Verify" : "Open",
      onAction: needsVerify
        ? () => void verifyTwinWork(e.ledger_entry_id)
        : undefined,
      actionBusy: verifyBusyId === e.ledger_entry_id,
      testId: "twin-working-row",
    });
  }
  // Intelligence suggestions only when they add a real action — calm
  // "keeping watch" headlines must not invent a Focus card (one-shot calm).
  if (focusItems.length === 0 && suggestions.length > 0) {
    if (headline !== null) {
      focusItems.push({
        key: "headline",
        title: headline,
        tone: "ambient",
        testId: "changed-headline",
        to: "/app/action-center",
      });
    }
    for (const s of suggestions.slice(0, 2)) {
      if (focusItems.length >= 3) break;
      focusItems.push({
        key: `sug-${s.rank}`,
        title: s.safe_title,
        to: "/app/my-day",
        tone: "ambient",
        testId: "changed-suggestion",
      });
    }
  }

  const glance: Array<{
    key: string;
    label: string;
    to: string;
    testId: string;
    show: boolean;
  }> = [
    {
      key: "projects",
      label:
        myProjects.length > 0
          ? `${myProjects.length} project${myProjects.length === 1 ? "" : "s"}`
          : "Projects",
      to: "/app/work-projects",
      testId: "my-projects-open-all",
      show: true,
    },
    {
      key: "twin",
      label:
        twinWorking.length > 0
          ? `AI · ${twinWorking.length}`
          : "AI Teammate",
      to: twinWorking.length > 0 ? "/app/my-work" : "/app/my-twin",
      testId: "twin-working-open-my-work",
      show: true,
    },
    {
      key: "needs",
      label:
        actionUnreadCount + urgentBlindSpots + inboundCollab.length > 0
          ? `More · ${actionUnreadCount + urgentBlindSpots + inboundCollab.length}`
          : "Needs me",
      to: "/app/action-center",
      testId: "glance-needs-me",
      show: true,
    },
    {
      key: "doc",
      label: docLink ? "Working doc" : "New doc",
      to: docLink ?? "#create-doc",
      testId: docLink ? "google-doc-open" : "google-doc-create",
      show: true,
    },
  ];

  const calmCaughtUp =
    focusItems.length === 0 &&
    nothingInFlight &&
    (dgi === null || dgi.attention_count === 0) &&
    dgi?.coherence_status !== "BLOCKED" &&
    dgi?.coherence_status !== "UNPAIRED";

  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col gap-3 px-1 pb-28 pt-2 sm:max-w-xl sm:pt-4"
      data-testid="ambient-work-surface"
    >
      {/* One-shot hero — presence + optional first-use strip (not a second page). */}
      <section className="otzar-stage relative px-4 py-5 sm:px-6 sm:py-6">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="otzar-aurora-layer opacity-80" />
          <div className="otzar-grain opacity-[0.03]" />
        </div>
        <div className="relative flex items-center gap-4">
          <OtzarMark size="lg" active={!quiet} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-500/80">
              Today
            </p>
            <h1 className="otzar-text-luminous mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
              {greetingFor(new Date().getHours(), name)}
            </h1>
            <p
              className="mt-1 text-xs leading-snug text-slate-500"
              data-testid="ambient-presence-line"
            >
              {quiet ? (
                <>
                  <MoonStar className="mr-1 inline h-3 w-3" aria-hidden />
                  Quiet mode
                </>
              ) : dgi?.coherence_status === "NEEDS_ATTENTION" ? (
                "One thing needs you — the rest stays quiet."
              ) : dgi?.coherence_status === "BLOCKED" ||
                dgi?.coherence_status === "UNPAIRED" ? (
                "Present — pairing needs a quick fix."
              ) : dgi?.coherence_status === "HEALTHY" ? (
                "Present. Not another dashboard."
              ) : (
                "Speak, act, or leave me quiet."
              )}
            </p>
            <FirstUseReveal />
          </div>
        </div>
      </section>

      {/* FOCUS — max ~3 actions. The ADHD / YC one-shot surface. */}
      {focusItems.length > 0 ? (
        <GlassPanel
          intensity={
            focusItems.some((f) => f.tone === "attention")
              ? "attention"
              : dgiIntensity
          }
          label="Focus"
          testId="dgi-coherence-panel"
        >
          <ul className="space-y-1.5" data-testid="changed-suggestions">
            {focusItems.map((item) => (
              <li key={item.key}>
                {item.onAction ? (
                  <div
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/50 bg-white/45 px-3 py-2.5"
                    data-testid={item.testId}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      {item.detail ? (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                          {item.detail}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={item.actionBusy}
                      onClick={item.onAction}
                      className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                    >
                      {item.actionBusy ? "…" : item.actionLabel ?? "Go"}
                    </button>
                  </div>
                ) : (
                  <Link
                    to={item.to ?? "/app/action-center"}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/50 bg-white/45 px-3 py-2.5 transition-colors hover:bg-white/70"
                    data-testid={item.testId}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      {item.detail ? (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                          {item.detail}
                        </p>
                      ) : null}
                    </div>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-slate-400"
                      aria-hidden
                    />
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {ackError !== null ? (
            <p className="mt-2 text-[11px] text-rose-700" data-testid="ambient-handoff-ack-error">
              Couldn&apos;t acknowledge ({ackError}).
            </p>
          ) : null}
          {verifyError !== null ? (
            <p className="mt-2 text-[11px] text-rose-700" data-testid="twin-working-verify-error">
              Couldn&apos;t verify ({verifyError}).
            </p>
          ) : null}
        </GlassPanel>
      ) : calmCaughtUp ? (
        <div
          className="flex items-center gap-2 px-1 py-1"
          data-testid="ambient-caught-up"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
          <p className="text-sm text-slate-400" data-testid="dgi-healthy">
            You&apos;re clear. Otzar is listening.
          </p>
        </div>
      ) : dgiLoaded ? (
        <p className="px-1 text-xs text-slate-400" data-testid="dgi-coherence-panel">
          Nothing urgent in focus — open Needs me or talk.
        </p>
      ) : null}

      {/* GLANCE — one row of chips, not stacked panels. */}
      <div
        className="flex flex-wrap gap-1.5 px-0.5"
        data-testid="today-glance"
        role="navigation"
        aria-label="Quick destinations"
      >
        {glance
          .filter((g) => g.show)
          .map((g) =>
            g.to === "#create-doc" ? (
              <button
                key={g.key}
                type="button"
                data-testid={g.testId}
                disabled={docBusy}
                onClick={() => void createWorkingDoc()}
                className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/55 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-sm transition hover:bg-white/80 disabled:opacity-60"
              >
                <FileText className="h-3 w-3 text-slate-500" aria-hidden />
                {docBusy ? "…" : g.label}
              </button>
            ) : g.to.startsWith("http") || (docLink && g.key === "doc") ? (
              <a
                key={g.key}
                href={g.key === "doc" && docLink ? docLink : g.to}
                target={g.key === "doc" ? "_blank" : undefined}
                rel={g.key === "doc" ? "noreferrer" : undefined}
                data-testid={g.testId}
                className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/55 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-sm transition hover:bg-white/80"
              >
                {g.label}
              </a>
            ) : (
              <Link
                key={g.key}
                to={g.to}
                data-testid={g.testId}
                className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/55 px-2.5 py-1 text-[11px] font-medium text-slate-700 backdrop-blur-sm transition hover:bg-white/80"
              >
                {g.key === "projects" ? (
                  <FolderKanban className="h-3 w-3 text-slate-500" aria-hidden />
                ) : null}
                {g.label}
              </Link>
            ),
          )}
        {managerGapCount > 0 ? (
          <Link
            to="/app/work-projects"
            data-testid="manager-placement-ambient-cta"
            className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/60 px-2.5 py-1 text-[11px] font-medium text-amber-900"
          >
            {managerGapCount} to place
          </Link>
        ) : null}
      </div>
      {docError !== null ? (
        <p className="px-1 text-[11px] text-amber-800" data-testid="google-doc-create-error">
          {docError}{" "}
          <Link to="/app/connector-health" className="font-semibold underline-offset-2 hover:underline">
            Fix connection
          </Link>
        </p>
      ) : null}

      {/* Single primary invitation — Talk is the engine. */}
      <button
        type="button"
        onClick={openOrb}
        data-testid="ambient-talk"
        className={`${GLASS_CTA} flex w-full items-center gap-3 px-3.5 py-3 text-left transition-transform active:scale-[0.99]`}
      >
        <span className="otzar-cta-fill flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <Mic className="h-4 w-4 text-white" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">
            Talk to Otzar
          </span>
          <span className="block text-[11px] text-slate-500">
            What matters · what needs me · open work
          </span>
        </span>
      </button>

      {/* Power-user detail only — not the default scroll path. */}
      <details className="group px-1" data-testid="today-more-details">
        <summary className="cursor-pointer list-none text-[11px] font-medium text-slate-400 hover:text-slate-600">
          More detail
          <span className="ml-1 opacity-50 group-open:hidden">
            · projects, team, context
          </span>
        </summary>
        <div className="mt-2 space-y-2">
          {myProjects.length > 0 ? (
            <GlassPanel intensity="ambient" label="Projects" testId="my-projects-panel">
              <ul className="space-y-1" data-testid="my-projects-list">
                {myProjects.slice(0, 4).map((proj) => (
                  <li key={proj.project_id}>
                    <Link
                      to="/app/work-projects"
                      className="block truncate rounded-lg px-2 py-1.5 text-sm text-slate-800 hover:bg-white/50"
                      data-testid="my-projects-row"
                      data-project-id={proj.project_id}
                    >
                      {proj.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          ) : (
            <p className="px-1 text-xs text-slate-400" data-testid="my-projects-empty-cta">
              No projects yet — your manager can place you when ready.
            </p>
          )}
          {teamPeople.length > 0 ? (
            <GlassPanel intensity="ambient" label="Team" testId="team-work-panel">
              <ul className="space-y-1">
                {teamPeople.slice(0, 4).map((person) => (
                  <li
                    key={person.display_name}
                    className="flex justify-between gap-2 px-2 py-1 text-sm"
                    data-testid="team-work-person"
                  >
                    <span className="truncate font-medium text-slate-800">
                      {person.display_name}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-500">
                      {person.open_obligation_count + person.open_incoming_handoff_count} open
                    </span>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          ) : null}
          {ctxActive ? (
            <GlassPanel intensity="ambient" label="Context" testId="context-panel">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-slate-700" data-testid="context-active">
                  Working from {ctxLabel}
                </span>
                <button
                  type="button"
                  onClick={() => clearContext()}
                  data-testid="context-clear"
                  className="shrink-0 text-[11px] text-slate-500 hover:text-slate-800"
                >
                  Clear
                </button>
              </div>
            </GlassPanel>
          ) : null}
          {inboundCollab.length > 0 ? (
            <Link
              to="/app/collaboration"
              className="block px-1 text-xs font-medium text-sky-800"
              data-testid="ambient-inbound-collab"
            >
              {inboundCollab.length} collaboration
              {inboundCollab.length === 1 ? "" : "s"} in inbox →
            </Link>
          ) : null}
        </div>
      </details>

      <Link
        to="/app/my-day"
        className="px-1 text-center text-[11px] font-medium text-slate-400 underline-offset-4 hover:text-slate-600 hover:underline"
        data-testid="ambient-open-workbench"
      >
        Full workbench
      </Link>
    </div>
  );
}
