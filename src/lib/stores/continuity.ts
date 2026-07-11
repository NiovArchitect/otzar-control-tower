// FILE: src/lib/stores/continuity.ts
// PURPOSE: [OTZAR-CONTINUITY C6-CT] The authoritative CLIENT continuity store. The SERVER is
//          the source of truth for the active conversation, restored turns, the current
//          Twin, and pending-request reconciliation — this store holds only what the server
//          told us, plus transient UI state. It NEVER treats localStorage as authority for
//          conversation id, pending request, canonical result, action state, or Twin.
// CONNECTS TO: api.otzar.threads.{restore,detail,requestByClient}, Chat/Voice/Ambient
//          surfaces, bootstrap-on-auth.

import { create } from "zustand";
import type { StoreApi, UseBoundStore } from "zustand";
import { api } from "@/lib/api";
import type { OtzarSafeRequestStatus, OtzarSafeTurn, OtzarThreadSummary } from "@/lib/types/foundation";

export type HydrationState = "idle" | "restoring" | "restored" | "unavailable";

/** [C6-CT CHUNK 2] The next safe action for a locally-pending submission, derived ONLY from
 *  the server's durable request state — never from local guessing. */
export type RecoveryAction =
  | "render_canonical" // COMPLETED + a valid canonical result → render canonical_text
  | "keep_polling" // RECEIVED/PROCESSING → keep bounded polling
  | "offer_retry" // FAILED_RETRYABLE → show a retry affordance (same client_request_id)
  | "final_failure" // FAILED_FINAL → show final failure, stop
  | "gone"; // foreign/missing → do NOT auto-resubmit; let the user act

/** Map a server request status to the ONE safe recovery action. Pure + deterministic. */
export function nextRecoveryAction(status: OtzarSafeRequestStatus | null): RecoveryAction {
  if (status === null) return "gone";
  if (status.state === "COMPLETED") return status.has_canonical_result && status.canonical_text !== null ? "render_canonical" : "keep_polling";
  if (status.state === "RECEIVED" || status.state === "PROCESSING") return "keep_polling";
  if (status.state === "FAILED_RETRYABLE") return "offer_retry";
  if (status.state === "FAILED_FINAL") return "final_failure";
  return "keep_polling";
}

// The minimal, non-sensitive pending logical-submission identity persisted across a reload
// so a lost response can be reconciled with the SERVER (which stays authoritative). No
// tokens, no canonical content — only the ids needed to ask the server "what happened?".
const PENDING_KEY = "otzar.continuity.pending";
export interface PendingSubmission {
  conversation_id: string;
  client_request_id: string;
  message: string; // retained only to re-post on an explicit retry (same request_id)
}
function readPending(): PendingSubmission | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (raw === null) return null;
    const p = JSON.parse(raw) as Partial<PendingSubmission>;
    return typeof p.conversation_id === "string" && typeof p.client_request_id === "string" && typeof p.message === "string"
      ? { conversation_id: p.conversation_id, client_request_id: p.client_request_id, message: p.message }
      : null;
  } catch {
    return null;
  }
}
function writePending(p: PendingSubmission | null): void {
  try {
    if (p === null) sessionStorage.removeItem(PENDING_KEY);
    else sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    /* sessionStorage unavailable → recovery degrades gracefully; server stays authoritative */
  }
}

interface ContinuityState {
  hydration: HydrationState;
  /** The server-authoritative active conversation id, or null (no active thread — never invented). */
  activeConversationId: string | null;
  /** The authorized Twin for the restored relationship (server-resolved). */
  activeTwinId: string | null;
  /** Bounded recent turns of the active thread, server-provided (safe projection). */
  restoredTurns: OtzarSafeTurn[];
  /** Bounded recent-thread list for the current Twin. */
  recentThreads: OtzarThreadSummary[];
  /** Set once a restore attempt has completed at least once this session. */
  restoreError: string | null;

  /** Server-authoritative bootstrap: call on authenticated login/refresh. Resolves the
   *  current authorized Twin's most-recent ACTIVE thread (or none — never mints one) and
   *  loads its bounded turns. Server state overrides any stale local state. */
  bootstrapRestore: () => Promise<void>;
  /** After a genuine new submission created/resolved a server thread, adopt it as active. */
  adoptActiveConversation: (conversationId: string, twinId?: string | null) => void;
  /** Clear active continuity (e.g. on close/logout). */
  clearActive: () => void;
  /** Reset the whole store (logout). */
  reset: () => void;

