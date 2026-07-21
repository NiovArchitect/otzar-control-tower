// FILE: l02-s250.ts
// PURPOSE: R-03 — exercise L-02 storm controls against the real S250 twin graph.
// CONNECTS TO: ai-collab-load, canonical-provision.

import type { StructuralEnterprise } from "./canonical-provision";
import {
  admitCollabUnderLoad,
  fingerprintCollabRequest,
  type CollabLoadEvent,
} from "@/lib/work-os/ai-collab-load";

export type L02S250Report = {
  total: number;
  admitted_legitimate: number;
  refused_correct: number;
  false_refusal: number;
  false_admission: number;
  loop_blocks: number;
  duplicate_blocks: number;
  storm_blocks: number;
  pass: boolean;
};

type Planned = {
  kind: "legit" | "dup" | "loop" | "self" | "storm_fill";
  from: string;
  to: string;
  chain: string[];
  intent: string;
};

export function runL02AgainstS250(ent: StructuralEnterprise): L02S250Report {
  const twins = ent.twins;
  const planned: Planned[] = [];

  // Safety cases first (before storm window fills) so refusal codes are specific
  const dFrom = twins[0]!.twin_id;
  const dTo = twins[5]!.twin_id;
  // First establishes fingerprint (legit); further identical intents must refuse
  planned.push({
    kind: "legit",
    from: dFrom,
    to: dTo,
    chain: [dFrom],
    intent: "identical-dup",
  });
  for (let d = 0; d < 4; d++) {
    planned.push({
      kind: "dup",
      from: dFrom,
      to: dTo,
      chain: [dFrom],
      intent: "identical-dup",
    });
  }

  const c0 = twins[1]!.twin_id;
  const c1 = twins[2]!.twin_id;
  planned.push({
    kind: "loop",
    from: c0,
    to: c1,
    chain: [c0, c1, c0],
    intent: "circular",
  });

  planned.push({
    kind: "self",
    from: twins[3]!.twin_id,
    to: twins[3]!.twin_id,
    chain: [twins[3]!.twin_id],
    intent: "self",
  });

  // Legitimate cross-team chains (distinct principals)
  for (let i = 0; i < 30; i++) {
    const a = twins[i % twins.length]!;
    const b = twins[(i + 17) % twins.length]!;
    if (a.twin_id === b.twin_id) continue;
    planned.push({
      kind: "legit",
      from: a.twin_id,
      to: b.twin_id,
      chain: [a.twin_id],
      intent: `cross-team handoff ${i}`,
    });
  }

  // Fan-out storm from one principal
  const stormer = twins[10]!.twin_id;
  for (let s = 0; s < 20; s++) {
    planned.push({
      kind: "storm_fill",
      from: stormer,
      to: twins[(11 + s) % twins.length]!.twin_id,
      chain: [stormer],
      intent: `fanout-${s}`,
    });
  }

  const history: CollabLoadEvent[] = [];
  let admitted_legitimate = 0;
  let refused_correct = 0;
  let false_refusal = 0;
  let false_admission = 0;
  let loop_blocks = 0;
  let duplicate_blocks = 0;
  let storm_blocks = 0;

  planned.forEach((p, i) => {
    const fp = fingerprintCollabRequest({
      from: p.from,
      to: p.to,
      intent: p.intent,
    });
    const decision = admitCollabUnderLoad(history, {
      id: `l02-${i}`,
      at_ms: 1_800_000_000_000 + i * 5,
      from_principal_id: p.from,
      to_principal_id: p.to,
      chain: p.chain,
      fingerprint: fp,
      advanced_work: p.kind === "legit",
    });

    const shouldAllow = p.kind === "legit" || p.kind === "storm_fill";
    // storm_fill may hit concurrency/storm — those refusals are correct for excess

    if (decision.allow) {
      history.push({
        id: `l02-${i}`,
        at_ms: 1_800_000_000_000 + i * 5,
        from_principal_id: p.from,
        to_principal_id: p.to,
        chain: p.chain,
        fingerprint: fp,
        advanced_work: p.kind === "legit",
      });
      if (p.kind === "legit") admitted_legitimate++;
      if (p.kind === "dup" || p.kind === "loop" || p.kind === "self") {
        false_admission++;
      }
    } else {
      const code = !decision.allow ? decision.code : "ok";
      if (code === "loop_chain" || code === "self_loop") loop_blocks++;
      if (code === "loop_duplicate") duplicate_blocks++;
      if (code === "storm_trip" || code === "concurrency_cap") storm_blocks++;

      if (p.kind === "dup" || p.kind === "loop" || p.kind === "self") {
        refused_correct++;
      } else if (p.kind === "legit") {
        // legit refused = false refusal only if not capacity
        if (code === "storm_trip" || code === "concurrency_cap") {
          refused_correct++; // capacity honesty
        } else {
          false_refusal++;
        }
      } else {
        refused_correct++;
      }
    }
    void shouldAllow;
  });

  const pass =
    false_admission === 0 &&
    loop_blocks >= 1 &&
    duplicate_blocks >= 1 &&
    admitted_legitimate > 0 &&
    false_refusal === 0;

  return {
    total: planned.length,
    admitted_legitimate,
    refused_correct,
    false_refusal,
    false_admission,
    loop_blocks,
    duplicate_blocks,
    storm_blocks,
    pass,
  };
}
