// FILE: MatrixCell.tsx
// PURPOSE: One cell of the permissions matrix heatmap. Renders the
//          access scope as background intensity, can_share_forward
//          as a small icon overlay, and the bridge count for the
//          (entity x capsule_type) intersection. Click opens the
//          per-bridge detail drawer in 12B.4.
// CONNECTS TO: Access Control PermissionsMatrix (12B.4).
//
// SCHEMA-HONEST PATTERN (per Q1, 12B.1):
// Foundation models permissions as a 3-tuple
// (access_scope, can_share_forward, duration_type) -- not a single
// 4-level enum. The matrix renders:
//   - access_scope as cell color (NONE → neutral, METADATA_ONLY →
//     light, SUMMARY → medium, FULL → strong)
//   - can_share_forward as a small chevron-right icon overlay
//   - duration shown only in the cell detail drawer (not on cell)

import { ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PermissionLevel } from "@/lib/types/foundation";

interface MatrixCellProps {
  /** Includes client-side "NONE" for "no Permission row exists for
   *  this cell". METADATA_ONLY / SUMMARY / FULL mirror Foundation's
   *  AccessScope enum. */
  accessScope: PermissionLevel;
  /** True if any Permission row in this cell has can_share_forward.
   *  Renders the chevron-right overlay so the operator sees the
   *  re-share affordance at a glance. */
  canShareForward: boolean;
  /** How many distinct bridges affect this entity x capsule_type
   *  intersection. > 1 means multiple grants stack here. */
  bridgeCount: number;
  /** Optional click handler -- typically opens the bridge detail
   *  drawer in 12B.4. When omitted, the cell renders static. */
  onClick?: () => void;
}

const SCOPE_TONE: Record<PermissionLevel, string> = {
  NONE: "bg-neutral-50 text-neutral-400",
  METADATA_ONLY: "bg-green-100 text-green-900",
  SUMMARY: "bg-blue-200 text-blue-900",
  FULL: "bg-orange-300 text-orange-950",
};

const SCOPE_ABBREVIATION: Record<PermissionLevel, string> = {
  NONE: "—",
  METADATA_ONLY: "M",
  SUMMARY: "S",
  FULL: "F",
};

export function MatrixCell({
  accessScope,
  canShareForward,
  bridgeCount,
  onClick,
}: MatrixCellProps) {
  const isInteractive = Boolean(onClick);
  const abbreviation = SCOPE_ABBREVIATION[accessScope];
  const display =
    accessScope === "NONE"
      ? "—"
      : bridgeCount > 1
        ? `${abbreviation}×${bridgeCount}`
        : abbreviation;

  const tooltipText = (() => {
    if (accessScope === "NONE") {
      return "No permission granted for this combination.";
    }
    const base = `Permission level: ${accessScope}. ${bridgeCount} bridge${bridgeCount === 1 ? "" : "s"} affect this entity × capsule combination.`;
    return canShareForward ? `${base} Grantee can re-share.` : base;
  })();

  const className = cn(
    "relative flex h-9 w-12 items-center justify-center rounded-sm text-xs font-medium",
    SCOPE_TONE[accessScope],
    isInteractive &&
      "cursor-pointer transition hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring outline-none",
  );

  const inner = (
    <>
      <span aria-hidden>{display}</span>
      {canShareForward && accessScope !== "NONE" && (
        <ChevronRight
          className="absolute right-0.5 top-0.5 h-3 w-3 opacity-70"
          aria-hidden
        />
      )}
    </>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {isInteractive ? (
          <button
            type="button"
            onClick={onClick}
            className={className}
            aria-label={tooltipText}
          >
            {inner}
          </button>
        ) : (
          <span role="cell" className={className} aria-label={tooltipText}>
            {inner}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
