// FILE: collaboration-receipt.ts
// PURPOSE: Human-readable AI Teammate collaboration receipt projection.
//          Maps SafeView collaboration rows into founder-visible copy
//          without raw prompts, traces, policy internals, or UUIDs in
//          ordinary presentation.
// CONNECTS TO: Collaboration.tsx, AmbientWorkSurface, AI collab envelope.

import type {
  CollaborationRequestSafeView,
  TwinCollaborationState,
} from "@/lib/types/foundation";

export interface CollaborationJourneyStep {
  label: string;
  detail: string;
  done: boolean;
}

export interface CollaborationReceiptView {
  collaboration_id: string;
  /** Short human title — never a UUID. */
  title: string;
  who_collaborated: string;
  why: string;
  what_was_used: string;
  what_was_excluded: string;
  result: string;
  time_label: string;
  state: TwinCollaborationState;
  is_ai_teammate: boolean;
  /** Link into Action Center / People for progressive disclosure. */
  proof_path: string;
  /** Human-readable journey from gap → result (no agent chatter). */
  journey: CollaborationJourneyStep[];
}

/**
 * WHAT: Build a calm, role-appropriate collaboration receipt.
 * INPUT: A CollaborationRequestSafeView (SAFE fields only).
 * OUTPUT: CollaborationReceiptView for product surfaces.
 * WHY: Backend receipt exists; founders must see WHO/WHY/RESULT without
 *      inspecting API JSON or developer traces.
 */
export function buildCollaborationReceipt(
  item: CollaborationRequestSafeView,
): CollaborationReceiptView {
  const isAi =
    item.target_type === "EMPLOYEE_TWIN" ||
    item.has_target_twin === true ||
    item.requested_by_ai === true;

  const who = isAi
    ? "Your AI Teammates (governed request)"
    : item.target_type === "EMPLOYEE"
      ? "You and a coworker"
      : "Your team";

  const why =
    item.safe_summary.trim().length > 0
      ? item.safe_summary.trim()
      : "Coordinated work across teammates under org policy.";

  let result: string;
  switch (item.state) {
    case "COMPLETED":
      result = "Collaboration finished. Downstream work can use the accepted result.";
      break;
    case "IN_PROGRESS":
      result = "Collaboration is in progress.";
      break;
    case "ACCEPTED":
    case "REQUESTED":
      result = "Collaboration is open and routed.";
      break;
    case "NEEDS_APPROVAL":
      result = "Waiting on human approval before work continues.";
      break;
    case "BLOCKED":
      result = "Blocked by policy or membership — no silent bypass.";
      break;
    case "REJECTED":
      result = "Declined. Current truth was not changed by this request.";
      break;
    case "CANCELED":
    case "EXPIRED":
      result = "Closed without completion.";
      break;
    default:
      result = "Recorded collaboration state.";
  }

  const elapsed = formatElapsed(item.created_at, item.completed_at);
  const completed = item.state === "COMPLETED";
  const accepted =
    completed ||
    item.state === "ACCEPTED" ||
    item.state === "IN_PROGRESS" ||
    item.state === "REQUESTED";
  const journey: CollaborationJourneyStep[] = [
    {
      label: "Work gap detected",
      detail: "Authorized context or evidence was missing for the active review.",
      done: true,
    },
    {
      label: "Minimum request",
      detail: why,
      done: true,
    },
    {
      label: "Target AI Teammate / human responds",
      detail:
        item.state === "NEEDS_APPROVAL"
          ? "Waiting for acceptance under policy."
          : "Routed to the owning teammate under organization policy.",
      done: accepted || completed,
    },
    {
      label: "Result applied",
      detail: completed
        ? "Accepted summary is available for dependent work and Talk."
        : "Result not yet finalized.",
      done: completed,
    },
    {
      label: "Private memory excluded",
      detail: "Only the safe summary and allowed work context were shared.",
      done: true,
    },
  ];

  return {
    collaboration_id: item.collaboration_id,
    title: isAi ? "AI Teammate collaboration" : "Team collaboration",
    who_collaborated: who,
    why,
    what_was_used:
      "The approved request summary and any accepted shared work context.",
    what_was_excluded:
      "Private personal memory, unrelated work, raw prompts, and internal traces.",
    result,
    time_label: elapsed,
    state: item.state,
    is_ai_teammate: isAi,
    proof_path: `/app/collaboration?focus=${encodeURIComponent(item.collaboration_id)}`,
    journey,
  };
}

/**
 * WHAT: Prefer COMPLETED AI-teammate rows for the founder "what Otzar completed" strip.
 * INPUT: Collaboration list (inbound or outbound).
 * OUTPUT: Up to `limit` receipt views, COMPLETED first.
 */
export function selectCollaborationReceipts(
  items: CollaborationRequestSafeView[],
  limit = 3,
): CollaborationReceiptView[] {
  const completed = items.filter((i) => i.state === "COMPLETED");
  const rest = items.filter((i) => i.state !== "COMPLETED");
  const ordered = [...completed, ...rest];
  return ordered.slice(0, limit).map(buildCollaborationReceipt);
}

function formatElapsed(
  createdAt: string,
  completedAt: string | null,
): string {
  if (completedAt === null || completedAt.length === 0) {
    return "In progress";
  }
  const start = Date.parse(createdAt);
  const end = Date.parse(completedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return "Completed";
  }
  const sec = Math.round((end - start) / 1000);
  if (sec < 60) return `About ${Math.max(1, sec)} seconds`;
  if (sec < 3600) return `About ${Math.round(sec / 60)} minutes`;
  return `About ${Math.round(sec / 3600)} hours`;
}
