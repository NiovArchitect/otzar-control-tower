# Otzar Operational Gap Ledger

> Part of the canonical architecture — see
> [`OTZAR_WORK_OS_BUILDING_BLOCKS.md`](./OTZAR_WORK_OS_BUILDING_BLOCKS.md).
> This ledger is the standing answer to "what should we build next and why" —
> next slices are chosen HERE, by customer journey, never by page/button/route.

**Status:** 2026-07-03 (Fable 5). Authored on founder directive immediately
after the learn-loop slice closed. State at authoring: CT `main` `9a31454` ·
FND `main` `8a45de2` · live bundle `index-DFF5a5nz.js`.

**Update discipline:** every slice closeout updates its gap's Status here.
A gap is CLOSED only when the full translation chain below is proven — not
when a screen exists.

---

## The rule this ledger enforces

**The customer experience drives the code.** Every user story must translate
backward into ALL of:

1. canonical source of truth
2. ingestion path
3. transformation/normalization path
4. routing logic
5. durable state
6. governed action
7. audit/proof
8. feedback/memory
9. UI projection
10. tests
11. live smoke

If a feature has UI but no durable truth — not complete. Backend routes but no
customer flow — not complete. Data ingested but not routed to surfaces — not
complete. Agents that reason but cannot act through governance — not complete.
Approvals where sender/approver surfaces disagree — not complete. Memory
written that future ingest never reads — not complete. A card the customer
cannot act on — not complete. Anything requiring the customer to understand
backend concepts — not complete.

Ambient AI is not a pretty UI. It is: right data ingested → right context
extracted → right person/twin/team/tool resolved → right action drafted or
executed → right approval boundary respected → right proof recorded → right
memory updated → right surface shows the right next step — so the customer
never re-explains, re-ingests, or hunts for the work. The felt experience is
"Otzar is quietly moving the work with me," legible to both a power operator
and someone's grandma. The code must prove the story:
**ambient signal → clean data → org truth → agent/twin routing → governed
action → proof → memory → right surface.**

Standing architecture principles this ledger polices:

- **Multi-source ingestion contract** — every future source (Zoom, Slack,
  Docs, Drive, Calendar, Gmail, Notion/Jira/GitHub/CRM, voice, tool events,
  workflow observation) follows the SAME chain: source event → normalized
  event → extraction → identity/project/tool/twin resolution → policy checks →
  durable WorkLedger/Dandelion/Action/Audit/Memory → projection. No source
  creates its own private truth.
