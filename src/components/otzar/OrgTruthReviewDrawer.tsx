// FILE: OrgTruthReviewDrawer.tsx
// PURPOSE: [SECTION-10 ORG-TRUTH REVIEW §6-§11] A right Sheet for an authorized
//          reviewer to resolve one organizational-truth conflict: compare the
//          preserved competing candidates (authority / currentness / integrity /
//          truth-weight shown as DISTINCT signals — never one "confidence
//          score", never "highest weight wins"), see the current promoted answer
//          separately, select a winner, record a reason, and promote through the
//          governed backend. Server is authoritative; nothing is optimistic and
//          nothing is executed here.
// CONNECTS TO: OrgTruthReviewLane (mounts this), api.otzar.orgTruth, labels/
//              org-truth.
//
// WHY A NEW COMPONENT: the candidate-comparison discipline (distinct signals +
// mandated non-accusatory copy), the expected-version-guarded resolve with
// in-flight lock + server reconciliation, and the current-vs-competing-vs-
// historical labelling are drift-prone and must be identical everywhere org
// truth is reviewed.
//
// PRIVACY: ids + closed-vocab classifications + safe structured value only.
// Never raw source content, hashes, or metadata.

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert, Scale } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { canWriteOtzar } from "@/lib/auth/capabilities";
import { useAuthStore } from "@/lib/stores/auth";
import {
  ORG_TRUTH_COPY,
  getConflictStateLabel,
  getIntegritySeverity,
  humanizeOrgTruthClass,
  type OrgTruthSeverity,
} from "@/lib/labels/org-truth";
import type {
  ConflictCandidate,
  ConflictSet,
  ConflictSetWithCount,
  OrgTruthRecord,
} from "@/lib/types/foundation";

interface OrgTruthReviewDrawerProps {
  conflict: ConflictSetWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a resolution completes (ok OR failed) so the lane refetches. */
  onResolved: () => void;
}

const SEVERITY_TINT: Record<OrgTruthSeverity, string> = {
  neutral: "border-border",
  amber: "border-amber-500/40 bg-amber-500/5",
  red: "border-destructive/40 bg-destructive/5",
};
const SEVERITY_TEXT: Record<OrgTruthSeverity, string> = {
  neutral: "text-muted-foreground",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-destructive",
};

function candidateKey(c: ConflictCandidate): string {
  return `${c.source_record_type}:${c.source_record_id}`;
}

