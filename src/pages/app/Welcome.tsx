// FILE: Welcome.tsx
// PURPOSE: Phase 1237 — the Dandelion voice-first welcome. Otzar
//          greets the new employee (spoken via browser TTS on
//          request, text always), asks what to call them and how to
//          pronounce it, learns their communication + quiet
//          preferences, and — only with their explicit consent —
//          sends those preferences down the governed memory path:
//          an Action awaiting THEIR approval in Action Center.
//          Nothing is remembered silently.
//
// CONNECTS TO: api.otzar.dandelionOnboarding /
//          dandelionMemoryCandidate, useSpeechSynthesis (greeting),
//          /app/action-center (approval), /app/collaboration-workspaces.
//
// PRIVACY INVARIANT:
//   - Shows only the caller's scoped onboarding view.
//   - The memory candidate carries only fields the user typed.
//   - Copy never claims memory was saved — approval happens in
//     Action Center, and the page says so.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sparkles, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { api } from "@/lib/api";
import type { DandelionOnboardingResponse } from "@/lib/types/foundation";

type Onboarding = DandelionOnboardingResponse["onboarding"];

export function Welcome(): JSX.Element {
  const synthesis = useSpeechSynthesis();
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [preferredName, setPreferredName] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [communication, setCommunication] = useState("");
  const [quietPref, setQuietPref] = useState("");
  const [remember, setRemember] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.otzar.dandelionOnboarding().then((r) => {
      if (!cancelled && r.ok) setOnboarding(r.data.onboarding);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasAnything =
    [preferredName, pronunciation, communication, quietPref, remember].some(
      (v) => v.trim().length > 0,
    );

  async function submit(): Promise<void> {
    if (!hasAnything || submitting) return;
    setSubmitting(true);
    setError(null);
    const r = await api.otzar.dandelionMemoryCandidate({
      ...(preferredName.trim() !== ""
        ? { preferred_name: preferredName.trim() }
        : {}),
      ...(pronunciation.trim() !== ""
        ? { pronunciation: pronunciation.trim() }
        : {}),
      ...(communication.trim() !== ""
        ? { communication_preference: communication.trim() }
        : {}),
      ...(quietPref.trim() !== "" ? { quiet_preference: quietPref.trim() } : {}),
      ...(remember.trim() !== "" ? { remember_text: remember.trim() } : {}),
    });
    setSubmitting(false);
    if (!r.ok) {
      setError(
        r.message || "Otzar couldn't prepare that just now. Please try again.",
      );
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="space-y-6" data-testid="welcome-page">
      <PageHeader
        title="Welcome"
        description="Otzar will help you understand your day, your team, and what needs your attention."
      />

      {/* The greeting — voice on request, text always. */}
      <Card data-testid="welcome-greeting">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <p className="text-sm">
            {onboarding?.greeting ??
              "Welcome — I'm Otzar. I'll help you understand your day, your team, and what needs your attention."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!synthesis.supported}
            onClick={() =>
              synthesis.speak(
                onboarding?.greeting ??
                  "Welcome. I'm Otzar. What should I call you?",
                { source: "manual", force: true },
              )
            }
            data-testid="welcome-hear-greeting"
          >
            <Volume2 className="mr-1 h-4 w-4" aria-hidden /> Hear it
          </Button>
        </CardContent>
      </Card>

      {/* The questions — every field optional, nothing saved silently. */}
      <Card data-testid="welcome-questions">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tell Otzar about you</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="preferred-name">What should Otzar call you?</Label>
              <Input
                id="preferred-name"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="Your preferred name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pronunciation">
                How should I pronounce your name?
              </Label>
              <Input
                id="pronunciation"
                value={pronunciation}
                onChange={(e) => setPronunciation(e.target.value)}
                placeholder="e.g. sah-DAYL"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="communication">How do you like to communicate?</Label>
              <Input
                id="communication"
                value={communication}
                onChange={(e) => setCommunication(e.target.value)}
                placeholder="e.g. short messages, voice in the morning"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quiet-pref">When should Otzar stay quiet?</Label>
              <Input
                id="quiet-pref"
                value={quietPref}
                onChange={(e) => setQuietPref(e.target.value)}
                placeholder="e.g. during meetings, before 9am"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="remember">
              Anything you'd like Otzar to remember?
            </Label>
            <Textarea
              id="remember"
              value={remember}
              onChange={(e) => setRemember(e.target.value)}
              placeholder="Only what you write here is considered — and only after you approve it."
              rows={2}
            />
          </div>

          {submitted ? (
            <div
              className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-2 text-xs"
              data-testid="welcome-submitted"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                Sent for your approval. Otzar will remember this only after
                you approve it in the{" "}
                <Link
                  to="/app/action-center"
                  className="underline underline-offset-2"
                >
                  Action Center
                </Link>
                . You can change or revoke it anytime.
              </p>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={!hasAnything || submitting}
              data-testid="welcome-save"
            >
              {submitting ? "Preparing…" : "I'll remember that only if you approve it"}
            </Button>
          )}
          {error !== null ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <p className="text-[10px] text-muted-foreground">
            {onboarding?.memory_consent_note ??
              "Otzar only remembers what you approve. Anything you save is private to your organization, recorded in the audit trail, and you can revoke it later."}
          </p>
        </CardContent>
      </Card>

      {/* People + places to start with. */}
      {onboarding !== null ? (
        <Card data-testid="welcome-intros">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" aria-hidden /> A good first week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {onboarding.teammates_to_meet.length > 0 ? (
              <div data-testid="welcome-teammates">
                <p className="font-medium">People worth saying hello to</p>
                <ul className="mt-1 space-y-1">
                  {onboarding.teammates_to_meet.map((t) => (
                    <li
                      key={t.display_name}
                      className="flex items-center gap-2"
                    >
                      <span>{t.display_name}</span>
                      {t.role_label !== null ? (
                        <Badge variant="outline">{t.role_label}</Badge>
                      ) : null}
                      {t.shares_a_project ? (
                        <span className="text-muted-foreground">
                          shares a project with you
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {onboarding.workspaces_to_join.length > 0 ? (
              <div data-testid="welcome-workspaces">
                <p className="font-medium">Workspaces to explore</p>
                <ul className="mt-1 space-y-1">
                  {onboarding.workspaces_to_join.map((w) => (
                    <li key={w.workspace_id}>
                      <Link
                        to="/app/collaboration-workspaces"
                        className="underline-offset-2 hover:underline"
                      >
                        {w.title}{" "}
                        <ArrowRight className="inline h-3 w-3" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="font-medium">First steps</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {onboarding.first_steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
