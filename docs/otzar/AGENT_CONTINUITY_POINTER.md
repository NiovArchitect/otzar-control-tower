# Agent continuity pointer

## REQUIRED FIRST READ (anti-drift)

Before any Otzar product implementation, status claim, or “slice complete” assertion, read:

0. **`docs/otzar/master/CONTINUITY_MEMORY_2026-07-21.md`** — **current program memory** (audit correction: Gate A ≠ full Otzar freeze)  
1. **`docs/otzar/master/MASTER_COMPLETION_CONTRACT.md`** — controlling rules  
2. **`docs/otzar/master/MASTER_COMPLETION_GATE.md`** — multi-gate status + open P0  
3. **`docs/otzar/master/PROGRAM_GATES.md`** — Gates A/B/C/D  
4. **`docs/otzar/master/REGISTER_COMPLETENESS_AUDIT.md`** — what was missing from the 60-row subset  
5. **`docs/otzar/master/FOUNDER_REQUIREMENTS_REGISTER.json`** — machine register (**74 rows** post-audit)  
6. **`docs/otzar/master/REQUIREMENTS_PROOF_MATRIX.md`** — proof levels  

**Rule:** Every task maps to a stable requirement ID.  
**Rule:** Do not mark CLOSED from code existence alone.  
**Rule:** Do **not** declare the complete Otzar program frozen because Gate A is green.  
**Rule:** Relay (T-02/T-03), compliance (U-*), and internal synthetic scale (R-03) are **required programs**, not optional.  
**Rule:** Do not long-wait Render; short poll then **MANUAL DEPLOY** signal (`docs/RENDER_DEPLOY_NOTES.md`).

---

## Snapshot (2026-07-21)

| Gate | Status |
|------|--------|
| **A** CT investor surface | Nearly closed (N-02 EXTERNALLY_BLOCKED) |
| **B** Work OS | Open (R-03 deepen, J-04, A-08, L-02, V-*) |
| **C** Relay | Open required program (boundary T-01 only LIVE) |
| **D** Compliance | Open (U-01/U-02) |

**Next internal Work OS priority:** deepen **R-03** (S250 synthetic seed harness).

---

Full durable Foundation memory also lives in **niov-foundation**:

* `docs/otzar/AGENT_CONTINUITY_MEMORY.md`  
* `docs/otzar/HOLISTIC_EXECUTION_LEDGER.md`  
* `docs/otzar/HOLISTIC_ACCEPTANCE_GATE.md` (must point at this master register)

Read those after the master register for API/substrate detail.
