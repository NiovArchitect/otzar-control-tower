// FILE: ContextValidationChoices.tsx
// PURPOSE: [AIX-2/AIX-3] the ONE seeded-context validation affordance —
//          question + five customer-labeled choices + honest done/failure
//          copy, posting to the single FND validation route. Extracted
//          (new component rationale: encapsulates the drift-prone
//          4-stage validation flow and is reused on seeded rows [AIX-2]
//          AND on every derived relevance candidate [AIX-3] — there must
//          never be a second validation mechanism or divergent copy).
//          Nothing writes before an explicit click; authority is enforced
//          server-side.
// CONNECTS TO: src/lib/work-os/context-validation.ts (all copy),
//          api.workOs.validateSeededContext, WorkLedgerItem.tsx,
//          tests/unit/context-validation.test.tsx + context-candidates
//          .test.tsx.

import { useState } from "react";
import { api } from "@/lib/api";
import {
  CONTEXT_VALIDATION_DONE,
  CONTEXT_VALIDATION_FAILED,
  CONTEXT_VALIDATION_OPTIONS,
  CONTEXT_VALIDATION_QUESTION,
  type ContextValidationState,
} from "@/lib/work-os/context-validation";

export function ContextValidationChoices({
  ledgerEntryId,
  testIdPrefix = "context-validation",
  onValidated,
}: {
  /** The SEEDED row being validated (the target of the AIX-2 POST). */
  ledgerEntryId: string;
  /** Distinct prefix per surface so instances never collide in tests. */
  testIdPrefix?: string;
  onValidated?: (() => void) | undefined;
}): JSX.Element {
  const [busy, setBusy] = useState<ContextValidationState | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function choose(state: ContextValidationState): Promise<void> {
    if (busy !== null) return;
    setBusy(state);
    setErr(null);
    const r = await api.workOs.validateSeededContext(ledgerEntryId, { state });
    setBusy(null);
    if (r.ok && r.data.ok) {
      setDone(CONTEXT_VALIDATION_DONE[state]);
      onValidated?.();
    } else {
      setErr(CONTEXT_VALIDATION_FAILED);
    }
  }

  return (
    <>
      {done !== null ? (
        <div data-testid={`${testIdPrefix}-done`}>{done}</div>
      ) : (
        <>
          <div>{CONTEXT_VALIDATION_QUESTION}</div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {CONTEXT_VALIDATION_OPTIONS.map((o) => (
              <button
                key={o.state}
                type="button"
                className="rounded border border-border/70 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                data-testid={`${testIdPrefix}-${o.state}`}
                disabled={busy !== null}
                onClick={() => void choose(o.state)}
              >
                {busy === o.state ? "Recording…" : o.label}
              </button>
            ))}
          </div>
        </>
      )}
      {err !== null ? (
        <div className="text-amber-600" data-testid={`${testIdPrefix}-error`}>
          {err}
        </div>
      ) : null}
    </>
  );
}
