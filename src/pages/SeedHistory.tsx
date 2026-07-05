// FILE: SeedHistory.tsx
// PURPOSE: [CS-2] "Seed organization history" at /setup/seed-history — the
//          admin surface for Gap V lane 1. Paste a historical transcript
//          with the period it covers; Otzar runs it through the ONE
//          ingestion spine in seeded-context mode: everything lands as
//          company-owned, lineaged CONTEXT ("seeded history, provided by
//          you, covering X") — never to-dos, never follow-up drafts, never
//          notifications. External names still go to review. The preview
//          step states all of this BEFORE anything is written; nothing is
//          created without explicit confirmation.
// CONNECTS TO: api.otzar.commsIngest (seeded_context param — admin-gated
//          server-side), /setup (Foundation card door), Gap V doctrine.

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type Phase =
  | { kind: "input" }
  | { kind: "confirm" }
  | { kind: "seeding" }
  | { kind: "done"; summary: string }
  | { kind: "failed"; message: string };

export function SeedHistoryPage() {
  const [text, setText] = useState("");
  const [period, setPeriod] = useState("");
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "input" });

  async function seed(): Promise<void> {
    setPhase({ kind: "seeding" });
    const r = await api.otzar.commsIngest({
      captured_text: text,
      ...(title.trim().length > 0 ? { title: title.trim() } : {}),
      seeded_context: {
        ...(period.trim().length > 0 ? { covering_period: period.trim() } : {}),
      },
    });
    if (!r.ok) {
      setPhase({
        kind: "failed",
        message:
          r.code === "OPERATION_NOT_PERMITTED"
            ? "Seeding organization history requires admin authority."
            : "The history couldn't be seeded right now. Nothing was created — try again.",
      });
      return;
    }
    const counts = r.data.result as unknown as {
      work_items?: unknown[];
      summary?: { owned?: number };
    };
    const n = Array.isArray(counts.work_items) ? counts.work_items.length : 0;
    setPhase({
      kind: "done",
      summary: `${n} ${n === 1 ? "context record" : "context records"} were created from this history — as background knowledge, not to-dos.`,
    });
  }

  return (
    <div className="space-y-6" data-testid="seed-history-page">
      <PageHeader
        title="Seed organization history"
        description="Give Otzar background from before it arrived — past meetings and decisions become company-owned context, clearly dated, never to-dos."
      />
      <p className="text-xs text-muted-foreground" data-testid="seed-history-doctrine">
        Seeded history is context, not current work: no follow-ups are
        drafted, nobody is notified, and nothing lands in anyone's task list.
        External names found in history still go to review before they're
        trusted. Everything stays company-owned.{" "}
        <Link to="/setup/seed-corpus" className="font-medium text-foreground underline underline-offset-2">
          Seeding a document instead?
        </Link>
      </p>

      {phase.kind === "input" && (
        <Card data-testid="seed-history-input">
          <CardHeader>
            <CardTitle className="text-sm">1 · Paste the history</CardTitle>
            <CardDescription>
              A past meeting transcript or conversation notes, with the
              period it covers so the context is honestly dated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="seed-period">What period does this cover?</Label>
                <Input
                  id="seed-period"
                  placeholder="e.g. 2025 Q3"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  data-testid="seed-history-period"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="seed-title">Title (optional)</Label>
                <Input
                  id="seed-title"
                  placeholder="e.g. Q3 planning meeting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="seed-history-title"
                />
              </div>
            </div>
            <Textarea
              rows={10}
              placeholder="Paste the historical transcript or notes…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              data-testid="seed-history-text"
            />
            <Button
              size="sm"
              disabled={text.trim().length === 0}
              onClick={() => setPhase({ kind: "confirm" })}
              data-testid="seed-history-review"
            >
              Review before seeding
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      )}

      {phase.kind === "confirm" && (
        <Card data-testid="seed-history-confirm">
          <CardHeader>
            <CardTitle className="text-sm">2 · What will happen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <ul className="space-y-1.5">
              {[
                "Otzar reads the trusted text and finds the decisions, commitments, and relationships inside it.",
                `Everything is recorded as dated context${period.trim().length > 0 ? ` ("seeded history covering ${period.trim()}")` : ""} — visible in your organization's records with full lineage.`,
                "No to-dos are created, no follow-ups are drafted, and nobody is notified — history never becomes homework.",
                "External or client names go to Organization Seeding for review before Otzar trusts them.",
                "Everything created is company-owned and stays reviewable.",
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
                data-testid="seed-history-back"
              >
                Back
              </Button>
              <Button size="sm" onClick={() => void seed()} data-testid="seed-history-confirm-btn">
                <History className="mr-1 h-3.5 w-3.5" aria-hidden />
                Seed this history
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase.kind === "seeding" && (
        <Card data-testid="seed-history-progress">
          <CardHeader>
            <CardTitle className="text-sm">Seeding…</CardTitle>
            <CardDescription>Reading the history and recording dated context.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {phase.kind === "done" && (
        <Card data-testid="seed-history-done">
          <CardHeader>
            <CardTitle className="text-sm">History seeded</CardTitle>
            <CardDescription data-testid="seed-history-summary">{phase.summary}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild size="sm" data-testid="seed-history-more">
              <Link to="/setup/seed-history" onClick={() => { setText(""); setTitle(""); setPhase({ kind: "input" }); }}>
                Seed another
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/organization-seeding">Open Organization Seeding</Link>
            </Button>
            <Button asChild variant="outline" size="sm" data-testid="seed-history-back-to-setup">
              <Link to="/setup">Back to Organization Setup</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {phase.kind === "failed" && (
        <Card data-testid="seed-history-failed">
          <CardHeader>
            <CardTitle className="text-sm">Nothing was seeded</CardTitle>
            <CardDescription data-testid="seed-history-error">{phase.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => setPhase({ kind: "confirm" })}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
