# Otzar page projection matrix

> Part of the canonical architecture — see
> [`OTZAR_WORK_OS_BUILDING_BLOCKS.md`](./OTZAR_WORK_OS_BUILDING_BLOCKS.md)
> (block 4: no page invents its own truth; this matrix is the page-by-page
> ledger of that rule). Known projection/truth gaps and the next-slice queue
> live in
> [`OTZAR_OPERATIONAL_GAP_LEDGER.md`](./OTZAR_OPERATIONAL_GAP_LEDGER.md).

**Status:** 2026-07-02 (Fable 5). Every surface → the customer question it
answers, its source of truth, whether its actions are durable, and known
mismatch risk. Grounded in the codebase + this session's audit. ✅ coherent ·
🔶 partial/named-gap · ❌ mapping bug.

## Employee / work surfaces

| Page | Customer question | Source of truth | Durable actions? | Coherence |
|---|---|---|---|---|
| Today / Ambient Work Surface | "What needs me now?" | presence store + my-day intelligence (same object) | n/a (links) | ✅ Section-25 fix: headline & items one source; urgent blind-spots surfaced |
| Comms | "Turn this conversation into work" | ingest → WorkLedger (durable) | ✅ | ✅ **BUG B FIXED** — send-cards render from durable FOLLOW_UP rows (`getPendingFollowUps`), survive navigation; send→EXECUTED, dismiss→CANCELLED · ✅ **BUG A** send shape fixed |
| My Work | "What do I own / owe?" | `getMyWork` (WorkLedger, paginated) | ✅ | ✅ |
| Team Work | "My team's operating state" | `getTeamWork` + hierarchy edges | ✅ | ✅ rollup from real manager edges |
| Action Center / Needs me | "What must I decide?" | approvals/actions feed | ✅ | ✅ agrees with Today (same signals) |
| Blind Spots | "What's stuck?" | blind-spots feed + P0R triage | ✅ | ✅ urgent items also on Today |
| My Digital Work Wallet | "What Otzar knows about how I work" | context-health + consent-session (prototype) | governed (admin-owned authority) | ✅ portable-identity framing; observation is consent-only |
| Work Health | "How am I doing?" | operational-health + risk routes | read-only | ✅ honest, advisory-labeled |
| Talk to Otzar | "Just do it / ask / correct" | conduct/chat path → same governed loop | governed | 🔶 correction intents (reroute/fix-role) documented, not wired |

## Admin / org surfaces

| Page | Customer question | Source of truth | Coherence |
|---|---|---|---|
| Home / Command Center | "Is my org ready; what needs me?" | readiness + audit + approvals | ✅ (raw action codes humanized) |
| Members | "Who's here, and the org structure?" | `/org/entities` + `/org/hierarchy` | ✅ org map + reporting editor on real edges |
| People & Collaboration | "Who can I work with; who needs setup?" | teammates + `dandelionOrgGrowth` | ✅ **BUG D FIXED** — copy states true org placement ("already part of your organization on M's team") + names the one missing object (first project/workspace); structured per-fact context; honest "Hide for now" |
| AI Teammates | "Whose twin, doing what?" | ai-teammates + hierarchy (owner/title→template) | ✅ role-template column; no raw ids |
| Organization Seeding (Dandelion) | "Who/what did Otzar discover?" | `OrgSeed` grouped queues + meeting ingest | ✅ discovery framing; ingest door live |
| Tools & Connections | "What's connected, what does it unlock?" | `ConnectorBinding` + capability states | ✅ purpose groups + four facts |
| Access Control | "Who can see/use/share what?" | permissions + grants (one hub) | ✅ consolidated (permissions + grants tabs) |
| Policies | "What governs us; compliance readiness?" | policy rows + compliance preview (internal) | ✅ preview internal-only, no external claim |
| Security & Audit | "Who did what, with proof?" | `AuditEvent` (self/org/platform scopes) | 🔶 org-data-stays-here clarity is a future copy pass |
| Data & Knowledge | "Raw → curated → permissioned?" | knowledge layer projection | 🔶 lifecycle framing shipped; deep browse future |
| Reports | "Team/org rollups up the hierarchy" | link-hub today | 🔶 honest link-hub; hierarchy rollups = future (no fake metrics) |
| Scenario Studio | "Explore outcomes with AI teammates" | ADR-0077 pipeline (6 routes) | ✅ real pipeline, reframed language |
| Onboarding | "Get the org ready" | onboarding routes | 🔶 functional; top-down restructure pending |
| System Health / Data retention | operator/retention truth | health + retention | ✅ diagnostics tier |

## What this matrix reveals (the mapping bugs) — ALL REPAIRED (2026-07-02)

The two surfaces that read incoherently are both **fixed and live-verified**:
**Comms** (BUG B — durable FOLLOW_UP rows now back the send-cards; BUG C —
recipient review completes durably with caller_confirmed proof) and **People &
Collaboration** (BUG D — copy states true org placement and names the one
missing object; structured per-fact context). Every work surface now reads the
shared WorkLedger / hierarchy / audit source correctly. The audit also exposed
and fixed a dual-control regression (org resolved to the caller's MANAGER once
hierarchy edges existed → all sends by managed people 503-rejected); governed
sends now queue for approval as designed.

## Cross-page coherence tests to add (as B/C/D land)

1. Ingested follow-up appears in Comms (resumed) AND My Work.
2. Pending follow-up survives navigation/refresh.
3. Sent/dismissed follow-up updates all surfaces.
4. People connectedness copy agrees with hierarchy (no false "disconnected").
5. AI Twin mapping agrees with Members.
6. Action Center agrees with Today. *(covered: ambient-work-surface tests)*
7. Team Work agrees with hierarchy. *(covered: team-rollup tests)*
8. Dandelion conversion updates People/Projects.
9. Access Control agrees with Tools capabilities.
10. Data & Knowledge lineage appears when work came from communication.
    *(partially covered 2026-07-03 `[GAP-J]`: work cards + Why panel carry
    per-row source lineage — "From Slack"/"From Zoom recording"/"From Comms
    transcript" via `source_lineage`; the D&K page itself lists connector
    sources, not knowledge rows, so lineage BROWSING there stays open)*
