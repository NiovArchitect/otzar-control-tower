# Otzar Experience Governing Spec (Wave-1)

> **Otzar is not a destination employees must operate. It is a governed
> intelligence presence that moves with them across communication, devices,
> teams, tools, and organizations.**

## Design rule

The user experience is the governing specification. Backend objects
(obligations, ledgers, MCP, conflict sets, etc.) exist under the floor —
never as the employee vocabulary.

## Employee experience (what the human feels)

| Human need | Product surface | Never say |
|------------|-----------------|-----------|
| What needs me now | **Today** (`/app`) ambient presence | obligations, DGI, WorkLedger |
| Speak / type intent | **Talk** (`/app/voice`) | conductSession, TAR |
| Confirm or finish | **Needs me** (`/app/action-center`) | actions queue, handoff CAS |
| People / help | **People** (`/app/collaboration`) | EMPLOYEE_TWIN, policy scopes |
| My memory | **Memory** (`/app/my-memory`) | capsules, wallets |
| Capture meetings | Comms (secondary) | ingest pipelines |

Admin Control Tower remains a **separate shell** for org setup, tools,
security, and policy — not the employee daily path.

## Otzar Relay (communications application)

Provisional product name for the real-time channel:

- **Not** Slack clone; not channel maze
- Phone credential ≠ identity
- Portable professional core + org-bound Twin
- Foundation authority for identity, permissions, truth, evidence
- BEAM candidate for presence/delivery only

### First messaging slice (this wave)

1. Human sends a message in Relay (or Relay-compatible API).
2. Foundation records a durable communication event + thread turn.
3. Optional Twin participation is labeled (draft vs human).
4. Comms extract / ingest can promote to work (meetings, docs) under gates.

## Consolidation Wave-1 (implemented)

Employee primary nav collapses to:

1. Today  
2. Talk  
3. Needs me  
4. People  
5. Memory  

Legacy routes remain deep-linkable; many redirect into the five.

## Frozen

No new unrelated employee pages until Relay messaging slice and further
consolidation waves land.
