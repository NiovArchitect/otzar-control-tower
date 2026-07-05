# Org Context Seeding + Employee Twin Calibration — Doctrine + Audit

**Status:** 2026-07-05 (Fable 5). Doctrine + audit only — no ingestion code
in this pass. **State at authoring:** CT `main` `b3834fc` · FND `main`
`1e21709` (both live). The setup arc (Gap U slices 1–5) is coherent:
activation, least-access import, data-flow trust, go-live gating, and setup
coaching are shipped, test-locked, and live-smoked. This doctrine defines
the NEXT layer — how a company safely gives Otzar its starting context and
how each employee's AI Teammate calibrates to its person — **before any
broad transcript/doc upload, employee writing-sample, or memory-write
feature is built.**
**Companions:** FND `docs/otzar/DOMAIN_GENERAL_INTELLIGENCE_DOCTRINE.md`,
`OTZAR_CORRECTION_MEMORY_LEARN_LOOP.md`, CT
`OTZAR_ORG_READY_AND_PORTABLE_TWIN_DOCTRINE.md`,
`OTZAR_ORGANIZATION_SETUP_JOURNEY_MODEL.md`, Gap V in the operational ledger.

**The question:** a company is set up. Now it wants Otzar to *know things* —
project history, key documents, how the team works, who its clients are,
each person's style. How does that context enter safely, land in the right
place, stay owned by the right party, and make the system genuinely smarter
— without memory contamination, stale truth, wallet leakage, or external
trust errors?

**The prize:** domain general intelligence powered at setup. Otzar's
intelligence compounds from GOVERNED, ACCURATE, LINEAGED context — not from
hoovering documents. Wrong context is worse than no context: it routes work
to the wrong people, asserts stale decisions, and burns trust permanently.

---

## Part 1 — The three-lane split (the load-bearing distinction)

Everything a company might "give Otzar" belongs to exactly one lane. The
lanes have different truth stores, different owners, different risk, and
different rails. Collapsing them is how memory contamination happens.

### Lane 1 — Organization Context Seeding
*"What the company tells Otzar about itself."*
Projects, teams, clients, vocabulary, priorities, key decisions already
made, historical documents/transcripts the org chooses to seed.
- **Owner:** the organization. Company-owned, never portable, org-scoped.
- **Lands in:** org truth (WorkProjects, workspaces, external
  collaborators via the T-2/T-3C review rail, org vocabulary, WorkLedger
  rows marked as SEEDED context — never as live commitments).
- **Trust model:** admin-provided ≠ automatically true. Seeded context is
  *reviewable input*, processed through the SAME spine (`ingestSourceEvent`
  → extraction → identity resolution → policy → durable rows → audit) with
  a **seeding source label** so every derived row carries "this came from
  seeded history, dated X" in its lineage.

### Lane 2 — Employee Twin Calibration
*"What each person teaches their own AI Teammate."*
Preferences, communication style, pronunciation, corrections, "how I work".
- **Owner:** the person. Personal wallet; the portable SHAPE of how they
  work — with company facts stripped by construction.
- **Lands in:** the existing rails ONLY — `MemoryCapsule` types
  `FOUNDATIONAL` / `CORRECTION` / `CONVERSATION_LEARNING` (read back by
  conductSession layers 3–5) and `TwinCorrectionMemory`. The Welcome
  memory-candidates flow (proposal → explicit approve → capsule) is the
  template: **calibration is always proposed, never silently written.**
- **Trust model:** self-scoped. A person calibrates their own twin; nobody
  calibrates someone else's; the org cannot read personal calibration.

### Lane 3 — Live Work Ingestion
*"What flows in from real, current communication."*
The existing production spine (manual comms, Zoom ingest, future
connectors). Already governed, quality-gated, deduped, lineaged.
- **Boundary vs Lane 1:** live ingestion asserts CURRENT work truth
  (commitments become actionable, follow-ups draft). Seeded history must
  NEVER mint actionable follow-ups or notifications — a commitment from a
  six-month-old transcript is context, not a to-do. This is the **stale
  transcript rule** and it is the single biggest risk in context seeding.

## Part 2 — Audit: what exists today (code-grounded)

