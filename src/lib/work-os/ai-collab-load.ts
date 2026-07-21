// FILE: ai-collab-load.ts
// PURPOSE: L-02 — AI↔AI collaboration under load: concurrency budgets,
//          loop/storm protection, multi-principal attribution, work advancement.
// CONNECTS TO: L-01 envelope, Collaboration page, FOUNDER L-02.

export const L02_DOCTRINE =
  "AI↔AI collaboration under load must stay governed: concurrency budgets, " +
  "loop and storm protection, multi-principal attribution on every hop, and " +
  "honest work-advancement proof — not a single envelope green badge.";

export const L02_DEFAULTS = {
  /** Max concurrent in-flight AI↔AI envelopes per principal. */
  max_concurrent_per_principal: 3,
  /** Max envelopes in a sliding window before storm trip. */
  storm_window_count: 12,
  /** Sliding window length (ms). */
  storm_window_ms: 60_000,
  /** Max hops in an AI↔AI delegation chain before loop refuse. */
  max_chain_depth: 4,
  /** Duplicate identical request fingerprint within window → loop risk. */
  duplicate_fingerprint_limit: 2,
} as const;

export type CollabLoadEvent = {
  id: string;
  at_ms: number;
  from_principal_id: string;
  to_principal_id: string;
  /** Optional chain of twin ids already in the path (for cycle detection). */
  chain: string[];
  fingerprint: string;
  advanced_work: boolean;
};

export type StormDecision =
  | { allow: true; reason: string }
  | {
      allow: false;
      reason: string;
      code:
        | "concurrency_cap"
        | "storm_trip"
        | "loop_chain"
        | "loop_duplicate"
        | "self_loop"
        | "missing_principal";
    };

