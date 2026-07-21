#!/usr/bin/env node
// FILE: otzar-s250-pressure.mjs
// PURPOSE: CLI entry for R-03 S250 pressure (runs via vitest/node --experimental).
// Prefer: npx vitest run tests/unit/synthetic-s250-harness.test.ts
// This script documents the metrics contract for operators.

console.log(`
R-03 S250 pressure harness
==========================
Run:

  npx vitest run tests/unit/synthetic-s250-harness.test.ts

Produces deterministic:
  - 250 people + 250 twins
  - ≥20 teams, ≥30 projects, matrix edges
  - 40 multi-day NL scenarios with hidden oracles
  - failure injection + repair loop + metrics

Does NOT require YC credentials or Google Meet OAuth.
Real-provider bounded proofs remain N-*/R-04; N-02 still EXTERNALLY_BLOCKED.
`);