- **Org Truth Graph (Otzar's Data 360, but for work meaning)** — people,
  twins, roles/templates, departments, managers, teams, projects, workspaces,
  tools, grants, policies, comms, decisions, commitments, blockers,
  follow-ups, approvals, escalations, audit, memory, corrections, reports,
  work health, external collaborators. Coherent across every surface; no page
  invents its own truth (see [`OTZAR_PAGE_PROJECTION_MATRIX.md`](./OTZAR_PAGE_PROJECTION_MATRIX.md)).
- **Clean transformation layer** — dedupe, stable-ID normalization, raw vs
  trusted separation, noise quarantine, ambiguity confirmation, source
  pointers, company-vs-portable memory separation, and NO stale truth
  (archived/revoked relationships must never count as active — the
  assignment-smoke growth bug was a data-truth bug, not a UI bug).
- **Twin collaboration reality test** — not "are AI teammates listed" but:
  does each twin know its person, role, authority, tools, boundaries; can it
  route to the right human/twin, draft on its person's behalf, request
  approval at boundaries, execute only when authorized, preserve proof, and
  learn from correction? Every twin feature maps identity → role template →
  permissions → tools → WorkLedger → approval → audit → memory.
- **Three levels of the loop** — solo work (capture → extract → confirm → My
  Work), human collaboration (route → review → boundary approval → Team
  Work), agent/twin collaboration (twin drafts/handles → governed tool
  execution → approval where needed → audit), org intelligence (reports/work
  health/lineage/memory/org graph reflect reality).

---

## Gap ledger

Statuses: 🔴 open · 🟡 partially closed · 🟢 closed (kept for the record).

### A. Customer-visible correction provenance — 🔴 open (copy approved, UI parked until built on the right surface)

- **Customer story:** "Why did Otzar pick this person? Did it remember what I
  chose last time? Will it still ask for approval?"
- **Broken/incomplete experience:** the backend now uses prior recipient
  corrections (learn-loop read-path, FND `8a45de2`) but the UI never explains
  it — reduced re-asking feels arbitrary instead of trustworthy.
- **Source of truth:** `recipient_governance.evidence.source` on the
  FOLLOW_UP row (`correction_memory` / `caller_confirmed`) — already
  projected to CT verbatim in the follow-up card payload.
- **Code surfaces:** FND `recipient-governance.ts` (evidence),
  `comms-artifacts.service.ts` (projection); CT Comms follow-up cards +
  any WorkLedger item that renders governance explanation ("Why" area).
- **Trust risk:** medium — silence is safe but wastes earned trust; WRONG copy
  (backend jargon, overclaiming, creepiness) is worse than none.
- **Approved copy (founder-adjusted — binding):**
  - `correction_memory`: **"Matched from a previous team choice."** (alt:
    "Based on who your team chose last time."; contextual with name: "You
    chose Samiksha Sharma for this kind of request before, so Otzar matched
    her again.")
  - `caller_confirmed`: **"Previously confirmed by your team."** (alt: "Your
    team confirmed this recipient before.")
  - Approval still applies: **"Matched from a previous team choice. Approval
    rules still apply."**
  - Cross-team/unauthorized: frame the boundary, never confidence: **"Prior
    context found, but this still needs approval."**
  - NEVER in customer copy: "prior correction from your organization",
    `correction_memory`, `caller_confirmed`, `evidence.source`, `FOLLOW_UP`,
    "ledger", entity/ledger IDs. No loud badge; render inside the "Why" /
    explanation details only. No certainty claims, no bypass implication, no
    broad-memory/surveillance framing. The benefit is reduced repeated
    clarification, not AI magic. If it feels creepy, do not ship it.
- **Recommended slice:** grep the existing "Why"/explanation rendering for
  follow-up cards; reuse it; if no natural surface exists, keep parked.
- **Tests/smoke:** unit — copy renders ONLY for the two correction sources;
  never for transcript/explicit-mention evidence; zero backend terms in
  rendered output; approval/cross-team boundary copy preserved; card stays
  calm. Live — read-only; screenshot only if a correction row exists
  naturally (no forced irreversible fixture — corrections are permanent).

### B. People & Collaboration full setup queue ("and N more") — 🟢 CLOSED 2026-07-03 (FND `2b70145`, CT `30658d9`; live-proven "Showing 5 of 10" + expandable server-backed queue with the real assign rail; smoke `otzar-live-people-full-queue.spec.ts` 2/2)

- **Customer story:** "As an admin, show me the TRUE scale of what my org
  needs — not a sample that quietly hides half the problem."
- **Broken experience:** live smoke proved 10 people lack a first
  project/workspace but the growth card shows only 5
  (`MAX_RECOMMENDATIONS = 5`, backfilling). The admin sees "5 ways" while
  truth is 10 — the surface understates reality, the exact opposite of an
  ambient system's job.
- **Source of truth:** `dandelionOrgGrowth` — uncapped
  `signals.members_without_project_count` vs the capped recommendation list.
- **Code surfaces:** FND `dandelion-growth.service.ts` (cap at 166/421); CT
  `Collaboration.tsx` growth card.
- **Trust risk:** high for admins — a truth surface that silently truncates
  reads as "covered everything" when it didn't.
- **Recommended slice:** honest scale copy + "and N more" affordance backed by
  the uncapped signal, and/or a paged full queue on the existing card (no new
  page). Server already knows the truth; this is projection honesty.
- **Tests/smoke:** unit — capped list + "N more" copy from the uncapped
  signal; integration — >5 unassigned members → signal correct; live —
  read-only screenshot of true-scale copy (org currently has 10 → immediate
  visible proof).

### C. Workspace cleanup/archive rail — 🟢 CLOSED 2026-07-03 (FND `7bc31e7`: APPROVE-gated archive service + route, audited, idempotent; live route probe 404→401; live smoke `otzar-live-assign-workspace.spec.ts` 4/4)

- **Customer story:** "If Otzar helps me place someone in a workspace, my org
  must be able to undo/retire that placement."
- **Broken experience:** projects have create + archive rails (reversible,
  live-proven). Workspaces have create + add-member only — no archive/remove,
  so workspace assignment could only be integration-proven and any live
  workspace write is permanent.
- **Source of truth:** `CollaborationWorkspace.status` /
  `CollaborationMembership.status` (REVOKED exists in the enum; no rail sets
  it via product routes).
- **Code surfaces:** FND `collaboration-workspace.service.ts` +
  `otzar-collaboration-workspace.routes.ts`; CT picker already lists
  workspaces.
- **Trust risk:** medium — irreversibility blocks live proof and real admin
  hygiene.
- **Recommended slice:** `archiveCollaborationWorkspaceForCaller` (+ member
  revoke), mirroring the project archive pattern: owner/authority-gated,
  audited, idempotent; growth already ignores non-ACTIVE workspaces (FND
  `bf9a68e`). Then re-run the assignment smoke with a workspace leg.
- **Tests/smoke:** integration mirror of the project archive-restores-truth
  loop; live — reversible workspace smoke matching the project one.

### D. Durable server-side dismiss for recommendations — 🔴 open (product decision needed)

- **Customer story:** "When I say 'not now' to a suggestion, it should stay
  dismissed — and my org should be able to see that choice was made."
- **Current honest state:** "Hide for now" is session-local by design and
  never masquerades as truth change.
- **Source of truth needed:** a durable, audited dismissal record (org-scoped,
  per-recommendation-key), read by `dandelionOrgGrowth` at recompute.
- **Trust risk:** low today (copy is honest); grows as recommendation volume
  grows.
- **Recommended slice:** only if the product wants it — server-backed dismiss
  with audit + resurface policy; never local hiding dressed as dismissal.
- **Tests/smoke:** dismissal survives refresh/re-login; audited; resurfaces
  per policy; live reversible (un-dismiss or expiry).

### E. Sender-visible rejection reason — 🟢 CLOSED 2026-07-03 (FND `04c6b64`: SafeActionView.not_approved_reason projected from the paired escalation, REJECTED-only; CT `a907e17`: 'From your approver: "…"' on the Blocked tab; live smoke `otzar-live-reject-reason.spec.ts` 2/2 with screenshot)

- **Customer story:** "My send was declined — tell me WHY in my own list, so I
  know what to change, without hunting through an admin surface."
- **Broken experience:** the approver's reason lives on the escalation
  (`resolution_metadata.reason`) and audit; the sender's follow-up/Action list
  shows the rejected state but not the human reason.
- **Source of truth:** escalation `resolution_metadata.reason` + paired
  Action state (already reconciled both-verdicts in the approval-loop slice).
- **Code surfaces:** FND sender-facing list projections (work-os ledger /
  actions views); CT My Work / Comms follow-up + Action Center cards.
- **Trust risk:** high — an unexplained rejection reads as system failure and
  breaks trust in the whole approval loop.
- **Recommended slice:** project the reason into the sender's item view
  (human copy, no escalation IDs), with the same no-raw-codes discipline.
- **Tests/smoke:** reason renders on the sender item after rejection;
  approve leg unaffected; live smoke can reuse the approval-loop pattern
  (queue → reject with reason → sender sees reason).

### F. Review Center badge refinement — 🔴 open

- **Customer story:** "The badge said 3, but my approval queue shows 1 — what
  am I missing?"
- **Broken experience:** badges count all escalation types while the queue
  view is approval-specific — numbers can disagree.
- **Source of truth:** escalation store filtered by type/status.
- **Trust risk:** medium — disagreeing numbers on a governance surface corrode
  confidence fast.
- **Recommended slice:** badge query = exactly the queue's query; test that
  they can never diverge.

### G. Role-template→twin behavior wiring — 🔴 open (audit first)

- **Customer story:** "My AI teammate should act like MY role allows — and my
  admin should see which template governs it."
- **Unknown:** role templates exist conceptually
  ([`OTZAR_TWIN_ROLE_TEMPLATE_MODEL.md`](./OTZAR_TWIN_ROLE_TEMPLATE_MODEL.md))
  but whether/how they attach to twins and change behavior/authority/tool
  access is unverified.
- **Chain that must hold:** identity → role template → permissions → tools →
  WorkLedger → approval → audit → memory.
- **Recommended slice:** grep-first AUDIT (no code): map what exists, what's
  display-only, what's wired; report drift; then pick the smallest wiring
  slice.
- **Trust risk:** high long-term — twin collaboration without role authority
  is the "listed, not real" failure mode.

### H. AI Teammates mapping clarity — 🔴 open

- **Customer story:** "Whose twin is this? What can it do? With which tools?
  Under what boundaries?"
- **Broken experience:** AI Teammates surfaces exist, but
  person↔twin↔template↔tools↔boundaries is not one legible projection.
- **Depends on:** G (template wiring truth) — audit G first, then this
  becomes a projection slice over proven truth.
- **Tests/smoke:** projection agrees with grants/TAR/authority substrate; no
  invented capability claims.

### I. Multi-source ingestion readiness — 🟡 partially closed

- **Customer story:** "Wherever my work happens, Otzar quietly picks it up —
  the same way every time."
- **State:** transcript + generic source-event ingest share one canonical
  chain (`ingestSourceEvent`: quality gate → extraction → governance →
  WorkLedger → memory → audit), with Slack shape mapped
  (`slackMessageToSourceEvent`) and dedupe keys. Zoom OAuth parked; Docs /
  Drive / Calendar / Gmail / Notion / Jira / GitHub / CRM / workflow
  observation not started.
- **Rule:** every new source is an ADAPTER to the same contract — never a
  one-off integration with private truth.
- **Recommended slice (when chosen):** one real connector end-to-end through
  the existing chain, proving the adapter pattern (Slack is closest).
- **Tests/smoke:** same-chain assertions (dedupe, quarantine, governance,
  ledger rows, audit) per source; live smoke per connector with labeled
  fixtures + cleanup.

### J. Data & Knowledge lineage browsing — 🔴 open

- **Customer story:** "Where did this knowledge come from? What's raw vs
  curated vs trusted vs excluded, and what policy governs it?"
- **State:** substrate stores source pointers (captures, evidence quotes,
  provenance details) but the Data & Knowledge surface doesn't yet let a
  customer walk lineage.
- **Trust risk:** high for enterprise buyers — data governance is a purchase
  gate.
- **Tests/smoke:** lineage projection matches stored pointers; no leakage of
  other-tenant/other-person raw content.

### K. Memory / Digital Work Wallet redesign — 🔴 open

- **Customer story:** "I can see what Otzar carries for ME and what belongs to
  my company — without being able to quietly strip my employer's controls."
- **Boundary:** personal value legible; org-controlled authority NOT
  employee-revocable in ways an enterprise would reject; company data never
  silently becomes portable personal memory.
- **Depends on:** the correction/memory taxonomy (FND
  `docs/otzar/OTZAR_CORRECTION_MEMORY_LEARN_LOOP.md`).

### L. Desktop app verification — 🔴 open

- **Customer story:** "Otzar sits quietly on my desktop — orb, tray, native
  notifications, mic — and just works against production."
- **State:** DMG builds; window/orb/tray/mic-permission/native-notification
  behavior against api.otzar.ai unverified (uncommitted WIP exists in CT:
  `AmbientOtzarBar`, `useDesktopVoiceCapture`, `orb-position.ts`).
- **Rule from memory/doctrine:** never claim hands-free/desktop-ready until a
  live HTTPS+key check passes on the real machine.

### M. Native/push/email notification channels — 🔴 open

- **Customer story:** "When something needs me, Otzar reaches me where I am —
  I don't poll a dashboard." (Polling a dashboard is the anti-ambient smell.)
- **State:** in-app notification rows work end-to-end; native/push/email
  channels incomplete.
- **Boundary:** channel delivery must respect the same governance (no content
  leakage to unverified channels; audit the delivery).

### N. Work Health vs Reports depth — 🔴 open

- **Customer story:** employee — "a mirror for me"; manager — "a rollup for my
  org." Never the same lens, never confused.
- **State:** both exist shallowly; deepening must keep the employee-mirror /
  manager-scorecard separation
  ([`OTZAR_REPORTS_VS_WORK_HEALTH_MODEL.md`](./OTZAR_REPORTS_VS_WORK_HEALTH_MODEL.md)).

### O. Scenario Studio / Agent Playground positioning — 🔴 open

- **Customer story:** "Show me what my twins COULD do, safely, and roll the
  learnings up for executives."
- **State:** real pipeline exists; customer positioning + exec rollup unclear
  ([`OTZAR_AGENT_PLAYGROUND_SCENARIO_MODEL.md`](./OTZAR_AGENT_PLAYGROUND_SCENARIO_MODEL.md)).

### P. Workspace/project assignment live parity — 🟢 CLOSED 2026-07-03 (full reversible workspace loop live-proven: create → UI assign from card → membership+audit → recommendation gone → idempotent → archive → targets drop it, assignment refuses TARGET_NOT_ACTIVE, recommendation + baseline restored)

- **State:** project path fully live-proven (create → assign from card → truth
  change → audit → archive → truth restored; CT `019f4e8`, FND `bf9a68e`).
  Workspace path integration-only. Closing C closes P.

### Q. Correction-memory learn-loop expansion — 🟡 read-path v1 closed; expansion future

- **State:** recipient corrections (select + confirm) live in ingest.
  Future correction types — wrong-owner, approval/rejection-outcome learning,
  tool/setup, durable dismissals, workflow observation — each needs its own
  boundary design; NONE may bypass policy, and none may write memory the
  future path doesn't read (the learn-loop law). Taxonomy: FND
  `docs/otzar/OTZAR_CORRECTION_MEMORY_LEARN_LOOP.md`.

### R. Source dedupe + stale-residue discipline — 🟡 ongoing

- **Customer story:** "My org's Otzar reflects my real org — not old demos,
  fake names, or dead relationships."
- **State:** dedupe keys exist for source events; growth now ignores
  archived/revoked relationships; smoke fixtures are label-disciplined and
  archived after runs. Remaining: periodic residue review of the live org
  (fake names, old smoke captures, duplicate work items) and the standing
  capped-list rule — **never count a capped list; use the uncapped signal**
  (`members_without_project_count` precedent).

---

## Next-slice selection method

Before starting ANY slice, answer for each candidate:

1. What customer journey improves?
2. What operational gap closes?
3. What source of truth changes?
4. What surfaces must agree?
5. What proof/audit is needed?
6. What live smoke proves it?
7. What can go wrong?
8. What remains honest?

**Current founder-approved ranking (2026-07-03):**

1. **B — People & Collaboration full setup queue / "and N more"** — the live
   org proves the gap today (10 real vs 5 shown); pure projection honesty on
   an admin truth surface; small, high-trust.
2. **C — workspace archive/remove rail** — closes P (live parity) and gives
   admins real hygiene; pattern already proven by the project rail.
3. **E — sender-visible rejection reason** — completes the approval loop's
   trust story for the sender.
4. **A — customer-visible correction provenance** — approved human copy above;
   render in the existing "Why" area only.
5. **G — role-template→twin behavior wiring audit** — grep-first audit before
   any twin-collaboration expansion.
6. **I — multi-source ingestion operational audit** — same-contract adapter
   readiness before any new connector.
