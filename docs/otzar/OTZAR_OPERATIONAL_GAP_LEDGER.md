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

### T. External relationship / third-party work intelligence — 🔴 open (doctrine + audit COMPLETE 2026-07-03)

- **Governing doc:** [`OTZAR_EXTERNAL_RELATIONSHIP_WORK_INTELLIGENCE_MODEL.md`](./OTZAR_EXTERNAL_RELATIONSHIP_WORK_INTELLIGENCE_MODEL.md)
  — the external side of the Work OS: external communication → internal
  understanding → routed work → proof-backed follow-up. NOT a CRM clone.
- **Company story:** "External communication with clients, prospects,
  vendors, and partners becomes organized, governed work — without losing
  accuracy, proof, or client context."
- **Client story:** "The company feels more accurate, responsive, and
  aligned — not like it's using another internal tool."
- **Headline audit finding:** TWO unlinked external-party systems —
  `ExternalEntity` (ingestion-observed mention index) and
  `ExternalCollaborator` (governed, manual, workspace-gated, with the
  full 11-value `ExternalRelationshipType`, bidirectional
  `ExternalCommitment` + internal-owner routing + access lifecycle) —
  with NO bridge; the ingestion→ExternalCommitment auto-record is dead
  code (`recordExternalCommitmentForCaller` has no callers); no
  external-org/account model (free-string company names); identity
  reconciliation cannot NAME an external (indistinguishable from unknown
  internal); zero external context on work rows ("Waiting on {name}
  ({company})" exists only inside workspace detail);
  `internal_owner_entity_id` never renders. External send is safe BY
  CONSTRUCTION (no executable external ActionType + REQUIRES_APPROVAL
  policy vocabulary + connector EXTERNAL_SEND/CUSTOMER_SENSITIVE rails).
- **Trust risks:** dropped client promises invisible until the client
  notices (highest-cost failure for services businesses); cross-client
  mixing (no sub-org partition — workspace-per-account is a convention,
  not a boundary); external data is the MOST company-owned data — the
  portable-twin boundary applies verbatim (client names/excerpts/contact
  graph never portable).
- **Build order (each needs GO):** T-1 ✅ **SHIPPED 2026-07-03**
  (FND `fd10ebe` PR #546 + CT `854f682`, live-verified): read-only
  `external_context` on ledger views from three deterministic org-scoped
  links (validated details read-through = T-2's write target;
  conversation-matched governed ExternalCommitment → "Waiting on Acme"
  with direction; roster-first unique governed-name match from Gap J
  lineage → "For Globex") — one calm card fragment + Why rows, silence
  when unprovable, no emails/excerpts/ids projected (leak-swept), no
  personal-memory writes (count-invariance). Live honest: 200 rows /
  0 with context (no governed externals exist live yet — silence IS the
  proof; happy path integration-locked). T-2 ✅ **SHIPPED 2026-07-03**
  (FND `8ee0144` PR #547 + CT `a6e866a`, live-verified read-only):
  governed promotion, not automatic CRM — new `review_external_party`
  Dandelion seed on a DETERMINISTIC trigger (unresolved source actor ∩
  the org's opt-in ExternalEntity mention index; one open seed per
  subject; a mention never auto-promotes); admin approval creates the
  org-scoped governed ExternalCollaborator (idempotent per org+name,
  TRACKED_EXTERNAL, access NOT granted, audited); the DEAD
  `recordExternalCommitmentForCaller` wire revived at its designed
  caller (workspace comms-import, EXTERNAL_ALLOWED + workspace-linked
  governed collaborator, unique-name only, source_conversation_id
  preserved) — T-1 lights up both ways (test-locked: "For Morgan Reeve"
  via lineage; "Waiting on Acme" via conversation link). CT: the seed
  renders as "External collaborator review" in the existing queue. Live
  honest: 97 seeds / 0 external-review (no observed index live yet).
  Remaining honest for T-2.5: reconciliation still cannot NAME the
  external state outside these links. T-3 ✅ **SHIPPED 2026-07-03**
  (FND `a438f56` PR #548; zero CT changes — projection shape
  unchanged): the governed external identity key. ExternalOrganization
  (org-scoped: same "Acme" in two customer orgs = two rows FOREVER via
  @@unique(org, normalized_name)) + ExternalOrganizationIdentifier
  (typed evidence with confidence + verified-by provenance; personal
  email domains NEVER identify an org) + nullable
  ExternalCollaborator.external_org_id (company_name stays the display
  fallback). Live migration applied + verified via the hardened job
  rail BEFORE merge (fail-capable canary → idempotent DDL →
  independent print+exit-nonzero verification: column present, tables
  exist, 0 rows touched). Matching policy: governed/manual paths only,
  exact normalized reuse, ambiguity → null, never a merge; creation
  audited. Wired: manual track (+corporate-domain evidence), Dandelion
  promotion (company_label), T-1 prefers the organization label.
  "Identity is layered" doctrine added to the external model doc
  (person / membership / twin / collaborator / organization / future
  pairwise refs — schema future-safe, nothing built beyond doctrine).
  T-3B ✅ **SHIPPED 2026-07-03** (FND `28ec60d` PR #550; migration
  applied + verified via the hardened rail pre-merge; zero CT changes):
  ExternalCollaboratorIdentifier (typed evidence: EMAIL/SLACK_USER/
  ZOOM_PARTICIPANT/CALENDAR_ATTENDEE/MANUAL_ALIAS/PHONE/OTHER,
  confidence + verified-by provenance) + ONE governed matcher used by
  both manual track and Dandelion promotion: EMAIL evidence reuses even
  across differing names; legacy email column backfills; VERIFIED
  aliases reuse (unverified never); unique consistent-account name
  matches reuse; same name + DIFFERENT account = a different person
  (never merges); ambiguity refuses to decide; revoked/deleted never
  match; cross-org never matches. The J1-ledgered duplicate
  (seed-promote + track = two records) is FIXED — one record, account
  backfilled, reuse audited ({reused, matched_by}), second workspace =
  membership only. Live read-only battery green post-deploy.
  T-3C ✅ **SHIPPED 2026-07-03** (FND `d0b2c7c` PR #551 + CT `8f22457`;
  no schema change): the admin experience layer over T-3B's safe
  refusal — when identity is ambiguous, Otzar helps the admin decide,
  never silently. `listPossibleCollaboratorMatches` projects up to 3
  SAFE candidates on open review_external_party seeds (labels + machine
  id only — reasons closed-vocab "Verified alias"/"Same company"/
  "Similar name in this account"; org-scoped, active-only, no emails/
  domains/identifier values/backend enums on the wire). approveSeed
  gained decision: link_existing (validates org-scoped + active,
  records the observed name as an ADMIN-VERIFIED alias when it differs,
  audits {decision, from_seed_id, alias_added}) | track_new (forces a
  distinct record); dismiss = existing reject (nothing created).
  Chooser UI on Organization Seeding: "Possible existing collaborator —
  review before linking. Otzar will not merge this automatically."
  FND integration 3/3 (safe projection + leak sweep; link_existing
  reuse + alias + audit + T-1 light-up + wallet invariance; track_new /
  dismiss / cross-org+missing refused). CT chooser tests + full gates
  green. Live read-only battery 6/6 post-deploy (wire-shape sweep,
  no CRM/auto-merge copy, reads mutate nothing).
  T-4 ✅ **SHIPPED 2026-07-03** (FND `f5a38f8` PR #552 + CT `34df2b9`;
  no schema change, no new endpoint): manager external-relationship
  exceptions on the SAME CE-4B clarity-health summary — an optional
  `external_relationships` block (omitted when all-zero) computed from
  governed records only (open ExternalCommitments with active
  collaborators + open review_external_party seeds). Two distinct gap
  signals per founder direction: external_review_pending_count
  (identity/governance gap) vs external_ownership_unclear_count
  (execution/accountability gap). Counts: waiting-on-external,
  we-owe-external, overdue, review-pending, ownership-unclear, repeated
  ambiguity; topics prefer the governed ExternalOrganization label
  (company_name fallback, else the T-3C closed relationship vocab —
  RELATIONSHIP_LABELS now exported). Top exception priority: overdue >
  unowned > waiting-on > we-owe > review-pending > repeated ambiguity.
  Same manager gate as Team Work; org-keyed; best-effort (failure =
  silence). CT renders ONE calm section inside the existing clarity box
  (renders only when non-zero; external alone can open the box; no new
  page/badges/CRM words). FND integration 9/9 (direction counts,
  governed-label preference + priority, deleted/completed/cross-org
  exclusion, non-manager gate, leak sweep, wallet count-invariance,
  all-zero silence, seed-driven counts, clarity half unchanged); CT
  suite 2162 green. Live read-only battery 6/6: live has no governed
  external commitments → block honestly ABSENT, section not rendered,
  clarity box untouched, reads mutate nothing.
  T-2.5 ✅ **SHIPPED 2026-07-04** (FND `ef79149` PR #553; no schema
  change, no new endpoint, ZERO CT changes): identity reconciliation
  can now NAME the external state — `classifyExternalActor` /
  `ExternalResolution` (external-collaborator-identity.service.ts):
  internal_member | governed_external | observed_external_needs_review
  | possible_external_match | unknown. Read-only (T-3B evidence order
  with NO identifier backfill), org-scoped, roster always wins,
  internal ambiguity stays internal (external tables never consulted),
  cross-org/deleted invisible, labels only. comms-ingest T-2A rewired
  through it with ONE approved behavior change: a GOVERNED external
  actor no longer regenerates a review seed — their conversations'
  work rows carry safe details.external_context at WRITE time (T-1
  lights up with source "external_collaborator"; read-time lineage
  fallback still locked for pre-T-2.5 rows). Observed keeps the exact
  seed rail (idempotent via review_seed_id); possible/unknown stay
  silent — no seed, no card certainty. NOT an identity merge system —
  a naming layer that kills redundant admin re-review. Tests: new
  external-resolution suite 6/6 (12 locked behaviors incl. leak sweep
  + wallet invariance); T-1/T-2 suites updated to the new doctrine;
  external+seed batch 46 green, ingest-chain batch 40 green; CI 5/5.
  Live read-only battery 7/7 post-deploy (honest silence — no governed
  externals live; reads mint no seeds, mutate nothing). Remaining:
  pairwise limited-disclosure refs (future); Account Pulse explicitly
  NOT built (T-4 is exception visibility, not a CRM dashboard); CT
  surfacing of the named states only if a future slice needs it (T-1
  context + chooser + Team Work already render the safe projections).
- **Tests/smoke needed:** org-scoping + no-global-merge, no cross-client
  leak, lineage safety, client-data-never-in-wallets (CE-4A
  count-invariance pattern), owner routing, exceptions-only manager view,
  no-CRM-claims copy sweep.

---

### T2. Pilot ops rail (P0-OPS) — 🟡 LARGELY CLOSED 2026-07-04

- **State:** `OTZAR_PILOT_OPS_RUNBOOK.md` is the BINDING ops doc: manual
  verified deploy rail (autoDeploy OFF on both services — verified via
  API), migration-before-code (hardened canary→DDL→verify, the P2022
  lesson), smoke tenancy + residue policy + sweep procedure, smoke gates
  (`test:e2e:live:pilot-gate` — 11/11 green at authoring, cleans after
  itself), rollback pointer + CT addendum, key-rotation plan.
- **G1 DUAL-CONTROL REPAIR — CLOSED 2026-07-06 (FND):** the Phase-0
  pre-flight found org-creation dual-control approvals were STANDING
  (no expiry, no consume, matched by operation type — a spent approval
  could re-create orgs with any payload). Repaired before Phase-0 ran:
  `PLATFORM_ORG_CREATION` approvals are now payload-bound (canonical
  sha256 of the body, `admin_password` redacted from hash + metadata +
  audit; body itself never stored per no-leak guard) and single-use
  (consumed atomically inside executePhase0's transaction, APPROVED →
  EXPIRED + `DUAL_CONTROL_APPROVAL_CONSUMED` audit; concurrent replay
  409s). Other dual-control operations keep standing semantics by
  design; extending payload binding is per-operation (monetization
  config is the next candidate). Canonical record Amendment 2 + runbook
  §3.1 updated.
- **PHASE-0 EXECUTED 2026-07-06:** two dedicated platform operators
  bootstrapped (scripts/bootstrap-niov-operator.ts, founder-authorized;
  census 0→2) and `NIOV Smoke Org` created under the G1 payload-bound
  single-use dual control (escalation c5981a96…: 403 → second-approver
  approve → 201 → approval consumed in-tx; self-approval blocked live).
  Org `ad9515e2…`, admin smoke-admin@niovlabs.com, baseline all green
  (approval ON / audit ON / APPROVAL_REQUIRED / default hive / twin).
  The 2 stale smoke escalations (8fad318b…, ce8fca11…) REJECTED by
  their designated target; pending queue 0. Demo org untouched.
- **PASSWORDS ROTATED 2026-07-07:** operator-1, operator-2 and
  smoke-admin rotated through the shipped `POST /auth/change-password`
  lifecycle rail after an in-session exposure of the bootstrap secrets
  file (old passwords verified dead 401, new logins verified with
  `admin_niov` / `admin_org` grants, secure file rewritten chmod 600,
  zero secret leakage in tracked files or git history of either repo).
- **ROLLBACK REHEARSED 2026-07-07 (runbook §6):** FND rolled back
  `b564da8` → `b26b397` via the Render API rail (`commitId`), all
  gates green on the rollback SHA (health/db, smoke-admin login,
  escalations 0, verify-chain true, ledger reads, CT loads), rolled
  forward to `b564da8`, gates green again + the Redwood 2-persona
  probe passed (162.8s) proving the restored SHA's supersession
  semantics live. Code-only window (zero migrations), smoke org only,
  demo org untouched. FND rollback-runbook §6 history row appended.
- **SMOKE-TENANCY MIGRATION COMPLETE 2026-07-07 (runbook §3 BINDING):**
  the demo org is READ-ONLY smoke territory; mutating live specs run on
  the NIOV Smoke Org via `tests/e2e/live-tenancy.ts` (smoke-admin creds
  + structural org-id guard before any write + per-run dynamic-member
  rail). Migrated & proven live: onboard-activation, learn-loop,
  assign-active-target, assign-workspace (10/10 assign scenarios,
  full UI loop), alongside the smoke-native redwood pair. Demo-locked
  pending the cast port: approval-loop, arc-coherence, bugb, bugc,
  clarification-roundtrip (whole-file), bugd S5, reject-reason R2
  (scenario) — verified skipping even with a password set.
  collaboration-matrix/employee-flow writes arm only for smoke-org
  accounts. New batteries: `test:e2e:live:mutating` (smoke, workers=1),
  `test:e2e:live:demo-readonly`. FND fix shipped en route (PR #586,
  `9f97ae2`, live): growth roster excludes SUSPENDED/soft-deleted
  members — suspended smoke identities no longer flood growth recs
  (tenant-general copy fix).
- **CAST PORT COMPLETE 2026-07-07 (P1 closed):** all seven demo-locked
  governed-action arcs regained live coverage on the smoke org via the
  governance cast (hybrid: durable smoke-admin approver + per-run
  actor/colleague + optional manager edge through the canonical
  hierarchy rail). approval-loop's full approve→deliver→SUCCEEDED loop,
  reject-with-reason, recipient review, follow-up durability,
  clarification round-trip, and the manager-edge dual-control
  regression all green on the smoke org; residue swept to zero.
  Bonus finding recorded: the Action⇄Escalation reconciliation gap
  pinned in arc-coherence C2 has SHIPPED — the caller's Action now
  reflects the approver's verdict (assertion flipped to REJECTED).
- **Remaining (founder actions):** rotate sadeil@ password; rotate
  RENDER_API_KEY per §7. Engineering P1: governed can_admin_niov grant
  route (operator #2 used the founder rail); codify the migration job
  rail as a script; twin-deactivation rail.

### U. Organization Setup Journey / Admin Setup OS — 🟡 SLICE 1 SHIPPED 2026-07-04 (read-only Organization Setup page at /setup: seven-section guided journey composing 7 existing GET projections, deterministic next-best-step ladder, least-access spine, honest limitations for bulk import/retention/ambient ingestion; failure-story smoke matrix in OTZAR_ORGANIZATION_SETUP_SMOKE_MATRIX.md; zero write paths, zero schema, zero backend changes. SLICE 2 SHIPPED 2026-07-04: CSV people import at /setup/import-people — preview-first, confirmation-gated, least-access by construction (forbidden columns hard-refused), rails-only (bulk create → per-person invite+one-time link → hierarchy assign), cap 20/batch. SLICE 3 SHIPPED 2026-07-05: /setup/data-flow per-source trust panel (pull/push/landing/ownership/visibility/retention per source; connected ≠ ingesting explicit; wallet doctrine on-page; read-only, matrix stories 7+11 covered). SLICE 4 SHIPPED 2026-07-05: /setup/go-live readiness gate (deterministic verdict, founder actions apart, warnings never fake-block, self-serve limitation always rendered; shared computeSetupFacts — no duplicated readiness logic). SLICE 5 SHIPPED 2026-07-05: setup coach on /setup — DERIVED typed recommendations (persisted seeds deliberately rejected: approval lifecycle is the wrong shape for repair items; noise rules free by construction) + coherence sweep (first-workflow path → real Comms route; overclaim grep clean; matrix 14/14). Setup arc COHERENT — ready for the Org Context Seeding + Employee Twin Calibration doctrine. Remaining maturity: HRIS/org-chart import, per-account external views, printable gate handoff)

- **Customer story:** "As a new organization adopting Otzar, I want a guided
  AI-assisted setup process that helps me map my people, roles, tools, data
  sources, policies, AI Twins, and first workflows so my team can start
  using Otzar quickly and safely."
- **Purpose:** make onboarding feel like a guided AI-native setup
  experience, not a scattered admin console ("12 pages, good luck").
- **State:** full doctrine + code-grounded audit in
  [`OTZAR_ORGANIZATION_SETUP_JOURNEY_MODEL.md`](./OTZAR_ORGANIZATION_SETUP_JOURNEY_MODEL.md)
  — the 8-phase journey (bootstrap → people → roles/twins → work structure
  → tools/data → policy → first workflows → go-live check), the Dandelion
  three-way split (setup coach / growth-ops / recommendation queue), the
  org-vs-user connector doctrine (only org-level exists), the MCP
  governed-capability chain, the pilot LLM policy (NIOV-managed
  Anthropic-primary, no org choice), and the data-flow setup doctrine.
  Key audit facts: NO bulk/CSV import (bulk route is API-only), NO
  retention model anywhere, NO go-live checklist, NO twin repair rail, NO
  setup sequence; activation loop ✅ (P0-ONBOARD), tool readiness honest,
  OrgSettings substrate live but partially surfaced.
- **Build order (after P0-OPS + Phase-0 runbook):** (1) read-only Org Setup
  checklist page composing EXISTING projections (zero new writes, no fake
  buttons), (2) CSV people import through the existing bulk + hierarchy +
  activation rails, (3) setup-coach Dandelion seeds, (4) retention model +
  policy UI, (5) twin repair rail.
- **Hard boundaries:** no fake wizard, no fake readiness, no "connected"
  copy beyond real connectors, no setup step that completes without the
  underlying truth changing; the do-not-overclaim setup list in the model
  doc is binding.

### V. Org Context Seeding + Employee Twin Calibration — 🔴 open (doctrine + audit COMPLETE 2026-07-05)

- **Customer story:** "Now that we're set up, Otzar should know our
  projects, history, clients, and how each of us works — safely."
- **State:** doctrine + code-grounded audit in
  [`OTZAR_ORG_CONTEXT_SEEDING_AND_TWIN_CALIBRATION_MODEL.md`](./OTZAR_ORG_CONTEXT_SEEDING_AND_TWIN_CALIBRATION_MODEL.md).
  The three-lane split is binding: (1) Org Context Seeding —
  company-owned, through the ONE spine with a seeded-source label and
  actionability suppression (the stale-transcript rule: seeded history
  creates context, NEVER to-dos/notifications); (2) Employee Twin
  Calibration — personal wallet, propose-then-approve only (the Welcome
  pattern), self-scoped; (3) Live Work Ingestion — the existing spine,
  unchanged. Audit: spine/wallet/review/calibration substrates all LIVE;
  what's missing is the seeding MODE (lineage label + suppression), the
  admin seeding surface, and calibration expansion.
- **Build order:** CS-1 ✅ SHIPPED 2026-07-05 (FND `2fd8daa`: seeded-context mode, stale-transcript rule enforced, 4/4 integration) → CS-2 ✅ SHIPPED 2026-07-05 (FND `3e25705`: admin-gated route exposure; CT `/setup/seed-history` confirmation-gated flow) → CS-3 ✅ SHIPPED 2026-07-05 (FND PR #559: preference-only proposer on the consent gate; CT /app/my-twin/calibration boundary-first form) → CS-4 ✅ SHIPPED 2026-07-05 (raw sample never leaves the browser; mechanical mirror + own-words guidance through the CS-3 consent rail; server-side risky-content refusal) → CS-5 ✅ SHIPPED 2026-07-05 (adapter contract + /setup/seed-corpus; extraction off; no work-view pollution). Prerequisite
  P1 ✅ SHIPPED 2026-07-05: real sha256 content_hash on new learning
  capsules (legacy rows keep placeholders, never reported tampered).
- **Hard boundaries:** one spine, stale ≠ actionable, wallet law
  untouchable (count-invariance mandatory), external trust never seeded,
  deterministic identity only, everything reviewable + reversible, no
  fake intelligence claims.

### W. Context Relevance Intelligence + AIX — 🔴 open (doctrine + audit COMPLETE 2026-07-05)

- **Non-negotiable:** admins govern boundaries; OTZAR manages relevance;
  employees and workflows validate nuance — no context-librarian UI, no
  manual relevance tagging, ever.
- **State:** doctrine + code-grounded audit in
  [`OTZAR_CONTEXT_RELEVANCE_INTELLIGENCE_AND_AIX_MODEL.md`](./OTZAR_CONTEXT_RELEVANCE_INTELLIGENCE_AND_AIX_MODEL.md)
  — AIX defined (the AI's designed experience of the organization), the
  six relevance states (background → candidate → confirmed → current →
  stale → contradicted), the live-work-wins ranking law, in-context
  validation doctrine. **Audit verdict: seeded context is STORED-ONLY
  today** (zero read paths consume seeded_context; documents excluded
  from all views; no current-truth/open-work/personal-memory leak —
  test-locked). One labeling gap: seeded lineage is stored but not yet
  rendered in View/Why.
- **Build order:** AIX-1 ✅ SHIPPED 2026-07-05 (SeededOriginProjection on ledger views — origin/coverage/currentness/boundary labels; View/Why 'Context origin / How to treat it' rows; 'Seeded background' card fragment; clarity WHERE_FROM answers carry the background framing with medium confidence) → AIX-2 ✅ SHIPPED 2026-07-05
  (the FIRST relevance write path: POST /work-os/ledger/:id/context-validation —
  seeded-rows-only, party/manager-authorized, idempotent, additive
  details.context_relevance JSON; five in-context choices on seeded rows
  inside View/Why — Still current / Outdated / Wrong context / Conflicts
  with newer work / Ask someone else; customer-safe validation labels in
  the projection; additive audit event SEEDED_CONTEXT_VALIDATED; no
  status change, no follow-ups/notifications/wallet writes, retrieval
  still OFF) → AIX-3 ✅ SHIPPED 2026-07-05 (derived-only deterministic
  candidate relevance: GET /work-os/ledger/:id/context-candidates — zero
  writes, no persisted seeds [Dandelion approval has apply semantics, so
  persistence would fake it]; signals = ≥2 shared title tokens or
  internal participant full-name match, year overlap supporting-only;
  cap 3, one per source, AIX-2 states suppress/label; manager-scoped
  visibility; CT "Possible background context" block inside View/Why
  reusing the ONE AIX-2 validation affordance per candidate)
  → AIX-4 ✅ SHIPPED 2026-07-05 (confidence-aware retrieval on the
  clarity-answer surface ONLY: WHAT_BACKGROUND intent; CONTEXT_RANKING_LAW
  codified [live work 1 → suppressed 8, this surface emits 4–5]; live
  truth leads every answer; mandatory attribution + medium-capped
  confidence + should_not_act on every result; retrieval reuses the
  AIX-3 gate [permissions, signals, cap, AIX-2 suppression]; no
  vectors/embeddings/broad search; no action path consumes seeded
  context; CT unchanged — the ask surface renders answer prose).
  **Gap W is now CLOSED end-to-end: doctrine → lineage → validation →
  candidates → governed retrieval.** → AIX-5 ✅ SHIPPED 2026-07-05
  (ambient expansion, narrowly: the ambient bar routes item-scoped
  background questions to the SAME clarity-answer rail — terminal
  this/it only, named subjects and action requests excluded by the
  recognizer; FND test-locks the action boundary [7 action phrasings:
  no retrieval intent, no seeded mention, no execution claim, no
  writes]; zero new retrieval machinery; LLM priming stays OFF).
  → AIX-6 ✅ SHIPPED 2026-07-05 (org-scoped named-subject retrieval:
  GET /work-os/context/background-answer — tight extraction with
  deictic/action/vague refusals; subject fidelity [all tokens must
  match]; live work leads permission-scoped like My Work / Team Work;
  seeded follows via the subject-mode derivation, manager-only,
  confirmed-first, AIX-4 copy; medium-capped; "nothing was guessed"
  no-match honesty; ambient recognizer mirrors the extractor).
  → DOC-EXTRACT ✅ SHIPPED 2026-07-05 (review-first extraction preview:
  POST /otzar/context/extract-preview — admin-gated, read-only,
  preview-only [no persisted candidates; Dandelion/Review Center
  semantics deliberately not reused]; one engine; Possible action/
  decision/blocker/owner labels; per-kind cap 3 + overall 8; excerpt
  anchoring; approval = existing work rail with PROPOSED + extraction
  lineage + human_reviewed; rejection persists nothing; CS-5
  no-extraction-on-upload contract intact and test-locked; CT
  seed-corpus page gains the explicit-click scan + review panel).
  → CTX-BOUNDARY ✅ SHIPPED 2026-07-05 (/setup/context-boundaries — the
  admin BOUNDARY view, not a relevance queue: seven can/cannot groups;
  read-only manager-gated GET /work-os/context/boundaries with exact
  counts + recent document labels only; honest retention limitation;
  linked from /setup, data-flow, retention; zero curation asks).
  → PASSWORD-LIFECYCLE ✅ SHIPPED 2026-07-06 (self-service account
  access on the one token rail: authed change-password [current
  required, other sessions die, current survives]; public
  enumeration-safe forgot-password [distinct reset template via the
  ACT-EMAIL provider; no token burned when unconfigured]; admin
  "Send password reset" for ACTIVE members [pending → 409 activation;
  admins never see/set passwords]; /app/account-security page +
  /forgot-password page + Login door; 3 new audit events; lockout
  behavior documented honestly [reset does not unsuspend]).
  → TWIN-BOOTSTRAP ✅ SHIPPED 2026-07-06 (the live smoke's
  `twin_not_found` root cause closed: bulk+email members skipped
  Phase-3 invite [the twin-minting step]; now activation redemption
  ensures a STARTER twin on the same rail [shell only: no tools/
  authority/role template; audited STARTER_TWIN_PROVISIONED], plus
  admin repair POST /org/members/:id/ensure-twin for stranded actives;
  CT: identity-aware My Twin empty state + honest TWIN_NOT_FOUND ask
  mapping — never a raw code, never a useless "try again").
  → ACT-EMAIL ✅ SHIPPED 2026-07-05 (activation-email delivery on the
  existing token rail: provider abstraction with honest not-configured
  gate [Resend behind ACTIVATION_EMAIL_USE_REAL + RESEND_API_KEY +
  ACTIVATION_EMAIL_FROM]; "sent" = provider accepted; token only in
  the link, never logged/audited/returned; admin-only org-scoped
  single + batch-20 sends; already-active 409; Users row + CSV-result
  explicit-click surfaces; copy-link fallback preserved; audit
  ACTIVATION_EMAIL_SENT/FAILED; env not yet set live — honest
  "not configured" until founder enables).
  → RETENTION ✅ SHIPPED 2026-07-05 (governed lifecycle: admin
  retire/restore of seeded context via additive details JSON — total
  preservation [row/capture/audit/lineage/extracted work], total
  active-use suppression [AIX gate + extraction refusal], idempotent,
  audited once, reversible; /retention gains lifecycle categories +
  the two-step-confirm document list; boundaries counts retired; hard
  delete/purge/windows/compliance deliberately NOT built and honestly
  stated). Copy
  shipped now: both seeding surfaces state that admins never
  classify/tag.

### X. Org operating substrate — decision-rights truth — 🟡 BLOCK 3A SHIPPED 2026-07-06

- **Doctrine (binding, from the Redwood Atlas pack):** truth weight =
  decision rights + communication act + source lineage + currentness,
  context-aware — never newest-wins, never hierarchy-always-wins. The
  three planes never collapse: reporting hierarchy (EntityMembership) ·
  approval authority (dual-control/policy/TAR) · domain decision
  rights (this store).
- **Block 3A shipped (FND `912318e` PR #576 + CT this commit):**
  `entity_decision_rights` (additive, per org+person, owns/can_approve/
  recommend_only by DecisionDomain, admin-authored, audited
  DECISION_RIGHTS_UPDATED) + the pure overlay feeding the production
  `computeDecisionRights` engine (owner beats recommend-only
  floor-holder; approver seats when no owner; recommend-only never
  finalizes; heuristic fallback byte-identical when unset; policy
  outranks). Rights grant NO tools/TAR/templates/authority — test-locked,
  including AI_AGENT rows unwritable + never surfaced (a Twin resolves
  through its human). CT: Company Profile "Decision rights" editor +
  Work Schedule read-only posture.
- **Block 3B SHIPPED 2026-07-06 (FND):** speech-act + source/authority
  lineage stamped at ingest — `details.communication_lineage` on every
  conversation-derived COMMITMENT/FOLLOW_UP row + artifact-level lineage
  on the MEETING row (AIX-2 additive-JSON precedent; zero schema). The
  16-act vocabulary is adopted from the Redwood corpus EXACTLY and
  test-locked against it; deterministic marker classification
  (memory_reference/unresolved_question recognized BEFORE decision
  markers so they can never be promoted); authority_basis/status through
  the 3A rights store (owner/approver within_authority; recommend-only
  marked; finality in someone else's domain = exceeds_authority; no
  rights = honest unknown, ingestion never blocked); supersedes/
  superseded_by left null rather than guessed. Stamping changes NO
  customer-facing behavior (comms-ingest suite unchanged 10/10).
- **Block 3C SHIPPED 2026-07-06 (FND):** truth-weight retrieval live —
  pure 8-class weight law (policy_constraint > authorized_decision >
  unverified_decision > work_signal > recommendation > reference_only >
  exceeds_authority > superseded; recency breaks ties only WITHIN a
  class); deterministic supersession linking at ingest (explicit
  language + same domain + ≥2 shared content tokens with participant
  names excluded + exactly-one older candidate; ambiguity links
  NOTHING); clarity WHAT_BACKGROUND leads with the calm correction when
  a row is superseded (successor named only if the caller passes the
  same party-or-manager gate) + one quiet flag for exceeds-authority /
  recommend-only / recollection rows; Twin-boundary LOCKED in tests
  (AI_AGENT caller NOT_FOUND, cross-org NOT_FOUND, rights via human
  roster only, recommend-only can never finalize for any caller).
- **REDWOOD-RUNTIME SHIPPED 2026-07-06 (FND):** the smoke-org
  simulation run — the arc proven over real HTTP (provision → rights →
  timezones → ingest → supersession → calm correction → boundary
  honesty) with dynamic per-run identities, all-8-persona true-UX
  walks, and human-copy sweeps on every read string. Found + fixed a
  REAL production gap: last-name speakers ("Torres") never resolved
  structured rights (first-token-only matching) — now unique
  name-token-subset matching with ambiguity → honest unknown.
- **AIX-SURFACES SHIPPED 2026-07-06 (FND):** truth-weight now covers
  ALL THREE retrieval surfaces — the clarity rail (3C), AIX-6
  named-subject (superseded rows never present as live truth; ONE calm
  correction with the visibility-gated current source; weight-ordered
  matches; quiet honest flags; unstamped orgs byte-identical), and
  AIX-5 ambient locked across all three recognizer phrasings.
- **REDWOOD-LIVE-PROBE SHIPPED 2026-07-06:** the 2-persona truth-weight
  arc proven LIVE on the NIOV Smoke Org over rails only (invite/activate
  → 3A rights → conflict-pair ingest → supersession + calm correction →
  overreach flag → boundary 404 → no-mechanics sweep), now a durable
  repeat-safe gate (`test:e2e:live:redwood`, two consecutive green
  runs). Substrate fix landed from the live lesson: CANCELLED/EXPIRED
  rows are settled history for supersession candidacy (FND `b564da8`).
- **Remaining (future, own GO):** full 48-artifact Redwood corpus run
  against the smoke org (the probe is the proven template); per-domain
  thresholds (budget limits); supersession chains across >2 hops.
  Redwood corpus stays out of prod/demo, always.

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
