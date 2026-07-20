// FILE: Corrections.tsx
// PURPOSE: The employee HITL correction surface. Submits a correction
//          to the real POST /otzar/correction, writing a CORRECTION
//          capsule into scoped memory. Write-gated: correction uses
//          validateSession("write"), so the form is only enabled for
//          users with can_write_capsules.
// CONNECTS TO: api.otzar.correction, src/lib/auth/capabilities.ts.
//
// HONESTY GUARDRAILS:
//   - Records a correction into scoped memory. Does NOT imply broad
//     model retraining or any action in external tools.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { canWriteOtzar } from "@/lib/auth/capabilities";
import type { CorrectionRequest } from "@/lib/types/foundation";

export function Corrections() {
  const { capabilities } = useAuthStore();
  const writable = canWriteOtzar(capabilities);

  const [incorrect, setIncorrect] = useState("");
  const [correct, setCorrect] = useState("");
  const [targetCapsuleId, setTargetCapsuleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correctionSaved, setCorrectionSaved] = useState(false);

  if (!writable) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Corrections"
          description="Teach and correct your AI teammate."
        />
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            You don't have the <code>write</code> capability required to submit
            corrections. Ask your organization administrator to enable it.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function submit(): Promise<void> {
    if (submitting) return;
    if (incorrect.trim().length === 0 || correct.trim().length === 0) return;
    setError(null);
    setCorrectionSaved(false);
    setSubmitting(true);
    const trimmedTarget = targetCapsuleId.trim();
    const body: CorrectionRequest = {
      incorrect_description: incorrect.trim(),
      correct_behavior: correct.trim(),
      ...(trimmedTarget.length > 0 ? { target_capsule_id: trimmedTarget } : {}),
    };
    const r = await api.otzar.correction(body);
    setSubmitting(false);
    if (!r.ok) {
      setError(r.message || "Could not submit the correction. Please try again.");
      return;
    }
    setCorrectionSaved(true);
    setIncorrect("");
    setCorrect("");
    setTargetCapsuleId("");
  }

  return (
    <div
      className="space-y-6"
      data-testid="corrections-page"
      data-contextual-kind="corrections"
      data-contextual-host="/app/action-center"
    >
      <PageHeader
        title="Corrections"
        description="Tell Otzar what it got wrong and what the right behavior is. Saved as personal learning in your Digital Work Wallet — it improves how Otzar works with you at this organization, and it does not retrain a global model or act in outside tools. Also reachable from Needs me."
      />

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="incorrect">What Otzar got wrong</Label>
          <Textarea
            id="incorrect"
            value={incorrect}
            onChange={(e) => setIncorrect(e.target.value)}
            placeholder="Describe the incorrect understanding or behavior…"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="correct">The correct behavior</Label>
          <Textarea
            id="correct"
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
            placeholder="Describe what Otzar should do or understand instead…"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Related knowledge item ID (optional)</Label>
          <Input
            id="target"
            value={targetCapsuleId}
            onChange={(e) => setTargetCapsuleId(e.target.value)}
            placeholder="Knowledge item ID this correction is about (optional)"
          />
        </div>

        <Button
          type="submit"
          disabled={
            submitting ||
            incorrect.trim().length === 0 ||
            correct.trim().length === 0
          }
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            "Submit correction"
          )}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {correctionSaved && (
        <Card>
          <CardContent className="space-y-1 py-4 text-sm" data-testid="correction-result">
            <p className="font-medium">Correction saved.</p>
            <p className="text-muted-foreground">
              Otzar will use this to improve how it understands your work.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
