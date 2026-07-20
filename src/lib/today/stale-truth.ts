// FILE: stale-truth.ts
// PURPOSE: B-03 — resolved work leaves open surfaces; stale labeled;
//          "Next" is only a real decision (never IDLE as a fake card).
// CONNECTS TO: AmbientWorkSurface, ActionCenter, FOUNDER B-03.

/** Pending work older than this is labeled Stale (still open, not resolved). */
export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function isStaleOpenWork(
  updatedAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!updatedAt) return false;
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return false;
  return nowMs - t >= STALE_AFTER_MS;
}

export function staleLabel(
  updatedAt: string | null | undefined,
  nowMs: number = Date.now(),
): string | null {
  if (!isStaleOpenWork(updatedAt, nowMs)) return null;
  return "Stale — still open, needs a decision";
}

/**
 * B-03: Next-best-step only surfaces when it is a real decision.
 * IDLE_HEALTHY must never invent a Focus card.
 */
export function isRealNextDecision(kind: string | null | undefined): boolean {
  if (!kind) return false;
  return kind !== "IDLE_HEALTHY";
}

/** Statuses that must not remain on open/pending surfaces. */
const RESOLVED_STATUSES = new Set([
  "SUCCEEDED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
  "REVOKED",
]);

export function isResolvedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return RESOLVED_STATUSES.has(status.toUpperCase());
}
