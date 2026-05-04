// FILE: AuditEventTooltip.tsx
// PURPOSE: Small inline indicator that surfaces the AuditEventType
//          a privileged action will write. Pure presentation -- no
//          state, no interaction beyond the hover tooltip.
// CONNECTS TO: AuditAwareButton (renders this in Stage 1 below the
//              button), AuditAwareForm (same), Pending Approvals
//              detail rows (12E), every place the customer needs
//              to know "what audit event will fire when I click
//              this".

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAuditEventLabel } from "@/lib/audit/event-types";
import type { AuditEventType } from "@/lib/types/foundation";

interface AuditEventTooltipProps {
  eventType: AuditEventType;
  /** Optional sub-action label (e.g., "ORG_MEMBER_ADDED" for an
   *  ADMIN_ACTION event). Surfaces the technical detail alongside
   *  the customer-friendly umbrella label so the operator sees
   *  both when granular auditing matters.
   *
   *  Note: typed as `string | undefined` (not just `string`) so
   *  callers can pass through their own optional prop with
   *  exactOptionalPropertyTypes enabled. */
  actionLabel?: string | undefined;
}

export function AuditEventTooltip({
  eventType,
  actionLabel,
}: AuditEventTooltipProps) {
  const customerLabel = getAuditEventLabel(eventType);
  const display = actionLabel
    ? `Audit event: ${customerLabel} (${actionLabel})`
    : `Audit event: ${customerLabel}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-xs text-muted-foreground" aria-label={display}>
          {display}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        When this action succeeds, an immutable audit row will be written to
        your enterprise audit log. Click the toast confirmation to view the
        audit detail.
      </TooltipContent>
    </Tooltip>
  );
}
