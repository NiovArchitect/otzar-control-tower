// FILE: ReviewCenter.tsx
// PURPOSE: Phase 1300-A — the Control Tower "Review Center" governance surface
//          for high-sensitivity data reviews. It is the first governance cockpit
//          over the shipped Foundation routes (1297-A review workflow + 1298-A
//          retention + 1299-A reviewer delegation + 1299-B visibility/audit). It
//          shows a human WHAT needs review, WHAT they requested/provided, WHAT
//          their org can review, and the safe lifecycle/eligibility history — and
//          lets authorized humans approve (safe mode only) / deny / revoke.
//
//          SAFE-LABELS-ONLY. It never displays raw capsule body, payload_content,
//          storage_location, embedding, content_hash, medical/biometric/children
//          content, secrets, hidden reasoning, or payment data. Entity ids are
//          never primary labels. VISIBILITY IS NOT APPROVAL AUTHORITY — every
//          action calls the backend and honors the returned code; nothing is
//          guessed client-side. Raw access / training / model-improvement /
//          redistribution / commercial toggles are never offered.
//
// CONNECTS TO: src/lib/api.ts (api.reviews.*), src/lib/types/foundation.ts
//              (HighSensitivityReview etc.), src/lib/nav.ts + src/App.tsx (route).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  HighSensitivityReview,
  ReviewAuditEvent,
  ReviewListResponse,
  ReviewListScope,
  ReviewSummary,
} from "@/lib/types/foundation";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

// ── Safe closed-vocab label helpers (never raw tokens / UUIDs) ──────────────

