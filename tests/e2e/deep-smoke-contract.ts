// FILE: deep-smoke-contract.ts
// PURPOSE: Contract for Otzar LIVE deep smokes — complex, multi-step,
//          real-work UX proof. Marker-only / empty-queue "PASS" is not enough.
//
// DEPTH RULES (all live deep smokes must meet these):
//   1. DRIVE WORK — type a command, stage a change, open a drawer, or
//      sync/discover — not only assert a testid after navigation.
//   2. MULTI-STEP — ≥2 sequential user actions before scoring the core claim.
//   3. HONESTY — prove false-complete language is absent when partial/not wired.
//   4. BRANCHES — exercise hold/clear/alternative when primary apply is unsafe.
//   5. CROSS-SURFACE — touch a related route or role when the feature spans shells.
//   6. EMPTY IS NOT SUCCESS for core claims — empty queue → SKIP or FAIL the
//      depth rows; only explicit honest-empty scenarios may PASS.
//   7. TIMEOUT — ≥180s; prefer 240–300s for multi-surface journeys.
//   8. SCORECARD — JSON totals + per-row PASS/FAIL/SKIP; require fail===0 and
//      pass ≥ 5 for "deep" rows (or document why fewer).
//
// EXAMPLES OF DEEP (good): otzar-live-mail-n05, otzar-live-collaboration-matrix,
//   otzar-live-comms-k01-k03 (drive Talk / multi-scenario).
// EXAMPLES OF TOO NOVEL (upgrade required): load page → see data-testid → pass.
//
// CONNECTS TO: all tests/e2e/otzar-live-*.spec.ts deep smokes.

export const DEEP_SMOKE_MIN_PASS = 5;
export const DEEP_SMOKE_TIMEOUT_MS = 300_000;

export type DeepRowStatus = "PASS" | "FAIL" | "SKIP";
export type DeepRow = { id: string; status: DeepRowStatus; detail: string };

export function deepRec(
  rows: DeepRow[],
  prefix: string,
  id: string,
  status: DeepRowStatus,
  detail: string,
): void {
  rows.push({ id, status, detail: detail.slice(0, 320) });
  const mark = status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗";
  console.log(`[${prefix}] ${mark} ${id} :: ${detail.slice(0, 180)}`);
}

export function deepTotals(rows: DeepRow[]): {
  pass: number;
  fail: number;
  skip: number;
} {
  return {
    pass: rows.filter((r) => r.status === "PASS").length,
    fail: rows.filter((r) => r.status === "FAIL").length,
    skip: rows.filter((r) => r.status === "SKIP").length,
  };
}
