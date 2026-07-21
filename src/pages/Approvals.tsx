// FILE: Approvals.tsx
// PURPOSE: Section 9 (Admin / Governance Control Tower) consumer
//          surface — replaces the Placeholder with the customer-
//          facing Pending Approvals screen. Consumes Foundation
//          escalation reads + mutations (LIVE per ADR-0026 dual-
//          control + ADR-0050 break-glass):
//            GET  /api/v1/escalations/pending  (caller's own queue)
//            GET  /api/v1/escalations/:id      (single detail)
//            POST /api/v1/escalations/:id/approve
//            POST /api/v1/escalations/:id/reject
//          Renders the caller's own pending dual-control queue
//          plus a side detail panel; approve/deny actions wired
//          with explicit two-step confirmation.
//
//          The two-person rule is enforced server-side
//          (Foundation returns ESCALATION_FORBIDDEN when
//          caller === source); the CT UI mirrors this by
//          disabling action buttons on self-sourced rows for
//          honest UX. Foundation NEVER fails open — even if CT
//          forgot the disable, the wire would reject.
//
//          resolution_metadata is the only unbounded field on
//          the Escalation row; CT NEVER renders it raw. Detail
//          view surfaces only safe scalars (escalation_id,
//          type, severity, status, description, timestamps).
//
//          NO raw payload, NO chain-of-thought, NO secret_ref,
//          NO connector_payload, NO employee scoring, NO
//          manager surveillance, NO legal certainty language.
// CONNECTS TO: src/lib/api.ts (api.escalations.*); src/lib/
//              types/foundation.ts (Escalation + envelope
//              types); src/lib/stores/auth.ts (caller entity
//              id for self-sourced detection); src/components/
//              PageHeader.tsx + ui/* primitives.

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { friendlyEscalationDescription } from "@/lib/approvals/escalation-copy";
import { useAuthStore } from "@/lib/stores/auth";
import type {
  Escalation,
  EscalationStatus,
  EscalationType,
} from "@/lib/types/foundation";
import { formatRelativeTime } from "@/lib/utils/relative-time";

// WHAT: Closed-vocab Badge variant for the escalation status.
function statusBadge(status: EscalationStatus): {
  variant: "default" | "secondary" | "outline" | "destructive";
  label: string;
} {
  switch (status) {
    case "PENDING":
      return { variant: "secondary", label: "Pending" };
    case "APPROVED":
      return { variant: "secondary", label: "Approved" };
    case "REJECTED":
      return { variant: "destructive", label: "Rejected" };
    case "EXPIRED":
      return { variant: "outline", label: "Expired" };
  }
}

// WHAT: Closed-vocab label for the escalation type.
function escalationTypeLabel(t: EscalationType): string {
  switch (t) {
    case "HUMAN_REVIEW_REQUIRED":
      return "Human Review Required";
    case "SOVEREIGNTY_VIOLATION":
      return "Sovereignty Violation";
    case "THRESHOLD_BREACH":
      return "Threshold Breach";
    case "POLICY_CONFLICT":
      return "Policy Conflict";
    case "AUTHORIZATION_FAILURE":
      return "Authorization Failure";
    case "COMPLIANCE_GATE":
      return "Compliance Gate";
    case "DUAL_CONTROL_REQUIRED":
      return "Dual Control Required";
  }
}

function fullTimestamp(iso: string): string {
  try {
    return new Date(iso).toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
  } catch {
    return iso;
  }
}

