// FILE: relative-time.ts
// PURPOSE: Single-import wrapper around date-fns formatDistanceToNow
//          so the rest of the app keeps date-fns usage centralized.
//          Decision #26: "Last Updated" columns use this helper.
// CONNECTS TO: Users table "Last Updated" column, member detail
//              drawer profile tab, audit feed timestamp render in
//              12D.

import { formatDistanceToNow, parseISO } from "date-fns";

// WHAT: Format an ISO 8601 timestamp as a relative-to-now string.
// INPUT: An ISO 8601 string (e.g., "2026-05-04T18:23:00.000Z").
// OUTPUT: A human-friendly relative string (e.g., "5 minutes ago",
//          "about 1 hour ago"). Returns "—" if the input is null
//          or unparseable.
// WHY: Schema-honest "Last Updated" display per decision #26.
//      Centralized so a future swap from date-fns to another lib
//      lands in one place.
export function formatRelativeTime(iso: string | null | undefined): string {
  if (iso === null || iso === undefined || iso.length === 0) {
    return "—";
  }
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}