export function fingerprintCollabRequest(input: {
  from: string;
  to: string;
  intent: string;
}): string {
  const norm = `${input.from}|${input.to}|${input.intent.trim().toLowerCase()}`;
  // FNV-1a 32-bit — pure, stable
  let h = 0x811c9dc5;
  for (let i = 0; i < norm.length; i++) {
    h ^= norm.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fp-${(h >>> 0).toString(16)}`;
}

/** Detect circular delegation in an AI chain. */
export function detectCollabLoop(
  chain: string[],
  nextPrincipal: string,
  maxDepth = L02_DEFAULTS.max_chain_depth,
): { loop: boolean; code: "loop_chain" | "self_loop" | "ok"; detail: string } {
  if (!nextPrincipal) {
    return { loop: true, code: "loop_chain", detail: "missing next principal" };
  }
  if (chain.includes(nextPrincipal)) {
    return {
      loop: true,
      code: "loop_chain",
      detail: `cycle involving ${nextPrincipal}`,
    };
  }
  if (chain.length > 0 && chain[chain.length - 1] === nextPrincipal) {
    return { loop: true, code: "self_loop", detail: "self-delegation" };
  }
  if (chain.length >= maxDepth) {
    return {
      loop: true,
      code: "loop_chain",
      detail: `chain depth ${chain.length} ≥ ${maxDepth}`,
    };
  }
  return { loop: false, code: "ok", detail: "no loop" };
}

/**
 * Admit or refuse a new collab event under load.
 * Pure: given history + candidate, decide.
 */
export function admitCollabUnderLoad(
  history: CollabLoadEvent[],
  candidate: Omit<CollabLoadEvent, "id"> & { id?: string },
  nowMs = candidate.at_ms,
  cfg = L02_DEFAULTS,
): StormDecision {
  if (!candidate.from_principal_id || !candidate.to_principal_id) {
    return {
      allow: false,
      code: "missing_principal",
      reason: "Missing principal attribution — fail closed",
    };
  }
  if (candidate.from_principal_id === candidate.to_principal_id) {
    return {
      allow: false,
      code: "self_loop",
      reason: "Self AI↔AI loop refused",
    };
  }

  const loop = detectCollabLoop(
    candidate.chain,
    candidate.to_principal_id,
    cfg.max_chain_depth,
  );
  if (loop.loop) {
    return {
      allow: false,
      code: loop.code === "self_loop" ? "self_loop" : "loop_chain",
      reason: `Loop protection: ${loop.detail}`,
    };
  }

  const windowStart = nowMs - cfg.storm_window_ms;
  const inWindow = history.filter((e) => e.at_ms >= windowStart);

  // Concurrency per principal (in-flight approx = recent without advanced_work false-complete)
  const fromInflight = inWindow.filter(
    (e) => e.from_principal_id === candidate.from_principal_id,
  ).length;
  if (fromInflight >= cfg.max_concurrent_per_principal) {
    return {
      allow: false,
      code: "concurrency_cap",
      reason: `Concurrency cap ${cfg.max_concurrent_per_principal} for principal`,
    };
  }

  if (inWindow.length >= cfg.storm_window_count) {
    return {
      allow: false,
      code: "storm_trip",
      reason: `Storm trip: ${inWindow.length} events in window`,
    };
  }

  const dups = inWindow.filter(
    (e) => e.fingerprint === candidate.fingerprint,
  ).length;
  if (dups >= cfg.duplicate_fingerprint_limit) {
    return {
      allow: false,
      code: "loop_duplicate",
      reason: "Duplicate collaboration request — loop risk",
    };
  }

  return {
    allow: true,
    reason: "Admitted under load budget with principal attribution",
  };
}

export type LoadPressureReport = {
  total_events: number;
  admitted: number;
  refused: number;
  by_code: Record<string, number>;
  principal_attribution_rate: number;
  work_advancement_rate: number;
  storm_trips: number;
  loop_blocks: number;
};

/** Simulate a batch of candidate events against empty then growing history. */
export function runCollabLoadPressure(
  candidates: Array<Omit<CollabLoadEvent, "id"> & { id?: string }>,
  cfg = L02_DEFAULTS,
): LoadPressureReport {
  const history: CollabLoadEvent[] = [];
  const by_code: Record<string, number> = {};
  let admitted = 0;
  let refused = 0;
  let attributed = 0;
  let advanced = 0;
  let storm_trips = 0;
  let loop_blocks = 0;

  candidates.forEach((c, i) => {
    const id = c.id ?? `ev-${i}`;
    if (c.from_principal_id && c.to_principal_id) attributed++;
    const decision = admitCollabUnderLoad(history, { ...c, id }, c.at_ms, cfg);
    if (decision.allow) {
      admitted++;
      const ev: CollabLoadEvent = {
        id,
        at_ms: c.at_ms,
        from_principal_id: c.from_principal_id,
        to_principal_id: c.to_principal_id,
        chain: c.chain,
        fingerprint: c.fingerprint,
        advanced_work: c.advanced_work,
      };
      history.push(ev);
      if (c.advanced_work) advanced++;
    } else {
      refused++;
      by_code[decision.code] = (by_code[decision.code] ?? 0) + 1;
      if (decision.code === "storm_trip") storm_trips++;
      if (
        decision.code === "loop_chain" ||
        decision.code === "loop_duplicate" ||
        decision.code === "self_loop"
      ) {
        loop_blocks++;
      }
    }
  });

  const n = candidates.length;
  return {
    total_events: n,
    admitted,
    refused,
    by_code,
    principal_attribution_rate: n ? Math.round((attributed / n) * 1000) / 1000 : 0,
    work_advancement_rate: admitted
      ? Math.round((advanced / admitted) * 1000) / 1000
      : 0,
    storm_trips,
    loop_blocks,
  };
}

/** Build a deterministic storm/load scenario set for tests and UI demo. */
export function buildSyntheticLoadScenario(seed = 42): CollabLoadEvent[] {
  const out: CollabLoadEvent[] = [];
  const principals = ["twin-a", "twin-b", "twin-c", "twin-d", "twin-e"];
  const t = 1_700_000_000_000 + seed;
  for (let i = 0; i < 20; i++) {
    const from = principals[i % principals.length]!;
    const to = principals[(i + 1) % principals.length]!;
    const intent = i % 5 === 0 ? "draft status" : `advance work ${i % 3}`;
    out.push({
      id: `syn-${seed}-${i}`,
      at_ms: t + i * 500,
      from_principal_id: from,
      to_principal_id: to,
      chain: i % 7 === 0 ? [from, to, from] : [from],
      fingerprint: fingerprintCollabRequest({ from, to, intent }),
      advanced_work: i % 4 !== 0,
    });
  }
  // Explicit self-loop + duplicate burst
  out.push({
    id: `syn-${seed}-self`,
    at_ms: t + 30_000,
    from_principal_id: "twin-a",
    to_principal_id: "twin-a",
    chain: ["twin-a"],
    fingerprint: fingerprintCollabRequest({
      from: "twin-a",
      to: "twin-a",
      intent: "self",
    }),
    advanced_work: false,
  });
  const dupFp = fingerprintCollabRequest({
    from: "twin-b",
    to: "twin-c",
    intent: "dup",
  });
  for (let d = 0; d < 4; d++) {
    out.push({
      id: `syn-${seed}-dup-${d}`,
      at_ms: t + 40_000 + d,
      from_principal_id: "twin-b",
      to_principal_id: "twin-c",
      chain: ["twin-b"],
      fingerprint: dupFp,
      advanced_work: false,
    });
  }
  return out;
}
