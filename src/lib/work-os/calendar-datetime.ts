// FILE: calendar-datetime.ts
// PURPOSE: N-04 — Normalize relative day + clock + timezone into a final
//          agreed RFC3339 selected_time window for gated calendar create.
//          Idempotency key for the same final slot. Never fabricates a
//          timezone — unknown labels fall back to the runtime local zone
//          with an honest display note.
// CONNECTS TO: timezone.ts, command-planner extractExplicitTime/extractWhen,
//          AmbientOtzarBar SCHEDULE_MEETING confirm, FOUNDER N-04.

import {
  displayForIana,
  formatClock,
  interpretTimezoneLabel,
} from "@/lib/work-os/timezone";

export interface NormalizedSelectedTime {
  /** RFC3339 start (with offset). */
  start: string;
  /** RFC3339 end (start + duration). */
  end: string;
  /** Human final agreed line, e.g. "11:00 AM Pacific Time · 2026-07-21". */
  display: string;
  /** IANA zone used. */
  iana: string;
  /** True when zone came from explicit user label. */
  timezoneExplicit: boolean;
  /** Stable key for the same logical create (idempotent client retries). */
  idempotencyKey: string;
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Offset of `timeZone` at instant `utcMs` (ms to add to local wall to get UTC). */
function offsetMsAt(utcMs: number, timeZone: string): number {
  const d = new Date(utcMs);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string): number =>
    Number.parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - utcMs;
}

/**
 * Convert a wall-clock in `timeZone` to a UTC Date.
 * Uses iterative offset correction (DST-safe for civil times).
 */
export function zonedWallToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const off = offsetMsAt(guess, timeZone);
    const next = Date.UTC(year, month - 1, day, hour, minute, 0) - off;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

function zonedYmd(d: Date, timeZone: string): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string): number =>
    Number.parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  return { y: get("year"), m: get("month"), day: get("day") };
}

function addCalendarDays(
  y: number,
  m: number,
  day: number,
  add: number,
): { y: number; m: number; day: number } {
  const utc = new Date(Date.UTC(y, m - 1, day + add));
  return {
    y: utc.getUTCFullYear(),
    m: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function weekdayIndexInZone(d: Date, timeZone: string): number {
  const w = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(d);
  return WEEKDAYS.indexOf(w.toLowerCase() as (typeof WEEKDAYS)[number]);
}

/** Resolve relative when → calendar Y-M-D in the target zone. */
export function resolveRelativeDay(
  when: string | undefined,
  now: Date,
  timeZone: string,
): { y: number; m: number; day: number } {
  const base = zonedYmd(now, timeZone);
  const w = (when ?? "today").toLowerCase().trim();
  if (w === "today" || w.length === 0) return base;
  if (w === "tomorrow") return addCalendarDays(base.y, base.m, base.day, 1);
  if (w === "next week") return addCalendarDays(base.y, base.m, base.day, 7);
  const target = WEEKDAYS.indexOf(w as (typeof WEEKDAYS)[number]);
  if (target >= 0) {
    const cur = weekdayIndexInZone(now, timeZone);
    let delta = (target - cur + 7) % 7;
    if (delta === 0) delta = 7; // next occurrence, not today
    return addCalendarDays(base.y, base.m, base.day, delta);
  }
  return base;
}

function parseTime24(time24: string): { hour: number; minute: number } | null {
  const m = time24.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (m === null) return null;
  const hour = Number.parseInt(m[1]!, 10);
  const minute = Number.parseInt(m[2]!, 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function toRfc3339WithOffset(d: Date, timeZone: string): string {
  const off = offsetMsAt(d.getTime(), timeZone);
  // off = local - utc  =>  utc = local - off; for ISO we want local wall + offset
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string): string =>
    parts.find((p) => p.type === t)?.value ?? "00";
  const totalMin = Math.round(off / 60000);
  const sign = totalMin >= 0 ? "+" : "-";
  const abs = Math.abs(totalMin);
  const oh = pad2(Math.floor(abs / 60));
  const om = pad2(abs % 60);
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}${sign}${oh}:${om}`;
}

/**
 * Build final agreed selected_time for calendar create.
 * time24 is "HH:MM" 24h; when is today|tomorrow|weekday; timezoneLabel optional.
 */
export function normalizeSelectedTime(args: {
  time24: string;
  when?: string;
  timezoneLabel?: string;
  durationMinutes?: number;
  now?: Date;
  /** Fallback IANA when label unknown (default: runtime local guess). */
  fallbackIana?: string;
}): NormalizedSelectedTime | null {
  const clock = parseTime24(args.time24);
  if (clock === null) return null;

  const interp = interpretTimezoneLabel(args.timezoneLabel);
  const timezoneExplicit = interp !== null;
  const iana =
    interp?.iana ??
    args.fallbackIana ??
    (typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC");

  const now = args.now ?? new Date();
  const ymd = resolveRelativeDay(args.when, now, iana);
  const startUtc = zonedWallToUtc(
    ymd.y,
    ymd.m,
    ymd.day,
    clock.hour,
    clock.minute,
    iana,
  );
  const duration = Math.max(15, args.durationMinutes ?? 30);
  const endUtc = new Date(startUtc.getTime() + duration * 60_000);

  const start = toRfc3339WithOffset(startUtc, iana);
  const end = toRfc3339WithOffset(endUtc, iana);
  const dateLabel = `${ymd.y}-${pad2(ymd.m)}-${pad2(ymd.day)}`;
  const display = `${formatClock(args.time24)} ${displayForIana(iana)} · ${dateLabel}`;
  const idempotencyKey = [
    "cal",
    start,
    end,
    iana,
    String(duration),
  ].join("|");

  return {
    start,
    end,
    display,
    iana,
    timezoneExplicit,
    idempotencyKey,
  };
}

/** Human summary for UI after create or at gate with resolved slot. */
export function finalAgreedSummary(args: {
  display: string;
  htmlLink?: string | null;
  meetLink?: string | null;
  created?: boolean;
}): string {
  const parts = [`Final agreed time: ${args.display}`];
  if (args.meetLink) parts.push(`Meet: ${args.meetLink}`);
  else if (args.htmlLink) parts.push(`Event: ${args.htmlLink}`);
  if (args.created === false) {
    parts.push("No event created yet (gated).");
  }
  return parts.join(" · ");
}
