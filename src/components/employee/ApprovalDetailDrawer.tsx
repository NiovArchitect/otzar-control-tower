// FILE: ApprovalDetailDrawer.tsx
// PURPOSE: Single-purpose Sheet (side="right", no tabs) showing one
//          approval request and its approve/reject actions for the
//          employee Otzar shell. Plain mutation UX -- /escalations/*
//          returns no audit_event_id, so there is NO audit-aware
//          clickable-link primitive here.
// CONNECTS TO: src/pages/app/Approvals.tsx (mounts this),
//              api.escalations.{approve,reject}, capabilities helpers,
//              escalation-types label map.
//
// APPROVABILITY (two-person rule, client mirror): the pending list is
// always target === caller, and the backend rejects caller === source
// with 403. The auth store has no caller entity_id, so we derive the
// self-raised case from the row itself: source_entity_id ===
// target_entity_id means the caller raised it -> awaiting a second
// approver, actions disabled. The backend remains the source of truth;
// a 403 is still handled gracefully.
//
// PRIVACY: renders type/severity/status/description/timestamps only.
// Raw entity ids and capsule_id are never surfaced.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { canWriteOtzar } from "@/lib/auth/capabilities";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import {
  getEscalationStatusLabel,
  getEscalationTypeLabel,
} from "@/lib/labels/escalation-types";
import type { Escalation } from "@/lib/types/foundation";

interface ApprovalDetailDrawerProps {
  escalation: Escalation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful OR failed resolve so the list refetches. */
  onResolved: () => void;
}

function resolveErrorCopy(
  code: string,
  status: number,
  message: string,
): string {
  if (status === 403 || code === "ESCALATION_FORBIDDEN") {
    return "A different approver is required — you can't resolve a request you raised.";
  }
  if (status === 409 || code === "ESCALATION_INVALID_TRANSITION") {
    return "This request has already been resolved.";
  }
  if (status === 404 || code === "ESCALATION_NOT_FOUND") {
    return "This request is no longer available.";
  }
  return message || "Could not complete the action. Please try again.";
}

export function ApprovalDetailDrawer({
  escalation,
  open,
  onOpenChange,
  onResolved,
}: ApprovalDetailDrawerProps) {
  const { capabilities } = useAuthStore();
  const writable = canWriteOtzar(capabilities);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const [error, setError] = useState<string | null>(null);

  if (escalation === null) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg" />
      </Sheet>
    );
  }

  const awaitingSecondApprover =
    escalation.source_entity_id === escalation.target_entity_id;
  const isPending = escalation.status === "PENDING";

  async function act(kind: "approve" | "reject"): Promise<void> {
    if (escalation === null || busy !== null) return;
    setError(null);
    setBusy(kind);
    const trimmed = note.trim();
    const body =
      trimmed.length > 0 ? { resolution_metadata: { note: trimmed } } : {};
    const r =
      kind === "approve"
        ? await api.escalations.approve(escalation.escalation_id, body)
        : await api.escalations.reject(escalation.escalation_id, body);
    setBusy(null);
    if (!r.ok) {
      setError(resolveErrorCopy(r.code, r.status, r.message));
      onResolved(); // backend is source of truth -- refetch the queue
      return;
    }
    setNote("");
    onResolved();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
      >
        <div className="space-y-4">
          <div className="space-y-2 border-b border-border pb-4">
            <h2 className="text-lg font-semibold">
              {getEscalationTypeLabel(escalation.escalation_type)}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{escalation.severity}</Badge>
              <Badge>{getEscalationStatusLabel(escalation.status)}</Badge>
              <span className="text-muted-foreground">
                Requested {formatRelativeTime(escalation.created_at)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              What needs your decision
            </p>
            <p className="text-sm">{escalation.description}</p>
          </div>

          {escalation.expires_at && (
            <p className="text-xs text-muted-foreground">
              Expires {formatRelativeTime(escalation.expires_at)}
            </p>
          )}

          {!writable && (
            <p className="text-sm text-muted-foreground">
              You can view this request, but you don't have the write
              capability required to approve or reject it.
            </p>
          )}

          {writable && awaitingSecondApprover && (
            <p
              className="text-sm text-muted-foreground"
              data-testid="awaiting-second-approver"
            >
              Awaiting a second approver — you can't resolve a request you
              raised.
            </p>
          )}

          {writable && !awaitingSecondApprover && isPending && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="resolution-note">Note (optional)</Label>
                <Textarea
                  id="resolution-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an optional note for the record…"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => void act("approve")}
                  disabled={busy !== null}
                >
                  {busy === "approve" ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                      Approving…
                    </>
                  ) : (
                    "Approve"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void act("reject")}
                  disabled={busy !== null}
                >
                  {busy === "reject" ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                      Rejecting…
                    </>
                  ) : (
                    "Reject"
                  )}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
