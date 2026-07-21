// FILE: DecisionEvidenceDrawer.tsx
// PURPOSE: [OTZAR STAGE-2 TRUTH-EVIDENCE §O] A single-purpose right Sheet that
//          shows the IMMUTABLE captured evidence a completed decision relied on,
//          alongside its SEPARATE live source status, and lets an authorized
//          user run one explicit recheck. It NEVER executes anything and NEVER
//          claims the decision was wrong — a changed basis is surfaced as
//          "review required", not "error".
// CONNECTS TO: DecisionEvidenceLane (mounts this), api.otzar.obligations
//              .{evidence,recheck}, labels/basis-status.
//
// WHY A NEW COMPONENT (reused-3+/drift-prone JSDoc rationale): the captured-vs-
// live distinction, the non-accusatory severity copy, the in-flight-guarded
// recheck, and the safe-classification projection are non-trivial and must be
// identical everywhere decision evidence is shown; a shared Sheet enforces it.
//
// PRIVACY: renders ids + closed-vocab classifications + timestamps + a short
// hash prefix ONLY. Never raw source text, message bodies, tokens, or the
// opaque `details` object.

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { canWriteOtzar } from "@/lib/auth/capabilities";
import { useAuthStore } from "@/lib/stores/auth";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import {
  getCurrentSourceStatusLabel,
  getCurrentSourceStatusSeverity,
  humanizeClassification,
  type EvidenceSeverity,
} from "@/lib/labels/basis-status";
import type {
  EvidenceSnapshotView,
  ObligationRecheckResponse,
  ObligationWithBasis,
} from "@/lib/types/foundation";

interface DecisionEvidenceDrawerProps {
  decision: ObligationWithBasis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a recheck completes (ok OR failed) so the lane refetches —
   *  server state is the source of truth. */
  onRechecked: () => void;
}

// Restrained ambient classes by severity — a calm tint, never a full alert.
const SEVERITY_TINT: Record<EvidenceSeverity, string> = {
  neutral: "border-border",
  amber: "border-amber-500/40 bg-amber-500/5",
  red: "border-destructive/40 bg-destructive/5",
};
const SEVERITY_TEXT: Record<EvidenceSeverity, string> = {
  neutral: "text-muted-foreground",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-destructive",
};

// A safe, bounded fingerprint indicator — first 8 chars, never the full hash as
// a claim of content. Purely a "which basis" visual anchor.
function shortHash(h: string | null): string {
  return h !== null && h.length >= 8 ? h.slice(0, 8) : "—";
}

