// FILE: flow.ts
// PURPOSE: [OTZAR-LIVE-6] Ephemeral "work is moving" flow events — the data behind
//          the directional flow traces. A real action (a governed send, an
//          approval routed, a reply surfaced, context set) emits ONE short-lived
//          flow event; the shell renders it as a soft directional trace that
//          fades. There is NO constant animation and NO event without a real
//          action — silence when nothing moves. This is UI-only ephemeral state,
//          never durable memory.
// CONNECTS TO: AmbientOtzarBar (emit sites), FlowTraceOverlay (render),
//          src/lib/stores/presence.ts (intensity), tests/unit/flow-store.test.ts.

import { create } from "zustand";
import type { PresenceIntensity } from "@/lib/stores/presence";

export type FlowKind =
  | "user_to_otzar"
  | "otzar_to_person"
  | "reply_to_user"
  | "context_to_action"
  | "blocker_to_approval"
  | "approval_to_completion"
  | "correction_to_memory";

export interface FlowEvent {
  id: string;
  kind: FlowKind;
  /** Short, human one-liner ("Routed to David", "David replied"). */
  label: string;
  intensity: PresenceIntensity;
  createdAt: number;
  ttlMs: number;
}

export const DEFAULT_FLOW_TTL_MS = 4200;

// Direction the trace sweeps: "in" = work arriving to the human (reply, context,
// completion); "out" = work leaving toward a teammate/approver/memory.
export function flowDirection(kind: FlowKind): "in" | "out" {
  switch (kind) {
    case "reply_to_user":
    case "user_to_otzar":
    case "context_to_action":
    case "approval_to_completion":
      return "in";
    case "otzar_to_person":
    case "blocker_to_approval":
    case "correction_to_memory":
    default:
      return "out";
  }
}

interface FlowStore {
  events: FlowEvent[];
  emit: (e: {
    kind: FlowKind;
    label: string;
    intensity?: PresenceIntensity;
    ttlMs?: number;
    now: number;
  }) => void;
  prune: (now: number) => void;
  clear: () => void;
}

let seq = 0;

export const useFlowStore = create<FlowStore>((set) => ({
  events: [],
  emit: ({ kind, label, intensity = "working", ttlMs = DEFAULT_FLOW_TTL_MS, now }) =>
    set((s) => ({
      // Keep only a few recent events; one trace shows at a time.
      events: [
        ...s.events.slice(-3),
        { id: `flow-${(seq += 1)}`, kind, label, intensity, createdAt: now, ttlMs },
      ],
    })),
  prune: (now) =>
    set((s) => {
      const next = s.events.filter((ev) => now - ev.createdAt < ev.ttlMs);
      return next.length === s.events.length ? s : { events: next };
    }),
  clear: () => set({ events: [] }),
}));

// WHAT: The current live (non-expired) flow event to render, or null. Most recent
//       wins so a fresh action takes over the trace.
export function liveFlow(events: FlowEvent[], now: number): FlowEvent | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i]!;
    if (now - ev.createdAt < ev.ttlMs) return ev;
  }
  return null;
}

// Emit a flow event from anywhere (the orb action sites). No-op-safe; uses the
// caller's clock via Date.now (browser only — never a workflow context).
export function emitFlow(
  kind: FlowKind,
  label: string,
  intensity: PresenceIntensity = "working",
  ttlMs?: number,
): void {
  useFlowStore.getState().emit({
    kind,
    label,
    intensity,
    now: Date.now(),
    ...(ttlMs !== undefined ? { ttlMs } : {}),
  });
}
