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

// Phase 1284 Priority-0 isolation fix. The personal chat transcript MUST be
// scoped to the authenticated user — never globally shared across users,
// demo accounts, or desktop profiles on the same device. The key is bound
// per-user via bindConversationScope(scopeId) on login and cleared on
// logout. The version bump (v1 -> v2) abandons the previously SHARED
// "otzar.conversation.v1" key so the leaked cross-user transcript is never
// read again. Until a scope is bound, NOTHING is loaded or persisted (the
// safety guard: when the authenticated user is unknown, show an empty chat,
// never another user's transcript).
const STORAGE_PREFIX = "otzar.conversation.v2";
const MAX_ENTRIES = 200;

// The currently-bound, user-scoped storage key. null = no authenticated
// scope yet (show empty, persist nothing).
let activeStorageKey: string | null = null;

function keyForScope(scopeId: string): string {
  return `${STORAGE_PREFIX}.${scopeId}`;
}

function loadForKey(key: string): ConversationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
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
  // Safety guard: never persist to a shared/unknown key. If no user scope is
  // bound, the transcript stays in memory only and dies with the tab.
  if (activeStorageKey === null) return;
  try {
    window.localStorage.setItem(activeStorageKey, JSON.stringify(entries));
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
  /** Bind the transcript to an authenticated user (Phase 1284 P0). Loads
   *  only that user's scoped transcript; never another user's. */
  bindScope: (scopeId: string) => void;
  /** Unbind on logout: clear the visible transcript + stop persisting.
   *  Does NOT delete the prior user's durable local data, just hides it. */
  clearScope: () => void;
  append: (entry: Omit<ConversationEntry, "id">) => void;
  clear: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  // Start EMPTY — never load a transcript before the authenticated user is
  // known (safety guard: unknown user => empty chat, never a leak).
  entries: [],
  bindScope: (scopeId: string) =>
    set(() => {
      const id = (scopeId ?? "").trim();
      if (id.length === 0) {
        activeStorageKey = null;
        return { entries: [] };
      }
      activeStorageKey = keyForScope(id);
      return { entries: loadForKey(activeStorageKey) };
    }),
  clearScope: () =>
    set(() => {
      activeStorageKey = null;
      return { entries: [] };
    }),
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

/** Bind/unbind the user scope from non-React call sites (the auth store).
 *  Called on login (with a stable per-user id) and logout. */
export function bindConversationScope(scopeId: string): void {
  useConversationStore.getState().bindScope(scopeId);
}
export function clearConversationScope(): void {
  useConversationStore.getState().clearScope();
}
