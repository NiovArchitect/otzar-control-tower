# Founder Requirements Register (human view)

**Machine source of truth:** `FOUNDER_REQUIREMENTS_REGISTER.json`  
**Governing rules:** `MASTER_COMPLETION_CONTRACT.md`  
**Phase gate:** `MASTER_COMPLETION_GATE.md`  
**Proof matrix:** `REQUIREMENTS_PROOF_MATRIX.md`

> Update the JSON when status changes. Do not “close” from conversation memory.

## Live snapshot

| Field | Value |
|-------|--------|
| CT main | `882361d` (product live `d320c12`) |
| Live bundle | `index-CqgWhZAo.js` |
| Live as of | 2026-07-20 07:47:37 UTC |
| LIVE_VERIFIED count | 13 |
| Open P0 count | 22 |
| EXTERNALLY_BLOCKED | N-02 (Meet operational) |

## Groups A–T (summary)

### A — Login & first-time experience

| ID | Proof | Notes |
|----|-------|-------|
| **A-01** Login → Home | LIVE_VERIFIED | #173 post-login-destination |
| **A-02** Deep-link validation | LIVE_VERIFIED | Expand matrix |
| **A-03** Role-aware first-use strip | LIVE_VERIFIED | localStorage; see A-04 |
| **A-04** Server-side versioned multi-role walkthrough | LIVE_VERIFIED | dual-write + roles; live verify after deploy |
| **A-05** YC first 5 min aha | LIVE_VERIFIED | Needs S-01 continuous |
| **A-06** Org switch → Home | IMPLEMENTED | Client isolation + badge; deploy + a06 smoke |
| **A-07** Sole-admin lockout honesty | LIVE_VERIFIED | #178 |

### B — Home / Today / trust

| ID | Proof | Notes |
|----|-------|-------|
| **B-01** Today one-shot ADHD | LIVE_VERIFIED | #174 |
| **B-02** Counts reconcile + why-card | LIVE_VERIFIED | focus-truth why/link; live oracle follow-up |
| **B-03** Resolved/stale/Next truth | PARTIAL | |
| **B-04** What changed / integrations | PARTIAL | reconnect chip live |
| **B-05** Role-different Home | PARTIAL | |

### C — UI consolidation

| ID | Proof | Notes |
|----|-------|-------|
| **C-01** Route/control inventory earn existence | LIVE_VERIFIED | matrix + welcome→Today cull |
| **C-02** Admin/employee separation | LIVE_VERIFIED | #173 |
| **C-03** No dead/fake/coming-soon primary | LIVE_VERIFIED | |
| **C-04** Contextual work surfaces | LIVE_VERIFIED | Needs me host; deep 6/6 |
| **C-05** Viewport chrome pin | LIVE_VERIFIED | #175 |
| **C-06** More zero-noise + Tools | LIVE_VERIFIED | #178–179 |

### D — Ambient

PARTIAL / DISCOVERED — presence, voice, 3D, permissioned window context (D-01–D-04).

### E — Dandelion

PARTIAL — growth card + seeding; full source-driven proposal classes open (E-01–E-03).

### F — Hierarchy

| ID | Proof | Notes |
|----|-------|-------|
| **F-01** People structure glance + assign | LIVE_VERIFIED | #176 |
| **F-02** Drag-drop hierarchy editor | NOT_STARTED | **P0 phase 3** |
| **F-03** Matrix/sponsor edges | PARTIAL | |
| **F-04** Hierarchy ≠ RBAC/TAR | PARTIAL | doctrine |

### G — Role-templated AI Teammates

PARTIAL — templates/authority substrate exist; distinct first sessions incomplete.

### H — Memory / work-style

PARTIAL — Teach Otzar UI + FND work-style; multi-user isolation not SCALE/MULTI proven.

### I — Portability

PARTIAL — doctrine strong; product UI incomplete.

### J — Project coherence

| ID | Proof | Notes |
|----|-------|-------|
| **J-01** Mission heart panel | LIVE_VERIFIED | #175 |
| **J-02** Full project spine | PARTIAL | |
| **J-03** Conversation→project | PARTIAL | |

### K — Communication→execution

| ID | Proof | Notes |
|----|-------|-------|
| **K-01** Ambient Comms primary | PARTIAL | needs Meet provider |
| **K-02** Reconnect honesty | LIVE_VERIFIED | #179–180 |
| **K-03** Full lineage | PARTIAL | |

### L — AI↔AI

PARTIAL — collab envelope exists; load/storm proofs open.

### M — Autonomy

PARTIAL — TAR/grants/escalations; graduated product ladder open.

### N — Providers

| ID | Proof | Notes |
|----|-------|-------|
| **N-01** Tools reconnect honesty | LIVE_VERIFIED | #180 |
| **N-02** Meet operational | **EXTERNALLY_BLOCKED** | Operator OAuth |
| **N-03** Docs create/append/edit | LIVE_VERIFIED | create + honest append fail |
| **N-04** Calendar honesty | LIVE_VERIFIED | final agreed; deep 6/6 |
| **N-05** Gmail draft/sent honesty | LIVE_VERIFIED | not_wired draft; deep 6/6 |

### O — Connections / MCP

| ID | Proof | Notes |
|----|-------|-------|
| **O-01** Capability-first tools | LIVE_VERIFIED | MCP advanced-only |
| **O-02** Org/team/user coverage + SCIM honesty | LIVE_VERIFIED | not_wired SCIM; deep 6/6 |

### P — Role reports

PARTIAL — thin.

### Q — Multi-tenant

PARTIAL — continuous isolation suite + second-tenant credential open.

### R — Pressure

PARTIAL — level1/2 harnesses exist; progressive scale continuous open.

### S — YC investor

PARTIAL / BROWSER_PROVEN prior — dedicated continuous YC org open.

### T — Relay

DISCOVERED — preserve separate app; do not merge into CT employee shell.

### OPS

| ID | Proof | Notes |
|----|-------|-------|
| **OPS-01** Short-lag + MANUAL DEPLOY | LIVE_VERIFIED | #179 |
| **OPS-02** clear-lockout script | IMPLEMENTED | #178 |

---

## Sources reconciled

* Founder master completion directive (this session)  
* `EXPERIENCE_GOVERNING_SPEC.md`, ambient doctrines  
* Foundation ADRs 0080–0094 region + earlier  
* `HOLISTIC_ACCEPTANCE_GATE.md`, execution ledger  
* CT PRs #171–#180 and acceptance era  
* Live app.otzar.ai browser smokes 2026-07-20  

Conflicts: none unresolved — external Meet blocked honestly vs “Connected” catalog (product path #180).

---

## How to update

1. Edit JSON first.  
2. Refresh this MD summary for open P0.  
3. Update `MASTER_COMPLETION_GATE.md` live snapshot.  
4. Never mark CLOSED without regression ref.
