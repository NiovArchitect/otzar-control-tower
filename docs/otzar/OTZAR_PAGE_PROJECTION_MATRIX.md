# Otzar page projection matrix

**Status:** 2026-07-02 (Fable 5). Every surface → the customer question it
answers, its source of truth, whether its actions are durable, and known
mismatch risk. Grounded in the codebase + this session's audit. ✅ coherent ·
🔶 partial/named-gap · ❌ mapping bug.

## Employee / work surfaces

| Page | Customer question | Source of truth | Durable actions? | Coherence |
|---|---|---|---|---|
| Today / Ambient Work Surface | "What needs me now?" | presence store + my-day intelligence (same object) | n/a (links) | ✅ Section-25 fix: headline & items one source; urgent blind-spots surfaced |
| Comms | "Turn this conversation into work" | ingest → WorkLedger (durable) | ⚠️ send-cards volatile | ❌ **BUG B** (cards rebuilt from volatile response; data durable) · ✅ **BUG A** send shape fixed |
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
| People & Collaboration | "Who can I work with; who needs setup?" | teammates + `dandelionOrgGrowth` | ❌ **BUG D** — "not connected" copy implies disconnection when only project/workspace is missing (hierarchy connection ignored) |
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

## What this matrix reveals (the mapping bugs)

Only **two surfaces read incoherently with the rest of the system**, and both
are now root-caused: **Comms** (volatile follow-up cards over durable data —
BUG B) and **People & Collaboration** (misleading "disconnected" copy over a
true project-only gap — BUG D). Every other work surface reads the shared
WorkLedger / hierarchy / audit source correctly. The earlier Home↔Action-Center
mismatch was already fixed (Section-25, single-source). No page was found
inventing durable truth from local-only state except the Comms send-cards.

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
