// FILE: conversation-history-view.ts
// PURPOSE: Slice 4 — pure helpers for Conversation History cards + search.
// CONNECTS TO: Conversations.tsx, ConversationListItem.

export interface ConversationListRow {
  conversation_id: string;
  twin_id: string;
  source_type: string;
  status: string;
  message_count: number;
  started_at: string;
  closed_at: string | null;
  title?: string | null;
  summary_preview?: string | null;
  summary_available?: boolean;
}

/** Banned primary content on Conversation History (hardware roadmap). */
export const HISTORY_BANNED_TERMS = [
  "glasses planned",
  "earphones planned",
  "lenses planned",
  "goggles planned",
  "desktop app tray",
  "ambient capture readiness",
  "capture model",
  "wearable",
  "push-to-talk capture model",
] as const;

export function conversationCardTitle(row: ConversationListRow): string {
  if (typeof row.title === "string" && row.title.trim().length > 0) {
    return row.title.trim();
  }
  if (typeof row.summary_preview === "string" && row.summary_preview.trim().length > 0) {
    const s = row.summary_preview.trim();
    return s.length > 72 ? `${s.slice(0, 69)}…` : s;
  }
  return row.status === "ACTIVE" ? "Active conversation" : "Past conversation";
}

export function conversationCardSummary(row: ConversationListRow): string {
  if (typeof row.summary_preview === "string" && row.summary_preview.trim().length > 0) {
    return row.summary_preview.trim();
  }
  if (row.status === "ACTIVE") {
    return "Still active — summary is created when the session closes or goes idle.";
  }
  return "No stored summary yet for this session.";
}

/**
 * WHAT: Client-side filter for conversation search (self-scoped list only).
 * INPUT: rows + query string.
 * OUTPUT: filtered rows.
 */
export function filterConversations(
  rows: ReadonlyArray<ConversationListRow>,
  query: string,
): ConversationListRow[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [...rows];
  return rows.filter((r) => {
    const hay = [
      r.title,
      r.summary_preview,
      r.source_type,
      r.status,
      String(r.message_count),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

/** True if page text illegally leads with hardware roadmap. */
export function historyPageLeaksHardwareRoadmap(text: string): boolean {
  const lower = text.toLowerCase();
  return HISTORY_BANNED_TERMS.some((t) => lower.includes(t));
}
