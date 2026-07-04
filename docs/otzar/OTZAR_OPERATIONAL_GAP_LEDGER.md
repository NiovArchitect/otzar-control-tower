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

### A. Customer-visible correction provenance — 🟢 CLOSED 2026-07-03 (CT: 'Why this person' row in the shared View/Why panel for Comms follow-ups, binding human copy, boundary-honest; renders ONLY for the two correction proof sources; 5 unit tests incl. banned-vocabulary sweep. Live: content probe of the deployed bundle — no natural correction card existed live at closeout, so the pixel screenshot honestly waits for the next organic correction)

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

### F. Review Center badge refinement — 🟢 CLOSED 2026-07-03 (CT-only: the Pending Approvals badge, the Approvals queue, AND the Home Command-Center/KPI numbers now consume the SAME /escalations/pending query (shared queryKey + cache — divergence impossible by construction; previously the badge counted ORG-targeted escalations via /org/analytics while the queue listed the CALLER's own). Review Center badge fallback tightened to count only PENDING_REVIEW rows from the queue's own list. 3 can-never-diverge unit tests + read-only live coherence smoke)

### G. Role-template→twin behavior wiring — 🟡 SLICE 1 SHIPPED 2026-07-03 (FND `dd7c4ab` + CT `e8cc7f5`: Option A ceiling-capped wire live — templates recommend, OrgSettings.twin_autonomy_ceiling caps (default APPROVAL_REQUIRED), provenance stored+audited, evaluator role slot filled with golden-proof zero behavior change, existing twins untouched (live-verified 0/10 provenance rows). Future: skills/tools wiring, TwinAuthorityGrant consumer-or-retire, ceiling admin UI. Incident note: shipped after a P0 auth outage caused by a silently no-op migration job — see the plan doc's deploy-order lesson) (plan: [`OTZAR_ROLE_TEMPLATE_TO_TWIN_AUTHORITY_PLAN.md`](./OTZAR_ROLE_TEMPLATE_TO_TWIN_AUTHORITY_PLAN.md) — recommended Option A ceiling-capped wire + evaluator slot-fill; day-one outcome change ZERO with ceiling default APPROVAL_REQUIRED; 3/13 seed templates carry EXECUTIVE_OVERRIDE defaults, which is why verbatim wiring is rejected; awaiting founder GO on the 4 approval points at the end of the plan) (full findings: [`OTZAR_ROLE_TEMPLATE_WIRING_AUDIT.md`](./OTZAR_ROLE_TEMPLATE_WIRING_AUDIT.md) — template drives the conduct persona only; enforcement runs on autonomy_level; 4 severed wires numbered; smallest wiring slice identified but PARKED for founder decision because it changes authority defaults of new twins)

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

### H. AI Teammates mapping clarity — 🟢 LARGELY CLOSED 2026-07-03 (FND `da52ac0`: list projects the authoritative owner from the same org-scoped edge that defines the twin set; CT `c6b5e5b`: names render "<Owner>'s AI Twin" + Owner column from server truth — raw 'Twin of <uuid>' strings and false 'Unassigned' eliminated, live-verified 10/10 owners. OPS slice SHIPPED 2026-07-03 (FND `2544bd3` + CT `ac4fb72`): honest tool-readiness ('Tool requirements not set yet' — never fake ready until per-role requirements are modeled) + canonical last-active (OtzarConversation = the only twin-attributable source; owner work labeled separately) + employee 'My AI Twin' transparency panel on /app/my-twin (self-scoped endpoints only; exact honest empty state; learn-loop row only with backend evidence). Per-role required-tools SHIPPED 2026-07-03 (FND `73a0099`, PR #536): AgentTemplate.required_tools seeded per role (SLACK+GOOGLE_WORKSPACE default; engineering SLACK+GITHUB; product/ops SLACK+JIRA); readiness is now REAL — ready only when every required provider key matches an enabled org ConnectorBinding (variant-tolerant), never fake ready (test-locked end-to-end: needs_setup→ready→disabled-regression). Live twins honestly not_configured (no templates applied yet). Remaining: employee-side self-scoped readiness projection on /otzar/my-twin (panel currently states the org-level truth), richer twin-executed activity once twins can execute, per-tool setup URLs. The 12B.3 badge literal-token issue is RESOLVED (CT `6f3d8d2`: 'Admin-level authority' — deliberately distinct words from the Behavior Policy label so admin-twin status and autonomy mode never conflate; live smoke bans every raw autonomy token page-wide))

- **Customer story:** "Whose twin is this? What can it do? With which tools?
  Under what boundaries?"
