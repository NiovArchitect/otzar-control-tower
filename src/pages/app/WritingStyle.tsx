// FILE: WritingStyle.tsx
// PURPOSE: [CS-4] "Writing style" at /app/my-twin/calibration/writing-style.
//          The employee pastes a short sample THEY wrote; the sample stays
//          in the browser (never transmitted, never stored). A mechanical
//          mirror reflects its structure; the employee writes the guidance
//          in their own words; an explicit consent checkbox and a preview
//          of EXACTLY what will be proposed gate the save; the proposal
//          rides the CS-3 consent rail (approve in Action Center →
//          personal PREFERENCE capsule, revocable). Style, not facts —
//          company/sensitive-looking samples are refused with repair copy.
// CONNECTS TO: src/lib/twin/style-mirror.ts (pure guardrails + mirror),
//          api.otzar.twinCalibration (writing_style_text), CS-3 page.

import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, PenLine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
  SAMPLE_MAX_CHARS,
  checkSample,
  composeStyleGuidance,
  mirrorStructure,
} from "@/lib/twin/style-mirror";

type Phase =
  | { kind: "sample" }
  | { kind: "mirror"; structure: string[] }
  | { kind: "saving" }
  | { kind: "done" }
  | { kind: "failed"; message: string };

export function WritingStylePage() {
  const [sample, setSample] = useState("");
  const [ownWords, setOwnWords] = useState("");
  const [consented, setConsented] = useState(false);
  const [guardMessage, setGuardMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "sample" });

  function reflect(): void {
    const check = checkSample(sample);
    if (check.ok === false) {
      setGuardMessage(check.message);
      return;
    }
    setGuardMessage(null);
    setPhase({ kind: "mirror", structure: mirrorStructure(sample) });
  }

  const proposed =
    phase.kind === "mirror" ? composeStyleGuidance(ownWords, phase.structure) : "";

  async function save(structure: string[]): Promise<void> {
    setPhase({ kind: "saving" });
    const guidance = composeStyleGuidance(ownWords, structure);
    const r = await api.otzar.twinCalibration({ writing_style_text: guidance });
    if (!r.ok) {
      setPhase({
        kind: "failed",
        message:
          "Your style guidance couldn't be proposed right now. Nothing was stored — try again, or describe your style in more general terms.",
      });
      return;
    }
    setPhase({ kind: "done" });
  }

  return (
    <div className="space-y-6" data-testid="writing-style-page">
      <PageHeader
        title="Writing style"
        description="Help your AI Teammate learn how you write — tone, structure, and phrasing. Style, not facts."
      />
      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs" data-testid="style-boundary">
        <p className="font-medium text-foreground">
          Your AI Teammate can learn how you write. It cannot take ownership of
          company work.
        </p>
        <p className="mt-1 text-muted-foreground">
          Paste a short sample you wrote yourself, or write a few sentences
          in your natural style. Do not paste company documents, customer
          information, project records, meeting notes, credentials, or
          confidential work. Otzar uses this to learn style, not facts —
          and your sample never leaves this page: only the style guidance
          you approve below is proposed to memory.
        </p>
      </div>

      {phase.kind === "done" ? (
        <Card data-testid="style-done">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-600" aria-hidden />
              Style guidance proposed
            </CardTitle>
            <CardDescription data-testid="style-done-copy">
              Nothing is remembered until you approve it: review the proposed
              style memory in Action Center. You can revoke it any time from
              My Memory. Your sample was not saved or sent anywhere.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild size="sm">
              <Link to="/app/action-center">Open Action Center</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/my-twin/calibration">Back to calibration</Link>
            </Button>
          </CardContent>
        </Card>
      ) : phase.kind === "sample" || phase.kind === "failed" ? (
        <Card data-testid="style-sample">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PenLine className="h-4 w-4" aria-hidden />
              1 · A short sample, in your own voice
            </CardTitle>
            <CardDescription>
              A quick note or message you'd naturally write — up to{" "}
              {SAMPLE_MAX_CHARS} characters. It stays on this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={6}
              maxLength={SAMPLE_MAX_CHARS + 400}
              placeholder="e.g. Hey team — quick update. The rollout went well…"
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              data-testid="style-sample-text"
            />
            {guardMessage !== null ? (
              <p className="text-xs text-destructive" data-testid="style-guard">
                {guardMessage}
              </p>
            ) : null}
            {phase.kind === "failed" ? (
              <p className="text-xs text-destructive" data-testid="style-error">
                {phase.message}
              </p>
            ) : null}
            <Button size="sm" onClick={reflect} data-testid="style-reflect">
              Reflect my style
            </Button>
          </CardContent>
        </Card>
      ) : phase.kind === "mirror" || phase.kind === "saving" ? (
        <Card data-testid="style-mirror">
          <CardHeader>
            <CardTitle className="text-sm">2 · What will be proposed</CardTitle>
            <CardDescription>
              Only this guidance is proposed to your twin — never the sample
              itself, never facts from it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {phase.kind === "mirror" && phase.structure.length > 0 ? (
              <p className="text-xs text-muted-foreground" data-testid="style-structure">
                From your sample's structure: {phase.structure.join(" · ")}
              </p>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="style-words" className="text-xs font-medium">
                Your style, in your own words
              </Label>
              <Textarea
                id="style-words"
                rows={3}
                maxLength={500}
                placeholder="e.g. Warm but direct. Short context first, then the ask. Client-facing drafts should sound confident."
                value={ownWords}
                onChange={(e) => setOwnWords(e.target.value)}
                data-testid="style-own-words"
              />
            </div>
            {proposed.length > 0 ? (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="text-[11px] font-medium text-foreground">
                  Proposed style memory (needs your approval):
                </p>
                <p className="text-xs text-muted-foreground" data-testid="style-proposed">
                  {proposed}
                </p>
              </div>
            ) : null}
            <label className="flex items-start gap-2 text-xs" data-testid="style-consent">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                data-testid="style-consent-box"
                className="mt-0.5"
              />
              <span className="text-muted-foreground">
                I confirm this is my own writing style sample and the
                guidance above does not include confidential company or
                customer information.
              </span>
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhase({ kind: "sample" })}
                data-testid="style-back"
              >
                Back
              </Button>
              <Button
                size="sm"
                disabled={!consented || proposed.length === 0 || phase.kind === "saving"}
                onClick={() => phase.kind === "mirror" && void save(phase.structure)}
                data-testid="style-save"
              >
                {phase.kind === "saving" ? "Proposing…" : "Propose to my twin"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Nothing is remembered until you approve the proposed memory in
              Action Center.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