function humanizeStatus(s: string): string {
  const m: Record<string, string> = {
    PENDING_REVIEW: "Pending review",
    APPROVED: "Approved",
    DENIED: "Denied",
    REVOKED: "Revoked",
    EXPIRED: "Expired",
  };
  return m[s] ?? sentence(s);
}
function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" | "warning" {
  switch (s) {
    case "APPROVED":
      return "default";
    case "PENDING_REVIEW":
      return "secondary";
    case "DENIED":
      return "destructive";
    default:
      return "outline";
  }
}
function humanizeAccessMode(m: string): string {
  const map: Record<string, string> = {
    PROOF_ONLY: "Proof only",
    SAFE_PROJECTION: "Safe projection",
    AGGREGATED_SIGNAL: "Aggregated signal",
    DEPERSONALIZED_SIGNAL: "Depersonalized signal",
    MEMORY_CAPSULE_BUNDLE: "Knowledge bundle",
    RETRIEVAL_QUERY: "Retrieval query",
    CAPSULE_REFERENCE: "Knowledge reference",
    LLM_CONTEXT_ACCESS: "Context access",
    APP_WORLD_PERSONALIZATION: "App personalization",
  };
  return map[m] ?? sentence(m);
}
function sentence(token: string): string {
  const w = token.toLowerCase().split("_").filter((x) => x.length > 0);
  if (w.length === 0) return token;
  const s = w.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
// A short, non-primary reference for an id (never the primary label).
function shortRef(id: string | null): string | null {
  if (id === null || id.length === 0) return null;
  return id.slice(0, 8);
}
function fmtDate(iso: string | null): string | null {
  if (iso === null) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}
// A safe, human card title — never a raw UUID.
function reviewTitle(r: HighSensitivityReview): string {
  const cats = r.sensitive_categories.length > 0
    ? r.sensitive_categories.map(sentence).join(", ")
    : sentence(r.sensitivity_class);
  return `${cats} data review`;
}

// ── Audit drawer ────────────────────────────────────────────────────────────

function AuditDrawer({
  reviewId,
  open,
  onOpenChange,
}: {
  reviewId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const query = useQuery({
    queryKey: ["review-audit", reviewId],
    enabled: open && reviewId !== null,
    queryFn: () => {
      if (reviewId === null) return Promise.reject(new Error("no review"));
      return api.reviews.audit(reviewId);
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
        data-testid="review-audit-drawer"
      >
        <SheetTitle>Review audit trail</SheetTitle>
        <SheetDescription className="mb-4">
          Safe lifecycle + eligibility decisions. No raw content.
        </SheetDescription>
        {query.isPending && open ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !query.data ? null : !query.data.ok ? (
          <p className="text-sm text-destructive" data-testid="review-audit-error">
            {blockedReason(query.data.code)}
          </p>
        ) : (
          <ol className="space-y-3" data-testid="review-audit-list">
            {query.data.data.audit_events.map((e, i) => (
              <AuditRow key={`${e.event_type}-${e.timestamp}-${i}`} event={e} />
            ))}
            {query.data.data.audit_events.length === 0 ? (
              <li className="text-sm text-muted-foreground">No audit events yet.</li>
            ) : null}
          </ol>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AuditRow({ event }: { event: ReviewAuditEvent }): JSX.Element {
  const ts = fmtDate(event.timestamp);
  const ref = shortRef(event.candidate_reviewer_entity_id);
  return (
    <li className="rounded-md border border-border p-3 text-sm" data-testid="review-audit-event">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{sentence(event.event_type.replace(/^HIGH_SENSITIVITY_/, ""))}</span>
        <Badge variant={event.outcome === "DENIED" ? "destructive" : "secondary"}>
          {sentence(event.outcome)}
        </Badge>
      </div>
      <dl className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {ts ? <div>{ts}</div> : null}
        {event.status ? <div>Status: {humanizeStatus(event.status)}</div> : null}
        {event.access_mode ? <div>Access: {humanizeAccessMode(event.access_mode)}</div> : null}
        {event.reviewer_scope && event.reviewer_scope !== "DENIED" ? (
          <div>Reviewer scope: {sentence(event.reviewer_scope)}</div>
        ) : null}
        {event.reviewer_reason_codes.length > 0 ? (
          <div>Reason: {event.reviewer_reason_codes.map(sentence).join(", ")}</div>
        ) : null}
        {event.denial_reason ? <div>Note: {sentence(event.denial_reason)}</div> : null}
        {ref ? <div className="font-mono">Reviewer ref: {ref}…</div> : null}
      </dl>
    </li>
  );
}

// ── Safe blocked-reason copy from a backend code ────────────────────────────

function blockedReason(code: string | undefined): string {
  switch (code) {
    case "REVIEWER_IS_NON_HUMAN":
      return "Only a human reviewer can act on this review.";
    case "REVIEWER_IS_BUYER":
      return "You requested this data — you can't approve your own request.";
    case "REVIEWER_CROSS_TENANT":
    case "REVIEW_NOT_FOUND":
      return "This review isn't available to you.";
    case "REVIEWER_NOT_ORG_AUTHORIZED":
    case "REVIEWER_NOT_PROVIDER_OWNER":
      return "You're not an authorized reviewer for this data.";
    case "CHILDREN_DATA_REVIEW_NOT_SUPPORTED":
      return "Children's data can't be approved here.";
    case "REVIEW_NOT_PENDING":
      return "This review is no longer pending.";
    case "REVIEW_NOT_APPROVED":
      return "This review isn't in an approved state.";
    case "REVIEW_EXPIRED":
      return "This review has expired.";
    case "REVIEW_REVOKED":
      return "This review was revoked.";
    case "REVIEW_NOT_APPLICABLE":
      return "Review doesn't apply to this package.";
    case "REVIEW_NOT_REQUIRED":
      return "This package doesn't require a review.";
    case "REVIEW_REQUIRED":
      return "This package still requires review approval.";
    case "REVIEW_MODE_NOT_APPROVED":
      return "That access mode isn't approved for this review.";
    case "REVIEW_NOT_APPROVABLE":
    case "APPROVED_MODE_NOT_ALLOWED":
      return "That access mode can't be approved for this data.";
    case "SELF_REVIEW_NOT_PERMITTED":
      return "Self-review is limited to proof-only access.";
    case "INVALID_SCOPE":
      return "That view isn't available.";
    case "SESSION_INVALID":
      return "Your session expired. Please sign in again.";
    default:
      return "That action was blocked.";
  }
}

// ── Review card ─────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  onViewAudit,
  onChanged,
}: {
  review: HighSensitivityReview;
  onViewAudit: (id: string) => void;
  onChanged: () => void;
}): JSX.Element {
  const qc = useQueryClient();
  const [blocked, setBlocked] = useState<string | null>(null);
  const [denyOpen, setDenyOpen] = useState(false);
  const [denyReason, setDenyReason] = useState("");

  const refresh = (): void => {
    void qc.invalidateQueries({ queryKey: ["reviews"] });
    onChanged();
  };

  const approve = useMutation({
    // No approved_access_modes => backend picks the SAFEST allowed mode. We never
    // request raw / training / commercial. CHILDREN + non-pending are blocked
    // server-side and surfaced as a safe reason.
    mutationFn: () => api.reviews.approve(review.review_id, {}),
    onSuccess: (r) => (r.ok ? (setBlocked(null), refresh()) : setBlocked(blockedReason(r.code))),
  });
  const deny = useMutation({
    // Optional safe denial reason (free text the reviewer authored — never raw
    // capsule content). Backend records it as the review's denial_reason.
    mutationFn: (reason: string) =>
      api.reviews.deny(review.review_id, reason.trim().length > 0 ? { reason: reason.trim() } : {}),
    onSuccess: (r) => {
      if (r.ok) {
        setBlocked(null);
        setDenyOpen(false);
        setDenyReason("");
        refresh();
      } else {
        setBlocked(blockedReason(r.code));
      }
    },
  });
  const revoke = useMutation({
    mutationFn: () => api.reviews.revoke(review.review_id, {}),
    onSuccess: (r) => (r.ok ? (setBlocked(null), refresh()) : setBlocked(blockedReason(r.code))),
  });

  const isPending = review.status === "PENDING_REVIEW";
  const isApproved = review.status === "APPROVED";
  const busy = approve.isPending || deny.isPending || revoke.isPending;
  const expiry = fmtDate(review.expires_at);

  return (
    <Card data-testid="review-card" data-review-id={review.review_id} data-review-status={review.status}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{reviewTitle(review)}</h3>
            <p className="text-sm text-muted-foreground">For: {sentence(review.intended_use)}</p>
          </div>
          <Badge variant={statusVariant(review.status)}>{humanizeStatus(review.status)}</Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {review.sensitive_categories.map((c) => (
            <Badge key={c} variant="outline">{sentence(c)}</Badge>
          ))}
          <Badge variant="secondary">{humanizeAccessMode(review.access_mode)}</Badge>
          {review.approved_access_modes.length > 0 ? (
            <Badge variant="default">
              Approved: {review.approved_access_modes.map(humanizeAccessMode).join(", ")}
            </Badge>
          ) : null}
          <Badge variant="outline">Proof required</Badge>
          <Badge variant="outline">No raw content</Badge>
          {expiry ? <Badge variant="warning">Expires {expiry}</Badge> : null}
        </div>

        {review.denial_reason ? (
          <p className="text-xs text-muted-foreground">Reason: {sentence(review.denial_reason)}</p>
        ) : null}
        {blocked ? (
          <p className="text-sm text-destructive" data-testid="review-blocked-reason">{blocked}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            data-testid="review-view-audit"
            aria-label={`View audit trail for ${reviewTitle(review)}`}
            onClick={() => onViewAudit(review.review_id)}
          >
            View audit
          </Button>
          {isPending && !denyOpen ? (
            <>
              <Button
                size="sm"
                data-testid="review-approve"
                aria-label="Approve safe access for this review"
                disabled={busy}
                onClick={() => approve.mutate()}
              >
                Approve safe access
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid="review-deny"
                aria-label="Deny this review"
                disabled={busy}
                onClick={() => setDenyOpen(true)}
              >
                Deny
              </Button>
            </>
          ) : null}
          {isApproved ? (
            <Button
              variant="destructive"
              size="sm"
              data-testid="review-revoke"
              aria-label="Revoke this approved review"
              disabled={busy}
              onClick={() => revoke.mutate()}
            >
              Revoke
            </Button>
          ) : null}
        </div>

        {isPending && denyOpen ? (
          <div className="space-y-2 rounded-md border border-border p-3" data-testid="review-deny-form">
            <label htmlFor={`deny-reason-${review.review_id}`} className="text-sm font-medium">
              Reason for denial (optional)
            </label>
            <Textarea
              id={`deny-reason-${review.review_id}`}
              data-testid="review-deny-reason"
              value={denyReason}
              maxLength={500}
              placeholder="A short, safe reason — no sensitive content."
              onChange={(e) => setDenyReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                data-testid="review-deny-confirm"
                disabled={busy}
                onClick={() => deny.mutate(denyReason)}
              >
                Confirm denial
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid="review-deny-cancel"
                disabled={busy}
                onClick={() => {
                  setDenyOpen(false);
                  setDenyReason("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ── Summary strip + tab body ────────────────────────────────────────────────

function SummaryStrip({ summary }: { summary: ReviewSummary }): JSX.Element {
  const items: Array<[string, number]> = [
    ["Pending", summary.pending_review_count],
    ["Approved", summary.approved_count],
    ["Denied", summary.denied_count],
    ["Revoked", summary.revoked_count],
    ["Expired", summary.expired_count],
    ["Expiring soon", summary.expiring_soon_count],
  ];
  return (
    <div className="flex flex-wrap gap-3" data-testid="review-summary">
      {items.map(([label, n]) => (
        <div key={label} className="rounded-md border border-border px-3 py-2 text-sm">
          <span className="font-semibold">{n}</span>{" "}
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

function emptyCopy(scope: ReviewListScope): string {
  switch (scope) {
    case "org_reviewable":
      return "No reviews need your attention. (If you don't have review authority for this org, this list stays empty.)";
    case "org_history":
      return "No review history in your scope.";
    default:
      return "You have no high-sensitivity reviews.";
  }
}

function ReviewList({ scope }: { scope: ReviewListScope }): JSX.Element {
  const [auditId, setAuditId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["reviews", scope],
    queryFn: () => api.reviews.list(scope),
    staleTime: 30_000,
  });

  let body: JSX.Element;
  if (query.isPending) {
    body = <p className="text-sm text-muted-foreground">Loading…</p>;
  } else if (!query.data || !query.data.ok) {
    body = (
      <p className="text-sm text-destructive" data-testid="review-list-error">
        {blockedReason(query.data?.code)}
      </p>
    );
  } else {
    const data: ReviewListResponse = query.data.data;
    body = (
      <div className="space-y-4">
        {data.summary ? <SummaryStrip summary={data.summary} /> : null}
        {data.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="review-empty">{emptyCopy(scope)}</p>
        ) : (
          <div className="space-y-3">
            {data.reviews.map((r) => (
              <ReviewCard
                key={r.review_id}
                review={r}
                onViewAudit={setAuditId}
                onChanged={() => void query.refetch()}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const updated = query.dataUpdatedAt ? fmtDate(new Date(query.dataUpdatedAt).toISOString()) : null;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground" data-testid="review-last-updated">
          {query.isFetching ? "Refreshing…" : updated ? `Updated ${updated}` : ""}
        </span>
        <Button
          variant="outline"
          size="sm"
          data-testid="review-refresh"
          aria-label="Refresh reviews"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
      </div>
      {body}
      <AuditDrawer
        reviewId={auditId}
        open={auditId !== null}
        onOpenChange={(open) => !open && setAuditId(null)}
      />
    </>
  );
}

export function ReviewCenterPage(): JSX.Element {
  return (
    <div className="space-y-6" data-testid="review-center-page">
      <PageHeader
        title="Review Center"
        description="High-sensitivity data decisions you can see or act on. Safe projections only — no raw content."
      />
      <Tabs defaultValue="org_reviewable">
        <TabsList>
          <TabsTrigger value="org_reviewable" data-testid="tab-needs-review">Needs review</TabsTrigger>
          <TabsTrigger value="mine" data-testid="tab-mine">My reviews</TabsTrigger>
          <TabsTrigger value="org_history" data-testid="tab-org-history">Org history</TabsTrigger>
        </TabsList>
        <TabsContent value="org_reviewable" className="mt-4">
          <ReviewList scope="org_reviewable" />
        </TabsContent>
        <TabsContent value="mine" className="mt-4">
          <ReviewList scope="mine" />
        </TabsContent>
        <TabsContent value="org_history" className="mt-4">
          <ReviewList scope="org_history" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
