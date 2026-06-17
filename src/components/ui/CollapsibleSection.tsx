// FILE: CollapsibleSection.tsx
// PURPOSE: Phase 1287-C — the first reusable "ambient-readable" primitive. A
//          compact, collapsible section with a header (label + count) and a
//          chevron, so dense Work OS surfaces (My Work, Notifications) can lead
//          with high-priority work and collapse history/lower-priority groups.
//          Keyboard- and voice-friendly (a real <button> with aria-expanded),
//          AI-readable (stable data-testid + the label/count stay in the DOM),
//          and lens-safe (compact summary first, details on expand). This is the
//          FIRST ambient-readiness pass, not the final glasses UI.
// CONNECTS TO: pages/app/MyWork, components/otzar/NotificationBell.

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  testId,
  children,
}: {
  title: string;
  /** Optional item count shown next to the title. */
  count?: number;
  /** Urgent/active groups pass true; history/low-priority pass false. */
  defaultOpen?: boolean;
  testId?: string;
  children: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="space-y-1.5" data-testid={testId ?? "collapsible-section"} data-section-title={title} data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="flex w-full items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        data-testid="collapsible-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-3 w-3" aria-hidden /> : <ChevronRight className="h-3 w-3" aria-hidden />}
        <span>
          {title}
          {count !== undefined ? ` (${count})` : ""}
        </span>
      </button>
      {open ? (
        <div className="space-y-1.5" data-testid="collapsible-content">
          {children}
        </div>
      ) : null}
    </section>
  );
}
