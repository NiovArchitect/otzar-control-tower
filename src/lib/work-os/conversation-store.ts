// FILE: conversation-store.ts
// PURPOSE: Phase 1266 — the Otzar conversation thread store. Before
//          this, the ambient dock showed only the LATEST response, so
//          prior prompts/answers/action-results vanished and could not
//          be scrolled. This store keeps a single ordered, persisted
//          thread of everything the user said, everything Otzar
//          answered, every Work-OS action result, and every error — so
//          the conversation survives navigation and re-renders.
//
// PERSISTENCE: localStorage (best-effort) so the thread survives
//          navigation + reloads for demo continuity. Capped to the
//          most recent MAX_ENTRIES. NEVER stores secrets or raw audio —
//          only the SAFE text the user spoke/typed, Otzar's
//          speech-ready answer, and Work-OS result/status strings.
// CONNECTS TO: src/components/otzar/AmbientOtzarBar.tsx,
//          tests/unit/conversation-store.test.ts.

import { create } from "zustand";

export type ConversationRole = "user" | "otzar" | "action" | "error";

export interface ConversationEntry {
  id: string;
  role: ConversationRole;
  /** SAFE text only — spoken/typed prompt, speech-ready answer, or a
   *  Work-OS result/error string. Never a secret, never raw audio. */
  text: string;
  /** ISO timestamp (caller-supplied so tests stay deterministic). */
  at: string;
  /** Work-OS action kind for `action` entries (e.g. DRAFT_MESSAGE). */
  kind?: string;
  /** Status badge for `action` entries (e.g. "Approval required"). */
  status?: string;
}

const STORAGE_KEY = "otzar.conversation.v1";
const MAX_ENTRIES = 200;

function loadInitial(): ConversationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: only keep well-shaped entries.
    return parsed
      .filter(
        (e): e is ConversationEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as ConversationEntry).id === "string" &&
          typeof (e as ConversationEntry).text === "string",
      )
      .slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
}

function persist(entries: ConversationEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage full / unavailable — keep the in-memory thread regardless */
  }
}

let seq = 0;
function nextId(): string {
  seq += 1;
  // Avoids Date.now()/Math.random in hot path; uniqueness within a
  // session is all we need for React keys.
  return `c${seq}`;
}

interface ConversationState {
  entries: ConversationEntry[];
  append: (entry: Omit<ConversationEntry, "id">) => void;
  clear: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  entries: loadInitial(),
  append: (entry) =>
    set((s) => {
      // Skip empty text (e.g. a GOVERNED_CHAT action with no spoken copy).
      if (entry.text.trim().length === 0) return s;
      const next = [...s.entries, { ...entry, id: nextId() }].slice(
        -MAX_ENTRIES,
      );
      persist(next);
      return { entries: next };
    }),
  clear: () =>
    set(() => {
      persist([]);
      return { entries: [] };
    }),
}));

/** Non-hook accessor for imperative call sites (e.g. inside async
 *  handlers) that don't want to subscribe. */
export function appendConversationEntry(
  entry: Omit<ConversationEntry, "id">,
): void {
  useConversationStore.getState().append(entry);
}
