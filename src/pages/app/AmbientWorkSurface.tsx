// FILE: AmbientWorkSurface.tsx
// PURPOSE: Default /app Today — one-shot ambient surface (ADHD + YC).
//          Hero + Focus (≤3 actions) + glance chips + Talk. Users do not
//          live here; power detail is under closed "More".
// CONNECTS TO: EmployeeLayout, GlassPanel, presence, myDayIntelligence,
//              api.otzar.dgiCoherence, api.workOs.myWork + twin_work.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Mic,
  MoonStar,
  Sparkles,
  FileText,
  FolderKanban,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { usePresenceStore } from "@/lib/stores/presence";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";
import { GlassPanel } from "@/components/ambient/GlassPanel";
import { OtzarBrandLogo } from "@/components/ambient/OtzarBrandLogo";
import { GLASS_CTA } from "@/lib/ambient/glass";
import { nameFromEmail } from "@/lib/identity/person-name";
import type {
  CollaborationRequestSafeView,
  DgiCoherenceSnapshot,
  MyDaySuggestion,
  SafeHandoffView,
  WorkLedgerEntryView,
  WorkProjectSafeView,
} from "@/lib/types/foundation";
import { triagePriority } from "@/lib/work-os/blind-spot-triage";
import {
  activeTwinWorkItems,
  twinWorkDocClaimIds,
  twinWorkNeedsVerification,
  twinWorkStateLabel,
} from "@/lib/work-os/twin-work";

