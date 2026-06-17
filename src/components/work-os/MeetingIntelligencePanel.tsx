// FILE: MeetingIntelligencePanel.tsx
// PURPOSE: Phase 1286-C — a small, reusable, READ-ONLY display of the advisory
//          meeting-intelligence projection (Phase 1285-V) wherever a Work Ledger
//          / Comms artifact already carries it. It renders nothing when the
//          metadata is absent (never fakes intelligence), creates/sends/approves
//          nothing, shows no raw UUID labels, and never exposes the raw
//          transcript or chain-of-thought. Long lists are truncated; the panel
//          collapses by default to keep cards compact.
// CONNECTS TO: foundation type MeetingIntelligenceView; surfaced in
//          pages/app/Comms (recent-artifacts) + components/work-os/WorkLedgerItem.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type {
  MeetingIntelligenceView,
  MeetingIntelligenceCandidateView,
} from "@/lib/types/foundation";

const MAX_PER_SECTION = 5;

// Closed-vocab candidate types grouped into the sections we display. Anything
// not listed (e.g. SUMMARY, DRAFT_SUGGESTION) is intentionally not shown as a
// section — SUMMARY has its own field; DRAFT_SUGGESTION stays a proposal.
const SECTIONS: ReadonlyArray<{ label: string; types: ReadonlyArray<string> }> = [
  { label: "Decisions", types: ["DECISION"] },
  { label: "Action items", types: ["ACTION_ITEM"] },
  { label: "Blockers / risks", types: ["BLOCKER", "RISK"] },
  { label: "Open questions", types: ["OPEN_QUESTION"] },
  { label: "Follow-ups", types: ["FOLLOW_UP", "COMMITMENT"] },
];

function confidenceWord(c: string): string {
  const w = c.toLowerCase();
  return w.length > 0 ? w : "";
}

function Section({
  label,
  items,
}: {
  label: string;
  items: MeetingIntelligenceCandidateView[];
}): JSX.Element | null {
  if (items.length === 0) return null;
  const shown = items.slice(0, MAX_PER_SECTION);
  const extra = items.length - shown.length;
  return (
    <div className="mt-1" data-testid="mi-section" data-section={label}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <ul className="mt-0.5 space-y-0.5">
        {shown.map((c, i) => (
          <li key={`${label}-${i}`} className="text-[11px] text-foreground">
            • {c.text}
            {confidenceWord(c.confidence) ? (
              <span className="ml-1 text-[9px] text-muted-foreground">({confidenceWord(c.confidence)})</span>
            ) : null}
          </li>
        ))}
      </ul>
      {extra > 0 ? <div className="text-[10px] text-muted-foreground">+{extra} more</div> : null}
    </div>
  );
}

export function MeetingIntelligencePanel({
  data,
}: {
  data: MeetingIntelligenceView | undefined | null;
}): JSX.Element | null {
  const [open, setOpen] = useState(false);

  // Render NOTHING when there is no real meeting intelligence — never fake it.
  if (data === undefined || data === null) return null;
  const hasSummary = data.summary !== null && data.summary.length > 0;
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  if (!hasSummary && candidates.length === 0) return null;

  const advisory = data.authority === "FOUNDATION_VALIDATED";
  // Per-type grouping for the count chips + expanded sections.
  const counts = SECTIONS.map((s) => ({
    label: s.label,
    items: candidates.filter((c) => s.types.includes(c.candidate_type)),
  }));
  const nonEmpty = counts.filter((c) => c.items.length > 0);

  return (
    <div className="mt-1.5 rounded border border-border bg-muted/20 p-2 text-xs" data-testid="meeting-intelligence-panel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="font-medium">Meeting intelligence</span>
          <Badge variant="outline" className="text-[9px] text-muted-foreground" data-testid="mi-advisory-label">
            {advisory ? "Advisory (Python)" : "Advisory"}
          </Badge>
        </div>
        <button
          type="button"
          className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
          data-testid="mi-toggle"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "Details"}
        </button>
      </div>

      {hasSummary ? (
        <div className="mt-1" data-testid="mi-summary">
          <span className="text-muted-foreground">Summary:</span> {data.summary}
        </div>
      ) : null}

      {/* Collapsed: a compact one-line count of what was found. */}
      {!open && nonEmpty.length > 0 ? (
        <div className="mt-1 text-[10px] text-muted-foreground" data-testid="mi-counts">
          {nonEmpty.map((c) => `${c.items.length} ${c.label.toLowerCase()}`).join(" · ")}
        </div>
      ) : null}

      {/* Expanded: the grouped, truncated sections. */}
      {open ? (
        <div data-testid="mi-sections">
          {counts.map((c) => (
            <Section key={c.label} label={c.label} items={c.items} />
          ))}
        </div>
      ) : null}

      <div className="mt-1 text-[9px] italic text-muted-foreground" data-testid="mi-provenance">
        Read-only advisory from a captured meeting. Otzar did not create tasks or send anything.
        {` Analysis ${data.status.toLowerCase()}.`}
      </div>
    </div>
  );
}
