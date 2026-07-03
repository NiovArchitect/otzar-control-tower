// FILE: DataSovereigntyInline.tsx
// PURPOSE: Page-top inline note that names the data source for a
//          screen and reinforces the sovereignty contract. Used in
//          addition to the persistent footer DataSovereigntyBadge
//          (12A) -- the inline variant is the per-screen explicit
//          callout customers see at the top of every data view.
// CONNECTS TO: Users (12B.2), AI Teammates (12B.3), Access Control
//              (12B.4), Data & Knowledge (12D), Security & Audit
//              (12D), Analytics (12D).

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DataSovereigntyInline() {
  return (
    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      {/* [GAP-S S-1] Name the owner — "your data" flipped referent between
          employee surfaces (the person) and these admin surfaces (the
          company). Company-owned is stated explicitly. */}
      <span>
        Source: Your organization&apos;s enterprise wallet — company-owned
        work data, governed by your organization.
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="More about data sovereignty"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          All data on this screen is company-owned: it is held in your
          organization's enterprise wallet and stays with the company —
          including source records, lineage, approvals, audit, and connector
          access. Employees' personal work memory is separate and is not
          shown here. Otzar does not aggregate, train on, or read this data
          without explicit consent.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