- **Broken experience:** AI Teammates surfaces exist, but
  person↔twin↔template↔tools↔boundaries is not one legible projection.
- **Depends on:** G (template wiring truth) — audit G first, then this
  becomes a projection slice over proven truth.
- **Tests/smoke:** projection agrees with grants/TAR/authority substrate; no
  invented capability claims.

### I. Multi-source ingestion readiness — 🟡 AUDITED 2026-07-03 (full 17-source readiness map: [`OTZAR_MULTI_SOURCE_INGESTION_AUDIT.md`](./OTZAR_MULTI_SOURCE_INGESTION_AUDIT.md)). Verdicts: manual Comms transcript is the reference implementation; Zoom is live but routed as generic TRANSCRIPT (provenance/idempotency loss); Slack read is one wire away (adapter + provider + OAuth rail all exist, no route calls them); Docs/Gmail content reads don't exist; **Notion is catalog-visible with zero substrate (R10 placeholder flag)**; two parallel durable stores violate the single-ledger contract (Observe/OCR tables, conduct MemoryCapsules); **no inbound event route exists anywhere — every connector is outbound-only, so nothing can arrive ambiently (the structural gap)**. Canonical adapter contract now written (18 fields; an adapter is ~50 lines that builds a WorkSourceEvent and calls ingestSourceEvent). Build order: (1) Zoom→CONNECTOR provenance ✅ SHIPPED 2026-07-03 (FND `51d8700`: sourceSystem ZOOM via the spine, org-scoped dedupe ZOOM:<meeting_id>, idempotent 409 on re-ingest, row lineage, no tokenized URLs; live honesty probes 401/403/NOT_CONFIGURED green), (2) Slack read→canonical ingest ✅ SHIPPED 2026-07-03 `[SLACK-INGEST-1]` (FND PR #539: admin-triggered public-channel message ingest via org sealed OAuth envelope → canonical adapter → spine; doctrine dedupe `org + SLACK:<team>:<channel>:[<thread_ts>:]<ts>`; DMs/private parked by policy; Events-API webhook honestly deferred — gap N still open), (3) NEXT: D&K per-row lineage, voice ingest hop, observe/OCR convergence, Notion catalog honesty.

### J. Per-row source lineage — 🟡 SLICE 1 SHIPPED 2026-07-03 `[GAP-J]`

- **Customer story:** "When Otzar shows me work, I want to know where it came
  from — Slack, Zoom, a transcript — without seeing raw backend IDs or secret
  URLs. If I understand the work, don't distract me; if I'm confused, answer
  'why is this here?' when I ask."
- **Shipped (FND PR #540 + CT):** ONE safe extractor
  (`sourceLineageFromDetails` in `work-ledger.service.ts`, wired into
  `projectLedger` — the single row→view mapper) projects
  `source_lineage {source_system, source_id_present, has_source_excerpt,
  source_actor, source_timestamp}`; raw `source_id`/`dedupe_key`/`source_url`/
  `connector_identity` deliberately never cross. ONE CT label map
  (`labels/source-lineage.ts`) turns it into calm copy; the card face gets at
  most one muted fragment ("From Slack"), the shared Why panel answers
  "Came from / Shared by / Received" (honest "Source not recorded yet").
- **Coherence:** no new Why component (rows injected into the existing
  `ViewWhyModel`, the Gap A idiom); no new proof store; the writer
  (`sourceEvidenceDetails`) untouched — one builder, one writer, one reader.
  `org-query.sourceSystemOf` keeps retrieval semantics (documented overlap).

#### Lineage is not clutter — lineage powers clarity (doctrine, 2026-07-03)

- **Quiet by default.** Main work cards carry at most ONE calm source label,
  and only when the system is known. Unknown ≠ a badge — unknown is silence
  on the card and an honest "Source not recorded yet" in Why. No proof
  badges everywhere; no source-metadata dashboard for employees; audit
  burden never lands on the person doing the work.
- **Three visibility levels, never collapsed into one UI:** employee = quiet
  task context ("From Slack", "Asked by Samiksha"); manager = exceptions and
  unresolved clarity/approval items, patterns not raw events; admin/security
  = full proof trail (source system/event/timestamps, actors, policy
  decisions, audit chain) on Security & Audit surfaces only.
- **Ask-for-clarity path.** Otzar answers "why is this here / where did this
  come from / who knows?" from truth (lineage, WorkLedger, people graph,
  approvals, prior corrections) — never vibes. If it cannot answer
  confidently it escalates for clarity instead of hallucinating.
