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
  completeReview,
  initialSession,
  OBSERVATION_LEARNS,
  OBSERVATION_NEVER,
  OBSERVATION_STATUS_NOTE,
  startSession,
  stopSession,
  type ConsentSession,
  type ObservationPolicy,
} from "@/lib/observation/consent-session";

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
          title="My Digital Work Wallet"
          description="How you work, what your Twin has learned, and what moves with you — your portable work identity."
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
          title="My Digital Work Wallet"
          description="How you work, what your Twin has learned, and what moves with you — your portable work identity."
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
    <div className="space-y-6" data-testid="my-memory-page">
      <PageHeader
        title="My Digital Work Wallet"
        description="How you work, what your Twin has learned, and what moves with you. Your methods, skills, and preferences are YOURS — your organization's records stay with the organization."
      />

      {/* [GAP-S S-1] The ownership boundary, rendered where the wallet
          already appears. Existing truth only: this wallet IS the personal
          wallet; company data lives in the organization's enterprise wallet.
          No export exists — future language is marked as future. */}
      <div className="space-y-2" data-testid="my-memory-boundary">
        <WalletProvenanceBadge walletType="PERSONAL" entityType="PERSON" />
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-md border border-border/60 p-2">
            <p className="font-medium text-foreground">Your personal work memory</p>
            <p>
              Your work style, preferences, personal learning, and reusable
              methods live here — they are yours, not the company&apos;s.
            </p>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <p className="font-medium text-foreground">Company-owned work data</p>
            <p>
              Company sources, meeting records, decisions, approvals, and
              audit history stay with the company — they are never part of
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
              hint="Times another teammate asked you or your Twin for something."
            />
            <Stat
              label="Collaborations outbound"
              value={i.context_signals.collaboration_outbound_count}
              hint="Times you or your Twin asked someone else for something."
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
              <p className="font-medium text-foreground">What your Twin may do</p>
              <p className="text-muted-foreground">
                Set by your organization's role and access policies. Teach and
                correct your Twin any time — granting or removing authority is
                an admin decision, recorded in the audit trail.
              </p>
            </div>
          </div>
          <RevocableRow
            icon={<PencilLine className="h-3 w-3" aria-hidden />}
            label="Preferences and corrections"
            description="Teach your Twin how you work. Edit or remove what it learned."
            to="/app/preferences"
            cta="Open preferences"
            testid="my-mem-revoke-preferences"
          />
          <RevocableRow
            icon={<Wallet className="h-3 w-3" aria-hidden />}
            label="Your Twin (identity + briefing)"
            description="See your Twin's current configuration and adjust as needed."
            to="/app/my-twin"
            cta="Open My Twin"
            testid="my-mem-revoke-twin"
          />
        </CardContent>
      </Card>

      {/* CX-SLICE-5 — the consent/trust layer for future workflow
          observation. Lives here because it is about YOUR portable work
          identity and how your Twin learns you. It captures NOTHING today. */}
      <ObservationConsentCard />

      {/* Reassurance */}
      <p className="text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-2 text-[10px]">
          Your sovereignty
        </Badge>
        Your memory and permissions are yours. Every grant is revocable; every
        action is recorded; nothing leaves your organization without your
        approval. This page is your control surface — Otzar follows it.
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

// CX-SLICE-5 — "Otzar is learning my work style FOR me, transparently, with
// my control — not spying on me." The consent + session-review model that
// must exist before any observation capture. It records NOTHING: it walks the
// employee through consent → active (with a visible indicator) → stop →
// review, so the trust protocol is real and testable now. Org policy is the
// gate (an employee can never enable it themselves); today no org has enabled
// it, so the honest state is "not enabled by your organization yet".
function ObservationConsentCard(): JSX.Element {
  // Org policy is not a wired field yet — the honest default is not-enabled.
  const policy: ObservationPolicy = "not_enabled_by_org";
  const [session, setSession] = useState<ConsentSession>(() => initialSession(policy));
  const [consent, setConsent] = useState(false);

  return (
    <Card data-testid="observation-consent-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4" aria-hidden /> Teach Otzar how you work
          {session.indicatorVisible ? (
            <span
              className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
              data-testid="observation-active-indicator"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Observing — you can stop anytime
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div data-testid="observation-learns">
            <p className="font-medium text-foreground">What Otzar would learn</p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {OBSERVATION_LEARNS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div data-testid="observation-never">
            <p className="font-medium text-foreground">What it never touches</p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {OBSERVATION_NEVER.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>

        {session.state === "unavailable" ? (
          <p className="text-[11px] text-amber-700" data-testid="observation-not-enabled">
            Your organization hasn&apos;t enabled work-style learning yet. When
            it does, you&apos;ll turn it on here — Otzar can never start it
            without your organization&apos;s policy and your explicit consent.
          </p>
        ) : session.state === "idle" ? (
          <div className="space-y-2" data-testid="observation-idle">
            <label className="flex items-start gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                data-testid="observation-consent-checkbox"
              />
              <span>
                I understand Otzar will learn my work methods during this
                session, that a visible indicator will show while it&apos;s on,
                and that I review what it learned before anything is kept.
              </span>
            </label>
            <Button
              size="sm"
              disabled={!consent}
              onClick={() => setSession((s) => startSession(s, { consentGiven: consent, policy }))}
              data-testid="observation-start"
            >
              Start a learning session
            </Button>
          </div>
        ) : session.state === "active" ? (
          <div className="space-y-2" data-testid="observation-active">
            <p className="text-muted-foreground">
              Otzar is watching how you work for this session only. Stop
              whenever you like — you&apos;ll review everything before it
              becomes part of your Work Wallet.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSession((s) => stopSession(s))}
              data-testid="observation-stop"
            >
              Stop the session
            </Button>
          </div>
        ) : (
          <div className="space-y-2" data-testid="observation-review">
            <p className="text-muted-foreground">
              Review before anything is kept: nothing enters your Work Wallet
              until you approve it, and company data is never included.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setSession((s) => completeReview(s, true))}
                data-testid="observation-review-keep"
              >
                Keep what I approved
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSession((s) => completeReview(s, false))}
                data-testid="observation-review-discard"
              >
                Discard everything
              </Button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground" data-testid="observation-status-note">
          {OBSERVATION_STATUS_NOTE}
        </p>
      </CardContent>
    </Card>
  );
}
