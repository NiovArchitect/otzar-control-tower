# Redwood Atlas Studio — Customer Org Simulation + DGI Harness

**Status:** 2026-07-06 (Fable 5) — Block 2 SHIPPED: the executable
harness lives in Foundation at `tests/fixtures/redwood-atlas/`
(people, clients, the 48-artifact 8-week corpus with statement-level
who/when/act metadata, the 44-check expected-behavior matrix) and
`tests/integration/redwood-atlas-simulation.test.ts` (the matrix is
BINDING — the suite fails if any check id goes unexecuted). Foundation
fixtures are canonical for machine-readable data; this folder holds the
doctrine + human-readable copies. **Nothing here loads into
production/demo orgs** — fixtures-first, test-database next, smoke org
only after Phase-0.

## What this is

A deterministic, repeatable simulation tenant proving Otzar behaves as
an ambient AI Work OS inside a realistic company: source-grounded,
role-aware, decision-rights-aware, time-zone-true, and honest about
tools. Language discipline: **high-confidence, test-proven,
source-grounded, auditable** — never "100% accurate" without evidence,
never omniscience.

## The org

**Redwood Atlas Studio, Inc.** — San Francisco, CA ·
org tz `America/Los_Angeles` · Mon–Fri 9:00–17:30 local ·
lunch 12:00–13:00 protected · B2B implementation / design-ops / AI
workflow consulting.

People (see `people.json`): Maya Chen (CEO), Jordan Ellis (Ops),
Priya Shah (Product), Marcus Reed (CSM), Elena Torres (Eng,
America/Denver), Naomi Brooks (Design), Theo Williams (Sales,
America/New_York), Aisha Khan (Finance). Each carries DECISION RIGHTS
(what they own / can approve / can only recommend) and a distinct Twin
behavior profile — Twins are never generic.

Clients (see `clients.json`): Northstar Health Group (compliance-
sensitive; pilot), Harborlight Logistics (aggressive timeline;
scheduling), Bluebird Learning Co. (transcript-heavy; summarization).
Client contacts span Central/Eastern time.

## COMMUNICATION LINEAGE AND DECISION ACTS (binding doctrine)

Truth is NOT "newest document wins." **Communication performs
organizational work**: direction changes first through conversation,
agreement, approval, or owner decision — documentation catches up.
Every simulated communication artifact therefore carries WHO said WHAT,
WHEN, in WHAT role, with WHICH decision-makers present — the nuances
are the data.

Communication-act vocabulary (deterministic metadata, not ML):
`proposal · request · decision · approval · rejection · assignment ·
commitment · correction · escalation · objection · clarification ·
memory_reference · unresolved_question · superseding_decision ·
policy_constraint · action_item`

Artifact metadata shape (transcripts + comms):
```
communication_type: meeting_transcript | chat_thread | email_thread | call_notes
date, participants[{name, role, timezone}], decision_makers_present,
decision_rights_basis, classification: client|internal, client/project,
statements[{speaker, role, at, text, act}],   // who said what, when, as what act
decisions[], approvals[], assignments[], commitments[],
unresolved_questions[], objections[],
supersedes, superseded_by, authority_level, confidence,
currentness: current|stale|superseded|contradicted, source_lineage
```

Truth-weight is CONTEXT-AWARE, never a rigid ladder:
1. explicit approved source of record
2. validated decision acts by AUTHORIZED decision-makers
3. documented agreements with required participants present
4. approved corrections / superseding decisions
5. current project/status docs
6. live WorkLedger truth
7. decision-bearing transcripts
8. client commitments within authority
9. seeded background documents
10. stale/superseded/unvalidated sources

…modulated by DOMAIN decision rights (never reporting hierarchy alone):
budget → finance policy + approver authority · feasibility → Engineering
Lead constraint beats sales language · client follow-up → current CSM
ownership matrix · strategy → CEO within governance · compliance-scoped
promises → policy + approved scope beat informal sales talk. A manager
is not the decision-maker for every domain; "Approved. Move the pilot to
August 7" from the right people outweighs a stale doc, while an
exploratory "can we maybe do daily syncs?" is a REQUEST, not policy.

Alignment voice (flow-preserving, never overloading): "You may be
working from the older July 24 plan — the latest approved decision
moved Northstar to August 7 after compliance review." Never "you are
wrong", never a source dump, never internal mechanics, never restricted
detail, never executive-always-wins.

## The eight binding conflict patterns (expected-behavior anchors)

1. Executive direction vs stale doc → August 7 wins (valid decision
   rights); July 24 named as superseded.
2. Sales promise vs approved scope → Phase 1 = transcript
   summarization; sales "full automation" flagged as exceeding scope.
3. Client request vs internal decision → twice-weekly syncs; daily
   never scheduled as if approved.
