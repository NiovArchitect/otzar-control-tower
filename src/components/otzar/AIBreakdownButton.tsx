// FILE: AIBreakdownButton.tsx
// PURPOSE: Phase 1214 -- reusable "brain icon" button that opens a
//          small popover explaining what Otzar surfaced, why, and
//          what happens next. Used by ProposedActionCard, the
//          notification bell items, Action Center cards, and the
//          Comms follow-up rows.
//
//          Per [FOUNDER — AI BREAKDOWN]: this is a USER-SAFE
//          explanation, not the LLM's hidden chain of thought.
//          The breakdown content is built deterministically by the
//          caller from closed-vocab fields the user can already
//          see (action_type / target / source_excerpt / confidence /
//          decision_reason). No new backend call. No chain-of-thought.
//          No private memory leak.
//
// CONNECTS TO:
//   - src/components/otzar/ProposedActionCard.tsx
//   - src/components/otzar/NotificationBell.tsx
//   - src/pages/app/ActionCenter.tsx
//   - src/pages/app/Comms.tsx
//
// PRIVACY INVARIANT:
//   - Renders only the AIBreakdown props the caller passes.
//   - No TAR / wallet / clearance / permission / payload / embedding
//     / bearer ever in primary copy.

import { useEffect, useRef, useState } from "react";
import { Brain } from "lucide-react";

export interface AIBreakdownPoint {
  label: string;
  body: string;
}

export interface AIBreakdown {
  /** Plain title users will read on the popover. */
  title: string;
  /** "Why this matters", "What happens if approved", etc. The
   *  consumer is responsible for human-language wording. */
  points: AIBreakdownPoint[];
  /** Optional confidence label (HIGH | MEDIUM | LOW). */
  confidence?: "HIGH" | "MEDIUM" | "LOW";
}

interface Props {
  breakdown: AIBreakdown;
  /** Optional aria-label override (defaults to "Why this matters"). */
  ariaLabel?: string;
  /** Test hook -- passed through to the trigger button. */
  triggerTestId?: string;
}

function confidenceLabel(c: "HIGH" | "MEDIUM" | "LOW"): string {
  switch (c) {
    case "HIGH":
      return "High confidence";
    case "MEDIUM":
      return "Medium confidence";
    case "LOW":
      return "Low confidence";
  }
}

export function AIBreakdownButton({
  breakdown,
  ariaLabel,
  triggerTestId,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Close on click outside or Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent): void {
      if (popRef.current === null) return;
      if (!popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded p-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={ariaLabel ?? "Why this matters"}
        aria-expanded={open}
        data-testid={triggerTestId ?? "ai-breakdown-trigger"}
      >
        <Brain className="h-3 w-3" aria-hidden />
        <span className="hidden sm:inline">Why this matters</span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={breakdown.title}
          className="absolute right-0 z-50 mt-1 w-80 rounded-md border bg-popover p-3 text-xs shadow-lg"
          data-testid="ai-breakdown-popover"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">{breakdown.title}</p>
            {breakdown.confidence !== undefined ? (
              <span
                className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                data-testid="ai-breakdown-confidence"
              >
                {confidenceLabel(breakdown.confidence)}
              </span>
            ) : null}
          </div>
          <dl className="space-y-2">
            {breakdown.points.map((p, i) => (
              <div key={i} data-testid="ai-breakdown-point">
                <dt className="text-muted-foreground">{p.label}</dt>
                <dd className="text-foreground">{p.body}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[10px] italic text-muted-foreground">
            This is a user-safe explanation built from the same governed
            context Otzar showed you. It is not the AI's hidden reasoning.
          </p>
        </div>
      ) : null}
    </div>
  );
}
