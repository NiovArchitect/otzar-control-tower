// FILE: Retention.tsx
// PURPOSE: Phase 1255 — the Data Retention & Lifecycle surface.
//          Honest first slice: explains, in plain language, what is
//          kept, who controls it, what can be revoked or deleted,
//          and what is immutable proof. No fake delete buttons; the
//          per-type retention policy editor is clearly marked as
//          arriving with the Founder-approved schema update.
// CONNECTS TO: Security & Audit (immutability), governed memory
//          (revocation), Work Comms design (transcript retention),
//          AdminCommandLayer ("retention").

import { Link } from "react-router-dom";
import { ArrowRight, Archive, Lock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LIFECYCLE_ROWS: Array<{ kind: string; rule: string }> = [
  {
    kind: "Audit records",
    rule: "Retained as tamper-evident proof. They cannot be deleted — that is what makes them proof.",
  },
  {
    kind: "Governed memory",
    rule: "Approved memory can be revoked from AI use at any time. Revocation is immediate and recorded.",
  },
  {
    kind: "Meeting & call transcripts",
    rule: "Follow your organization's retention policy. Capture requires consent; legal hold prevents deletion.",
  },
  {
    kind: "Documents Otzar read (Observe)",
    rule: "Stored as work records under org policy; never become permanent AI memory without approval.",
  },
  {
    kind: "Regulator packages",
    rule: "Time-boxed by design — they expire on schedule and can be revoked early at any time.",
  },
  {
    kind: "Work Comms messages",
    rule: "Will follow per-organization retention once Work Comms launches (design complete, schema pending).",
  },
];

export default function Retention(): JSX.Element {
  return (
    <div className="space-y-5" data-testid="retention-page">
      <PageHeader
        title="Data retention"
        description="How long your organization's data lives, who controls it, and what stays as proof. Your organization owns these decisions."
      />

      <Card data-testid="retention-lifecycle">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Archive className="h-4 w-4" aria-hidden /> What is kept, and who
            controls it
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {LIFECYCLE_ROWS.map((row) => (
            <div
              key={row.kind}
              className="rounded-xl border border-border/70 p-3"
              data-testid="retention-row"
            >
              <span className="font-medium text-foreground">{row.kind}</span>{" "}
              <span className="text-muted-foreground">— {row.rule}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="retention-controls">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4" aria-hidden /> Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <Link
            to="/data-knowledge"
            className="flex items-center justify-between rounded-xl border border-border/70 p-3 hover:border-primary/40"
          >
            <span>
              <span className="font-medium text-foreground">
                Review what AI can use
              </span>{" "}
              — knowledge items, permissions, and revocation live in Data
              &amp; Knowledge.
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
          <Link
            to="/security-audit"
            className="flex items-center justify-between rounded-xl border border-border/70 p-3 hover:border-primary/40"
          >
            <span>
              <span className="font-medium text-foreground">
                Review regulator shares
              </span>{" "}
              — expiry and revocation for every package, with audit.
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
          <p
            className="flex items-center gap-1 text-muted-foreground"
            data-testid="retention-editor-pending"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Per-type retention editing (including legal hold and
            export-before-deletion) arrives with a Founder-approved schema
            update.{" "}
            <Badge variant="outline" className="ml-1 text-[9px]">
              Setup needed
            </Badge>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
