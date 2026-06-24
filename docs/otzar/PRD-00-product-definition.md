# PRD-00 — Otzar Product Definition (index)

Status: living. Audience: any implementer (human or AI session) building Otzar.
Companion law: `docs/product/otzar-ambient-work-os-design-law.md`.
Interface map: `docs/otzar/AMBIENT_INTERFACE_RECONCILIATION_MAP.md`.

## What Otzar is

Otzar is an **ambient enterprise AI Work OS** running on the NIOV **Foundation**
governance substrate. It turns communication / documentation / context into
**governed work movement**. It is NOT a chatbot, dashboard, task app, CRM, debug
console, notification feed, admin panel, or generic browser/computer-use agent.

Otzar's job: understand what work is happening, who can do what, what should happen
next, and move it safely toward its endpoint with minimal human friction — the user
feels the magic, never the machinery.

## Extreme Polarity Ability: Communication → Governed Work Movement

The single thing Otzar must become extraordinarily good at — its domain-general wedge:

**Otzar turns messy human communication into governed, context-aware,
completion-oriented work movement.**

| From (messy input) | To (governed work movement) |
|---|---|
| scattered messages, meetings, transcripts | clear work structure |
| ambiguous "this"/"that"/"what I received" | resolved context |
| unclear ownership / authority | identified owners + authority-checked routing |
| hidden blockers / forgotten follow-ups | identified blockers + tracked follow-ups (owner/due/context) |
| decisions trapped in words | decisions + proposed next actions |
| notifications that don't earn attention | role/person/team-aware visibility, proof without noise |
| people waiting on each other | "who's waiting on whom", completion tracking |

Contrast: consumer AI browsers operate browsers/computers — **Otzar operates work**.
Generic assistants answer questions — **Otzar understands and moves work**. Task apps
store tasks — **Otzar recovers work from communication and carries it forward**. Meeting
tools summarize — **Otzar turns meetings into governed work movement**. Dashboards show
state — **Otzar changes state safely**. Enterprise software makes humans operate software
— **Otzar reduces the software humans must operate**.

**The judging question for every slice:** does this make Otzar better at turning
communication/context into governed work movement? If yes, build it. If it creates more
human work, compress it. If it creates contextless artifacts, block it. If it hides
something needing human judgment, surface it. If it surfaces noise, digest/hide it. If it
uses backend proof, keep it available but out of normal flow. If it routes work, govern
it. If it interprets work, allow correction. If it tracks work, don't fake completion.

**Doctrine acceptance checks (apply across phases):**
1. A transcript becomes digest + proposed actions + tracking, not just a summary. (3A/3B/3C)
2. A correction updates interpretation, not a new disconnected task. (3D)
3. "This/that/what I received" resolves context before action. (2.6/2.9)
4. A blocker becomes a visible blocker state, not a generic note. (3C)
5. A follow-up retains owner/due/context hints. (3B/3C)
6. A send/request routes through governance. (1+2/3B)
7. A low-value proof event stays silent. (2.5/2.7)
8. An approval need interrupts. (2.5)
9. Missing context asks one focused question. (2.6/2.9/3A)
10. The user doesn't need to operate a dashboard to understand what changed. (2.8/3C)

## The differentiator — governed enterprise work (PRD area 6)

Consumer AI agents operate browsers/computers. **Otzar operates governed enterprise
work.** Otzar's wedge is the layer below the click:

- **AI Twins bound to humans** — a Twin is a scoped extension of its human;
  **human authority = Twin authority** (never more access, never bypassing the
  human's RBAC/ABAC/TAR, org membership, team/project scope, memory permissions,
  admin-approved autonomy, approval requirements).
- **Foundation governance** — DMW / Memory Capsules, RBAC/ABAC/TAR, consent, audit,
  proof, policy. Enforced cryptographically, hidden from normal UX.
- **Work Ledger / audit / proof** — durable work objects + tracking, silent by default.
- **Role / team / person-aware routing**, approvals, completion tracking.

Browser/screen/computer control is, at most, ONE sensory/action layer (see
`PRD-04-permissioned-context-and-transcript.md`) — never the product.

## Competitive positioning (PRD area 10)

Track but do not copy: Perplexity **Comet**, ChatGPT **Atlas**, Claude
**computer-use / in-Chrome**, **Kimi WebBridge**, **Warmwind** (cloud AI employees).
They operate browsers/computers and are personal, often noisy, and create privacy
anxiety. Otzar wins by understanding **work, authority, memory, people, teams,
context, and endpoints**, governed and calm. Compete on end-to-end work movement,
governed Twins, org memory, role-aware coordination, calm attention, completion
tracking, context resolution, permissioned screen/meeting/transcript understanding,
admin-configured autonomy, and proof-without-noise — never UI flash.

## The canonical loop

`communication → interpret intent + recipient(incl. self) + context →
resolve people/teams/roles/self + referenced work object →
choose governed rail (message / collaboration / task / note / reminder /
transcript-extract / twin-chat) → RBAC/ABAC/TAR / approvals →
artifact + Work Ledger / audit / proof → decide visibility → calm confirmation →
thread continuity → track to completion`.

One canonical ambient orchestrator, shared across web / desktop / voice / glasses /
earbuds / cloud. Surfaces choose only presentation. No separate shallow per-surface
handlers.

## PRD set

- `PRD-00-product-definition.md` — this doc (areas 1, 6, 10).
- `PRD-01-ambient-presence-ui.md` — presence + UI (area 2).
- `PRD-02-visibility-and-interruption.md` — attention policy (area 3).
- `PRD-03-work-context-and-completion.md` — context resolution + completion (4, 5).
- `PRD-04-permissioned-context-and-transcript.md` — surface context + transcripts (7, 8).
- `PRD-05-feedback-correction-learning.md` — corrections as learning (area 9).
- `PRD-06-implementation-coherence.md` — coherence gate; read before implementing (area 11).

Pre-existing companions (reconciled, not superseded): `docs/product/otzar-ambient-work-os-design-law.md` (product law), `docs/otzar/AMBIENT_INTERFACE_RECONCILIATION_MAP.md` (per-surface cleanup map).

## Phase map (live build)

| Phase | Status | What | Code |
|---|---|---|---|
| 1+2 | shipped | self-routing + Twin-mediated collaboration | `lib/work-os/ambient-outbound.ts`, `AmbientOtzarBar.tsx` |
| 2.5 | shipped | `decideAmbientVisibility` + governed resolver | `lib/work-os/ambient-visibility.ts`, `target-resolution.ts` |
| 2.5+ | shipped | deepened visibility (importance/focus/digest) | `ambient-visibility.ts` |
| 2.6 | shipped | work context resolution (no contextless artifacts) | `lib/work-os/work-context.ts` |
| 2.7 | shipped | calm-interface pass | components |
| 2.8 | in progress | orb compression + presence layer | `AmbientOtzarBar.tsx`, `lib/stores/presence.ts` |
| 2.9 | next | permissioned "use what I'm looking at" seed | `PRD-04` |
| 3 | planned | transcript/meeting intelligence end-to-end | `PRD-04` |

## Acceptance (product-level)

1. A normal employee never sees backend terms / route names / ids / policy codes.
2. Natural language moves work without forms/picklists/page-handoffs.
3. Twins act only within their human's authority.
4. Proof/governance exists but is silent until asked.
5. The experience feels like a calm presence, not an app to operate.