4. Manager "ship Friday" vs Engineering dependency → aspirational until
   feasibility clears; Elena's constraint governs.
5. CEO "let's do it" vs finance threshold → approval requirement
   flagged (Aisha/policy), never auto-approved.
6. Old ownership matrix vs later reassignment → Jordan = executive
   follow-ups, Marcus = weekly check-ins; routing follows the latest
   valid assignment.
7. "I thought Google Calendar was live" vs connector truth → creation
   unavailable; draft/proposed schedule offered (proposal-only doctrine,
   test-proven in scheduling-policy.service).
8. Casual "lunch meetings are fine" vs protected-time policy → lunch
   avoided by default; explicit override required.

## What is real vs simulated vs future (honest)

**Real today:** timezones (org + person, self-service), deterministic
working-hours/lunch scheduling engine (proposal-only), seeded
context/corpus with lineage/currentness/validation/suppression,
governed retrieval + ranking law, decision-rights extraction
(computeDecisionRights) in the comms spine, role templates, hierarchy,
Twin calibration, **and — since Block 3A (FND `912318e`) — STORED
per-(org, person) domain decision rights** (`entity_decision_rights`:
owns/can_approve/recommend_only by DecisionDomain, admin-authored on
Company Profile, employee posture on Work Schedule, audited, overlaid
onto the heuristics before the engine runs — the runtime analog of this
pack's `people.json` rights; rights grant no tools/permissions/authority).
**Real since Block 3C (FND):** TRUTH-WEIGHT RETRIEVAL — the clarity/
background rail weighs stamped lineage through the 8-class law
(authorized decisions beat newer proposals; references never become
truth; recommend-only never finalizes; exceeds-authority flagged;
policy outranks preference; superseded loses to its successor);
deterministic supersession linking at ingest (explicit language +
unique content match only); Twin boundary test-locked on retrieval.
The doctrine's conflict patterns now hold END TO END at runtime, which
makes a future SMOKE-org load of this corpus structurally possible
(still gated on its own GO; never prod/demo).
**Real since Block 3B (FND):** statement-level speech-act + authority
lineage STAMPED AT INGEST — every conversation-derived work row /
follow-up carries `details.communication_lineage` (the 16-act vocabulary
adopted from THIS corpus exactly; deterministic marker classification;
authority_basis/status resolved through the Block 3A rights store with
honest `unknown` fallback; memory references and unresolved questions
never promoted to decisions; supersession pointers left null rather than
guessed — deterministic linking is Block 3C). The conversation row
carries artifact-level lineage (source, date, participants).
**Simulated (fixtures):** Google-Docs-like sources (labeled
`seeded_google_doc_simulation` — copy must say seeded/manual), calendar
availability fixtures, corpus-side communication-act annotations (the
fixture statements remain hand-labeled; runtime rows are stamped by the
deterministic classifier).
**Future (gated):** real Google Docs/Calendar/Meet connectors,
per-person working-hours storage (schema), NL speech-act extraction at
production scale, loading into the smoke org (after Phase-0).

## The executable harness (Foundation)

Four mechanisms, one binding matrix
(`tests/fixtures/redwood-atlas/expected-behavior-matrix.json`, 44
checks — C=corpus integrity, R=decision rights, S=scheduling,
D=governed retrieval):

- **corpus** — deterministic fixture-integrity checks: every statement
  is who/role/when/text/act from the 16-act vocabulary (all 16
  exercised); every internal decision/approval/assignment names an
  `authority_basis` found in that person's owns/can_approve rights;
  out-of-authority commitments carry `exceeds_authority: true`;
  supersession lineage resolves and non-current currentness follows it;
  all 8 conflict patterns have build-up AND resolution artifacts;
  simulated docs are labeled `seeded_google_doc_simulation`.
- **rights** — the PRODUCTION `computeDecisionRights` engine resolves
  all 8 conflict patterns from corpus framing: the approved August 7
  decision is actionable while the stale July 24 target never is;
  sales-vs-scope blocks and escalates to the scope owner; a client
  request is not policy; "ship Friday" stays aspirational against the
  engineering owner's evidence; policy outranks the CEO; routing
  follows the latest valid assignment; expertise alone never finalizes.
- **sched** — the PRODUCTION scheduling engine: per-person local-time
  conflicts named in local words, protected lunch per-person, weekend
  refusal, conforming alternatives, proposal-only connector truth.
- **db** — real Postgres: the contradicted July 24 brief is SUPPRESSED
  from governed retrieval, the confirmed August 7 decision log leads,
  retrieval is read-only and carries `should_not_act` on every result.

The suite's final test fails if any matrix check id was not executed —
coverage of the doctrine is enforced, not aspirational.
