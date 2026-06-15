// FILE: ThreadSignalChip.tsx
// PURPOSE: Phase 1285 slice 3 — surface a POSSIBLE work signal detected on a
//          thread message, conservatively. Shows an "Otzar detected" panel
//          with confirm-gated actions: Add to Work Ledger (creates a durable
//          linked entry → appears in My Work), and "Not work" (records a
//          scoped correction). Never auto-creates work; never sends anything
//          external. Reused by PersonCockpit + InboxThread.
// CONNECTS TO: api.workOs.createLedgerEntry, api.otzar.correction,
//          src/lib/work-os/thread-signal.ts.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { signalLabel, ledgerTypeForSignal, isAddable } from "@/lib/work-os/thread-signal";

export function ThreadSignalChip({
  signalType,
  sourceMessageId,
  tracked = false,
  onTracked,
}: {
  signalType: string;
  sourceMessageId: string;
  /** Server-derived: this message is already in the Work Ledger. */
  tracked?: boolean;
  /** Called after a successful Add so the parent can refresh waiting-on. */
  onTracked?: () => void;
}): JSX.Element {
  // Persist the "already tracked" state from the server so the chip never
  // re-offers "Add" for a message already in the Work Ledger (across reloads /
  // both participants' views). The backend track call is idempotent.
  const [state, setState] = useState<"idle" | "adding" | "added" | "dismissed" | "corrected" | "error">(
    tracked ? "added" : "idle",
  );
  const label = signalLabel(signalType);
  const addable = isAddable(signalType);

  if (state === "dismissed") return <></>;

  async function addToLedger(): Promise<void> {
    const ledgerType = ledgerTypeForSignal(signalType);
    if (ledgerType === null) return;
    setState("adding");
    // Track-signal derives the DIRECTION on the backend from the source
    // message (requester=sender, owner=the asked person) → waiting-on state.
    // Idempotent: a repeat call returns the existing entry (no duplicate).
    const r = await api.workOs.trackSignal(sourceMessageId, ledgerType);
    if (r.ok && r.data.ok) {
      setState("added");
      onTracked?.();
    } else {
      setState("error");
    }
  }

  async function notWork(): Promise<void> {
    // Scoped correction (writes a CORRECTION capsule in the caller's memory).
    await api.otzar.correction({
      incorrect_description: `Otzar flagged a message as ${label.toLowerCase()}.`,
      correct_behavior: "This message is not work — do not track it.",
    });
    setState("corrected");
  }

  return (
    <div
      className="mt-1 rounded border border-amber-500/40 bg-amber-500/5 p-1.5 text-[11px]"
      data-testid="thread-signal-chip"
      data-signal-type={signalType}
    >
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="text-[9px]">Otzar detected</Badge>
        <span className="font-medium text-foreground/80">{label}</span>
      </div>
      {state === "added" ? (
        <p className="mt-1 text-emerald-600" data-testid="thread-signal-added">Tracked in your Work Ledger.</p>
      ) : state === "corrected" ? (
        <p className="mt-1 text-muted-foreground">Thanks — noted that this isn't work.</p>
      ) : state === "error" ? (
        <p className="mt-1 text-amber-600">Couldn't add it right now.</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1">
          {addable ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px]"
              disabled={state === "adding"}
              onClick={() => void addToLedger()}
              data-testid="thread-signal-add"
            >
              {state === "adding" ? "Adding…" : "Add to Work Ledger"}
            </Button>
          ) : null}
          {addable ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px]"
              onClick={() => void notWork()}
              data-testid="thread-signal-notwork"
            >
              Not work
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px]"
            onClick={() => setState("dismissed")}
            data-testid="thread-signal-ignore"
          >
            Ignore
          </Button>
        </div>
      )}
    </div>
  );
}