export function OrgTruthReviewDrawer({
  conflict,
  open,
  onOpenChange,
  onResolved,
}: OrgTruthReviewDrawerProps): JSX.Element | null {
  const { capabilities } = useAuthStore();
  const writable = canWriteOtzar(capabilities);
  const [set, setSet] = useState<ConflictSet | null>(null);
  const [candidates, setCandidates] = useState<ConflictCandidate[]>([]);
  const [current, setCurrent] = useState<OrgTruthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolvedRecord, setResolvedRecord] = useState<OrgTruthRecord | null>(null);

  const conflictId = conflict?.conflict_set_id ?? null;

  const load = useCallback(() => {
    if (conflictId === null) return Promise.resolve();
    setLoading(true);
    return api.otzar.orgTruth
      .getConflict(conflictId)
      .then((r) => {
        if (r.ok) {
          setSet(r.data.conflict.set);
          setCandidates(r.data.conflict.candidates);
          setLoadFailed(false);
          // The current promoted answer the reviewer would replace — resolved SERVER-SIDE from the
          // conflict's own truth_key (the client never reconstructs the topic). null ⇒ no current
          // answer. Reflects the pre-existing answer for an open conflict AND the freshly-promoted
          // answer after a resolve (this drawer re-loads on success), so no second lookup is needed.
          // `?? null` keeps this forward-compatible: on a Foundation that predates the
          // current_promoted_truth projection the field is absent (undefined) → render "no current
          // answer" rather than crashing on undefined.
          setCurrent(r.data.conflict.current_promoted_truth ?? null);
        } else {
          setLoadFailed(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoadFailed(true);
        setLoading(false);
      });
  }, [conflictId]);

  useEffect(() => {
    if (open && conflictId !== null) {
      setSelected(null);
      setReason("");
      setResolveError(null);
      setResolvedRecord(null);
      void load();
    }
  }, [open, conflictId, load]);

  const isReviewable = set !== null && (set.state === "OPEN" || set.state === "UNDER_REVIEW");
  const canSubmit =
    writable && isReviewable && selected !== null && reason.trim().length > 0 && !submitting;

  const runResolve = useCallback(async () => {
    if (set === null || selected === null || !canSubmit) return;
    const winner = candidates.find((c) => candidateKey(c) === selected);
    if (winner === undefined) return;
    setSubmitting(true);
    setResolveError(null);
    const r = await api.otzar.orgTruth.resolveConflict(set.conflict_set_id, {
      decision_domain: set.decision_domain,
      winner: {
        source_record_type: winner.source_record_type,
        source_record_id: winner.source_record_id,
        source_version: winner.source_version,
      },
      reason: reason.trim(),
      expected_conflict_version: set.version,
    });
    setSubmitting(false);
    if (r.ok) {
      setResolvedRecord(r.data.result.record);
      onResolved();
      void load(); // server is authoritative — refetch the reconciled state
    } else if (r.code === "OTZAR_ORG_TRUTH_STATE_CHANGED") {
      setResolveError(ORG_TRUTH_COPY.stale);
      onResolved();
      void load();
    } else {
      // Safe denial / typed failure — never reveals hidden authority detail.
      setResolveError(r.message || "This resolution could not be recorded.");
    }
  }, [set, selected, canSubmit, candidates, reason, onResolved, load]);

  if (conflict === null) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl" data-testid="org-truth-drawer">
        <SheetTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-muted-foreground" aria-hidden />
          Organizational truth review
        </SheetTitle>
        <SheetDescription className="text-xs">
          {ORG_TRUTH_COPY.reviewerSelects}
        </SheetDescription>

        {loading ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground" data-testid="org-truth-drawer-loading">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {ORG_TRUTH_COPY.loading}
          </p>
        ) : loadFailed || set === null ? (
          <p className="mt-6 text-sm text-muted-foreground" data-testid="org-truth-drawer-unavailable">
            This conflict is not available.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Conflict header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{humanizeOrgTruthClass(set.decision_domain)}</span>
                <Badge variant="outline" data-testid="org-truth-drawer-state">{getConflictStateLabel(set.state)}</Badge>
              </div>
              <p className="break-all text-xs text-muted-foreground" data-testid="org-truth-drawer-key">{set.truth_key}</p>
            </div>

            {/* Current promoted answer — SEPARATE + explicitly labelled. */}
            <section aria-label="Current promoted organizational truth" className="rounded-md border border-border p-3">
              <p className="text-xs font-medium text-foreground">{ORG_TRUTH_COPY.currentLabel}</p>
              {current !== null ? (
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground" data-testid="org-truth-drawer-current">
                  <div><span className="text-foreground">{current.title ?? humanizeOrgTruthClass(current.value_type)}</span>{" · "}{humanizeOrgTruthClass(current.state)}{current.state === "DISPUTED" ? " · disputed" : ""}</div>
                  <div>
                    v{current.version}
                    {current.truth_class !== null ? ` · ${humanizeOrgTruthClass(current.truth_class)}` : ""}
                    {current.truth_weight_rank !== null ? ` · weight ${current.truth_weight_rank}` : ""}
                    {current.winning_source_record_type !== null ? ` · source: ${humanizeOrgTruthClass(current.winning_source_record_type)}` : ""}
                  </div>
                  {selected !== null ? (
                    <div className="pt-0.5 text-amber-600 dark:text-amber-500" data-testid="org-truth-drawer-would-replace">{ORG_TRUTH_COPY.wouldReplace}</div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground" data-testid="org-truth-drawer-current-none">
                  {ORG_TRUTH_COPY.currentNone}
                </p>
              )}
            </section>

            {/* Candidate comparison — distinct signals, never a single score. */}
            <section aria-label="Competing candidates" className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldAlert className="h-4 w-4 text-amber-500" aria-hidden />
                <span>Competing candidates ({candidates.length})</span>
              </div>
              <p className="text-xs text-muted-foreground">{ORG_TRUTH_COPY.weightInforms}</p>
              <ul className="space-y-2" data-testid="org-truth-drawer-candidates">
                {candidates.map((c) => {
                  const key = candidateKey(c);
                  const integ = getIntegritySeverity(c.source_integrity_state);
                  const isSel = selected === key;
                  const demoted = c.superseded || c.retracted || !c.permission_eligible;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={!isReviewable || !writable || demoted}
                        onClick={() => setSelected(key)}
                        aria-pressed={isSel}
                        data-testid="org-truth-candidate"
                        data-selected={isSel}
                        className={`w-full rounded-md border p-3 text-left transition-colors ${SEVERITY_TINT[integ]} ${isSel ? "ring-2 ring-primary" : ""} ${demoted ? "opacity-60" : "hover:border-primary/50"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-foreground" data-testid="org-truth-candidate-label">
                            {c.display_label ??
                              `${humanizeOrgTruthClass(c.source_record_type)} · ${humanizeOrgTruthClass(c.truth_class)}`}
                          </span>
                          <span className="flex items-center gap-1">
                            {c.is_winner ? <Badge variant="outline" className="text-[10px]">Current source</Badge> : null}
                            {c.retracted ? <Badge variant="outline" className={`text-[10px] ${SEVERITY_TEXT.red}`}>Retracted</Badge> : null}
                            {c.superseded ? <Badge variant="outline" className="text-[10px]">Superseded</Badge> : null}
                          </span>
                        </div>
                        {c.claim_summary ? (
                          <p className="mt-1 text-[11px] leading-snug text-foreground/80" data-testid="org-truth-candidate-claim">
                            {c.claim_summary}
                          </p>
                        ) : null}
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <div><dt className="inline text-foreground/70">Authority: </dt><dd className="inline">{humanizeOrgTruthClass(c.authority_status)}</dd></div>
                          <div><dt className="inline text-foreground/70">Currentness: </dt><dd className="inline">{humanizeOrgTruthClass(c.currentness)}</dd></div>
                          <div><dt className="inline text-foreground/70">Integrity: </dt><dd className={`inline ${SEVERITY_TEXT[integ]}`}>{humanizeOrgTruthClass(c.source_integrity_state)}</dd></div>
                          <div><dt className="inline text-foreground/70">Truth weight: </dt><dd className="inline">{c.truth_weight_rank !== null ? `rank ${c.truth_weight_rank}` : "—"} · {humanizeOrgTruthClass(c.truth_class)}</dd></div>
                        </dl>
                        {demoted ? <p className="mt-1 text-[11px] text-muted-foreground">{ORG_TRUTH_COPY.sourceUnavailable}</p> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Linked review obligation */}
            {set.review_obligation_id !== null ? (
              <p className="text-xs text-muted-foreground" data-testid="org-truth-drawer-obligation">
                A review item is assigned for this conflict.
              </p>
            ) : null}

            {/* Resolution */}
            {resolvedRecord !== null ? (
              <p className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-400" data-testid="org-truth-drawer-resolved">
                Resolved — the organizational answer has been promoted.
              </p>
            ) : isReviewable && writable ? (
              <section aria-label="Resolve conflict" className="space-y-2 border-t border-border pt-4">
                <label htmlFor="org-truth-reason" className="text-xs font-medium text-foreground">Resolution reason (required)</label>
                <Textarea
                  id="org-truth-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this the organizational answer?"
                  className="text-sm"
                  data-testid="org-truth-reason"
                  disabled={submitting}
                />
                {resolveError !== null ? (
                  <p className="text-xs text-destructive" role="alert" data-testid="org-truth-resolve-error">{resolveError}</p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  disabled={!canSubmit}
                  onClick={() => void runResolve()}
                  data-testid="org-truth-resolve"
                >
                  {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Promote selected answer
                </Button>
              </section>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
