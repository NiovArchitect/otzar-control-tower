// FILE: DataSovereigntyBadge.tsx
// PURPOSE: Footer badge that constantly reaffirms the mission --
//          humans remain sovereign over their intelligence and every
//          access through this UI is auditable.
// CONNECTS TO: Layout footer.

import { ShieldCheck } from "lucide-react";

export function DataSovereigntyBadge() {
  return (
    <div
      role="note"
      aria-label="Data sovereignty notice"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground"
    >
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
      <span>
        Sovereign by design — every access is audited under the COSMP Protocol.
      </span>
    </div>
  );
}
