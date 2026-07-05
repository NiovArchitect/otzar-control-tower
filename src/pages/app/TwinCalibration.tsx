// FILE: TwinCalibration.tsx
// PURPOSE: [CS-3] "Calibrate My AI Twin" at /app/my-twin/calibration — the
//          employee teaches their OWN twin the SHAPE of how they work:
//          summaries, tone, reminders, decision framing, style in their
//          own words, current focus, and do-not-dos. Boundary copy renders
//          FIRST and always: the twin learns the shape of how you work —
//          it cannot take ownership of company work. Plain text and
//          enumerated preferences only (no files); nothing is written
//          until explicit save; the save PROPOSES memory through the
//          existing consent gate — it becomes permanent only after the
//          user approves it, and it stays revocable afterwards.
// CONNECTS TO: api.otzar.twinCalibration (POST /otzar/twin/calibration),
//          /app/my-twin (the door), Gap V doctrine lane 2.

import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const CHOICES: Array<{
  key: "summary_preference" | "tone_preference" | "reminder_preference" | "decision_support_preference";
  label: string;
  options: string[];
}> = [
  {
    key: "summary_preference",
    label: "How do you like summaries?",
    options: [
      "Concise bullets",
      "Detailed explanation",
      "Executive summary first",
      "Risks and blockers first",
      "Action items first",
    ],
  },
  {
    key: "tone_preference",
    label: "What tone should your twin use?",
    options: [
      "Warm and direct",
      "Concise and professional",
      "Friendly and casual",
      "Executive and formal",
      "Plain language and simple",
    ],
  },
  {
    key: "reminder_preference",
    label: "How should reminders behave?",
    options: [
      "Remind me early",
      "Remind me near the deadline",
      "Batch reminders together",
      "Avoid reminders unless urgent",
    ],
  },
  {
    key: "decision_support_preference",
    label: "How should decisions be framed?",
    options: [
      "Show risks first",
      "Show tradeoffs",
      "Show the recommended next step",
      "Show options before a recommendation",
      "Ask before acting",
    ],
  },
];

const TEXTS: Array<{
  key: "writing_style_text" | "current_focus_text" | "do_not_do_text";
  label: string;
  placeholder: string;
}> = [
  {
    key: "writing_style_text",
    label: "Your working style, in your own words (optional)",
    placeholder: "e.g. Short context first, then the action. I like blockers before details.",
  },
  {
    key: "current_focus_text",
    label: "Your current focus and responsibilities (optional)",
    placeholder: "e.g. Customer onboarding quality this quarter.",
  },
  {
    key: "do_not_do_text",
    label: "What should your twin avoid? (optional)",
    placeholder: "e.g. Don't send anything without asking. Don't interrupt me for low-priority items.",
  },
];

const MAX_TEXT = 600;

type Phase = { kind: "form" } | { kind: "saving" } | { kind: "done" } | { kind: "failed"; message: string };

export function TwinCalibrationPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const anyValue = Object.values(values).some((v) => v.trim().length > 0);

  async function save(): Promise<void> {
    setPhase({ kind: "saving" });
    const body: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v.trim().length > 0) body[k] = v.trim().slice(0, MAX_TEXT);
    }
    const r = await api.otzar.twinCalibration(body);
    if (!r.ok) {
      setPhase({
        kind: "failed",
        message: "Your preferences couldn't be saved right now. Nothing was stored — try again.",
      });
      return;
    }
    setPhase({ kind: "done" });
  }

  return (
    <div className="space-y-6" data-testid="twin-calibration-page">
      <PageHeader
        title="Calibrate My AI Twin"
        description="Teach your AI Twin how you like help — summaries, tone, reminders, and what to avoid."
      />
      {/* The boundary — first, always. */}
      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs" data-testid="calibration-boundary">
        <p className="font-medium text-foreground">
          Your AI Twin can learn the shape of how you work. It cannot take
          ownership of company work.
        </p>
        <p className="mt-1 text-muted-foreground">
          Use this for preferences, tone, reminders, and how you like help.
          Do not paste confidential company documents or project records
          here — company project data, customer data, source documents,
          approvals, and audit trails stay governed by your organization.
          Your organization's policies still apply.
        </p>
      </div>

      {phase.kind === "done" ? (
        <Card data-testid="calibration-done">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-emerald-600" aria-hidden />
              Preferences proposed to your twin
            </CardTitle>
            <CardDescription data-testid="calibration-done-copy">
              Nothing is remembered without you: approve the proposed memory
              in your Action Center to make it stick. You can revoke it any
              time from My Memory.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild size="sm" data-testid="calibration-to-actions">
              <Link to="/app/action-center">Open Action Center</Link>
            </Button>
            <Button asChild variant="outline" size="sm" data-testid="calibration-back">
              <Link to="/app/my-twin">Back to My AI Twin</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="calibration-form">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" aria-hidden />
              How should your twin help you?
            </CardTitle>
            <CardDescription>
              Everything here is optional and personal to you. Saving
              proposes it to your twin's memory — it becomes permanent only
              after you approve it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {CHOICES.map((c) => (
              <div key={c.key} className="space-y-1">
                <Label className="text-xs font-medium">{c.label}</Label>
                <div className="flex flex-wrap gap-1.5" data-testid={`calibration-${c.key}`}>
                  {c.options.map((opt) => (
                    <Button
                      key={opt}
                      type="button"
                      size="sm"
                      variant={values[c.key] === opt ? "default" : "outline"}
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        setValues((v) => ({ ...v, [c.key]: v[c.key] === opt ? "" : opt }))
                      }
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground" data-testid="calibration-style-pointer">
              Want your twin to match your writing voice?{" "}
              <Link
                to="/app/my-twin/calibration/writing-style"
                className="font-medium text-foreground underline underline-offset-2"
              >
                Reflect a writing sample
              </Link>{" "}
              — it stays on your device; only style guidance is proposed.
            </p>
            {TEXTS.map((t) => (
              <div key={t.key} className="space-y-1">
                <Label htmlFor={t.key} className="text-xs font-medium">
                  {t.label}
                </Label>
                <Textarea
                  id={t.key}
                  rows={2}
                  maxLength={MAX_TEXT}
                  placeholder={t.placeholder}
                  value={values[t.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [t.key]: e.target.value }))}
                  data-testid={`calibration-${t.key}`}
                />
              </div>
            ))}
            {phase.kind === "failed" ? (
              <p className="text-xs text-destructive" data-testid="calibration-error">
                {phase.message}
              </p>
            ) : null}
            <Button
              size="sm"
              disabled={!anyValue || phase.kind === "saving"}
              onClick={() => void save()}
              data-testid="calibration-save"
            >
              {phase.kind === "saving" ? "Proposing…" : "Propose to my twin"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
