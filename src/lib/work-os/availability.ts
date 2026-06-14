// FILE: availability.ts
// PURPOSE: Phase 1271 — pure helpers that turn a real Google free/busy
//          response into meeting-proposal availability intelligence:
//            - tomorrowWorkWindow(): the RFC3339 window to query
//            - freeWindowsFromBusy(): candidate free slots from busy[]
//          These NEVER fabricate availability — they only compute gaps
//          from busy intervals the backend actually returned. No event
//          is created, no invite is sent; this is read-only scheduling
//          intelligence for the MeetingProposalCard.
// CONNECTS TO: AmbientOtzarBar.tsx (SCHEDULE_MEETING handler) +
//          api.connectorData.calendarFreeBusy (POST /calendar/freebusy).

/** Default meeting length when the user names no duration. */
export const DEFAULT_MEETING_MINUTES = 30;

export interface WorkWindow {
  time_min: string;
  time_max: string;
}

export interface BusyInterval {
  start: string;
  end: string;
}

// WHAT: Build tomorrow's work-hours window (local timezone) as RFC3339.
// INPUT: optional `now` (for tests), start/end work hours.
// OUTPUT: { time_min, time_max } — instants are correct regardless of
//         the Z/offset representation (toISOString yields UTC Z, which
//         the backend accepts as valid RFC3339).
// WHY: Free/busy needs a concrete window; tomorrow 09:00–17:00 local is
//      the default scheduling horizon. Timezone-aware because the Date
//      math runs in the user's local zone.
export function tomorrowWorkWindow(
  now: Date = new Date(),
  startHour = 9,
  endHour = 17,
): WorkWindow {
  const day = new Date(now);
  day.setDate(day.getDate() + 1);
  const start = new Date(day);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(day);
  end.setHours(endHour, 0, 0, 0);
  return { time_min: start.toISOString(), time_max: end.toISOString() };
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

// WHAT: Compute free candidate windows (>= durationMin) inside a work
//        window, given the busy intervals the provider returned.
// INPUT: busy[] (RFC3339 start/end), window bounds, duration minutes.
// OUTPUT: human-readable local time ranges ("9:00 AM – 10:30 AM").
// WHY: The card shows when the day is actually open. Overlapping busy
//      blocks are merged; only gaps long enough for the meeting count.
//      Empty result = no slot fits (honest "fully booked"), never a
//      fabricated opening.
export function freeWindowsFromBusy(
  busy: BusyInterval[],
  windowStartIso: string,
  windowEndIso: string,
  durationMin: number = DEFAULT_MEETING_MINUTES,
): string[] {
  const winStart = new Date(windowStartIso).getTime();
  const winEnd = new Date(windowEndIso).getTime();
  const durMs = durationMin * 60_000;
  if (!Number.isFinite(winStart) || !Number.isFinite(winEnd)) return [];

  const intervals = busy
    .map((b) => ({
      s: new Date(b.start).getTime(),
      e: new Date(b.end).getTime(),
    }))
    .filter(
      (x) =>
        Number.isFinite(x.s) &&
        Number.isFinite(x.e) &&
        x.e > winStart &&
        x.s < winEnd,
    )
    .map((x) => ({ s: Math.max(x.s, winStart), e: Math.min(x.e, winEnd) }))
    .sort((a, b) => a.s - b.s);

  // Merge overlapping busy blocks.
  const merged: Array<{ s: number; e: number }> = [];
  for (const it of intervals) {
    const last = merged[merged.length - 1];
    if (last !== undefined && it.s <= last.e) {
      last.e = Math.max(last.e, it.e);
    } else {
      merged.push({ ...it });
    }
  }

  // Walk the gaps between busy blocks.
  const out: string[] = [];
  let cursor = winStart;
  for (const m of merged) {
    if (m.s - cursor >= durMs) out.push(`${fmtTime(cursor)} – ${fmtTime(m.s)}`);
    cursor = Math.max(cursor, m.e);
  }
  if (winEnd - cursor >= durMs) {
    out.push(`${fmtTime(cursor)} – ${fmtTime(winEnd)}`);
  }
  return out;
}
