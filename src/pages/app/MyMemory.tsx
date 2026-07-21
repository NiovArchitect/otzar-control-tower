// FILE: MyMemory.tsx
// PURPOSE: Phase 1219 — "My Digital Work Wallet" + "My Twin Memory"
//          + "My permissions" page. Per the Founder directive
//          [DMW / COSMP user-facing clarity]: keep Foundation
//          internals (DMW, COSMP, MemoryCapsule, etc.) hidden
//          behind plain-language framing. The employee sees:
//          - what Otzar knows about their work (counts only)
//          - what categories of memory exist
//          - what Otzar can do with it (the authority surface from
//            Phase 1217 reused here for one-stop clarity)
//          - what they can revoke (links into Authority + Preferences)
//
//          DMW is renamed for the user as "My Digital Work Wallet."
//          COSMP is shown to the user as "Memory record" only;
//          the COSMP name lives in admin / governance docs (per the
//          UI language map directive).
//
// CONNECTS TO:
//   - src/lib/api.ts (api.otzar.contextHealth)
//   - /app/authority-grants (Phase EDX-4 substrate)
//   - /app/preferences (existing)
//   - /app/my-twin (existing)
//
// PRIVACY INVARIANT:
//   - Reads only the closed-vocab /context-health projection.
//   - Counts only. The page never surfaces raw memory bodies,
//     transcripts, embeddings, or vectors.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  ChevronRight,
  KeyRound,
  PencilLine,
  ShieldCheck,
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

  useEffect(() => {
    let cancelled = false;
    api.otzar.contextHealth().then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setData(r.data);
        setError(null);
      } else {
        setError(r.code);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="my-memory-loading">
        <PageHeader
          eyebrow="Portability"
          title="My Digital Work Wallet"
          description="How you work, what your AI Teammate has learned, and what moves with you: your portable work identity."
        />
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Loading your wallet…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error !== null || data === null) {
    return (
      <div className="space-y-6" data-testid="my-memory-error">
        <PageHeader
          eyebrow="Portability"
          title="My Digital Work Wallet"
          description="How you work, what your AI Teammate has learned, and what moves with you: your portable work identity."
        />
        <Card className="border-rose-400/40 bg-rose-500/5">
          <CardContent className="py-4 text-sm">
            Couldn't load your wallet. ({error ?? "Unknown error"})
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
    >
      <PageHeader
        eyebrow="Portability"
        title="My Digital Work Wallet"
        description="How you work, what your AI Teammate has learned, and what moves with you. Your methods, skills, and preferences are YOURS. Your organization's records stay with the organization."
      />

      {/* [GAP-S S-1] The ownership boundary, rendered where the wallet
          already appears. Existing truth only: this wallet IS the personal
          wallet; company data lives in the organization's enterprise wallet.
          No export exists. Future language is marked as future. */}
      <div className="space-y-2" data-testid="my-memory-boundary">
        <WalletProvenanceBadge walletType="PERSONAL" entityType="PERSON" />
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-md border border-border/60 p-2">
            <p className="font-medium text-foreground">Your personal work memory</p>
            <p>
              Your work style, preferences, personal learning, and reusable
              methods live here. They are yours, not the company&apos;s.
            </p>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <p className="font-medium text-foreground">Company-owned work data</p>
            <p>
              Company sources, meeting records, decisions, approvals, and
              audit history stay with the company. They are never part of
              this wallet.
            </p>
          </div>
        </div>
      </div>

      {/* What Otzar knows about my work */}
      <Card data-testid="my-memory-knows">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4" aria-hidden /> What Otzar knows about
            your work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Counts only. Otzar never shows raw memory bodies, transcripts, or
            internal storage details on this page.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Stat
              label="Memory records"
              value={i.context_signals.memory_capsules_count}
              hint="Things Otzar has saved as scoped working memory."
            />
            <Stat
              label="Conversation summaries"
              value={i.context_signals.transcript_summaries_count}
              hint="Safe summaries of meetings and conversations. Never raw transcripts by default."
            />
            <Stat
              label="Collaborations inbound"
              value={i.context_signals.collaboration_inbound_count}
              hint="Times another teammate asked you or your AI Teammate for something."
            />
            <Stat
              label="Collaborations outbound"
              value={i.context_signals.collaboration_outbound_count}
              hint="Times you or your AI Teammate asked someone else for something."
            />
          </div>
        </CardContent>
      </Card>

      {/* What Otzar can use it for */}
      <Card data-testid="my-memory-authority">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden /> What Otzar can do
            with it
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs">
            <AuthRow
              label="Read your memory and context"
              allowed={i.authority.can_read_capsules}
              extra={undefined}
              testid="my-mem-auth-read"
            />
            <AuthRow
              label="Write new memory entries on your behalf"
              allowed={i.authority.can_write_capsules}
              extra={undefined}
              testid="my-mem-auth-write"
            />
            <AuthRow
              label="Share scoped context with teammates"
              allowed={i.authority.can_share_capsules}
              extra={undefined}
              testid="my-mem-auth-share"
            />
            <AuthRow
              label="Make external API calls"
              allowed={i.authority.can_access_external_api}
              extra={
                i.authority.external_write_policy === "APPROVAL_REQUIRED"
                  ? "Approval required"
                  : undefined
              }
              testid="my-mem-auth-external"
            />
          </ul>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Otzar follows your organization's policy. Every action against your
            wallet is recorded in the audit trail.
          </p>
        </CardContent>
      </Card>

      {/* What can be revoked */}
      <Card data-testid="my-memory-revocable">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4" aria-hidden /> Yours to shape
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {/* PROD-MODEL-P4 §7/§24 — twin AUTHORITY is governed by your
              organization's admins and policies, not toggled here. Memory
              stays insight + teaching, never a permission console. */}
          <div
            className="flex items-start gap-2 rounded-md border border-border/60 p-2"
            data-testid="my-mem-authority-governed"
          >
            <KeyRound className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <div>
              <p className="font-medium text-foreground">What your AI Teammate may do</p>
              <p className="text-muted-foreground">
                Set by your organization's role and access policies. Teach and
                correct your AI Teammate any time. Granting or removing authority is
                an admin decision, recorded in the audit trail.
              </p>
            </div>
          </div>
          <RevocableRow
            icon={<PencilLine className="h-3 w-3" aria-hidden />}
            label="Preferences and corrections"
            description="Teach your AI Teammate how you work. Edit or remove what it learned."
            to="/app/preferences"
            cta="Open preferences"
            testid="my-mem-revoke-preferences"
          />
          <RevocableRow
            icon={<Wallet className="h-3 w-3" aria-hidden />}
            label="Your AI Teammate (identity + briefing)"
            description="See your AI Teammate's current configuration and adjust as needed."
            to="/app/my-twin"
            cta="Open My AI Teammate"
            testid="my-mem-revoke-twin"
          />
        </CardContent>
      </Card>

      {/* CX-SLICE-5 — the consent/trust layer for future workflow
          observation. Lives here because it is about YOUR portable work
          identity and how your Twin learns you. It captures NOTHING today. */}
      <ObservationConsentCard />
      {/* I-01 / H-02 — portable personal core vs org-bound; multi-user isolation surface */}
      <PortableCoreCard />
      {/* I-02 — multi-org memory isolation (org-bound never blends; portable not silent) */}
      <MultiOrgMemoryIsolationCard />
      {/* Q-01 / Q-02 — cross-tenant / cross-user / Twin zero leak + deep-link isolation */}
      <CrossTenantIsolationCard variant="employee" />
      {/* H-02 residual — redaction stress corpus + live portable scan */}
      <MemoryRedactionCard />
      {/* H-03 LearningAppliesCard is also nested under Teach Otzar for in-flow
          feedback; Portable core is the later-work inventory surface. */}
      {/* D-04 — selected-window share: explicit browser permission + live indicator */}
      <WindowContextShare />

      {/* Reassurance */}
      <p className="text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-2 text-[10px]">
          Your sovereignty
        </Badge>
        Your memory and permissions are yours. Every grant is revocable; every
        action is recorded; nothing leaves your organization without your
        approval. This page is your control surface. Otzar follows it.
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

function AuthRow({
  label,
  allowed,
  extra,
  testid,
}: {
  label: string;
  allowed: boolean;
  extra: string | undefined;
  testid: string;
}): JSX.Element {
  return (
    <li
      className="flex items-center justify-between gap-2 rounded border bg-card px-2 py-1.5"
      data-testid={testid}
      data-allowed={allowed ? "true" : "false"}
    >
      <span>{label}</span>
      <div className="flex items-center gap-1">
        {extra !== undefined ? (
          <Badge variant="outline" className="text-[10px]">
            {extra}
          </Badge>
        ) : null}
        <Badge
          variant={allowed ? "outline" : "destructive"}
          className="text-[10px]"
        >
          {allowed ? "Yes" : "Not yet"}
        </Badge>
      </div>
    </li>
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
