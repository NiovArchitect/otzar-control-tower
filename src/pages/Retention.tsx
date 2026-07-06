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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Archive, Lock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { SeededDocumentLifecycleRowView } from "@/lib/types/foundation";

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
  // [RETENTION] the seeded-context lifecycle categories.
  {
    kind: "Seeded history & documents",
    rule: "Company-owned background context. Admins can retire it from active use — Otzar stops using it while the record, its audit trail, and its source lineage are preserved. Nothing is deleted.",
  },
  {
    kind: "Reviewed extracted work",
    rule: "Human-approved work follows work lifecycle, not document lifecycle — retiring a source document never removes work your team approved from it.",
  },
  {
    kind: "Employee Twin calibration & writing style",
    rule: "Personal preference memory — revocable by the employee from My Memory, not controlled by admins as company context. Writing-style raw samples are never stored.",
  },
];

// [RETENTION] governed lifecycle for seeded context: list + retire/restore
// with a two-step confirm — nothing writes until the explicit confirm, and
// nothing is ever deleted. Non-admins see the honest boundary copy only.
function SeededContextLifecycleCard(): JSX.Element {
  const [docs, setDocs] = useState<SeededDocumentLifecycleRowView[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "failed">("loading");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(): Promise<void> {
    const r = await api.workOs.contextDocuments();
    if (r.ok) {
      setDocs(r.data.documents);
      setState("ready");
    } else {
      setState(r.code === "OPERATION_NOT_PERMITTED" ? "denied" : "failed");
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function setLifecycle(id: string, next: "retired" | "active"): Promise<void> {
    setBusy(id);
    setNotice(null);
    const r = await api.workOs.setContextLifecycle(id, { state: next });
    setBusy(null);
    setConfirming(null);
    if (r.ok && r.data.ok) {
      setNotice(
        next === "retired"
          ? "Retired from active use. Otzar stops using it as background; the record, audit trail, and source lineage are preserved — nothing was deleted."
          : "Restored to active use.",
      );
      await load();
    } else {
      setNotice("That couldn't be changed right now. Nothing was modified — try again.");
    }
  }

  return (
    <Card data-testid="retention-context-lifecycle">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Archive className="h-4 w-4" aria-hidden /> Seeded context lifecycle
        </CardTitle>
        <CardDescription className="text-xs" data-testid="retention-lifecycle-copy">
          Retention controls are becoming governed lifecycle controls.
          Retiring context stops Otzar from using it as active background
          while preserving audit and source lineage. It never deletes the
          record, never touches work your team approved from it, and never
          affects anyone's personal Twin preferences. Hard delete,
          compliance purge, retention windows, and automated expiry are not
          available yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {state === "denied" ? (
          <p className="text-muted-foreground" data-testid="retention-lifecycle-denied">
            Lifecycle controls are governed by org admins.
          </p>
        ) : null}
        {state === "failed" ? (
          <p className="text-amber-600" data-testid="retention-lifecycle-failed">
            The lifecycle list couldn't load right now. Nothing changed — try again.
          </p>
        ) : null}
        {state === "ready" && docs !== null && docs.length === 0 ? (
          <p className="text-muted-foreground" data-testid="retention-lifecycle-empty">
            No seeded documents yet — seed organization context first.
          </p>
        ) : null}
        {state === "ready" && docs !== null
          ? docs.map((d) => (
              <div
                key={d.ledger_entry_id}
                className="rounded-xl border border-border/70 p-3"
                data-testid="retention-lifecycle-doc"
              >
                <div>
                  <span className="font-medium text-foreground">“{d.title_label}”</span>{" "}
                  <span className="text-muted-foreground">
                    — {d.origin_label}
                    {d.currentness_label !== undefined ? ` · ${d.currentness_label}` : ""}
                    {d.covering_period_label !== undefined ? ` · ${d.covering_period_label}` : ""}
                    {` · seeded ${d.seeded_on}`}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={
                      d.lifecycle_state_label === "Active"
                        ? "text-emerald-700"
                        : "text-muted-foreground"
                    }
                    data-testid="retention-lifecycle-state"
                  >
                    {d.lifecycle_state_label}
                  </span>
                  {d.lifecycle_state_label === "Active" ? (
                    confirming === d.ledger_entry_id ? (
                      <>
                        <span className="text-muted-foreground" data-testid="retention-retire-confirm-copy">
                          Otzar will stop using it as background; the record and
                          audit stay. Nothing is deleted.
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy !== null}
                          onClick={() => void setLifecycle(d.ledger_entry_id, "retired")}
                          data-testid="retention-retire-confirm"
                        >
                          {busy === d.ledger_entry_id ? "Retiring…" : "Confirm retire"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirming(null)}
                          data-testid="retention-retire-cancel"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirming(d.ledger_entry_id)}
                        data-testid="retention-retire"
                      >
                        Retire from active use
                      </Button>
                    )
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy !== null}
                      onClick={() => void setLifecycle(d.ledger_entry_id, "active")}
                      data-testid="retention-restore"
                    >
                      {busy === d.ledger_entry_id ? "Restoring…" : "Restore to active use"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          : null}
        {notice !== null ? (
          <p className="text-muted-foreground" data-testid="retention-lifecycle-notice">
            {notice}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

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

      {/* [RETENTION] the first governed lifecycle control — retire/restore
          seeded context. Admin-gated server-side; NEVER a delete. */}
      <SeededContextLifecycleCard />

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
            to="/setup/context-boundaries"
            className="flex items-center justify-between rounded-xl border border-border/70 p-3 hover:border-primary/40"
            data-testid="retention-boundaries-link"
          >
            <span>
              <span className="font-medium text-foreground">
                See Context Boundaries
              </span>{" "}
              — what company context Otzar has been given and how it is
              governed.
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
