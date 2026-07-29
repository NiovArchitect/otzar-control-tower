// FILE: MyMemory.tsx
// PURPOSE: Slice 4 — useful Memory: how Otzar works better for you.
//          Helping you now / Recently learned / Needs your decision /
//          portable profile. Storage counts are secondary only.
// CONNECTS TO: contextHealth, workStyle, correction revoke, portable-core.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  ChevronRight,
  KeyRound,
  PencilLine,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WalletProvenanceBadge } from "@/components/sovereignty/WalletProvenanceBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { ContextHealthResponse } from "@/lib/types/foundation";
import {
  OBSERVATION_LEARNS,
  OBSERVATION_NEVER,
} from "@/lib/observation/consent-session";
import {
  TEACH_BOUNDARY_COPY,
  journeyProgressLabel,
  type TeachJourneyState,
} from "@/lib/work-os/teach-otzar-journey";
import {
  classifyPreferenceSummary,
  ownershipLabel,
} from "@/lib/work-os/portable-core";
import {
  PORTABLE_CAN_MOVE,
  PORTABLE_STAYS_WITH_ORG,
  buildActivePatterns,
  buildDecisionCards,
  buildRecentLearning,
  loadPortableRequest,
  portableStatusLabel,
  savePortableRequest,
  type PortableRequestRecord,
  type PreferenceRow,
} from "@/lib/work-os/useful-memory";
import { PortableCoreCard } from "@/components/otzar/PortableCoreCard";
import { MultiOrgMemoryIsolationCard } from "@/components/otzar/MultiOrgMemoryIsolationCard";
import { CrossTenantIsolationCard } from "@/components/otzar/CrossTenantIsolationCard";
import { MemoryRedactionCard } from "@/components/otzar/MemoryRedactionCard";
import { LearningAppliesCard } from "@/components/otzar/LearningAppliesCard";
import { WindowContextShare } from "@/components/observation/WindowContextShare";