- **Lateral escalation doctrine — manager is not always the answer.** The
  best clarifier is usually the source author, the commitment owner, the
  project lead, the approver, or the teammate named in the conversation;
  hierarchy is the right route only when authority itself is the question.
  Routing must be driven by ingestion + org truth, not a manager-only rule.
  Fewer repeated questions, fewer "who owns this?" moments — Otzar
  harmonizes collaboration, it does not add homework.
- **NEXT SLICE — lineage-aware clarity escalation: DESIGN COMPLETE
  2026-07-03** ([`OTZAR_LINEAGE_AWARE_CLARITY_ESCALATION_MODEL.md`](./OTZAR_LINEAGE_AWARE_CLARITY_ESCALATION_MODEL.md)):
  audit-first, no code. Spine = existing `EscalationRequest` (arbitrary
  lateral target + dormant `HUMAN_REVIEW_REQUIRED` AI-uncertainty type);
  deterministic clarifier ranking from org truth (source author → owner →
  requester → project OWNER → approver → named participant; manager ONLY
  on authority questions); build slices CE-1..CE-4. **CE-1 SHIPPED
  2026-07-03** (FND `a26631a` PR #541 + CT `07aa989`, live-verified):
  read-only `GET /work-os/ledger/:id/clarity` + calm "Who can clarify"
  inside View/Why — suggestions only, honest empty state, zero mutation
  (live proof: Review Center pending count unchanged; 6/25 probed live
  rows yield real candidates, e.g. "Ask David Odie — they own this
  work."). **CE-1.5 + CE-2 SHIPPED 2026-07-03** (FND `3f0f333` PR #542 +
  CT `0b01744`, live round-trip verified): target/recipient ranks 4th
  (durable row data, plain recipient copy, deduped under stronger
  roles); governed clarification request = the first production writer
  of the dormant `HUMAN_REVIEW_REQUIRED` type — lateral target must be
  a current candidate, duplicate-safe, 7-day expiry, audited at create,
  DIRECT_MESSAGE pointer, linkage survives resolution (metadata MERGE),
  asker sees requested→clarified/declined on the item's Why, Review
  Center labels it "Clarification request" (clarification ≠ approval).
  Live proof: clarifier pending 2→3→2 (exactly ±1, canonical reject
  cleanup, zero residue). **CE-3 SHIPPED 2026-07-03** (FND `a68537e`
  PR #543 + CT `2b6abc6`, live-verified read-only): deterministic
  clarity ANSWER over Work OS truth — `GET :id/clarity-answer` (six
  intents, zero LLM, structured payload, honest unknowns) + a quiet
  "Ask about this work" row inside the opened Why. Surfaces the
  clarifier's stored ANSWER text ('Eve clarified: "…"') — the CE-2
  remaining-honest item is closed. Live answers: "This came from a
  Comms transcript." / "Samiksha Sharma can clarify — they are the
  recipient of this follow-up." + suggested governed action; pending
  0→0. **CE-AMBIENT SHIPPED 2026-07-03** (FND `c9d7485` PR #545 + CT
  `ad0e98b`, live-verified read-only): ledger-aware surface context —
  opening an item's View/Why provides a `work_item` context
  (ledgerEntryId; cleared on close), and the ambient bar's
  deterministic clarity intercept answers deictic questions ("why is
  this here / where did this come from / who owns this") via the
  EXISTING clarity-answer route through the calm outcome line +
  speech. Contextual phrases ("what should I do next?") are
  item-clarity only when an item is selected — bare, they keep their
  Twin route (locked, 111/111 bar suite). No selection → honest
  "Open or select a work item first…". Live: both turns proven; the
  bar's context chip shows "Using current context · Work item";
  pending 0→0. Remaining honest: conductSession/COE grounding and
  hardware/desktop wake-word capture are future (voice INPUT through
  the composer already hits this intercept). **CE-4 SHIPPED 2026-07-03**
  (FND `e085894` PR #544 + CT `fcc4645`, live-verified): (A) READ-ONLY
  clarity learn signal — candidates who resolved clarifications on
  similar work (same project, else same source system+author) gain
  prior_clarifications + "They clarified similar work here before.";
  NOTHING written to MemoryCapsule/TwinCorrectionMemory
  (count-invariance locked — company clarification truth never enters
  portable personal memory), no approval suppression; the WRITE-loop
  is **CE-4.5, future** (needs the doctrine's Category-C derivation
  rail). (B) Manager exception visibility — GET
  /work-os/team-clarity-health on the Team Work gate + ONE calm box
  (silence when clear): live "8 items need ownership clarity" +
  "Slack-sourced work has repeated clarifications (2)"; employee 403
  blocker; counts + labels only, leak-swept. The ambient clarity loop
  (CE-1→4) is complete at slice depth.
- **Remaining honest:** approval/assignment-origin rows don't record lineage
  yet (writers must record it first — lineage is never invented); D&K page
  lists connector sources, not knowledge rows, so full lineage *browsing*
  (raw vs curated vs trusted, governing policy) stays open; comms follow-up
  cards + Ask-Otzar already carry source context via their own adapters.

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

### S. Portable AI Twin / Digital Work Wallet boundary — 🔴 open (doctrine + audit COMPLETE 2026-07-03)

- **Governing doc:** [`OTZAR_ORG_READY_AND_PORTABLE_TWIN_DOCTRINE.md`](./OTZAR_ORG_READY_AND_PORTABLE_TWIN_DOCTRINE.md)
  — "the employee can take the SHAPE of how they work; they cannot take
  the company's WORK."
- **Employee story:** "Leaving Company A, I take my AI Twin's learned
  skills and working style — I understand I cannot take Company A's
  confidential data, source records, internal messages, customer data, or
  audit history."
- **Org story:** "When an employee leaves, company data stays protected;
  when one joins, another company's private data never enters my
  environment; the new twin is capped by MY policy and MY bindings."
- **Trust risk:** existential both ways — an employer that suspects
  leakage never adopts; an employee whose wallet is hollow never invests.
- **Data-ownership risk:** MemoryCapsule has NO on-row scope field
  (personal-vs-org is implicit in the wallet join, reconstructed
  per-capsule-type at write time — FND schema:97-222); OtzarConversation
  lacks org_entity_id; "your data" copy flips referent between employee
  (MyMemory) and company (DataSovereigntyInline) surfaces.
- **Current substrate (live and correct):** three-wallet model
  (PERSONAL/ENTERPRISE/DEVICE, schema:446); write-time portability
  routing invariant (DECISION→org wallet; COMMITMENT/WORK_PATTERN/
  CORRECTION/CONVERSATION_LEARNING→employee wallet,
  observation.service.ts:229); TwinCorrectionMemory's explicit
  PERSONAL→ORG scope ladder with safe summaries + pointers-only;
  per-org sealed connector envelopes; revocable grants + receipts;
  honest `memory_portability_supported: false`
  (proof-of-access.service.ts:114); the full boundary VOCABULARY built
  but dead ("stays with company / travels with employee" —
  WalletProvenanceBadge renders in exactly one hardcoded place).
- **Missing boundaries:** no persisted ownership_class on capsules; no
  human offboarding flow (Users "Suspend" leaves the twin minted and is
  silent on wallet disposition); no Category-C derivation rail (mixed
  memory → stripped portable method); no export/import (correctly — none
  claimed); Chat correction UI silent on where learning lands; capsule
  label map ungrouped (personal/org split invisible despite backend
  routing truth, voice-note-provenance.ts:10).
- **S-1 boundary labeling — ✅ SHIPPED 2026-07-03 (CT `098976c`,
  live-verified both roles):** the 20-entry capsule map now carries a
  boundary class certified against the write-time routing truth
  (personal/company/device/mixed — COMMITMENT and CONVERSATION_LEARNING
  honestly "mixed: personal only after company details are stripped");
  WalletProvenanceBadge de-overclaimed ("yours, not the company's" +
  "export is not yet available") and mounted on My Memory (personal) +
  Data & Knowledge (enterprise); Access Control matrix columns carry
  muted ownership sub-labels; DataSovereigntyInline names the owner
  ("company-owned work data, governed by your organization" — pronoun
  flip fixed on Users/AI Teammates/Access Control); Chat + Corrections
  state where learning lands ("Saved as personal learning in your
  Digital Work Wallet"). NO export button, NO portability claim, NO
  data movement, NO FND change. Live smoke read-only:
  `screenshots/wallet-boundary-employee.png` +
  `wallet-boundary-admin-data.png`.
  **Alternative (S-2, second):** backend ownership-class classifier —
  safe derived categories over existing rows (wallet join + capsule_type
  + scope_type), read-only projection, no data movement, no schema
  change required for v1.
- **Tests/smoke needed:** label map matches the write-time routing truth
  (unit, both repos); badge renders the correct variant per wallet type;
  no surface claims exportability; admin sees counts-only of personal
  wallets (existing invariant locked); future portability = the ten
  proofs in doctrine §20.

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
