// FILE: escalation-copy.ts
// PURPOSE: [PROD-UX-APPROVAL-LOOP] Humanize the machine escalation
//          description. Dual-control action escalations arrive as
//          "DUAL_CONTROL:ACTION_CREATE_<TYPE>" — a raw backend code that must
//          never be the customer-facing answer to "what needs approval". Maps
//          it through the shared action-type vocabulary; any other description
//          is already human text and passes through unchanged.
// CONNECTS TO: src/pages/Approvals.tsx (Review Center detail),
//              src/lib/work-os/view-why.ts (actionTypeLabel).

import { actionTypeLabel } from "@/lib/work-os/view-why";

export function friendlyEscalationDescription(description: string): string {
  const m = /^DUAL_CONTROL:ACTION_CREATE_(.+)$/.exec(description);
  if (m !== null && m[1] !== undefined) {
    return `Second approval for: ${actionTypeLabel(m[1])}`;
  }
  return description;
}
