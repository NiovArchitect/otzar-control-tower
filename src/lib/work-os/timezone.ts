// FILE: timezone.ts
// PURPOSE: Phase 1274 — pure enterprise timezone interpretation for
//          scheduling. Maps casual US timezone labels ("PST", "ET") to
//          IANA zones + a DST-agnostic display name, and formats a
//          proposed time honestly ("11:00 AM Pacific Time"). It NEVER
//          fabricates a timezone — an unknown label returns null and the
//          caller falls back to a clearly-labeled default.
// CONNECTS TO: command-planner (explicit_timezone_label), AmbientOtzarBar
//          meeting flow (proposed-time display), MeetingProposalCard.
//
// Note: in summer the US Pacific zone is PDT, not PST; users say "PST"
// casually. We map the label to the zone + the season-neutral display
// "Pacific Time" and surface the interpretation so nothing is implied
// falsely.

export interface TimezoneInterpretation {
  /** IANA zone, e.g. "America/Los_Angeles". */
  iana: string;
  /** Season-neutral display, e.g. "Pacific Time". */
  display: string;
}

const LABELS: Record<string, TimezoneInterpretation> = {
  pst: { iana: "America/Los_Angeles", display: "Pacific Time" },
  pdt: { iana: "America/Los_Angeles", display: "Pacific Time" },
  pt: { iana: "America/Los_Angeles", display: "Pacific Time" },
  est: { iana: "America/New_York", display: "Eastern Time" },
  edt: { iana: "America/New_York", display: "Eastern Time" },
  et: { iana: "America/New_York", display: "Eastern Time" },
  cst: { iana: "America/Chicago", display: "Central Time" },
  cdt: { iana: "America/Chicago", display: "Central Time" },
  ct: { iana: "America/Chicago", display: "Central Time" },
  mst: { iana: "America/Denver", display: "Mountain Time" },
  mdt: { iana: "America/Denver", display: "Mountain Time" },
  mt: { iana: "America/Denver", display: "Mountain Time" },
  utc: { iana: "UTC", display: "UTC" },
  gmt: { iana: "UTC", display: "UTC" },
};

// Friendly display for known IANA zones (for caller/target profile zones).
const IANA_DISPLAY: Record<string, string> = {
  "America/Los_Angeles": "Pacific Time",
  "America/New_York": "Eastern Time",
  "America/Chicago": "Central Time",
  "America/Denver": "Mountain Time",
  UTC: "UTC",
};

// WHAT: Interpret a casual timezone label → IANA + display, or null.
export function interpretTimezoneLabel(
  label: string | undefined,
): TimezoneInterpretation | null {
  if (label === undefined) return null;
  return LABELS[label.trim().toLowerCase()] ?? null;
}

// WHAT: Friendly display name for an IANA zone (falls back to the raw id).
export function displayForIana(iana: string | null | undefined): string {
  if (iana === undefined || iana === null || iana.length === 0) return "unknown";
  return IANA_DISPLAY[iana] ?? iana;
}

// WHAT: Format a 24h "HH:MM" into a 12h clock string ("11:00 AM").
export function formatClock(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = Number.parseInt(hStr ?? "0", 10);
  const m = mStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

// WHAT: A human "Proposed time" line from an explicit time + label.
// OUTPUT: e.g. "11:00 AM Pacific Time" (label known) or "11:00 AM"
//         (no/unknown label — never invents a zone).
export function formatProposedTime(
  time24: string,
  label: string | undefined,
): string {
  const interp = interpretTimezoneLabel(label);
  const clock = formatClock(time24);
  return interp !== null ? `${clock} ${interp.display}` : clock;
}
