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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { ContextHealthResponse } from "@/lib/types/foundation";

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
