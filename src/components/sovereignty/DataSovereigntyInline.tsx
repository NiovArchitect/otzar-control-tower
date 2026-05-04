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
      <span>
        Source: Your enterprise wallet — your data, your control.
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
          All data on this screen is held in your organization's enterprise
          wallet. Otzar does not aggregate, train on, or read this data
          without explicit consent.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
