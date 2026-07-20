# OTZAR MASTER COMPLETION CONTRACT

> **Controlling program for all remaining Otzar work.**  
> Nothing the founder requested is complete until it exists in the requirements register, is connected to actual implementation, has the required tests and live proof, survives regression, and contributes to one coherent Otzar experience.

**Do not rely on conversation memory.**  
**Do not close shallow slices while major gaps remain.**  
**Do not mark CLOSED from code existence alone.**

---

## Permanent artifacts (this directory)

| File | Role |
|------|------|
| `FOUNDER_REQUIREMENTS_REGISTER.json` | Machine-readable register (source of truth for status) |
| `FOUNDER_REQUIREMENTS_REGISTER.md` | Human-readable register + nuance |
| `REQUIREMENTS_PROOF_MATRIX.md` | Proof level matrix by group |
| `MASTER_COMPLETION_GATE.md` | Phases, P0 order, exit criteria |
| `MASTER_COMPLETION_CONTRACT.md` | This file — governing rules |

Agents **must** read these before shipping any Otzar product slice.

Also: `docs/RENDER_DEPLOY_NOTES.md` — short lag then **MANUAL DEPLOY** signal.

---

## Proof levels (strict)

| Level | Meaning |
|-------|---------|
| `NOT_STARTED` | No material work |
| `DISCOVERED` | Documented only |
| `PARTIAL` | Some code/docs, not usable end-to-end |
| `IMPLEMENTED` | Code merged; not adequately proven |
| `UNIT_PROVEN` | Unit tests green for the contract |
| `INTEGRATION_PROVEN` | API/integration tests green |
| `BROWSER_PROVEN` | Live browser smoke against app.otzar.ai |
| `PROVIDER_PROVEN` | Real Google/Slack/etc. receipt or honest fail |
| `MULTI_USER_PROVEN` | ≥2 real principals, isolation holds |
| `SCALE_PROVEN` | Pressure harness at progressive scale |
| `LIVE_VERIFIED` | Deployed SHA matches main; acceptance criteria pass live |
| `EXTERNALLY_BLOCKED` | Product ready; operator/provider action required |
| `CLOSED` | LIVE_VERIFIED + permanent regression + no known reopen |

**CLOSED requires:** register row + implementation refs + required tests + live criteria + regression guard.

---

## Deploy / prove protocol (founder time)

1. Merge to `main` → wait CI green only.  
2. Poll live **~3 minutes**.  
3. If markers missing → print **MANUAL DEPLOY RECOMMENDED** with exact SHA (exit 4).  
4. Founder deploys `otzar-app` → replies `deployed`.  
5. Agent smokes immediately.  

Script: `scripts/otzar-ambient-autosmoke.sh --wait-ci`

---

## External blockers (do not greenwash)

| Blocker | Action | Auto-detect |
|---------|--------|-------------|
| Google Meet full operational transcripts | Operator completes OAuth reauth via Tools | Comms ambient sync + provider receipt |
| Full Docs write scopes if SCOPE_REAUTH | Operator reauth | Doc create/append smoke |
| Cross-tenant smoke credential | Founder supplies second-tenant account | Multi-tenant isolation suite |

Mark `EXTERNALLY_BLOCKED`; continue independent work; re-run when cleared.

---

## Final definition of complete

Otzar is **not** complete because many PRs merged, harness is large, or UI looks better.

Investor-ready scope is complete only when the master gate in `MASTER_COMPLETION_GATE.md` is fully green per LIVE_VERIFIED/CLOSED rules — including first-use, role value, thinner IA, project coherence, communication→execution, AI collaboration safety, tools proof, multi-tenant zero-leak, pressure harness, and YC unscripted survival.

---

## Progress report format (every milestone)

* active phase  
* requirement IDs closed  
* requirements still open  
* implementation  
* tests  
* real user/browser proof  
* provider proof  
* PR / merge SHA / deployment SHA / live bundle  
* regression status  
* external blockers  
* exact next slice  

No broad “nearly done” without the matrix.