| Capability | State | Evidence |
|---|---|---|
| Live ingestion spine (quality gate, dedupe, lineage, audit) | LIVE | comms-ingest.service.ts; org+source dedupe keys; source lineage per row |
| Manual transcript / Zoom ingest | LIVE | Comms page, MeetingCaptures, Zoom VTT ingest |
| Org vocabulary / domain terms | LIVE substrate | vocab_count in analytics; domain vocabulary route |
| Project/workspace/people/role seeding | LIVE (setup arc) | slices 1–5 + existing rails |
| External party seeding | LIVE + governed | T-2 review seeds → T-3C chooser; never auto-trusted |
| Twin calibration — corrections | LIVE | TwinCorrectionMemory + CORRECTION capsules, read back in conduct |
| Twin calibration — onboarding preferences | LIVE (narrow) | Welcome memory-candidates (propose → approve → RECORD_CAPSULE) |
| Twin calibration — conversation learning | LIVE (with a gap) | CONVERSATION_LEARNING capsules on close; **content_hash is a placeholder** (P1, pre-existing) |
| **Historical/backdated transcript seeding** | **MISSING** | ingest treats all input as current; no seeded-context label, no stale-commitment suppression |
| **Document/doc-corpus seeding** | **MISSING** | no doc ingestion path exists (audit: Docs/Gmail content reads don't exist) |
| **Employee writing-sample calibration** | **MISSING** | no upload; nothing writes style capsules from samples |
| **Org context review surface** | **MISSING** | no "what has been seeded, by whom, dated when" view |
| Wallet routing invariant | LIVE + count-invariance tested | write-time routing; every external slice re-proves it |

**The structural finding:** the spine, the wallet boundary, the review
rails, and the calibration stores all exist. What does NOT exist is the
**seeding mode** — a way to run history through the spine with (a) a
seeded-source lineage label, (b) actionability suppression (no follow-up
drafts, no notifications, no waiting-on states from stale content), and
(c) an admin review surface. That is the correct first build, and it is
small because the spine already does everything else.

## Part 3 — Binding rules (what protects the prize)

1. **One spine.** Seeded context enters through `ingestSourceEvent` with a
   seeding flag — never a parallel ingestion path, never direct DB writes.
2. **Stale ≠ actionable.** Seeded/backdated content may create context rows
   (decisions, vocabulary, relationships, project history) but NEVER
   follow-up drafts, notifications, escalations, or waiting-on states.
   Every seeded row's lineage says "seeded history, provided by <admin>,
   covering <period>".
3. **Wallet law is untouchable.** Lane 1 → org stores only. Lane 2 →
   personal wallet only, propose-then-approve only. No feature may write
   company source data into a personal wallet or personal calibration into
   org truth. Count-invariance tests are mandatory on every slice.
4. **External trust is never seeded.** Client/vendor names in seeded
   history flow through the SAME observed→review→governed rail (T-2/T-3C).
   Bulk history never auto-creates governed external collaborators.
5. **Identity resolution stays deterministic.** Seeded transcripts resolve
   names against the roster exactly like live ingest; unresolved actors in
   old transcripts stay unresolved (T-2.5 naming applies) — no fuzzy
   historical guessing.
6. **Calibration is consensual and self-scoped.** Writing-sample style
   learning (future) follows the Welcome pattern: the person uploads,
   Otzar proposes capsules, the person approves each one. Style capsules
   carry no company facts (extraction strips content, keeps shape).
7. **Everything reviewable, everything reversible.** Seeded context is
   soft-deletable by the org (RULE 10); calibration capsules are revocable
   by the person (the existing "Stop using" rail).
8. **No fake intelligence claims.** Seeding makes answers and routing
   better; it does not make twins autonomous. The draft-and-approve
   boundary is unchanged.

## Part 4 — Build order (each slice: grep → plan → gates → live smoke)

1. **CS-1 — Seeded-context mode on the spine (FND):** `seeded_context`
   flag on ingest → lineage label + actionability suppression (no
   follow-ups/notifications/seeds-with-urgency). Integration tests: stale
   commitment creates context row, zero drafts, zero notifications; wallet
   invariance; external names → review rail only.
2. **CS-2 — Admin seeding surface (CT):** "Seed organization history"
   under /setup — paste/upload transcript with a date, preview what will
   be created (context, not to-dos), confirm; seeded-history view (what,
   who, when, source) with soft-delete.
3. **CS-3 — Twin calibration expansion:** extend the Welcome
   propose→approve pattern to a small structured calibration set (style,
   escalation preferences, focus areas) — personal wallet only.
4. **CS-4 — Writing-sample style calibration (needs its own GO):** upload →
   shape extraction → proposed capsules → per-capsule approval. Blocked on
   a shape-extraction design that provably strips company facts.
5. **CS-5 — Doc-corpus seeding (needs its own GO + the multi-source
   adapter contract):** documents are a new source class; they follow the
   17-source audit's adapter contract, not ad-hoc parsing.

Prerequisite P1 (from the twin audit, now load-bearing): fix the
MemoryCapsule `content_hash` placeholder before calibration expands —
tamper-evidence matters more once calibration volume grows.

## Part 5 — Do-not-overclaim (context edition)

Never say: "Otzar learned your company" (it ingested reviewable, lineaged
context) · "upload everything" (only supported source classes, stated
per-class) · "your twin writes like you" (until CS-4 ships and the person
approved each capsule) · "AI-powered setup" for deterministic derivations ·
"historical data is live" (seeded ≠ actionable) · any claim that seeded
external parties are trusted (review rail always).