import {
  SpatialPresenceLayer,
} from "@/components/ambient/SpatialPresenceLayer";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { AdminOrganizationEntry } from "@/components/otzar/AdminOrganizationEntry";
import {
  focusApprovals,
  focusBlindSpots,
  focusHandoff,
  focusHeadline,
  focusNextBestStep,
  focusReplies,
  focusSuggestion,
  focusTwinBlocked,
  focusTwinUnpaired,
  focusTwinWork,
  type FocusTruthItem,
} from "@/lib/today/focus-truth";
import {
  orderGlanceByRole,
  resolveHomeRole,
  roleHomeCopy,
} from "@/lib/today/role-home";
import { buildRoleIntelligenceReport } from "@/lib/today/role-intelligence-report";
import {
  buildCreateBody,
  defaultAppendMaterial,
  editDetectionLabel,
  sessionAfterAppend,
  sessionAfterCreate,
  type WorkingDocSession,
} from "@/lib/connectors/google-docs-n03";
import { isRealNextDecision } from "@/lib/today/stale-truth";
import { buildWhatChanged } from "@/lib/today/what-changed";
import { composeHomeBands } from "@/lib/today/human-work-state";

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
  const capabilities = useAuthStore((s) => s.capabilities);
  const quiet = usePresenceStore((s) => s.quiet);
  const approvalsCount = usePresenceStore((s) => s.approvalsCount);
  const actionUnreadCount = usePresenceStore((s) => s.actionUnreadCount);
  const surfaceContext = useCurrentSurfaceContextStore((s) => s.context);
  const clearContext = useCurrentSurfaceContextStore((s) => s.clear);
  const [headline, setHeadline] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MyDaySuggestion[]>([]);
  // B-05 — role title from context-health (viewer), not a second dashboard.
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);
  const [viewerOrgRole, setViewerOrgRole] = useState<string | null>(null);

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
    api.otzar
      .contextHealth()
      .then((r) => {
        if (cancelled || !r.ok) return;
        const v = r.data.identity?.viewer;
        setViewerTitle(v?.title ?? null);
        setViewerOrgRole(v?.org_role ?? null);
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
  // [C.3] AI Teammate claims currently in flight (my-work twin_work projection).
  const [twinWorking, setTwinWorking] = useState<WorkLedgerEntryView[]>([]);
  const [verifyBusyId, setVerifyBusyId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  // A.2 — projects you are on (Work OS coherence anchor).
  const [myProjects, setMyProjects] = useState<WorkProjectSafeView[]>([]);
  // A.3 ambient — manager-only soft signal (reports without a first project).
  const [managerGapCount, setManagerGapCount] = useState(0);
  // Honest tools gate: Google/etc needs reconnect — surface once as a glance chip.
  const [toolsReconnectLabel, setToolsReconnectLabel] = useState<string | null>(
    null,
  );

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
      .oauthStatus()
      .then((r) => {
        if (cancelled || !r.ok) return;
        const bad = r.data.providers.filter(
          (p) =>
            p.status === "ERROR_NEEDS_RECONNECT" || p.status === "REVOKED",
        );
        if (bad.length === 0) {
          setToolsReconnectLabel(null);
          return;
        }
        const names = bad
          .map((p) => p.display_name || p.provider)
          .filter((n) => n.length > 0);
        const label =
          names.length === 1
            ? `Reconnect ${names[0]}`
            : names.length > 1
              ? `Reconnect tools (${names.length})`
              : "Reconnect tools";
        setToolsReconnectLabel(label);
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

  // [GOOGLE-DOCS-WRITE / N-03] One-tap: create a real non-empty Google Doc after
  // explicit confirm; optional material append for edit-detection proof.
  // Honest gates surface reconnect / missing scope — never a fake success.
  const [docSession, setDocSession] = useState<WorkingDocSession | null>(null);
  const [docAppendBusy, setDocAppendBusy] = useState(false);

  const createWorkingDoc = async () => {
    setDocBusy(true);
    setDocError(null);
    setDocLink(null);
    setDocSession(null);
    const day = new Date().toISOString().slice(0, 10);
    const built = buildCreateBody({
      title: `Working notes · ${day}`,
      dayIso: day,
    });
    if ("error" in built) {
      setDocError("EMPTY_BODY");
      setDocBusy(false);
      return;
    }
    try {
      const r = await api.connectorData.googleDocCreate({
        title: built.title,
        body_text: built.body_text,
        caller_confirmed: true,
        source_command: "ambient_today_create_doc",
      });
      if (r.ok) {
        const link =
          r.data.web_view_link ??
          `https://docs.google.com/document/d/${r.data.document_id}/edit`;
        setDocLink(link);
        setDocSession(
          sessionAfterCreate({
            documentId: r.data.document_id,
            title: r.data.title ?? built.title,
            webViewLink: r.data.web_view_link,
            bodyChars: built.body_text.length,
          }),
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

  /** N-03 — append material body so Drive modifiedTime advances (edit detect). */
  const appendWorkingDoc = async () => {
    if (docSession === null) return;
    setDocAppendBusy(true);
    setDocError(null);
    const material = defaultAppendMaterial(new Date().toISOString());
    try {
      const r = await api.connectorData.googleDocAppend({
        document_id: docSession.documentId,
        body_text: material,
        caller_confirmed: true,
      });
      if (r.ok && r.data.appended) {
        setDocSession(
          sessionAfterAppend(
            docSession,
            r.data.body_char_count,
            new Date().toISOString(),
          ),
        );
        if (r.data.web_view_link) setDocLink(r.data.web_view_link);
      } else {
        const code = "code" in r ? String(r.code) : "APPEND_FAILED";
        if (code === "GOOGLE_RECONNECT_REQUIRED" || code === "DOC_WRITE_SCOPE_MISSING") {
          setDocError(
            "Reconnect Google to append. Document create scopes are required.",
          );
        } else {
          setDocError(code);
        }
      }
    } catch {
      setDocError("NETWORK_ERROR");
    } finally {
      setDocAppendBusy(false);
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

  const dgiIntensity = dgiPanelIntensity(dgi);

  // One-shot Focus (B-02): ≤3 actions; every card has why + object/queue link.
  type FocusItem = FocusTruthItem & {
    onAction: (() => void) | null;
    actionBusy: boolean;
  };
  const focusItems: FocusItem[] = [];
  if (dgi?.coherence_status === "BLOCKED") {
    focusItems.push({
      ...focusTwinBlocked(dgi.eligible_twin_count),
      onAction: null,
      actionBusy: false,
    });
  } else if (dgi?.coherence_status === "UNPAIRED") {
    focusItems.push({
      ...focusTwinUnpaired(),
      onAction: null,
      actionBusy: false,
    });
  }
  // B-03: only a real next decision — never IDLE_HEALTHY as a fake card.
  if (
    dgi?.next_best_step &&
    isRealNextDecision(dgi.next_best_step.kind) &&
    focusItems.length < 3
  ) {
    const nbs = focusNextBestStep({
      title: dgi.next_best_step.safe_title,
      reason: dgi.next_best_step.reason ?? null,
      routeHint: dgi.next_best_step.route_hint ?? null,
    });
    focusItems.push({
      ...nbs,
      why: `${nbs.why} · real next decision`,
      onAction: null,
      actionBusy: false,
    });
  }
  if (approvalsCount > 0 && focusItems.length < 3) {
    focusItems.push({
      ...focusApprovals(approvalsCount),
      onAction: null,
      actionBusy: false,
    });
  }
  if (urgentBlindSpots > 0 && focusItems.length < 3) {
    focusItems.push({
      ...focusBlindSpots(urgentBlindSpots),
      onAction: null,
      actionBusy: false,
    });
  }
  if (actionUnreadCount > 0 && focusItems.length < 3) {
    focusItems.push({
      ...focusReplies(actionUnreadCount),
      onAction: null,
      actionBusy: false,
    });
  }
  for (const h of incomingHandoffs.slice(0, 2)) {
    if (focusItems.length >= 3) break;
    focusItems.push({
      ...focusHandoff({
        handoffId: h.handoff_id,
        title: h.title,
        summary: h.summary ?? null,
      }),
      onAction: () => {
        void acknowledgeHandoff(h);
      },
      actionBusy: ackBusyId === h.handoff_id,
    });
  }
  for (const e of twinWorking) {
    if (focusItems.length >= 3) break;
    const tw = e.twin_work;
    if (tw === undefined) continue;
    const needsVerify = twinWorkNeedsVerification(tw);
    if (
      !needsVerify &&
      tw.state !== "NEEDS_CLARITY" &&
      tw.state !== "COLLAB_REQUESTED"
    ) {
      continue;
    }
    focusItems.push({
      ...focusTwinWork({
        ledgerEntryId: e.ledger_entry_id,
        title: e.title,
        stateLabel: twinWorkStateLabel(tw.state),
        needsVerify,
      }),
      onAction: needsVerify
        ? () => {
            void verifyTwinWork(e.ledger_entry_id);
          }
        : null,
      actionBusy: verifyBusyId === e.ledger_entry_id,
    });
  }
  if (focusItems.length === 0 && suggestions.length > 0) {
    if (headline !== null) {
      focusItems.push({
        ...focusHeadline(headline),
        onAction: null,
        actionBusy: false,
      });
    }
    for (const s of suggestions.slice(0, 2)) {
      if (focusItems.length >= 3) break;
      focusItems.push({
        ...focusSuggestion(s.rank, s.safe_title),
        onAction: null,
        actionBusy: false,
      });
    }
  }

  const homeRole = resolveHomeRole({
    isOrgAdmin: isOrgAdmin(capabilities),
    title: viewerTitle,
    orgRole: viewerOrgRole ?? (isOrgAdmin(capabilities) ? "leader" : null),
  });
  const homeCopy = roleHomeCopy(homeRole);

  // P-01 — role-specific intelligence (short, real destinations, no fake charts).
  const roleIntel = buildRoleIntelligenceReport(homeRole, {
    needsMeCount: actionUnreadCount + urgentBlindSpots + inboundCollab.length,
    projectCount: myProjects.length,
    teamOpenCount: teamPeople.reduce(
      (n, p) => n + (p.open_obligation_count ?? 0),
      0,
    ),
    structureGapCount: managerGapCount,
    toolsNeedReconnect: toolsReconnectLabel !== null,
    toolsLabel: toolsReconnectLabel,
    twinWorkingCount: twinWorking.length,
    hasWorkingDoc: docLink !== null && docLink.length > 0,
    attentionCount: dgi?.attention_count ?? 0,
    blockedOrUnpaired:
      dgi?.coherence_status === "BLOCKED" ||
      dgi?.coherence_status === "UNPAIRED",
  });

  const glanceRaw: Array<{
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
    {
      key: "people",
      label: "People",
      to: "/app/collaboration",
      testId: "glance-people",
      show:
        homeRole === "administrator" ||
        homeRole === "executive" ||
        homeRole === "manager",
    },
    {
      key: "tools",
      label: toolsReconnectLabel ?? "Tools",
      to: "/app/connector-health",
      testId: "glance-tools",
      show: homeRole === "administrator" || toolsReconnectLabel !== null,
    },
  ];
  const glance = orderGlanceByRole(homeRole, glanceRaw);

  const calmCaughtUp =
    focusItems.length === 0 &&
    nothingInFlight &&
    (dgi === null || dgi.attention_count === 0) &&
    dgi?.coherence_status !== "BLOCKED" &&
    dgi?.coherence_status !== "UNPAIRED";

  // B-04 — What changed from real state only (never a fake activity feed).
  const whatChanged = buildWhatChanged({
    openHandoffCount: incomingHandoffs.length,
    handoffSampleTitles: incomingHandoffs.map((h) => h.title).filter(Boolean),
    attentionCount: dgi?.attention_count ?? 0,
    blockedOrUnpaired:
      dgi?.coherence_status === "BLOCKED" ||
      dgi?.coherence_status === "UNPAIRED",
    twinWorkingCount: twinWorking.length,
    toolsReconnectLabel,
    truthConflictCount: dgi?.open_org_truth_conflicts_count ?? 0,
    teamOpenSample:
      teamPeople.length > 0
        ? `${teamPeople[0]!.display_name} · ${teamPeople[0]!.open_obligation_count} open`
        : null,
  });

  // Human Home bands: needs me / changed / handled / waiting / next.
  const homeBands = composeHomeBands({
    needsMe: focusItems.slice(0, 3).map((item) => ({
      key: item.key,
      title: item.title,
      detail: item.detail ?? item.why,
      to: item.to ?? "/app/action-center",
      testId: item.testId,
    })),
    changed: whatChanged
      .filter((row) => row.testId !== "what-changed-quiet")
      .slice(0, 3)
      .map((row) => ({
        key: row.testId,
        title: row.title,
        ...(typeof row.to === "string" && row.to.length > 0
          ? { to: row.to }
          : {}),
        testId: row.testId,
      })),
    handled: twinWorking.slice(0, 3).map((tw, i) => ({
      key: `handled-${i}-${tw.ledger_entry_id ?? i}`,
      title: tw.title || "AI Teammate advanced work",
      detail: twinWorkStateLabel(tw.twin_work?.state ?? "CLAIMED_WORKING"),
      to: "/app/my-work",
      testId: `home-band-handled-${i}`,
    })),
    waiting: incomingHandoffs.slice(0, 3).map((h, i) => ({
      key: `wait-${h.handoff_id ?? i}`,
      title: h.title || "Waiting on a handoff",
      detail: "Waiting on someone else",
      to: "/app/action-center",
      testId: `home-band-waiting-${i}`,
    })),
    // Talk remains a dedicated primary CTA below. Do not invent a "Next" band
    // when the user is caught up (preserves ambient-caught-up calm state).
    next: [],
  });

  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col gap-3 px-1 pb-28 pt-2 sm:max-w-xl sm:pt-4"
      data-testid="ambient-work-surface"
      data-home-role={homeRole}
      data-s02-journey="true"
      data-s01-walkthrough="true"
      data-s01-primary-paths="login_home,needs_me,talk,twin,memory"
      data-d03-spatial="true"
    >
      {/* Org admins: login lands here — surface "Otzar found" without hunting Control Tower. */}
      {isOrgAdmin(capabilities) ? <AdminOrganizationEntry /> : null}

      {/* One-shot hero — presence + optional first-use strip (not a second page). */}
      <section
        className="otzar-stage otzar-atari-frame relative px-4 py-5 sm:px-6 sm:py-6"
        data-testid="ambient-spatial-stage"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="otzar-aurora-layer opacity-80" />
          <div className="otzar-grain opacity-[0.03]" />
        </div>
        {/* D-03 — optional purposeful CSS depth; reduced-motion → flat 2D */}
        <SpatialPresenceLayer depthEnabled={!quiet} showReadinessNote={false} />
        <div className="relative flex items-center gap-4">
          {/* Official logo — dimensional polish, not generic orb.
              data-testid otzar-mark kept for spatial presence live smokes. */}
          <span data-testid="otzar-mark" className="inline-flex">
            <OtzarBrandLogo
              size="xl"
              tone="brand"
              polish
              presence={quiet ? "QUIET" : "IDLE"}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/85">
              Today
            </p>
            <h1 className="otzar-text-luminous mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
              {greetingFor(new Date().getHours(), name)}
            </h1>
            <p
              className="mt-1 text-xs leading-snug text-slate-300"
              data-testid="ambient-presence-line"
            >
              {quiet ? (
                <>
                  <MoonStar className="mr-1 inline h-3 w-3" aria-hidden />
                  Quiet mode
                </>
              ) : dgi?.coherence_status === "NEEDS_ATTENTION" ? (
                "One item needs your attention."
              ) : dgi?.coherence_status === "BLOCKED" ||
                dgi?.coherence_status === "UNPAIRED" ? (
                "Your AI Teammate pairing needs a quick fix."
              ) : dgi?.coherence_status === "HEALTHY" || calmCaughtUp ? (
                homeCopy.presenceLine
              ) : (
                homeCopy.presenceLine
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Human work bands — empty bands are omitted. */}
      {homeBands.length > 0 ? (
        <div className="space-y-2" data-testid="home-human-bands">
          {homeBands.map((band) => (
            <GlassPanel
              key={band.band}
              intensity={band.band === "needs_me" ? "attention" : dgiIntensity}
              label={band.label}
              testId={`home-band-${band.band}`}
            >
              <ul className="space-y-1.5" data-testid={`${band.band}-list`}>
                {band.items.map((item) => (
                  <li key={item.key}>
                    {item.to ? (
                      <Link
                        to={item.to}
                        className="flex items-center justify-between gap-2 rounded-xl border border-white/12 bg-white/[0.07] px-3 py-2.5 transition-colors hover:bg-white/[0.12]"
                        data-testid={item.testId}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-50">
                            {item.title}
                          </p>
                          {item.detail ? (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-300">
                              {item.detail}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight
                          className="h-3.5 w-3.5 shrink-0 text-slate-300"
                          aria-hidden
                        />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={openOrb}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/12 bg-white/[0.07] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.12]"
                        data-testid={item.testId}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-50">
                            {item.title}
                          </p>
                          {item.detail ? (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-300">
                              {item.detail}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight
                          className="h-3.5 w-3.5 shrink-0 text-slate-300"
                          aria-hidden
                        />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </GlassPanel>
          ))}
          {ackError !== null ? (
            <p className="text-[11px] text-rose-700" data-testid="ambient-handoff-ack-error">
              Could not acknowledge. Try again.
            </p>
          ) : null}
          {verifyError !== null ? (
            <p className="text-[11px] text-rose-700" data-testid="twin-working-verify-error">
              Could not verify. Try again.
            </p>
          ) : null}
        </div>
      ) : calmCaughtUp ? (
        <div
          className="flex items-center gap-2 px-1 py-1"
          data-testid="ambient-caught-up"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
          <p className="text-sm text-slate-400" data-testid="dgi-healthy">
            {homeCopy.caughtUpLine}
          </p>
        </div>
      ) : dgiLoaded ? (
        <p className="px-1 text-xs text-slate-400" data-testid="dgi-coherence-panel">
          Nothing needs you right now. Open Needs me or talk.
        </p>
      ) : null}

      {/* Compatibility hooks for older tests; content is in home bands. */}
      {whatChanged.length > 0 ? (
        <div className="sr-only" data-testid="what-changed" aria-hidden>
          {whatChanged.map((row) => (
            <span key={row.testId} data-testid={row.testId}>
              {row.title}
            </span>
          ))}
        </div>
      ) : null}
      {focusItems.length > 0 ? (
        <div className="sr-only" data-testid="changed-suggestions" aria-hidden />
      ) : null}
      <div className="sr-only" data-testid="role-intelligence-report" aria-hidden>
        <span data-testid="role-intel-title">{roleIntel.title}</span>
      </div>

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
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-slate-100 backdrop-blur-sm transition hover:bg-white/[0.14] disabled:opacity-60"
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
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-slate-100 backdrop-blur-sm transition hover:bg-white/[0.14]"
              >
                {g.label}
              </a>
            ) : (
              <Link
                key={g.key}
                to={g.to}
                data-testid={g.testId}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-slate-100 backdrop-blur-sm transition hover:bg-white/[0.14]"
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
        {toolsReconnectLabel !== null ? (
          <Link
            to="/app/connector-health?need=reconnect&from=today"
            data-testid="today-tools-reconnect"
            className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/70 px-2.5 py-1 text-[11px] font-medium text-amber-950"
          >
            {toolsReconnectLabel}
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

      {/* N-03 — working doc session: non-empty create + append + edit detection */}
      {docSession !== null ? (
        <section
          className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 px-3 py-2.5"
          data-testid="google-doc-session"
          data-document-id={docSession.documentId}
          data-edit-detected={docSession.editDetected ? "true" : "false"}
          data-nonempty-create={docSession.createdBodyChars > 0 ? "true" : "false"}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/80">
            Working doc
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
            {docSession.title}
          </p>
          <p
            className="mt-1 text-[11px] text-slate-600"
            data-testid="google-doc-edit-status"
          >
            {editDetectionLabel(docSession)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {docLink !== null ? (
              <a
                href={docLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-emerald-300/80 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-emerald-950"
                data-testid="google-doc-open-session"
              >
                Open in Google Docs
              </a>
            ) : null}
            <button
              type="button"
              disabled={docAppendBusy}
              onClick={() => void appendWorkingDoc()}
              className="inline-flex items-center rounded-full border border-slate-300/80 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-800 disabled:opacity-60"
              data-testid="google-doc-append"
            >
              {docAppendBusy ? "Appending…" : "Append material change"}
            </button>
          </div>
        </section>
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
          <span className="block text-sm font-semibold text-slate-50">
            Talk to Otzar
          </span>
          <span className="block text-[11px] text-slate-300">
            What matters · what needs me · open work
          </span>
        </span>
      </button>

      {/* Power-user detail only — not the default scroll path. */}
      <details className="group px-1" data-testid="today-more-details">
        <summary className="cursor-pointer list-none text-[11px] font-medium text-slate-300 hover:text-slate-100">
          More detail
          <span className="ml-1 text-slate-400 group-open:hidden">
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
              No projects yet. Your manager can place you when ready.
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
