# Requirements → Proof Matrix

Generated from `FOUNDER_REQUIREMENTS_REGISTER.json`.  
**Update JSON first**, then re-sync counts when shipping.

## By proof level (current)

| Proof level | Count | Meaning |
|-------------|------:|---------|
| LIVE_VERIFIED | 13 | Live deploy + acceptance |
| EXTERNALLY_BLOCKED | 1 | N-02 Meet |
| BROWSER_PROVEN | 2 | Prior browser, re-bind continuous |
| IMPLEMENTED | 1 | Code, limited proof |
| PARTIAL | majority | Code/docs incomplete proof |
| NOT_STARTED | 1 | F-02 drag-drop |
| DISCOVERED | few | Doctrine only |

## LIVE_VERIFIED (must not regress)

A-01, A-02, A-03, A-07, B-01, C-02, C-05, C-06, F-01, J-01, K-02, N-01, OPS-01  

Regression anchors:

* `tests/e2e/otzar-live-login-home-first-use.spec.ts`  
* `tests/e2e/otzar-live-viewport-chrome.spec.ts`  
* `tests/e2e/otzar-live-project-context.spec.ts`  
* `tests/e2e/otzar-live-people-structure.spec.ts`  
* `tests/e2e/otzar-live-first-use-role.spec.ts`  
* `tests/e2e/otzar-live-tools-reconnect.spec.ts`  
* `tests/e2e/otzar-live-comms-reconnect.spec.ts`  
* `tests/unit/login-error-copy.test.ts`  
* `tests/unit/employee-shell-viewport.test.tsx`  
* `scripts/otzar-ambient-autosmoke.sh`

## Open P0 (active work queue)

| ID | Phase | Next proof needed |
|----|-------|-------------------|
| A-04 | 0 | Server walkthrough versioned multi-role |
| A-05 | 0 | Continuous YC 5-min (ties S-01) |
| B-02 | 1 | Card count reconcile browser oracle |
| C-01 | 0 | Full route/control inventory + cull PR |
| C-03 | 0 | Dead-control inventory |
| D-04 | 1 | Explicit window-permission product |
| E-01 | 3 | LIVE_VERIFIED complex deep 10/10 multi-class Dandelion |
| E-02 | 3 | LIVE_VERIFIED proposal confidence/admin confirm |
| E-03 | 3 | LIVE_VERIFIED complex deep 10/10 person types + participation≠authority |
| F-02 | 3 | LIVE_VERIFIED drag-drop hierarchy editor |
| F-03 | 3 | LIVE_VERIFIED complex deep 10/10 relationship edges |
| F-04 | 3 | Product copy separation |
| G-02 | 5 | LIVE_VERIFIED complex deep 10/10 Foundation authority multi-role |
| H-01 | 4 | LIVE_VERIFIED complex deep 10/10 Teach Otzar e2e |
| H-02 | 4 | LIVE_VERIFIED complex deep 10/10 multi-user isolation |
| H-03 | 4 | LIVE_VERIFIED complex deep 10/10 approved applies / rejected never |
| I-01 | 4 | LIVE_VERIFIED portable core UI (with H-02 deep) |
| I-02 | 4 | Multi-org memory isolation (open — needs 2nd tenant) |
| K-01 | 2 | Meet provider after N-02 |
| L-01 | 5 | LIVE_VERIFIED complex deep 10/10 AI↔AI envelope |
| M-01 | 5 | LIVE_VERIFIED complex deep 10/10 graduated ladder |
| M-02 | 5 | LIVE_VERIFIED complex deep 10/10 time-limited multi-class grants |
| N-02 | 2 | **Operator Meet reauth** |
| N-03 | 2 | Docs append live |
| O-01 | 2 | Capability-first domain provision |
| Q-01/Q-02 | 6 | Cross-tenant suite + credential |
| S-01 | 7 | Dedicated YC org (open — needs harness credentials) |
| S-02 | 7 | LIVE_VERIFIED complex deep 10/10 investor continuous journey |

## Phase exit checklist (abbreviated)

* **Phase 0:** A-01..A-07 (A-04 may remain PARTIAL only if documented walkthrough path is LIVE for primary roles); B-01; C-02; C-05; C-06; F-01; K-02; N-01; OPS-01.  
* **Phase 1:** B-02+, J-01+, project spine.  
* **Phase 2:** K/N/O provider honesty + Meet.  
* **Phase 3:** F-02 + E.  
* **Phase 4–7:** Memory, Twins, isolation, pressure, YC/Relay.

## Forbidden closes

* “Merged PR” ≠ CLOSED  
* “Unit green” ≠ LIVE_VERIFIED  
* “Connected” catalog ≠ PROVIDER_PROVEN  
* “Walkthrough animation” ≠ A-04  