// WHAT: Detail-row helper.
function DetailRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string | null | undefined;
  testId?: string;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-baseline gap-x-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className="break-all font-mono text-foreground"
        {...(testId !== undefined ? { "data-testid": testId } : {})}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function EscalationRow({
  escalation,
  selected,
  onSelect,
}: {
  escalation: Escalation;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const status = statusBadge(escalation.status);
  return (
    <li
      className={`rounded-md border p-3 transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/40"
      }`}
      data-testid="approval-row"
      data-escalation-id={escalation.escalation_id}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onSelect(escalation.escalation_id)}
        data-testid={`approval-row-button-${escalation.escalation_id}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {escalationTypeLabel(escalation.escalation_type)}
              </span>
              <Badge variant={status.variant} className="text-[10px]">
                {status.label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Severity: {escalation.severity}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {formatRelativeTime(escalation.created_at)}
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

function DetailPanel({
  escalationId,
  callerEntityId,
  onResolved,
}: {
  escalationId: string | null;
  callerEntityId: string | null;
  onResolved: () => void;
}) {
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);
  // [PROD-UX-APPROVAL-LOOP] The approver's optional human reason for a denial.
  const [rejectReason, setRejectReason] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["escalations", "detail", escalationId],
    queryFn: () =>
      api.escalations.detail(escalationId as string).then((r) => {
        if (r.ok) return r.data;
        throw new Error(r.code);
      }),
    enabled: escalationId !== null,
  });

  // [PROD-UX-APPROVAL-LOOP] "Who requested it" as a NAME, not just a UUID —
  // the approver decides about a person, not an identifier. Admin-gated
  // lookup; falls back to the stable id when the entity can't be resolved.
  const requesterId = detailQuery.data?.escalation?.source_entity_id ?? null;
  const requesterQuery = useQuery({
    queryKey: ["org", "entity", requesterId],
    queryFn: () =>
      api.org.entities.get(requesterId as string).then((r) => {
        if (!r.ok) throw new Error(r.code);
        // The live route wraps the row ({ ok, entity: {...} }); tolerate both
        // shapes and surface ONLY the display name — nothing else from the
        // entity row is read or rendered here.
        const data = r.data as unknown as {
          entity?: { display_name?: string };
          display_name?: string;
        };
        return { display_name: data.entity?.display_name ?? data.display_name ?? null };
      }),
    enabled: requesterId !== null,
    retry: false,
  });
  const requesterName = requesterQuery.data?.display_name ?? null;

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      api.escalations.approve(id).then((r) => {
        if (r.ok) return r.data;
        throw new Error(r.code);
      }),
    onSuccess: () => {
      setConfirmAction(null);
      setMutationError(null);
      void queryClient.invalidateQueries({
        queryKey: ["escalations", "pending"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["escalations", "detail", escalationId],
      });
      onResolved();
    },
    onError: (err) => {
      setMutationError(err instanceof Error ? err.message : "UNKNOWN_ERROR");
    },
  });

  const rejectMutation = useMutation({
    // [PROD-UX-APPROVAL-LOOP] Carry the approver's reason with the denial —
    // it persists on the escalation (resolution_metadata) and rides the
    // ACTION_REJECTED audit as a safe scalar.
    mutationFn: (id: string) =>
      api.escalations
        .reject(id, rejectReason.trim().length > 0 ? { reason: rejectReason.trim() } : {})
        .then((r) => {
          if (r.ok) return r.data;
          throw new Error(r.code);
        }),
    onSuccess: () => {
      setConfirmAction(null);
      setRejectReason("");
      setMutationError(null);
      void queryClient.invalidateQueries({
        queryKey: ["escalations", "pending"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["escalations", "detail", escalationId],
      });
      onResolved();
    },
    onError: (err) => {
      setMutationError(err instanceof Error ? err.message : "UNKNOWN_ERROR");
    },
  });

  if (escalationId === null) {
    return (
      <Card data-testid="approval-detail-empty">
        <CardHeader>
          <CardTitle className="text-base">Approval detail</CardTitle>
          <CardDescription>
            Select a pending approval from the queue to see its
            safe metadata and (when authorized) approve or deny
            it. The two-person rule prevents you from resolving
            requests you yourself sourced.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (detailQuery.isLoading || detailQuery.isFetching) {
    return (
      <Card data-testid="approval-detail-loading">
        <CardHeader>
          <CardTitle className="text-base">Approval detail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (detailQuery.isError || detailQuery.data === undefined) {
    const code =
      detailQuery.error instanceof Error
        ? detailQuery.error.message
        : "UNKNOWN_ERROR";
    return (
      <Card data-testid="approval-detail-error">
        <CardHeader>
          <CardTitle className="text-base">
            Approval detail unavailable
          </CardTitle>
          <CardDescription>
            The selected approval could not be loaded. Code:{" "}
            <span className="font-mono">{code}</span>. You may
            not be a party to this request, or it may have
            already been resolved.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const escalation = detailQuery.data.escalation;
  const status = statusBadge(escalation.status);
  const isSourcedByCaller =
    callerEntityId !== null &&
    escalation.source_entity_id === callerEntityId;
  const isPending = escalation.status === "PENDING";
  const canResolve = isPending && !isSourcedByCaller;
  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Card data-testid="approval-detail-panel">
      <CardHeader>
        <CardTitle className="text-base">Approval detail</CardTitle>
        <CardDescription className="text-xs">
          Safe metadata only. Two-person rule enforced server-side;
          the resolver must differ from the requester.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {escalationTypeLabel(escalation.escalation_type)}
            </span>
            <Badge variant={status.variant} className="text-[10px]">
              {status.label}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Severity: {escalation.severity}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {fullTimestamp(escalation.created_at)}
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Request
          </h4>
          <DetailRow
            label="Escalation id"
            value={escalation.escalation_id}
            testId="detail-escalation-id"
          />
          <DetailRow label="Type" value={escalation.escalation_type} />
          <DetailRow label="Severity" value={escalation.severity} />
          <DetailRow label="Status" value={escalation.status} />
          <DetailRow
            label="What needs approval"
            value={friendlyEscalationDescription(escalation.description)}
            testId="detail-escalation-description"
          />
          <DetailRow
            label="Requested by"
            value={requesterName ?? escalation.source_entity_id}
            testId="detail-escalation-requester"
          />
          <DetailRow
            label="Source entity"
            value={escalation.source_entity_id}
          />
          <DetailRow
            label="Target entity"
            value={escalation.target_entity_id}
          />
          {escalation.capsule_id !== null &&
            escalation.capsule_id !== undefined && (
              <DetailRow
                label="Related capsule"
                value={escalation.capsule_id}
              />
            )}
          {escalation.expires_at !== null &&
            escalation.expires_at !== undefined && (
              <DetailRow
                label="Expires at"
                value={fullTimestamp(escalation.expires_at)}
              />
            )}
        </div>

        {(escalation.status === "APPROVED" ||
          escalation.status === "REJECTED" ||
          escalation.status === "EXPIRED") && (
          <>
            <Separator />
            <div className="space-y-2" data-testid="approval-resolved-block">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Resolution
              </h4>
              {escalation.resolved_by_entity_id !== null &&
                escalation.resolved_by_entity_id !== undefined && (
                  <DetailRow
                    label="Resolved by"
                    value={escalation.resolved_by_entity_id}
                  />
                )}
              {escalation.resolved_at !== null &&
                escalation.resolved_at !== undefined && (
                  <DetailRow
                    label="Resolved at"
                    value={fullTimestamp(escalation.resolved_at)}
                  />
                )}
            </div>
          </>
        )}

        {isPending && (
          <>
            <Separator />
            <div className="space-y-3" data-testid="approval-actions">
              {isSourcedByCaller && (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="approval-two-person-block"
                >
                  You sourced this request — the two-person rule
                  prevents you from resolving it. A different
                  authorized resolver must act.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  disabled={!canResolve || isMutating}
                  onClick={() => {
                    setMutationError(null);
                    setConfirmAction("approve");
                  }}
                  data-testid="approval-approve-button"
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={!canResolve || isMutating}
                  onClick={() => {
                    setMutationError(null);
                    setConfirmAction("reject");
                  }}
                  data-testid="approval-reject-button"
                >
                  Deny
                </Button>
              </div>
              {mutationError !== null && (
                <p
                  className="text-xs text-destructive"
                  data-testid="approval-mutation-error"
                >
                  Action failed. Code:{" "}
                  <span className="font-mono">{mutationError}</span>.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent data-testid="approval-confirm-dialog">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "approve"
                ? "Approve this request?"
                : "Deny this request?"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is recorded in the audit chain and
              cannot be silently reversed. The two-person rule
              has already been validated; clicking confirm sends
              the resolution to Foundation.
            </DialogDescription>
          </DialogHeader>
          {confirmAction === "reject" ? (
            <div className="space-y-1">
              <label
                htmlFor="approval-reject-reason"
                className="text-xs font-medium"
              >
                Reason (optional, recommended)
              </label>
              <textarea
                id="approval-reject-reason"
                className="h-20 w-full rounded border bg-background p-2 text-sm"
                placeholder="Why isn't this approved? e.g. wrong recipient, rework the message…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={500}
                data-testid="approval-reject-reason"
              />
              <p className="text-[10px] text-muted-foreground">
                Recorded with the decision in the audit trail.
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction(null)}
              data-testid="approval-confirm-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmAction === "reject" ? "destructive" : "default"}
              size="sm"
              disabled={isMutating}
              onClick={() => {
                if (confirmAction === "approve") {
                  approveMutation.mutate(escalation.escalation_id);
                } else if (confirmAction === "reject") {
                  rejectMutation.mutate(escalation.escalation_id);
                }
              }}
              data-testid="approval-confirm-submit"
            >
              {isMutating
                ? "Sending…"
                : confirmAction === "approve"
                  ? "Confirm approve"
                  : "Confirm deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function ApprovalsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const callerEntity = useAuthStore((s) => s.entity);
  const callerEntityId =
    callerEntity !== null && "entity_id" in callerEntity
      ? (callerEntity.entity_id as string | undefined) ?? null
      : null;

  const pendingQuery = useQuery({
    queryKey: ["escalations", "pending"],
    queryFn: () =>
      api.escalations.pending().then((r) => {
        if (r.ok) return r.data;
        throw new Error(r.code);
      }),
  });

  const escalations = useMemo<readonly Escalation[]>(
    () => pendingQuery.data?.escalations ?? [],
    [pendingQuery.data],
  );

  return (
    <div className="space-y-6" data-testid="approvals-page">
      <PageHeader
        title="Action Center"
        description="Dual-control approval queue. Two-person rule applies — you cannot resolve a request you sourced. Audit chain captures every action."
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card data-testid="approval-list-card">
          <CardHeader>
            <CardTitle className="text-base">Your pending queue</CardTitle>
            <CardDescription>
              Only requests targeted at you appear here. Foundation's
              two-person rule blocks you from resolving anything
              you yourself raised.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingQuery.isLoading && (
              <ul className="space-y-2" data-testid="approval-list-loading">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i}>
                    <Skeleton className="h-16 w-full" />
                  </li>
                ))}
              </ul>
            )}
            {pendingQuery.isError && (
              <div
                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
                data-testid="approval-list-error"
              >
                Failed to load pending approvals. Code:{" "}
                <span className="font-mono">
                  {pendingQuery.error instanceof Error
                    ? pendingQuery.error.message
                    : "UNKNOWN_ERROR"}
                </span>
                .
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={() => pendingQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            )}
            {!pendingQuery.isLoading &&
              !pendingQuery.isError &&
              escalations.length === 0 && (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="approval-list-empty"
                >
                  No pending approvals targeted at you. New
                  dual-control requests will appear here as they
                  arrive.
                </p>
              )}
            {escalations.length > 0 && (
              <ul className="space-y-2" data-testid="approval-list">
                {escalations.map((escalation) => (
                  <EscalationRow
                    key={escalation.escalation_id}
                    escalation={escalation}
                    selected={selectedId === escalation.escalation_id}
                    onSelect={setSelectedId}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <DetailPanel
          escalationId={selectedId}
          callerEntityId={callerEntityId}
          onResolved={() => {
            // After a successful resolve, drop the selection so
            // the row disappears from the pending list refresh.
            setSelectedId(null);
          }}
        />
      </div>
    </div>
  );
}