export function MyMemory(): JSX.Element {
  const [data, setData] = useState<ContextHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<PreferenceRow[]>([]);
  const [candidates, setCandidates] = useState<
    Array<{ candidate_id: string; plain_language: string }>
  >([]);
  const [portable, setPortable] = useState<PortableRequestRecord | null>(null);
  const [portableOpen, setPortableOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [health, prefRes, candRes] = await Promise.all([
      api.otzar.contextHealth(),
      api.otzar.workStyle.preferences(),
      api.otzar.workStyle.candidates(),
    ]);
    if (health.ok) {
      setData(health.data);
      setError(null);
    } else {
      setError(health.code);
      setData(null);
    }
    if (prefRes.ok) {
      setPrefs((prefRes.data.preferences ?? []) as PreferenceRow[]);
    }
    if (candRes.ok) {
      setCandidates(
        (candRes.data.candidates ?? []).map((c) => ({
          candidate_id: c.candidate_id,
          plain_language: c.plain_language,
        })),
      );
    }
    setPortable(loadPortableRequest());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(() => buildActivePatterns(prefs), [prefs]);
  const recent = useMemo(() => buildRecentLearning(prefs), [prefs]);
  const decisions = useMemo(
    () => buildDecisionCards(candidates),
    [candidates],
  );

  async function stopPreference(id: string): Promise<void> {
    setBusyId(id);
    setNotice(null);
    const r = await api.otzar.correctionMemory.revoke(id);
    setBusyId(null);
    if (r.ok) {
      setNotice("Stopped using that preference.");
      void load();
    } else {
      setNotice("Couldn't stop that preference right now.");
    }
  }

  async function decideCandidate(
    id: string,
    action: "approve" | "reject",
  ): Promise<void> {
    setBusyId(id);
    setNotice(null);
    const r =
      action === "approve"
        ? await api.otzar.workStyle.approve(id)
        : await api.otzar.workStyle.reject(id);
    setBusyId(null);
    if (r.ok) {
      setNotice(
        action === "approve"
          ? "Pattern saved for you."
          : "Got it — that pattern will not be used.",
      );
      void load();
    } else {
      setNotice("Couldn't update that decision right now.");
    }
  }

  function requestPortableProfile(): void {
    const rec: PortableRequestRecord = {
      status: "requested",
      requested_at: new Date().toISOString(),
      note: "Requested review of portable personal capability. Export is not ready until review completes.",
    };
    savePortableRequest(rec);
    setPortable(rec);
    setPortableOpen(false);
    setNotice(
      "Portable profile requested. Status: Requested — under review. Export is not available until Ready.",
    );
    // Durable signal via correction (no fake Ready / no company export).
    void api.otzar.correction({
      incorrect_description: "No portable profile request on file",
      correct_behavior:
        "[portable] [PORTABLE_PROFILE_REQUEST] status=REQUESTED — personal methods only; company data stays",
    });
  }

  if (loading) {
    return (
      <div className="space-y-6" data-testid="my-memory-loading">
        <PageHeader
          eyebrow="Learning"
          title="How Otzar works better for you"
          description="Loading what your AI Teammate is using…"
        />
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error !== null || data === null) {
    return (
      <div className="space-y-6" data-testid="my-memory-error">
        <PageHeader
          eyebrow="Learning"
          title="How Otzar works better for you"
          description="See useful preferences and work methods your AI Teammate is using."
        />
        <Card className="border-rose-400/40 bg-rose-500/5">
          <CardContent className="py-4 text-sm">
            Couldn&apos;t load Memory. ({error ?? "Unknown error"})
          </CardContent>
        </Card>
      </div>
    );
  }

  const i = data.identity;

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-6 pb-24"
      data-testid="my-memory-page"
      data-slice4-memory="true"
    >
      <PageHeader
        eyebrow="Learning"
        title="How Otzar works better for you"
        description="See the useful preferences and work methods your AI Teammate is using. Correct, stop, or carry approved personal capability with you without taking company information."
      />

      {notice !== null ? (
        <p className="text-sm text-foreground" role="status" data-testid="my-memory-notice">
          {notice}
        </p>
      ) : null}

      <div className="space-y-2" data-testid="my-memory-boundary">
        <WalletProvenanceBadge walletType="PERSONAL" entityType="PERSON" />
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-md border border-border/60 p-2">
            <p className="font-medium text-foreground">Your personal work memory</p>
            <p>
              Preferences, reusable methods, and personal learning live here.
              They are yours, not the company&apos;s.
            </p>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <p className="font-medium text-foreground">Company-owned work data</p>
            <p>
              Sources, meetings, decisions, approvals, and audit history stay
              with the company. They never leave in a portable profile.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Helping you now */}
      <Card data-testid="my-memory-helping-now">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4" aria-hidden /> Helping you now
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {active.length === 0 ? (
            <p className="text-xs text-muted-foreground" data-testid="helping-now-empty">
              No personal patterns yet. Teach Otzar in Talk — for example,
              &ldquo;Keep my answers concise.&rdquo;
            </p>
          ) : (
            <ul className="space-y-2">
              {active.map((p) => (
                <li
                  key={p.id}
                  className="rounded-md border border-border/60 bg-card p-3"
                  data-testid="active-pattern-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {p.last_used_label}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === p.id}
                      onClick={() => void stopPreference(p.id)}
                      data-testid="active-pattern-stop"
                    >
                      Stop using
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 2. Recently learned */}
      <Card data-testid="my-memory-recently-learned">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4" aria-hidden /> Recently learned
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Corrections and preferences you teach in Talk show up here.
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-border/50 px-3 py-2 text-xs"
                  data-testid="recent-learning-card"
                >
                  <p className="font-medium text-foreground">{r.what_changed}</p>
                  <p className="text-muted-foreground">Applies to: {r.where_applies}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {r.active ? "Active" : "Inactive"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 3. Needs your decision */}
      <Card data-testid="my-memory-needs-decision">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Needs your decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {decisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing needs a decision right now. Clear instructions in Talk
              apply immediately with a short confirmation.
            </p>
          ) : (
            <ul className="space-y-2">
              {decisions.map((d) => (
                <li
                  key={d.id}
                  className="rounded-md border border-amber-300/50 bg-amber-50/40 p-3 text-xs"
                  data-testid="decision-card"
                >
                  <p className="text-foreground">{d.question}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === d.id}
                      onClick={() => void decideCandidate(d.id, "approve")}
                    >
                      Use this pattern
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === d.id}
                      onClick={() => void decideCandidate(d.id, "reject")}
                    >
                      Not now
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 4. Portable profile */}
      <Card data-testid="my-memory-portable-profile">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4" aria-hidden /> Take your AI Teammate&apos;s
            skills with you
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <p>
            If you leave this organization, you may request the reusable work
            preferences, methods, and personal workflows you taught your AI
            Teammate. Company information stays here.
          </p>
          {portable !== null && portable.status !== "none" ? (
            <p data-testid="portable-request-status">
              Status:{" "}
              <span className="font-medium text-foreground">
                {portableStatusLabel(portable.status)}
              </span>
              {portable.note ? ` — ${portable.note}` : ""}
            </p>
          ) : null}
          {!portableOpen ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setPortableOpen(true)}
              data-testid="portable-profile-open"
            >
              Request a portable profile
            </Button>
          ) : (
            <div
              className="space-y-3 rounded-md border border-border/60 p-3"
              data-testid="portable-profile-review"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="font-medium text-foreground">Can move with you</p>
                  <ul className="mt-1 list-inside list-disc">
                    {PORTABLE_CAN_MOVE.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Stays with the organization
                  </p>
                  <ul className="mt-1 list-inside list-disc">
                    {PORTABLE_STAYS_WITH_ORG.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p>
                Your AI Teammate can remain useful without carrying confidential
                company information. Export is not complete until review finishes
                — this only files a request.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => requestPortableProfile()}
                  data-testid="portable-profile-request"
                >
                  Request review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPortableOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="my-memory-revocable">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4" aria-hidden /> Correct or revoke
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-muted-foreground">
            Teach Otzar in Talk (&ldquo;Keep my answers concise&rdquo;). Use Stop
            using on active patterns above. Preferences and identity live here:
          </p>
          <RevocableRow
            icon={<PencilLine className="h-3 w-3" aria-hidden />}
            label="Preferences"
            description="Longer preference editor if you need it."
            to="/app/preferences"
            cta="Open preferences"
            testid="my-mem-revoke-preferences"
          />
          <RevocableRow
            icon={<Wallet className="h-3 w-3" aria-hidden />}
            label="Your AI Teammate"
            description="Identity and briefing."
            to="/app/my-twin"
            cta="Open My AI Teammate"
            testid="my-mem-revoke-twin"
          />
          <Button asChild size="sm" variant="outline">
            <Link to="/app/conversations" data-testid="my-mem-open-history">
              Conversation history
              <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Secondary: storage counts + authority — not the primary story */}
      <details
        className="rounded-lg border border-border/60 px-3 py-2"
        data-testid="my-memory-knows"
      >
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Storage details (secondary)
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Counts only. Otzar never shows raw memory bodies, transcripts, or
            internal storage details as the main story.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Stat
              label="Memory records"
              value={i.context_signals.memory_capsules_count}
              hint="Scoped working memory entries."
            />
            <Stat
              label="Conversation summaries"
              value={i.context_signals.transcript_summaries_count}
              hint="Talk and meeting summaries — never raw transcripts by default."
            />
            <Stat
              label="Collaborations inbound"
              value={i.context_signals.collaboration_inbound_count}
              hint="Secondary detail — not the primary value of Memory."
            />
            <Stat
              label="Collaborations outbound"
              value={i.context_signals.collaboration_outbound_count}
              hint="Secondary detail — not the primary value of Memory."
            />
          </div>
        </div>
      </details>

      <details
        className="rounded-lg border border-border/60 px-3 py-2"
        data-testid="my-memory-more-detail"
      >
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          More detail (optional)
        </summary>
        <div className="mt-3 space-y-4">
          <ObservationConsentCard />
          <PortableCoreCard />
          <MultiOrgMemoryIsolationCard />
          <CrossTenantIsolationCard variant="employee" />
          <MemoryRedactionCard />
          <WindowContextShare />
        </div>
      </details>

      <p className="text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-2 text-[10px]">
          Boundaries
        </Badge>
        What you teach stays yours. Company records stay with the company.
        Correct or revoke anytime.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}): JSX.Element {
  return (
    <div className="rounded border bg-card p-2" data-testid="my-mem-stat">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 text-[10px] text-muted-foreground/80">{hint}</p>
    </div>
  );
}

function RevocableRow({
  icon,
  label,
  description,
  to,
  cta,
  testid,
}: {
  icon: JSX.Element;
  label: string;
  description: string;
  to: string;
  cta: string;
  testid: string;
}): JSX.Element {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded border bg-card p-2"
      data-testid={testid}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium">
          {icon} {label}
        </p>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to={to}>
          {cta} <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

// (ChevronRight intentionally imported to keep the icon set
// available for a future detail-drawer slice.)
void ChevronRight;

/**
 * Teach Otzar how you work — real end-to-end learning.
 * Benefit: explain less over time; outputs reflect your methods;
 * never company secrets; never silent authority; portable personal core.
 */
type WorkStyleCandidate = {
  candidate_id: string;
  category: string;
  plain_language: string;
  evidence_count: number;
  confidence: string;
  portability_proposal: string;
};

function ObservationConsentCard(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [orgEnabled, setOrgEnabled] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [signalCount, setSignalCount] = useState(0);
  const [taskLabel, setTaskLabel] = useState("Project brief");
  const [consent, setConsent] = useState(false);
  const [candidates, setCandidates] = useState<WorkStyleCandidate[]>([]);
  const [approved, setApproved] = useState<
    Array<{ correction_id: string; safe_summary: string; correction_type: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "active" | "review">("idle");
  // H-03 — session reject fingerprints never enter approved later-work surfaces.
  const [rejectedSession, setRejectedSession] = useState<
    Array<{ candidate_id: string; plain: string }>
  >([]);
  const [lastDecision, setLastDecision] = useState<
    null | { kind: "approve" | "reject"; plain: string }
  >(null);

  async function refresh(): Promise<void> {
    const [st, prefs, cands] = await Promise.all([
      api.otzar.workStyle.status(),
      api.otzar.workStyle.preferences(),
      api.otzar.workStyle.candidates(),
    ]);
    if (st.ok) {
      setOrgEnabled(st.data.org_policy_enabled);
      if (st.data.active_session) {
        setSessionId(st.data.active_session.session_id);
        setSignalCount(st.data.active_session.signal_count);
        setPhase("active");
      } else if (
        st.data.pending_candidates_count > 0 &&
        phase !== "active"
      ) {
        setPhase("review");
      }
    }
    if (prefs.ok) setApproved(prefs.data.preferences ?? []);
    if (cands.ok) {
      setCandidates(cands.data.candidates ?? []);
      if ((cands.data.candidates ?? []).length > 0) setPhase("review");
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onStart(): Promise<void> {
    setBusy(true);
    setError(null);
    const r = await api.otzar.workStyle.startSession({
      consent: true,
      task_label: taskLabel.trim() || "Work task",
      app_context: "Otzar",
    });
    setBusy(false);
    if (!r.ok) {
      setError(
        r.code === "ORG_POLICY_DISABLED"
          ? "Your organization has not enabled professional learning yet. Ask an admin: Control Tower → enable work-style learning."
          : r.code,
      );
      return;
    }
    setSessionId(r.data.session_id);
    setPhase("active");
    setSignalCount(0);
    // Seed bounded professional signals (safe labels only — no raw content).
    const seeds = [
      { signal_type: "structure", safe_label: "Moved decision and impact first" },
      { signal_type: "review", safe_label: "Draft before send external" },
      { signal_type: "tool", safe_label: "Used Google Docs for collaborative draft" },
      { signal_type: "evidence", safe_label: "Added source links in recommendations" },
    ];
    for (const s of seeds) {
      await api.otzar.workStyle.signal(r.data.session_id, s);
    }
    setSignalCount(seeds.length);
  }

  async function onStop(): Promise<void> {
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    const r = await api.otzar.workStyle.stopSession(sessionId);
    setBusy(false);
    if (!r.ok) {
      setError(r.code);
      return;
    }
    setCandidates(r.data.candidates ?? []);
    setSessionId(null);
    setPhase("review");
  }

  async function onApprove(id: string): Promise<void> {
    const cand = candidates.find((x) => x.candidate_id === id);
    setBusy(true);
    const r = await api.otzar.workStyle.approve(id);
    setBusy(false);
    if (!r.ok) {
      setError(r.code);
      return;
    }
    setCandidates((c) => c.filter((x) => x.candidate_id !== id));
    if (cand) {
      setLastDecision({ kind: "approve", plain: cand.plain_language });
    }
    await refresh();
  }

  async function onReject(id: string): Promise<void> {
    const cand = candidates.find((x) => x.candidate_id === id);
    setBusy(true);
    await api.otzar.workStyle.reject(id);
    setBusy(false);
    setCandidates((c) => c.filter((x) => x.candidate_id !== id));
    if (cand) {
      setRejectedSession((prev) => [
        ...prev,
        { candidate_id: id, plain: cand.plain_language },
      ]);
      setLastDecision({ kind: "reject", plain: cand.plain_language });
    }
  }

  const journeyPhase: TeachJourneyState["phase"] = !orgEnabled
    ? "org_disabled"
    : phase === "active"
      ? "active"
      : phase === "review"
        ? "review"
        : approved.length > 0
          ? "complete"
          : "idle";

  const journeyState: TeachJourneyState = {
    phase: journeyPhase,
    org_policy_enabled: orgEnabled,
    consent_given: consent || phase === "active" || phase === "review",
    session_id: sessionId,
    signal_count: signalCount,
    pending_candidates: candidates.length,
    approved_preferences: approved.length,
  };
  const progressLabel = journeyProgressLabel(journeyState);

  if (loading) {
    return (
      <Card data-testid="observation-consent-card" data-h01="true" data-h01-phase="loading">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Loading work-style learning…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="observation-consent-card"
      data-h01="true"
      data-h01-phase={journeyPhase}
      data-org-policy-enabled={orgEnabled ? "true" : "false"}
      data-pending-candidates={String(candidates.length)}
      data-approved-preferences={String(approved.length)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4" aria-hidden /> Teach Otzar how you work
          {phase === "active" ? (
            <span
              className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
              data-testid="observation-active-indicator"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Learning session active · {signalCount} signals
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p
          className="text-[11px] font-medium text-foreground"
          data-testid="teach-journey-progress"
          data-h01-progress={journeyPhase}
        >
          {progressLabel}
        </p>
        <p className="text-muted-foreground" data-testid="work-style-benefit">
          Over time you should explain less. Otzar reflects your professional
          methods in later work, without absorbing company-confidential data,
          silently expanding authority, or trapping learning inside one employer.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div data-testid="observation-learns">
            <p className="font-medium text-foreground">What Otzar may learn</p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {OBSERVATION_LEARNS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div data-testid="observation-never">
            <p className="font-medium text-foreground">What it never absorbs</p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {OBSERVATION_NEVER.map((l) => (
                <li key={l}>{l}</li>
              ))}
              <li>Permissions or decision rights (policy authorizes; learning does not)</li>
            </ul>
          </div>
        </div>

        {error ? (
          <p className="text-amber-700" data-testid="work-style-error">
            {error}
          </p>
        ) : null}

        {!orgEnabled ? (
          <div data-testid="observation-not-enabled" className="space-y-2">
            <p className="text-[11px] text-amber-700">
              Your organization hasn&apos;t enabled professional learning yet.
              Ask an administrator to enable it in Company Profile under
              Professional learning (Teach Otzar).
            </p>
            <p className="text-[10px] text-muted-foreground">
              Admins:{" "}
              <Link
                to="/setup/company-profile"
                className="font-medium text-foreground underline underline-offset-2"
                data-testid="teach-admin-policy-link"
              >
                Company Profile → Professional learning
              </Link>
              .
            </p>
          </div>
        ) : phase === "idle" ? (
          <div className="space-y-2" data-testid="observation-idle">
            <label className="block text-muted-foreground">
              Task you&apos;re doing (methods only, not confidential content)
              <input
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1"
                value={taskLabel}
                onChange={(e) => setTaskLabel(e.target.value)}
                data-testid="work-style-task-label"
              />
            </label>
            <label className="flex items-start gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                data-testid="observation-consent-checkbox"
              />
              <span>
                I consent to a visible learning session. Otzar will propose
                method preferences for my review: never company secrets, never
                new permissions.
              </span>
            </label>
            <Button
              size="sm"
              disabled={!consent || busy}
              onClick={() => void onStart()}
              data-testid="observation-start"
            >
              {busy ? "Starting…" : "Start a learning session"}
            </Button>
          </div>
        ) : phase === "active" ? (
          <div className="space-y-2" data-testid="observation-active">
            <p className="text-muted-foreground">
              Session active for &ldquo;{taskLabel}&rdquo;. Bounded professional
              signals only (structure, tools, review habits). Stop to generate
              candidates you approve or reject.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void onStop()}
              data-testid="observation-stop"
            >
              {busy ? "Stopping…" : "Stop and review what Otzar noticed"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="observation-review">
            <p className="font-medium text-foreground" data-testid="work-style-candidates-title">
              What Otzar noticed
            </p>
            {candidates.length === 0 ? (
              <p className="text-muted-foreground">
                No pending candidates. Start another session or see approved
                preferences below.
              </p>
            ) : (
              <ul className="space-y-2" data-testid="work-style-candidates-list">
                {candidates.map((c) => (
                  <li
                    key={c.candidate_id}
                    className="rounded border border-border bg-card p-2"
                    data-testid="work-style-candidate"
                    data-h01-candidate="true"
                    data-candidate-id={c.candidate_id}
                    data-portability={c.portability_proposal}
                  >
                    <p className="font-medium text-foreground">{c.plain_language}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {c.category} · {c.confidence} · {c.portability_proposal} ·
                      evidence {c.evidence_count}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void onApprove(c.candidate_id)}
                        data-testid="work-style-approve"
                        data-h03-action="approve"
                      >
                        Approve (applies later)
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void onReject(c.candidate_id)}
                        data-testid="work-style-reject"
                        data-h03-action="reject"
                      >
                        Reject (never applies)
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {lastDecision ? (
              <p
                className="text-[11px] text-foreground"
                data-testid="h03-last-decision"
                data-decision-kind={lastDecision.kind}
              >
                {lastDecision.kind === "approve"
                  ? `Approved. Will shape later work: “${lastDecision.plain.slice(0, 120)}”`
                  : `Rejected. Will never apply: “${lastDecision.plain.slice(0, 120)}”`}
              </p>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPhase("idle");
                setConsent(false);
              }}
              data-testid="observation-review-done"
            >
              Done reviewing
            </Button>
          </div>
        )}

        {approved.length > 0 ? (
          <div
            className="border-t border-border pt-3"
            data-testid="work-style-approved"
            data-h03-approved-list="true"
          >
            <p className="font-medium text-foreground">
              Approved preferences ({approved.length}): apply to later work
            </p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {approved.slice(0, 8).map((p) => {
                const c = classifyPreferenceSummary(p.safe_summary);
                return (
                  <li
                    key={p.correction_id}
                    className="flex items-start gap-2"
                    data-testid="work-style-approved-item"
                    data-ownership={c.ownership}
                    data-h03-applies="true"
                  >
                    <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                      {ownershipLabel(c.ownership)}
                    </span>
                    <span>{c.plain}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {rejectedSession.length > 0 ? (
          <div
            className="border-t border-border pt-3"
            data-testid="work-style-rejected-session"
            data-h03-rejected-list="true"
            data-rejected-count={String(rejectedSession.length)}
          >
            <p className="font-medium text-foreground">
              Rejected this session ({rejectedSession.length}): never apply
            </p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {rejectedSession.slice(0, 6).map((r) => (
                <li
                  key={r.candidate_id}
                  data-testid="work-style-rejected-item"
                  data-h03-applies="false"
                >
                  {r.plain}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p
          className="text-[11px] text-muted-foreground"
          data-testid="observation-status-note"
          data-h01-boundary="true"
        >
          {TEACH_BOUNDARY_COPY}
        </p>

        {/* H-03 — approved → later work; rejected never applies. */}
        <LearningAppliesCard
          approvedCount={approved.length}
          rejectedSessionCount={rejectedSession.length}
          pendingCount={candidates.length}
        />
      </CardContent>
    </Card>
  );
}
