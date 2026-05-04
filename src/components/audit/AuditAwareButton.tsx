// FILE: AuditAwareButton.tsx
// PURPOSE: The reusable 4-stage audit-aware action button. Every
//          privileged action in 12B-12F (grant permission, revoke
//          permission, invite user, create twin, modify behavior
//          policy, ...) wraps its onClick in this component to get
//          consistent: pre-action affordance, optional confirmation
//          dialog, in-flight state, post-action toast with
//          clickable audit_event_id link.
// CONNECTS TO: AuditEventTooltip (Stage 1 subtext), Dialog (Stage 2
//              confirm), sonner toast (Stage 4), useNavigate
//              (Stage 4 audit link).
//
// 4-STAGE CONTRACT:
//   Stage 1 -- Pre-action affordance: button + AuditEventTooltip
//              subtext naming the AuditEventType that will fire.
//   Stage 2 -- Confirmation (only when requireConfirmation=true):
//              Dialog with title, description, target, audit
//              literal, Cancel + Confirm buttons.
//   Stage 3 -- In-flight: button disabled, spinner inside,
//              "Logging audit event..." text.
//   Stage 4 -- Post-action: success → toast with clickable
//              "Audit logged: AUDIT_ID_<truncated>" link to
//              /security-audit?audit_id={full}; failure → error
//              toast (no audit link, per 12B.0 contract).

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuditEventTooltip } from "@/components/audit/AuditEventTooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAuditEventLabel } from "@/lib/audit/event-types";
import type { AuditEventType } from "@/lib/types/foundation";

export type AuditAwareButtonResult =
  | { ok: true; audit_event_id: string }
  | { ok: false; error: string };

interface AuditAwareButtonProps {
  variant: "primary" | "destructive";
  auditEventType: AuditEventType;
  /** Optional sub-action label for ADMIN_ACTION events (e.g.,
   *  "ORG_MEMBER_ADDED"). */
  auditActionLabel?: string;
  /** Open a confirmation dialog before submission. Default false. */
  requireConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
  /** Plain-English description of the target (e.g., "permission for
   *  Sarah Lee to read Q4 Sales Decisions"). */
  targetDescription?: string;
  onConfirm: () => Promise<AuditAwareButtonResult>;
  children: React.ReactNode;
}

type Stage = "idle" | "confirming" | "inFlight";

function shortenAuditId(id: string): string {
  return `AUDIT_ID_${id.slice(0, 8)}…`;
}

export function AuditAwareButton({
  variant,
  auditEventType,
  auditActionLabel,
  requireConfirmation = false,
  confirmationTitle = "Confirm action",
  confirmationDescription,
  targetDescription,
  onConfirm,
  children,
}: AuditAwareButtonProps) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("idle");
  const buttonVariant = variant === "destructive" ? "destructive" : "default";

  async function execute(): Promise<void> {
    setStage("inFlight");
    try {
      const result = await onConfirm();
      if (result.ok) {
        toast.success("Action complete.", {
          description: shortenAuditId(result.audit_event_id),
          action: {
            label: "View audit",
            onClick: () =>
              navigate(`/security-audit?audit_id=${result.audit_event_id}`),
          },
        });
      } else {
        toast.error(`Action failed: ${result.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Action failed: ${message}`);
    } finally {
      setStage("idle");
    }
  }

  function handleClick(): void {
    if (requireConfirmation) {
      setStage("confirming");
    } else {
      void execute();
    }
  }

  const inFlight = stage === "inFlight";
  const customerEventLabel = getAuditEventLabel(auditEventType);

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant={buttonVariant}
        onClick={handleClick}
        disabled={inFlight}
        aria-busy={inFlight}
      >
        {inFlight ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Logging audit event...
          </>
        ) : (
          children
        )}
      </Button>
      <AuditEventTooltip
        eventType={auditEventType}
        actionLabel={auditActionLabel}
      />

      <Dialog
        open={stage === "confirming"}
        onOpenChange={(open) => {
          if (!open && stage === "confirming") {
            setStage("idle");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmationTitle}</DialogTitle>
            {confirmationDescription && (
              <DialogDescription>
                {confirmationDescription}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {targetDescription && (
              <p>
                <span className="font-medium">Action target:</span>{" "}
                {targetDescription}
              </p>
            )}
            <p>
              <span className="font-medium">Audit event:</span>{" "}
              {customerEventLabel}
              {auditActionLabel ? ` (${auditActionLabel})` : ""}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStage("idle")}
              disabled={inFlight}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={buttonVariant}
              onClick={() => void execute()}
              disabled={inFlight}
            >
              {inFlight ? (
                <>
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden
                  />
                  Logging audit event...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