export function DecisionEvidenceDrawer({
  decision,
  open,
  onOpenChange,
  onRechecked,
}: DecisionEvidenceDrawerProps): JSX.Element | null {
  const { capabilities } = useAuthStore();
  const writable = canWriteOtzar(capabilities);
  const [evidence, setEvidence] = useState<EvidenceSnapshotView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [recheckError, setRecheckError] = useState<string | null>(null);
  const [recheckResult, setRecheckResult] = useState<ObligationRecheckResponse | null>(null);

  const obligationId = decision?.obligation_id ?? null;

  const load = useCallback(() => {
    if (obligationId === null) return Promise.resolve();
    setLoading(true);
    return api.otzar.obligations
      .evidence(obligationId)
      .then((r) => {
        if (r.ok) {
          setEvidence(r.data.evidence);
          setLoadFailed(false);
        } else {
          setLoadFailed(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoadFailed(true);
        setLoading(false);
      });
  }, [obligationId]);

  // Load evidence whenever the drawer opens for a decision.
  useEffect(() => {
    if (open && obligationId !== null) {
      setRecheckError(null);
      setRecheckResult(null);
      void load();
    }
  }, [open, obligationId, load]);

  // Explicit recheck. In-flight guard prevents duplicate submissions; the server
  // is the source of truth — we always refetch + bubble up, never trust a local
  // optimistic result.
  const runRecheck = useCallback(async () => {
    if (obligationId === null || rechecking) return;
    setRechecking(true);
    setRecheckError(null);
    const r = await api.otzar.obligations.recheck(obligationId);
    if (r.ok) {
      setRecheckResult(r.data);
    } else {
      setRecheckError(
        r.message || "Couldn't recheck the evidence just now. Please try again.",
      );
    }
    await load(); // reconcile against the server regardless of outcome
    onRechecked();
    setRechecking(false);
  }, [obligationId, rechecking, load, onRechecked]);

  if (decision === null) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
        data-testid="decision-evidence-drawer"
      >
        <div className="space-y-5">
          <div className="space-y-2 border-b border-border pb-4">
            <SheetTitle className="text-lg font-semibold">{decision.title}</SheetTitle>
            <SheetDescription>
              The evidence this decision relied on, and whether it still holds.
              The recorded history never changes; the live status is shown
              separately.
            </SheetDescription>
          </div>

          {/* Explicit recheck — a governed review request, not an execution. */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Recheck compares the recorded basis against the current source and
              opens a review only if it has changed.
            </p>
            {writable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void runRecheck()}
                disabled={rechecking}
                data-testid="decision-evidence-recheck"
                aria-label="Recheck the evidence for this decision"
              >
                {rechecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Rechecking…
                  </>
                ) : (
                  "Recheck"
                )}
              </Button>
            ) : null}
          </div>

          {recheckError !== null ? (
            <p className="text-sm text-destructive" role="alert" data-testid="decision-evidence-recheck-error">
              {recheckError}
            </p>
          ) : null}

          {recheckResult !== null ? (
            recheckResult.status === "current" ? (
              <p className="text-sm text-muted-foreground" data-testid="decision-evidence-recheck-current">
                Decision basis remains current.
              </p>
            ) : (
              <div
                className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm"
                data-testid="decision-evidence-recheck-remediation"
              >
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Evidence changed. Review required
                </p>
                {recheckResult.remediation_obligation_id !== null ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    A review item has been opened
                    {recheckResult.remediation_created ? "" : " (already open)"} ·{" "}
                    <span className="font-mono" data-testid="decision-evidence-remediation-id">
                      {recheckResult.remediation_obligation_id}
                    </span>
                  </p>
                ) : null}
              </div>
            )
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground" data-testid="decision-evidence-loading">
              Loading the recorded evidence…
            </p>
          ) : loadFailed ? (
            <p className="text-sm text-muted-foreground" data-testid="decision-evidence-load-failed">
              The evidence isn't available right now.
            </p>
          ) : evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="decision-evidence-empty">
              No decision basis has been recorded for this yet.
            </p>
          ) : (
            <ul className="space-y-3" data-testid="decision-evidence-list">
              {evidence.map((s) => {
                const sev = getCurrentSourceStatusSeverity(s.current_source_status);
                return (
                  <li key={s.snapshot_id}>
                    <div
                      className={`rounded-md border p-3 ${SEVERITY_TINT[sev]}`}
                      data-testid="decision-evidence-snapshot"
                      data-current-source-status={s.current_source_status}
                    >
                      {/* LIVE status — visually separated from the captured basis below. */}
                      <div className="flex items-center gap-2">
                        {sev === "neutral" ? (
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
                        ) : (
                          <ShieldAlert className={`h-4 w-4 ${SEVERITY_TEXT[sev]}`} aria-hidden />
                        )}
                        <span className={`text-sm font-medium ${SEVERITY_TEXT[sev]}`} data-testid="decision-evidence-live-status">
                          {getCurrentSourceStatusLabel(s.current_source_status)}
                        </span>
                      </div>

                      {/* CAPTURED basis — the frozen record; labelled as history. */}
                      <div className="mt-3 space-y-1 border-t border-border/60 pt-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Recorded at the time of the decision
                        </p>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <dt className="text-muted-foreground">Decision point</dt>
                          <dd>{humanizeClassification(s.decision_point)}</dd>
                          <dt className="text-muted-foreground">Communication</dt>
                          <dd>{humanizeClassification(s.communication_act)}</dd>
                          <dt className="text-muted-foreground">Truth class</dt>
                          <dd>{humanizeClassification(s.truth_class)}</dd>
                          <dt className="text-muted-foreground">Authority</dt>
                          <dd>{humanizeClassification(s.authority_class)}</dd>
                          <dt className="text-muted-foreground">Currentness at capture</dt>
                          <dd>{humanizeClassification(s.currentness)}</dd>
                          <dt className="text-muted-foreground">Source integrity</dt>
                          <dd>{humanizeClassification(s.source_integrity_state)}</dd>
                          <dt className="text-muted-foreground">Recorded</dt>
                          <dd>{formatRelativeTime(s.captured_at)}</dd>
                          <dt className="text-muted-foreground">Basis ref</dt>
                          <dd className="font-mono">{shortHash(s.evidence_fingerprint)}</dd>
                        </dl>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
