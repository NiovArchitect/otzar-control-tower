// FILE: twin-operations.ts
// PURPOSE: [GAP-H OPS] Human labels for the AI Teammates operational truth
//          columns: tool readiness and last-active — from the backend's
//          honest projection only. Never fake "Ready", never owner work as
//          twin activity, never raw backend tokens.
// CONNECTS TO: src/pages/AITeammates.tsx, Foundation GET /org/ai-teammates
//          tool_readiness + recent_activity projection.

import type { AITeammateListItem } from "@/lib/types/foundation";
import { formatRelativeTime } from "@/lib/utils/relative-time";

export function toolReadinessLabel(
  tr: AITeammateListItem["tool_readiness"] | undefined,
): string {
  if (tr === undefined || tr.status === "unknown") return "Not set yet";
  switch (tr.status) {
    case "ready":
      return "Ready for assigned tools";
    case "needs_setup": {
      if (tr.missing_tools.length === 1) {
        const only = tr.missing_tools[0];
        return only !== undefined ? `Needs ${only.label}` : "Needs 1 tool";
      }
      return `Needs ${tr.missing_tools.length} tools`;
    }
    case "not_configured":
    default:
      return "Tool requirements not set yet";
  }
}

export function lastActiveLabel(
  ra: AITeammateListItem["recent_activity"] | undefined,
): string {
  if (ra === undefined || ra.activity_source === "unknown") {
    return "Activity tracking not connected yet";
  }
  if (ra.activity_source === "twin" && ra.last_active_at !== null) {
    return `Active ${formatRelativeTime(ra.last_active_at)}`;
  }
  if (ra.activity_source === "owner_work") {
    // The OWNER worked; the twin provably did not act — never conflate.
    return "Owner has recent work";
  }
  return "No twin activity yet";
}
