// FILE: today-attention.ts
// PURPOSE: PROD-UX-P0B — Today's "something needs your attention" must be BACKED by
//          real data and ROUTE to the actual item. Derives routable attention items
//          from the My Day intelligence signals (the same source as the headline), so
//          the count matches reality, every card deep-links to the surface that
//          resolves it, and there is never an attention claim without a backing item.
//          Pure + deterministic. Doctrine: calm, routed, no dead cards.
// CONNECTS TO: src/lib/types/foundation.ts (MyDayIntelligenceView),
//   src/pages/app/FocusHome.tsx.
import type { MyDayIntelligenceView } from "../types/foundation";

export interface TodayAttentionItem {
  kind: "approval" | "decision" | "blocked" | "reply" | "grant_expiring";
  text: string;
  to: string;
  count: number;
}

export interface TodayAttention {
  items: TodayAttentionItem[];
  /** Total items needing attention across all kinds. */
  total: number;
  /** Deep-link target when there is exactly one thing to look at. */
  primaryTo: string | null;
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** Turn the My Day signals into routable, real-data-backed attention items. */
export function deriveTodayAttention(view: MyDayIntelligenceView): TodayAttention {
  const s = view.signals;
  const items: TodayAttentionItem[] = [];

  const approvals = s.collaboration_needs_approval_count;
  if (approvals > 0) {
    items.push({ kind: "approval", count: approvals, to: "/app/action-center", text: `${approvals} ${plural(approvals, "approval is waiting", "approvals are waiting")}` });
  }
  const decisions = s.proposed_actions_count;
  if (decisions > 0) {
    items.push({ kind: "decision", count: decisions, to: "/app/action-center", text: `${decisions} ${plural(decisions, "decision to review", "decisions to review")}` });
  }
  const blocked = s.collaboration_blocked_count;
  if (blocked > 0) {
    items.push({ kind: "blocked", count: blocked, to: "/app/action-center", text: `${blocked} ${plural(blocked, "blocked item", "blocked items")}` });
  }
  const replies = s.unread_notifications_count + s.collaboration_inbox_pending_count;
  if (replies > 0) {
    items.push({ kind: "reply", count: replies, to: "/app/comms", text: `${replies} ${plural(replies, "reply to review", "replies to review")}` });
  }
  const expiring = s.expiring_soon_grants_count;
  if (expiring > 0) {
    items.push({ kind: "grant_expiring", count: expiring, to: "/app/access-grants", text: `${expiring} ${plural(expiring, "access grant expiring soon", "access grants expiring soon")}` });
  }

  const total = items.reduce((sum, i) => sum + i.count, 0);
  // Deep-link the headline only when there is a single, unambiguous destination.
  const primaryTo = items.length === 1 ? items[0]!.to : null;
  return { items, total, primaryTo };
}
