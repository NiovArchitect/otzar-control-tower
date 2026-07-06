// FILE: SeedCorpus.tsx
// PURPOSE: [CS-5] "Seed organization context" at /setup/seed-corpus — the
//          admin gives Otzar one piece of company-owned starting context
//          (project brief, SOP, decision log, policy, …) at a time.
//          Boundary-first, confirmation-gated, paste-only (no file upload
//          by design), and honest about the v1 contract: the document
//          becomes dated, lineaged REFERENCE context — no tasks, no
//          follow-ups, no personal memory, no external trust, no "Otzar
//          understands everything now."
// CONNECTS TO: api.otzar.seedDocumentContext (admin-gated server-side),
//          /setup/seed-history (transcript sibling), Gap V doctrine CS-5.

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { DocumentWorkCandidateView } from "@/lib/types/foundation";

const KINDS: Array<{ value: string; label: string }> = [
  { value: "PROJECT_BRIEF", label: "Project brief" },
  { value: "SOP", label: "Process / SOP" },
  { value: "DECISION_LOG", label: "Decision log" },
  { value: "MEETING_SUMMARY", label: "Meeting summary" },
  { value: "POLICY", label: "Policy" },
  { value: "CUSTOMER_CONTEXT", label: "Customer context" },
  { value: "VENDOR_CONTEXT", label: "Vendor context" },
  { value: "TEAM_CONTEXT", label: "Team context" },
  { value: "OTHER", label: "Other reference" },
];

const CURRENTNESS: Array<{ value: string; label: string }> = [
  { value: "current", label: "Current" },
  { value: "historical", label: "Historical" },
  { value: "unknown", label: "Not sure" },
];

const BODY_MAX = 20_000;

type Phase =
  | { kind: "input" }
  | { kind: "confirm" }
  | { kind: "seeding" }
  | { kind: "done"; ledgerEntryId: string }
  | { kind: "failed"; message: string };

// [DOC-EXTRACT] the review-first scan of the just-seeded document.
// Candidates live only in this state — nothing is persisted until the
// human explicitly creates an item through the existing work rail.
type ReviewCandidate = DocumentWorkCandidateView & {
  state: "open" | "creating" | "created" | "dismissed";
};
type Scan =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "failed"; message: string }
  | { kind: "ready"; note: string; sourceLabel: string; candidates: ReviewCandidate[] };

