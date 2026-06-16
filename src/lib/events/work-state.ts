// FILE: work-state.ts
// PURPOSE: Phase 1285-H semantic reconciliation (Phase 5, ADDITIVE) — a single
//          shared work-state event channel so a state change in one surface can
//          propagate to others (e.g. completing a task in My Work refreshes
//          Team Work) WITHOUT each surface knowing about the others. This is
//          ADDITIVE: existing onChanged/onTracked/reload callbacks stay in
//          place; surfaces also emit + subscribe here. No working refresh path
//          is removed (build-forward per RULE 1). Legitimate polling
//          (notifications/approvals/calendar) is unaffected.
// CONNECTS TO: ThreadSignalChip, WorkLedgerItem, MyWork, TeamWork, PersonCockpit,
//          InboxThread; tests/unit/work-state.test.ts.

import { useEffect, useRef } from "react";

// The unified work-state event vocabulary (decision 2026-06-16).
export type WorkStateChangedType =
  | "MESSAGE_CREATED"
  | "THREAD_UPDATED"
  | "LEDGER_UPDATED"
  | "TASK_COMPLETED"
  | "NOTIFICATION_CREATED"
  | "SIGNAL_TRACKED"
  | "WAITING_ON_CHANGED";

export interface WorkStateChanged {
  type: WorkStateChangedType;
  // Optional correlation ids for surfaces that want to scope their refresh.
  entity_id?: string;
  ledger_entry_id?: string;
  source_message_id?: string;
}

type Listener = (event: WorkStateChanged) => void;

const listeners = new Set<Listener>();

// WHAT: emit a work-state change to all subscribers. WHY: cross-surface sync.
// A listener that throws never blocks the others or the caller (the emitter is
// best-effort — a refresh failure must never break the action that caused it).
export function emitWorkStateChanged(event: WorkStateChanged): void {
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      // Swallow — a subscriber's refresh error must not affect the emitter.
    }
  }
}

// WHAT: subscribe to work-state changes; returns an unsubscribe fn.
export function onWorkStateChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Exported for tests only — the current subscriber count.
export function _listenerCount(): number {
  return listeners.size;
}

// WHAT: React hook — run `handler` whenever a WorkStateChanged of one of
//        `types` fires. Uses a ref so the subscription is stable across
//        renders (handler identity changes never re-subscribe).
export function useWorkStateChanged(
  types: ReadonlyArray<WorkStateChangedType>,
  handler: (event: WorkStateChanged) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const typesKey = types.join(",");
  useEffect(() => {
    const wanted = new Set(typesKey.split(",") as WorkStateChangedType[]);
    return onWorkStateChanged((event) => {
      if (wanted.has(event.type)) handlerRef.current(event);
    });
  }, [typesKey]);
}
