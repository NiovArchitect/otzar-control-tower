// FILE: current-surface-context.ts
// PURPOSE: Phase 2.9 — a PERMISSIONED "use what I'm looking at" context seed.
//          Holds ONE piece of work context the user EXPLICITLY provided (a
//          selection, a pasted note, the current surface) so a later "use this"
//          / "review this" / "summarize this" resolves the referenced object
//          from it. This is NOT screen surveillance, NOT background capture, NOT
//          browser automation — context only ever enters here through an
//          explicit user action, is visibly indicated while active, and is
//          easy to clear. It flows into resolveWorkContext (PRD-04 Part A).
// CONNECTS TO: lib/work-os/work-context.ts (resolveWorkContext consumes it),
//          components/otzar/AmbientOtzarBar.tsx (provide / clear / indicator),
//          tests/unit/current-surface-context.test.ts + ambient-otzar-bar.test.tsx.

import { create } from "zustand";

export type CurrentSurfaceContextType =
  | "selected_text"
  | "current_surface"
  | "document"
  | "client_note"
  | "transcript"
  | "meeting"
  | "thread"
  | "notification"
  | "project"
  // [CE-AMBIENT] an explicitly opened/selected Work Ledger item — carries
  // ledgerEntryId so the ambient bar can answer "why is this here?" via the
  // read-only clarity-answer route. Set when a user OPENS an item's View/Why
  // (a deliberate act), cleared when they close it.
  | "work_item"
  | "unknown";

export interface CurrentSurfaceContext {
  id: string;
  type: CurrentSurfaceContextType;
  title?: string;
  text?: string;
  summary?: string;
  sourceLabel?: string;
  /** [CE-AMBIENT] present only for type "work_item" — the machine handle for
   *  read-only clarity answers; never rendered as customer copy. */
  ledgerEntryId?: string;
  capturedAt: string;
  active: boolean;
  // The ONLY provenance this seed supports — the user explicitly provided it.
  permission: "explicit_user_provided";
}

// What a caller supplies to set context (the store fills id/capturedAt/active/
// permission). Empty text/title is rejected — no empty context.
export interface ProvideSurfaceContextInput {
  type: CurrentSurfaceContextType;
  title?: string;
  text?: string;
  summary?: string;
  sourceLabel?: string;
  /** [CE-AMBIENT] work_item only — see CurrentSurfaceContext.ledgerEntryId. */
  ledgerEntryId?: string;
}

interface CurrentSurfaceContextStore {
  context: CurrentSurfaceContext | null;
  /** Explicitly provide the current work context (replaces any prior). */
  provide: (input: ProvideSurfaceContextInput) => void;
  /** Pause/clear — a stale "this" must then ask, never reuse old context. */
  clear: () => void;
}

let seq = 0;

export const useCurrentSurfaceContextStore = create<CurrentSurfaceContextStore>(
  (set) => ({
    context: null,
    provide: (input) => {
      const text = (input.text ?? "").trim();
      const title = (input.title ?? "").trim();
      // No empty context — nothing meaningful to attach.
      if (text.length === 0 && title.length === 0 && (input.summary ?? "").trim().length === 0) {
        return;
      }
      seq += 1;
      set({
        context: {
          id: `ctx-${Date.now()}-${seq}`,
          type: input.type,
          ...(title.length > 0 ? { title } : {}),
          ...(text.length > 0 ? { text } : {}),
          ...(input.summary !== undefined && input.summary.trim().length > 0
            ? { summary: input.summary.trim() }
            : {}),
          ...(input.sourceLabel !== undefined && input.sourceLabel.length > 0
            ? { sourceLabel: input.sourceLabel }
            : {}),
          ...(input.ledgerEntryId !== undefined && input.ledgerEntryId.length > 0
            ? { ledgerEntryId: input.ledgerEntryId }
            : {}),
          capturedAt: new Date().toISOString(),
          active: true,
          permission: "explicit_user_provided",
        },
      });
    },
    clear: () => set({ context: null }),
  }),
);

/** The active context, or null. Stale/cleared context never resolves. */
export function getActiveSurfaceContext(): CurrentSurfaceContext | null {
  const c = useCurrentSurfaceContextStore.getState().context;
  return c !== null && c.active ? c : null;
}
