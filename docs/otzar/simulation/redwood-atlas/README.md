# Redwood Atlas Studio — Customer Org Simulation + DGI Harness

**Status:** 2026-07-06 (Fable 5) — Block 1 (substrate + doctrine +
fixtures schema). The corpus and integration harness are the next
autonomous block. **Nothing here loads into production/demo orgs** —
fixtures-first, test-database next, smoke org only after Phase-0.

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
Twin calibration.
**Simulated (fixtures):** Google-Docs-like sources (labeled
`seeded_google_doc_simulation` — copy must say seeded/manual), calendar
availability fixtures, communication-act metadata.
**Future (gated):** real Google Docs/Calendar/Meet connectors,
per-person working-hours storage (schema), NL speech-act extraction at
production scale, loading into the smoke org (after Phase-0).

## Next autonomous block

Generate the 8-week corpus (40–60 artifacts incl. 20+ transcripts with
statement-level who/when/act metadata), the 40+ expected-behavior
matrix as executable checks, and `tests/integration/
redwood-atlas-simulation.test.ts` driving the existing rails
(seed → retrieve → schedule → align) against the fixtures.
