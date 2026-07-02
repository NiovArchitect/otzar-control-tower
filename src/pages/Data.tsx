// FILE: Data.tsx
// PURPOSE: Phase 1255 slice 2 — the Data & Knowledge hub. Answers,
//          in plain language: where data comes from, where it can
//          go, how it flows through governance, which runtime
//          handles it, and what AI may use. Sources/runtimes are
//          LIVE (connector adapters + readiness APIs); destinations
//          and the flow map are truthful product statements with
//          real click-throughs. No raw backend tables, no jargon.
// CONNECTS TO: api.otzar.connectorAdapters (sources),
//          api.otzar.productionReadiness (runtimes), Retention,
//          Security & Audit, Access Control, AdminCommandLayer.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Database,
  GitBranch,
  Inbox,
  Send,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { humanizeStatus } from "@/lib/labels/humanize";
import type { HandoffReadinessResponse } from "@/lib/types/foundation";

interface SourceRow {
  name: string;
  status: string;
}

const DESTINATIONS: Array<{ label: string; note: string; to: string }> = [
  {
    label: "Governed memory",
    note: "Only after approval — AI can use it; you can revoke it any time.",
    to: "/access-control",
  },
  {
    label: "Workspaces & workflows",
    note: "Decisions, commitments, and follow-ups your teams act on.",
    to: "/workflows",
  },
  {
    label: "Reports & regulator packages",
    note: "Scoped, redacted, approval-gated, and revocable.",
    to: "/reports",
  },
  {
    label: "Audit proof",
    note: "Every step is recorded, tamper-evident, and retained as proof.",
    to: "/security-audit",
  },
];

const FLOW_STEPS = [
  "Coming from a source you connected",
  "Checked against your organization's permissions and policies",
  "Approved by a person when the action matters",
  "Delivered to workspaces, reports, memory, or notifications",
  "Recorded as audit proof, governed by retention",
] as const;

export function DataKnowledgePage(): JSX.Element {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [runtimes, setRuntimes] = useState<
    HandoffReadinessResponse["readiness"]["runtimes"]
  >([]);
  const [loadNote, setLoadNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.otzar
      .connectorAdapters()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setSources(
            r.data.adapters.map((a) => ({
              name: a.display_name,
              status: a.status,
            })),
          );
        } else
          setLoadNote(
            "Couldn't load sources right now — refresh to try again.",
          );
      })
      .catch(() => {
        if (!cancelled)
          setLoadNote(
            "Couldn't load sources right now — refresh to try again.",
          );
      });
    api.otzar
      .productionReadiness()
      .then((r) => {
        if (!cancelled && r.ok) setRuntimes(r.data.readiness.runtimes);
      })
      .catch(() => {
        /* runtime card stays empty-honest */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5" data-testid="data-knowledge-page">
      {/* PROD-MODEL-P4 §8 — this is the admin view of the governed knowledge
          lifecycle: raw capture → curated knowledge → permissioned use →
          retention. Retention is part of THIS story (linked below), not a
          stray page. */}
      <PageHeader
        title="Data & Knowledge"
        description="Your organization's knowledge lifecycle: raw captures become curated, permissioned knowledge that people, AI teammates, and reports may use — with lineage, audit, and retention at every step. Your organization owns all of it; nothing leaves without policy."
      />

      <Card data-testid="data-sources">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Inbox className="h-4 w-4" aria-hidden /> Coming from (data sources)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          {loadNote !== null ? (
            <p className="text-muted-foreground">{loadNote}</p>
          ) : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sources.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-xl border border-border/70 p-2.5"
                data-testid="data-source-row"
              >
                <span className="text-foreground">{s.name}</span>
                <Badge variant="outline" className="text-[9px]">
                  {humanizeStatus(s.status)}
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-2 text-muted-foreground">
            Also: meeting captures, documents you let Otzar read, and manual
            notes — always chosen by your people, never scraped.{" "}
            <Link
              to="/connectors"
              className="text-primary underline-offset-2 hover:underline"
            >
              Set up connections
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card data-testid="data-destinations">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="h-4 w-4" aria-hidden /> Can go to (destinations)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.label}
              to={d.to}
              className="flex items-center justify-between rounded-xl border border-border/70 p-3 hover:border-primary/40"
              data-testid="data-destination-row"
            >
              <span>
                <span className="font-medium text-foreground">{d.label}</span>{" "}
                <span className="text-muted-foreground">— {d.note}</span>
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </Link>
          ))}
          <p className="text-muted-foreground">
            Nothing leaves your organization without an approval — external
            sends are blocked until a person says yes.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="data-flow">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitBranch className="h-4 w-4" aria-hidden /> How it flows
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          <ol className="space-y-1.5">
            {FLOW_STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card data-testid="data-runtimes">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" aria-hidden /> Handled by (runtimes
            &amp; providers)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {runtimes.length === 0 ? (
            <p className="text-muted-foreground">
              Runtime status loads from the readiness check (admin access
              required).
            </p>
          ) : (
            runtimes.map((rt) => (
              <div
                key={rt.runtime}
                className="flex items-center justify-between rounded-xl border border-border/70 p-2.5"
                data-testid="data-runtime-row"
              >
                <span>
                  <span className="text-foreground">{rt.runtime}</span>{" "}
                  <span className="text-muted-foreground">— {rt.note}</span>
                </span>
                <Badge variant="outline" className="text-[9px]">
                  {humanizeStatus(rt.status)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card data-testid="data-ai-usage">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden /> What AI may use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p>
            <span className="font-medium text-foreground">AI can use</span>{" "}
            <span className="text-muted-foreground">
              — approved governed memory and the work context each person is
              permitted to see. Nothing more.
            </span>
          </p>
          <p>
            <span className="font-medium text-foreground">
              Blocked from AI
            </span>{" "}
            <span className="text-muted-foreground">
              — anything unapproved, anything revoked, anything outside the
              person's permissions, and anything another organization owns.
            </span>
          </p>
          <Link
            to="/retention"
            className="flex items-center justify-between rounded-xl border border-border/70 p-3 hover:border-primary/40"
          >
            <span className="text-foreground">
              Review retention &amp; revocation
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
