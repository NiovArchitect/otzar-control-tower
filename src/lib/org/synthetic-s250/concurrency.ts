// FILE: concurrency.ts
// PURPOSE: R-03 — bounded concurrent workloads over S250 structural enterprise.
// CONNECTS TO: runtime-sample, acceptance-gate.

import type { StructuralEnterprise } from "./canonical-provision";
import { sampleIdentityRuntime } from "./runtime-sample";
import {
  admitCollabUnderLoad,
  fingerprintCollabRequest,
  type CollabLoadEvent,
} from "@/lib/work-os/ai-collab-load";

export type ConcurrencyReport = {
  home_reads: { n: number; p50_ms: number; p95_ms: number; p99_ms: number; errors: number };
  project_context: { n: number; p50_ms: number; p95_ms: number; p99_ms: number; errors: number };
  collab_requests: {
    n: number;
    admitted: number;
    refused: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
  };
  pass: boolean;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx]!;
}

function latStats(samples: number[]) {
  const s = [...samples].sort((a, b) => a - b);
  return {
    p50_ms: percentile(s, 50),
    p95_ms: percentile(s, 95),
    p99_ms: percentile(s, 99),
  };
}

/**
 * In-process concurrent-style pressure (sync loops with timing).
 * Not multi-process HTTP — honest partial for scale_measured.
 */
export function runS250Concurrency(
  ent: StructuralEnterprise,
): ConcurrencyReport {
  const people = ent.seed_org.people;
  const homeLats: number[] = [];
  let homeErr = 0;
  for (let i = 0; i < 50; i++) {
    const p = people[i % people.length]!;
    const t0 = performance.now();
    const r = sampleIdentityRuntime(ent, p.id);
    homeLats.push(performance.now() - t0);
    if (!r.ok) homeErr++;
  }

  const projLats: number[] = [];
  let projErr = 0;
  for (let i = 0; i < 50; i++) {
    const proj = ent.seed_org.projects[i % ent.seed_org.projects.length]!;
    const t0 = performance.now();
    const ownerOk = ent.seed_org.people.some((p) => p.id === proj.owner_id);
    const membersOk = proj.member_ids.every((id) =>
      ent.seed_org.people.some((p) => p.id === id),
    );
    projLats.push(performance.now() - t0);
    if (!ownerOk || !membersOk) projErr++;
  }

  const collabLats: number[] = [];
  let admitted = 0;
  let refused = 0;
  const history: CollabLoadEvent[] = [];
  const twins = ent.twins;
  for (let i = 0; i < 100; i++) {
    const from = twins[i % twins.length]!;
    const to = twins[(i + 3) % twins.length]!;
    const t0 = performance.now();
    const fp = fingerprintCollabRequest({
      from: from.twin_id,
      to: to.twin_id,
      intent: i % 7 === 0 ? "dup-intent" : `work-${i}`,
    });
    const decision = admitCollabUnderLoad(history, {
      id: `c-${i}`,
      at_ms: 1_700_000_000_000 + i * 10,
      from_principal_id: from.twin_id,
      to_principal_id: to.twin_id,
      chain: i % 11 === 0 ? [from.twin_id, to.twin_id, from.twin_id] : [from.twin_id],
      fingerprint: fp,
      advanced_work: true,
    });
    collabLats.push(performance.now() - t0);
    if (decision.allow) {
      admitted++;
      history.push({
        id: `c-${i}`,
        at_ms: 1_700_000_000_000 + i * 10,
        from_principal_id: from.twin_id,
        to_principal_id: to.twin_id,
        chain: [from.twin_id],
        fingerprint: fp,
        advanced_work: true,
      });
    } else {
      refused++;
    }
  }

  const home = { n: 50, ...latStats(homeLats), errors: homeErr };
  const project_context = { n: 50, ...latStats(projLats), errors: projErr };
  const collab_requests = {
    n: 100,
    admitted,
    refused,
    ...latStats(collabLats),
  };

  // Budgets: pure in-process should be fast; zero home/project structural errors
  const pass =
    home.errors === 0 &&
    project_context.errors === 0 &&
    home.p99_ms < 50 &&
    project_context.p99_ms < 50 &&
    collab_requests.refused > 0 && // storm/loop controls fire
    collab_requests.admitted > 0;

  return { home_reads: home, project_context, collab_requests, pass };
}