export function SeedCorpusPage() {
  const [docKind, setDocKind] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [currentness, setCurrentness] = useState("");
  const [period, setPeriod] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "input" });
  const [scan, setScan] = useState<Scan>({ kind: "idle" });

  // [DOC-EXTRACT] explicit-click scan — never automatic on seeding.
  async function scanForWork(ledgerEntryId: string): Promise<void> {
    setScan({ kind: "scanning" });
    const r = await api.otzar.extractDocumentPreview(ledgerEntryId);
    if (!r.ok) {
      setScan({
        kind: "failed",
        message: "The scan couldn't run right now. Nothing was created — try again.",
      });
      return;
    }
    setScan({
      kind: "ready",
      note: r.data.review_note,
      sourceLabel: `${r.data.source.origin_label}${r.data.source.covering_period_label !== undefined ? ` · ${r.data.source.covering_period_label}` : ""}${r.data.source.currentness_label !== undefined ? ` · ${r.data.source.currentness_label}` : ""}`,
      candidates: r.data.candidates.map((c) => ({ ...c, state: "open" })),
    });
  }

  function setCandidateState(index: number, state: ReviewCandidate["state"]): void {
    setScan((prev) =>
      prev.kind === "ready"
        ? {
            ...prev,
            candidates: prev.candidates.map((c, i) => (i === index ? { ...c, state } : c)),
          }
        : prev,
    );
  }

  // [DOC-EXTRACT] approval = the EXISTING governed work rail: PROPOSED
  // status, explicitly owned by the approving admin, extraction lineage
  // + human_reviewed on the row. Never automatic.
  async function approveCandidate(index: number, ledgerEntryId: string): Promise<void> {
    if (scan.kind !== "ready") return;
    const c = scan.candidates[index];
    if (c === undefined || !c.can_create || c.suggested_ledger_type === undefined) return;
    setCandidateState(index, "creating");
    const r = await api.workOs.createLedgerEntry({
      ledger_type: c.suggested_ledger_type,
      title: c.text,
      status: "PROPOSED",
      details: {
        source: "document_extraction_review",
        source_document_ledger_id: ledgerEntryId,
        human_reviewed: true,
        ...(c.excerpt !== undefined ? { source_excerpt: c.excerpt } : {}),
      },
    });
    setCandidateState(index, r.ok ? "created" : "open");
    if (!r.ok && scan.kind === "ready") {
      setScan((prev) =>
        prev.kind === "ready"
          ? { ...prev, note: "That item couldn't be created. Nothing changed — try again." }
          : prev,
      );
    }
  }

  const ready =
    docKind.length > 0 && title.trim().length > 0 && body.trim().length > 0 && currentness.length > 0;

  async function seed(): Promise<void> {
    setPhase({ kind: "seeding" });
    const r = await api.otzar.seedDocumentContext({
      source_kind: docKind,
      title: title.trim(),
      body: body.trim(),
      currentness,
      ...(period.trim().length > 0 ? { covering_period: period.trim() } : {}),
    });
    if (!r.ok) {
      setPhase({
        kind: "failed",
        message:
          r.code === "OPERATION_NOT_PERMITTED"
            ? "Seeding organization context requires admin authority."
            : r.message || "This couldn't be seeded right now. Nothing was created — try again.",
      });
      return;
    }
    setScan({ kind: "idle" });
    setPhase({ kind: "done", ledgerEntryId: r.data.ledger_entry_id });
  }

  return (
    <div className="space-y-6" data-testid="seed-corpus-page">
      <PageHeader
        title="Seed organization context"
        description="Give Otzar company-owned starting context — one document at a time, clearly typed and dated."
      />
      <p className="text-xs text-muted-foreground" data-testid="corpus-boundary">
        This gives Otzar starting context. It is company-owned and stays
        governed by your organization — it never becomes anyone's personal
        Twin memory. If the document is historical, Otzar treats it as
        background, not current truth. No tasks or follow-ups are created
        from it. You don't need to classify what it relates to — Otzar
        manages relevance and asks the right person when context matters.{" "}
        <Link to="/setup/seed-history" className="font-medium text-foreground underline underline-offset-2">
          Seeding a meeting transcript instead?
        </Link>
      </p>

      {phase.kind === "input" || phase.kind === "failed" ? (
        <Card data-testid="corpus-input">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4" aria-hidden />
              1 · What is this context?
            </CardTitle>
            <CardDescription>
              Paste the text of one document — up to {BODY_MAX.toLocaleString()}{" "}
              characters. File upload and folder sync aren't available yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Type of context</Label>
              <div className="flex flex-wrap gap-1.5" data-testid="corpus-kind">
                {KINDS.map((k) => (
                  <Button
                    key={k.value}
                    type="button"
                    size="sm"
                    variant={docKind === k.value ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() => setDocKind(docKind === k.value ? "" : k.value)}
                  >
                    {k.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="corpus-title">Title</Label>
                <Input
                  id="corpus-title"
                  maxLength={120}
                  placeholder="e.g. Support escalation SOP"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="corpus-title"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="corpus-period">Covering period (optional)</Label>
                <Input
                  id="corpus-period"
                  placeholder="e.g. 2025"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  data-testid="corpus-period"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Is this current?</Label>
              <div className="flex flex-wrap gap-1.5" data-testid="corpus-currentness">
                {CURRENTNESS.map((c) => (
                  <Button
                    key={c.value}
                    type="button"
                    size="sm"
                    variant={currentness === c.value ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() => setCurrentness(currentness === c.value ? "" : c.value)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              rows={10}
              maxLength={BODY_MAX + 1000}
              placeholder="Paste the document text…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              data-testid="corpus-body"
            />
            {phase.kind === "failed" ? (
              <p className="text-xs text-destructive" data-testid="corpus-error">
                {phase.message}
              </p>
            ) : null}
            <Button
              size="sm"
              disabled={!ready}
              onClick={() => setPhase({ kind: "confirm" })}
              data-testid="corpus-review"
            >
              Review before seeding
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {phase.kind === "confirm" || phase.kind === "seeding" ? (
        <Card data-testid="corpus-confirm">
          <CardHeader>
            <CardTitle className="text-sm">2 · What will happen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <ul className="space-y-1.5">
              {[
                `It's saved as company-owned reference context — "${KINDS.find((k) => k.value === docKind)?.label ?? "document"}"${currentness === "historical" ? ", treated as historical background, not current truth" : currentness === "unknown" ? ", with its currentness marked as unconfirmed" : ""}.`,
                "It's fully lineaged: who provided it, what period it covers, and when it was seeded.",
                "No tasks, follow-ups, or notifications are created — reference context never becomes homework.",
                "It never becomes anyone's personal Twin memory.",
                "External or client names inside it are not trusted automatically.",
                "Retention controls are not configurable in-product yet.",
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                  <span className="text-muted-foreground">{line}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhase({ kind: "input" })}
                disabled={phase.kind === "seeding"}
                data-testid="corpus-back"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={() => void seed()}
                disabled={phase.kind === "seeding"}
                data-testid="corpus-confirm-btn"
              >
                {phase.kind === "seeding" ? "Seeding…" : "Seed this context"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {phase.kind === "done" ? (
        <Card data-testid="corpus-done">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-600" aria-hidden />
              Context seeded
            </CardTitle>
            <CardDescription data-testid="corpus-done-copy">
              One reference-context record was created — dated, lineaged, and
              company-owned. It informs Otzar's understanding as background;
              it doesn't create work or change anyone's access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setTitle("");
                  setBody("");
                  setPeriod("");
                  setScan({ kind: "idle" });
                  setPhase({ kind: "input" });
                }}
                data-testid="corpus-more"
              >
                Seed another
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/data-knowledge">Open Data & Knowledge</Link>
              </Button>
              <Button asChild variant="outline" size="sm" data-testid="corpus-back-to-setup">
                <Link to="/setup">Back to Organization Setup</Link>
              </Button>
            </div>

            {/* [DOC-EXTRACT] review-first scan — explicit click only. */}
            {scan.kind === "idle" ? (
              <div className="space-y-1 border-t border-border/50 pt-2">
                <p className="text-xs text-muted-foreground" data-testid="extract-promise">
                  Otzar can scan this seeded document for possible work to
                  review. Nothing becomes a task, follow-up, or assignment
                  unless a human approves it.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void scanForWork(phase.ledgerEntryId)}
                  data-testid="extract-scan"
                >
                  Scan for possible work to review
                </Button>
              </div>
            ) : null}
            {scan.kind === "scanning" ? (
              <p className="text-xs text-muted-foreground" data-testid="extract-scanning">
                Scanning… nothing is created by the scan itself.
              </p>
            ) : null}
            {scan.kind === "failed" ? (
              <p className="text-xs text-amber-600" data-testid="extract-failed">
                {scan.message}
              </p>
            ) : null}
            {scan.kind === "ready" ? (
              <div className="space-y-2 border-t border-border/50 pt-2" data-testid="extract-review">
                <p className="text-xs text-muted-foreground" data-testid="extract-note">
                  {scan.note} <span className="text-foreground/70">{scan.sourceLabel}</span>
                </p>
                {scan.candidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground" data-testid="extract-empty">
                    Otzar didn't find possible work items to suggest from this
                    document — nothing was created.
                  </p>
                ) : (
                  scan.candidates.map((c, i) => (
                    <div
                      key={`${c.kind_label}-${i}`}
                      className="rounded border border-border/60 p-2 text-xs"
                      data-testid="extract-candidate"
                    >
                      <div className="font-medium">
                        {c.kind_label} — {c.text}
                      </div>
                      {c.excerpt !== undefined ? (
                        <div className="mt-0.5 text-muted-foreground" data-testid="extract-excerpt">
                          From the document: “{c.excerpt}”
                        </div>
                      ) : null}
                      {c.state === "created" ? (
                        <div className="mt-1 text-emerald-700" data-testid="extract-created">
                          Approved item created as governed work — it starts as
                          proposed work owned by you.
                        </div>
                      ) : c.state === "dismissed" ? (
                        <div className="mt-1 text-muted-foreground" data-testid="extract-dismissed">
                          Rejected. Otzar will not use this extraction as work.
                        </div>
                      ) : (
                        <div className="mt-1 flex gap-2">
                          {c.can_create ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={c.state === "creating"}
                              onClick={() => void approveCandidate(i, phase.ledgerEntryId)}
                              data-testid="extract-approve"
                            >
                              {c.state === "creating" ? "Creating…" : "Create as governed work"}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground" data-testid="extract-info-only">
                              For awareness only — confirm ownership with the
                              person on real work.
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCandidateState(i, "dismissed")}
                            data-testid="extract-dismiss"
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
