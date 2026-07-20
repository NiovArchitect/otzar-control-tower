# Agent continuity pointer

## REQUIRED FIRST READ (anti-drift)

Before any Otzar product implementation, status claim, or “slice complete” assertion, read:

1. **`docs/otzar/master/MASTER_COMPLETION_CONTRACT.md`** — controlling rules  
2. **`docs/otzar/master/MASTER_COMPLETION_GATE.md`** — phase order + open P0  
3. **`docs/otzar/master/FOUNDER_REQUIREMENTS_REGISTER.json`** — machine register  
4. **`docs/otzar/master/REQUIREMENTS_PROOF_MATRIX.md`** — proof levels  

**Rule:** Every task maps to a stable requirement ID.  
**Rule:** Do not mark CLOSED from code existence alone.  
**Rule:** Do not long-wait Render; short poll then **MANUAL DEPLOY** signal (`docs/RENDER_DEPLOY_NOTES.md`).

---

Full durable Foundation memory also lives in **niov-foundation**:

* `docs/otzar/AGENT_CONTINUITY_MEMORY.md`  
* `docs/otzar/HOLISTIC_EXECUTION_LEDGER.md`  
* `docs/otzar/HOLISTIC_ACCEPTANCE_GATE.md` (must point at this master register)

Read those after the master register for API/substrate detail.