  // [C6-CT CHUNK 2] Response-loss + multi-tab reconciliation.
  /** The current in-flight logical submission (also mirrored to sessionStorage). */
  pending: PendingSubmission | null;
  /** Record a submission as pending (persisted for reload recovery). */
  markPending: (p: PendingSubmission) => void;
  /** Clear the pending submission (on a durable result / final failure / explicit cancel). */
  clearPending: () => void;
  /** Load any persisted pending submission (call on bootstrap). */
  loadPending: () => PendingSubmission | null;
  /** Read the server's durable status for a submission by its CLIENT-known id. Returns null
   *  when the request is foreign/absent (the server never discloses foreign existence). */
  reconcileByClient: (conversationId: string, clientRequestId: string) => Promise<OtzarSafeRequestStatus | null>;
  /** [cross-tab] Discover the caller's unresolved requests from SERVER authority (in-flight,
   *  FAILED_RETRYABLE, or awaiting confirmation), so a SECOND tab/device finds the first's
   *  obligations even with no local pending. Optionally scoped to one conversation. With
   *  recentCompletedMs (bounded recovery window) it ALSO surfaces ordinary COMPLETED requests
   *  finished inside the window, so a tab opened AFTER completion recovers the lost response. */
  discoverUnresolved: (conversationId?: string, recentCompletedMs?: number) => Promise<OtzarSafeRequestStatus[]>;
}

const INITIAL = {
  hydration: "idle" as HydrationState,
  activeConversationId: null,
  activeTwinId: null,
  restoredTurns: [] as OtzarSafeTurn[],
  recentThreads: [] as OtzarThreadSummary[],
  restoreError: null,
  pending: null as PendingSubmission | null,
};

export const useContinuityStore: UseBoundStore<StoreApi<ContinuityState>> = create<ContinuityState>(
  (set, get) => ({
    ...INITIAL,

    bootstrapRestore: async (): Promise<void> => {
      // Avoid overlapping restores.
      if (get().hydration === "restoring") return;
      set({ hydration: "restoring", restoreError: null });
      const res = await api.otzar.threads.restore();
      if (!res.ok) {
        // A restore failure is non-fatal: keep no active thread, surface an unavailable
        // state, and let the guards / a later retry recover. NEVER invent a thread.
        set({ hydration: "unavailable", restoreError: res.message, activeConversationId: null, restoredTurns: [] });
        return;
      }
      const { active, recent } = res.data;
      if (active === null) {
        // No eligible ACTIVE thread → keep none. Do not mint one on page load.
        set({ hydration: "restored", activeConversationId: null, activeTwinId: null, restoredTurns: [], recentThreads: recent });
        return;
      }
      // Adopt the server-authoritative active thread + load its bounded turns.
      set({ activeConversationId: active.conversation_id, activeTwinId: active.twin_entity_id, recentThreads: recent });
      const detail = await api.otzar.threads.detail(active.conversation_id);
      set({
        hydration: "restored",
        restoredTurns: detail.ok ? detail.data.turns : [],
        ...(detail.ok ? { activeTwinId: detail.data.thread.twin_entity_id } : {}),
      });
    },

    adoptActiveConversation: (conversationId: string, twinId?: string | null): void => {
      set({
        activeConversationId: conversationId,
        ...(twinId != null ? { activeTwinId: twinId } : {}),
      });
    },

    clearActive: (): void => set({ activeConversationId: null, activeTwinId: null, restoredTurns: [] }),

    reset: (): void => {
      writePending(null);
      set({ ...INITIAL });
    },

    markPending: (p: PendingSubmission): void => {
      writePending(p);
      set({ pending: p });
    },

    clearPending: (): void => {
      writePending(null);
      set({ pending: null });
    },

    loadPending: (): PendingSubmission | null => {
      const p = readPending();
      set({ pending: p });
      return p;
    },

    reconcileByClient: async (conversationId: string, clientRequestId: string): Promise<OtzarSafeRequestStatus | null> => {
      const res = await api.otzar.threads.requestByClient(conversationId, clientRequestId);
      return res.ok ? res.data.status : null;
    },

    discoverUnresolved: async (conversationId?: string, recentCompletedMs?: number): Promise<OtzarSafeRequestStatus[]> => {
      const res = await api.otzar.threads.unresolved(conversationId, recentCompletedMs);
      return res.ok ? res.data.unresolved : [];
    },
  }),
);
