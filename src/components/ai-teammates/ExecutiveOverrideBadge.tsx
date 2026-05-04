// FILE: ExecutiveOverrideBadge.tsx
// PURPOSE: Orange pill + tooltip surfacing the EXECUTIVE_OVERRIDE
//          status of an AI Teammate. Drawn directly from
//          `TwinConfig.is_admin_twin === true` per the architectural
//          anchor: there is no separate "executive override" field on
//          Foundation -- admin-twin status IS the override condition.
// CONNECTS TO: AI Teammates table (12B.3) row badge, TwinDetailDrawer
//              Overview tab.
//
// VOCABULARY DISCIPLINE: customer-facing label is "EXECUTIVE_OVERRIDE"
// (uppercased token, since the token itself communicates governance
// gravity to enterprise admins). Source field is `is_admin_twin`,
// which never appears in copy. Distinct from the `EXECUTIVE_OVERRIDE`
// autonomy_level literal -- that's a Behavior Policy MODE for
// non-admin twins; this badge marks an admin twin proper.
//
// REUSE JUSTIFICATION (per 12B.1 "reused 3+ times" rule): rendered in
// the AI Teammates table row, in the TwinDetailDrawer Overview tab,
// and (12B.4) in Access Control rows where the actor is a twin --
// three sites, one source of truth.

import { ShieldAlert } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ExecutiveOverrideBadgeProps {
  className?: string;
}

export function ExecutiveOverrideBadge({
  className,
}: ExecutiveOverrideBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="note"
          aria-label="Executive override"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800",
            className,
          )}
        >
          <ShieldAlert className="h-3 w-3" aria-hidden />
          <span>EXECUTIVE_OVERRIDE</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        Admin AI Teammate. Inherits the owner's executive clearance
        and can act with admin capabilities on the owner's behalf.
        Behavior Policy still gates day-to-day actions; this flag
        marks the privilege ceiling.
      </TooltipContent>
    </Tooltip>
  );
}
