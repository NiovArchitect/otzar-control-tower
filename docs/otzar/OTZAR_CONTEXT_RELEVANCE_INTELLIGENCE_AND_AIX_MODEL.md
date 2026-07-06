# Context Relevance Intelligence + AIX — Doctrine + Audit

**Status:** 2026-07-05 (Fable 5). Doctrine + audit; only safe copy changes
shipped alongside. **State at authoring:** FND `503a012` · CT `79f1348`
(both live). Gap U (setup arc) and Gap V (CS-1→CS-5) are closed: orgs can
seed history and documents; employees calibrate their twins; live work
flows governed.
**Companions:** `OTZAR_ORG_CONTEXT_SEEDING_AND_TWIN_CALIBRATION_MODEL.md`,
FND `DOMAIN_GENERAL_INTELLIGENCE_DOCTRINE.md`, the clarity escalation
model, the operational ledger (Gap W).

**The non-negotiable this doc locks:**

> **Admins govern boundaries. Otzar manages relevance. Employees and
> workflows validate nuance.**

No admin — small company or enterprise — can know what every document is
relevant to. If Otzar asks them to curate the corpus, Otzar has created a
job. Otzar exists to remove hidden operational weight, so the relevance
burden belongs to Otzar itself, with humans validating nuance exactly
where the work already is.

---

## Part 1 — AIX: Artificial Intelligence Experience

UX asks: *how does the human experience the product?*
**AIX asks: how does the AI experience the organization, so it can serve
humans correctly?**

Otzar is an ambient AI Work OS. Its intelligence is only as good as the
world it perceives. If the AI's experience of the org is noisy —
undated context, unlineaged claims, unlabeled staleness, unclear
boundaries — the AI becomes passive, overconfident, or unsafe. If its
experience is legible — every context object carrying source, time,
scope, confidence, and boundary — the AI can act, clarify, wait, or ask
with precision.

AIX is therefore a design surface of its own. Domain general intelligence
does not come from dumping documents into an LLM. It comes from governed
context: source lineage, role/hierarchy understanding, permissions,
confidence, staleness, corrections, live work, clarification loops,
audit, memory boundaries, tool constraints, approval policies, and human
feedback. Otzar already builds most of these as rails; AIX names the
discipline of composing them into what the AI perceives.

**The three simultaneous experiences every setup/context feature must
serve:**
1. **Human Experience** — setup feels simple, guided, safe; never a job.
2. **Organization Experience** — people, tools, projects, policies, and
   history become coherent inside Otzar.
3. **AI Experience** — context arrives structured, permissioned,
   lineaged, dated, and confidence-aware, so the AI can serve.

## Part 2 — The role split (binding)

**Admins:** govern boundaries — connect sources, seed broad context,
set policy, manage access, see trust/risk states. Admins do NOT tag
documents to projects, classify transcripts, validate seeded facts, or
retire stale items. There will be no context-librarian UI.

**Otzar:** carries the relevance burden — preserves lineage and time,
infers possible relevance *softly*, prefers live work over history,
refuses to act on uncertain context, detects contradictions, down-ranks
stale material, routes targeted clarification to the person who would
actually know, and keeps every boundary (wallet, external, permission)
intact while doing so.

**Employees / project owners:** validate nuance — confirm what is still
current, correct stale assumptions, answer targeted clarifications, teach
their own twin.

**Workflows:** are the strongest truth signal — live ingestion updates
truth, approvals confirm authority, corrections improve behavior,
completions create proof, new source events supersede old context.

## Part 3 — Context relevance states (the future retrieval contract)

1. **Background Context** — company-owned starting context (all of CS-2/
   CS-5 today). Orientation value, low authority. Creates no work, no
   decisions, no access.
2. **Candidate Relevance** — Otzar softly believes a source may relate to
   a project/team/person/customer. Rendered only as "possible context /
   may relate to this work." Never trusted, never acted on.
3. **Confirmed Relevance** — a project owner, live workflow, correction,
   or approved review confirmed it. Usable with attribution.
4. **Current Work Truth** — live WorkLedger, approvals, corrections,
   recent source events. **Always outranks seeded history.**
5. **Stale / Superseded** — newer work or correction overtook it.
   Down-ranked and labeled.
6. **Contradicted** — conflicts with newer truth or explicit correction.
   Never used for action without clarification.

**Live work wins — the ranking law:** recent ledger truth > corrections >
approved decisions > confirmed relevance > candidate relevance >
background context. On conflict, Otzar asks instead of acting: *"Based on
seeded historical context this may be true — but I need confirmation
before acting"* — never *"this is true because it appeared in an old
transcript."*

## Part 4 — Human validation is in-context, never a queue

Validation happens where the work already is: on a work card, inside
View/Why, during a clarification, in Review Center when an action
matters, in Dandelion when a recommendation matters, in My Work when the
user is the right clarifier, in Team Work when a manager sees a pattern.
Setup/Data-Flow surfaces exist for *boundary awareness only*.

Good prompts: "This comes from seeded history — is it still current?" ·
"This may relate to Project Phoenix. Confirm?" · "A newer update appears
to conflict with this. Which should Otzar follow?"
Banned prompts: "Admin, review all documents." · "Tag every seeded
document." · "Clean up the corpus."

## Part 5 — AIX metadata target (per context object, eventually)

source · source kind · owner · org scope · project/workspace/team scope
when known · provided_by · seeded_at/created_at · covering_period ·
currentness · confidence · relevance state · permission boundary · memory
boundary · can-support-answers · can-support-actions ·
requires-clarification · external/client-related · personal-vs-company ·
stale/contradicted flags · clarifier/repair path.

Not all fields exist today, and that is correct — the audit below says
what exists, and the build order says where the rest lands.

### Part 5b — Communication lineage at ingest (SHIPPED 2026-07-06, Block 3B)

Communication is a first-class source of truth, but not all
communication is equal — speech acts create organizational reality.
Since Block 3B, every conversation-derived work row and follow-up is
stamped at ingest with `details.communication_lineage`: WHO said it
(speaker + entity + role-at-time), WHERE (source artifact/title/date/
participants), AS WHAT ACT (the Redwood Atlas 16-act vocabulary,
adopted exactly and test-locked against the corpus), WITH WHAT
AUTHORITY (authority_basis/status through the Block 3A decision-rights
store: owner/approver within_authority · recommend-only marked, never
final · finality inside someone else's domain = exceeds_authority · no
rights = honest unknown), and HOW CURRENT (memory references are never
current truth; unresolved questions stay unresolved; supersession
pointers exist but stay null until deterministic linking lands in 3C —
unresolved beats guessed). Deterministic markers only, fail-open, zero
admin classification work, zero behavior change today. Truth weight in
3C composes: decision rights + communication act + source lineage +
authority lineage + agreement lineage + currentness + permissions —
never newest-wins, never executive-wins, never hierarchy-wins.

## Part 6 — Audit findings (code-grounded, 2026-07-05)

1. **Seeded context is STORED-ONLY today.** `seeded_context` appears in
   exactly three write-side files (comms-ingest, document-context, the
   route) and **zero read paths**. Conduct priming reads memory capsules /
   patterns / observed externals — never seeded rows. Clarity answers
   compose from row truth generically without seeded awareness.
2. **Can seeded context influence answers/routing/Dandelion/clarity?**
   Documents: no — `DOCUMENT_CONTEXT` is excluded from every work view,
   org query, and clarity computation (six exclusion sites). Seeded
   history: only as inert VERIFIED terminal records in generic lists; it
   feeds no AI decision path.
3. **Unsafe current-truth path?** None found for action (no follow-ups,
   no nudges, no notifications, terminal statuses, test-locked). One
   labeling gap: seeded-history work items carry status VERIFIED, which
   in projections could read as "verified/completed current truth" —
   the lineage that says "seeded history" is stored but **not yet
   rendered** in View/Why or card fragments. This is the first
   retrieval-layer gap to close.
4. **Open-work pollution?** No — integration-locked (zero follow-ups,
   absent from open work, exactly-one-row for documents).
5. **Personal-memory pollution?** No — count-invariance locked on every
   seeding and calibration slice; lanes share no write paths.
6. **Currentness / covering_period:** stored on every seeded row; used by
   nothing (no ranking logic exists to use them — correct for now).
7. **Live work override:** trivially true today *by absence* — seeded
   context isn't retrieved into any decision path. The ranking law must
   be implemented the day retrieval begins, not after.
8. **Corrections → stale/contradicted:** no mechanism exists yet.
9. **Where relevance/confidence should live:** on the rows' `details`
   JSON (`relevance_state`, `confidence`) + the projection layer — no
   schema needed; candidate-relevance suggestions ride the existing
   governed Dandelion lane when they arrive.
10. **Where in-context validation lands first:** View/Why (render the
    seeded lineage: "From seeded history, provided by X, covering Y —
    is this still current?") and clarity answers (label seeded sources
    and prefer live rows). Both are existing surfaces.

## Part 7 — Safe next build order

1. **AIX-1 ✅ SHIPPED 2026-07-05 — Seeded lineage rendered (read-only):** View/Why + card
   fragments label seeded rows ("Seeded history · covering 2025 ·
   background context"); clarity answers say when a source is seeded
   background and down-weight it verbally. No new writes.
2. **AIX-2 ✅ SHIPPED 2026-07-05 — "Is this still current?" in-context
   validation:** the first relevance write path. One targeted affordance
   on seeded rows inside the opened View/Why: "This is seeded background
   context. Is it still current for this work?" with five choices (Still
   current / Outdated / Wrong context / Conflicts with newer work / Ask
   someone else → internal states confirmed/stale/wrong_scope/
   contradicted/needs_clarifier). Lands as additive
   `details.context_relevance` JSON (state, confirmed_by, confirmed_at,
   optional capped note, source `human_validation`, applies_to
   `seeded_context`) via POST /work-os/ledger/:id/context-validation —
   seeded-rows-only, authorized for managers/admins or a party the row
   is about (ownerless org-wide documents are manager/admin-only),
   idempotent, audited once (SEEDED_CONTEXT_VALIDATED). The projection
   renders labels only (validation_state_label + validation_guidance);
   no status change, no follow-ups, no notifications, no wallet writes,
   and retrieval remains OFF — the recorded signal is what AIX-3/AIX-4
   consume under the ranking law.
3. **AIX-3 ✅ SHIPPED 2026-07-05 — Candidate relevance, softly (DERIVED,
   not persisted):** GET /work-os/ledger/:id/context-candidates computes
   on demand which seeded documents MAY relate to a work row — never
   stored, never acted on. **Design decision:** the Dandelion seed lane's
   APPROVE carries operational apply semantics (resulting_action), so
   persisting relevance there would make approval fake or truth-promoting
   — the setup-coach lesson applied; candidates are therefore derived
   pure-functionally per view. **Deterministic signals only:** ≥2 shared
   significant title/summary tokens, or an internal participant's full
   display name in the seeded text (external names NEVER match);
   covering-period year overlap is supporting-only and never a candidate
   by itself. **Noise policy:** one candidate per seeded source, ≥1
   strong signal required, hard cap 3 per row, most-signals first, and
   the AIX-2 human loop feeds back — stale/wrong_scope/contradicted
   context is suppressed (wrong_scope suppresses globally in v1: the
   validation record carries no scope, so conservative), confirmed/
   needs_clarifier surface with their labels. **Validation path:** every
   candidate renders the SAME AIX-2 five-choice affordance posted
   against the seeded source row — no second validation mechanism.
   **Permissions:** the v1 pool is ownerless org-wide DOCUMENT_CONTEXT —
   a manager/admin read under the existing party model; non-managers get
   silence, never leaked titles. **What AIX-3 does not do:** no
   retrieval (still OFF — answers never consume seeded content), no
   assignment, no current-truth promotion, no writes of any kind, no
   external trust, no personal memory, no admin curation queue.
4. **AIX-4 ✅ SHIPPED 2026-07-05 — Retrieval with the ranking law:**
   seeded background now informs answers — on ONE surface, the
   deterministic clarity-answer rail (chosen because it is explanatory,
   read-only, and already provenance/confidence-disciplined; broad
   ambient/conduct priming stays OFF). **The ranking law is code:**
   `CONTEXT_RANKING_LAW` in `context-retrieval.service.ts` (live work 1
   > corrections 2 > approved decisions 3 > confirmed seeded 4 >
   candidate relevance 5 > unvalidated background 6 > historical 7 >
   suppressed 8); this surface emits ranks 4–5 and always LEADS with
   rank-1 live truth. **No second matcher:** retrieval flows through
   the AIX-3 deterministic gate, inheriting permission scope
   (ownerless org-wide docs = manager/admin; non-managers get silence,
   no titles/snippets), strong signals, the noise cap, and AIX-2
   suppression (stale/wrong_scope/contradicted never returns — v1
   suppresses rather than conflict-labels). **Contract:** every
   retrieval result carries source/origin/confidence labels, rank,
   why_included, how_to_treat, requires_confirmation, and
   `should_not_act: true` — seeded context supports explanation and
   confidence framing only; it can never authorize sending, approving,
   assigning, task/follow-up creation, connector writes, Dandelion
   seeds, or authority changes. **Copy law:** "Confirmed seeded
   context — … live work still wins if they conflict" / "Possible
   background context — … Not confirmed — use as background only,
   never for action" / needs_clarifier → "needs the right person";
   confidence is capped at medium — never high from seeded content.
   The intent is `WHAT_BACKGROUND` ("what do we know / any background /
   is there context"); a seeded row asked about itself explains itself
   as background. CT needed NO code: the ask surface renders answer
   prose, and `used_sources` never renders. **Future (each needs its
   own GO):** broader ambient/conduct retrieval, vector/corpus search,
   document extraction/review flow, deeper project scoping,
   conflict-labeling instead of pure suppression.
5. **AIX-5 ✅ SHIPPED 2026-07-05 — Ambient retrieval expansion,
   narrowly:** the ambient bar / Ask Otzar now answers item-scoped
   background questions ("What do we know about this?" / "Any
   background on this?" / "Is there historical context for this?")
   through the SAME governed rail — the deictic clarity recognizer
   routes them verbatim to the clarity-answer route, where the AIX-4
   retrieval answers with live-work-first attribution. **Zero new
   retrieval machinery**: no new endpoint, no prompt stuffing, the LLM
   is never in this path (the clarity rail is deterministic).
   **Intent boundary (zero-error rule):** patterns require a TERMINAL
   this/it — "any background on this customer?" and "what do we know
   about Project Phoenix?" deliberately do NOT match, because answering
   them from the selected item would answer about the wrong thing;
   named-subject background questions keep their existing routes until
   org-scoped retrieval is modeled. Bare forms ("what do we know?")
   are item questions only when an item is selected; with no selection
   the user gets honest "open or select" copy, never a guess.
   **Action boundary (test-locked in FND):** seven action-like requests
   ("Send this to the customer" … "Move this project to done") never
   classify into the retrieval intent, never surface seeded content
   even as a mention, never claim execution, never write. Broad
   ambient/conduct LLM priming remains OFF.
6. **AIX-6 ✅ SHIPPED 2026-07-05 — Org-scoped named-subject retrieval:**
   "What do we know about Project Phoenix?" answered with NO selected
   item, via GET /work-os/context/background-answer. Deterministic end
   to end: tight subject extraction (four question shapes; deictic
   subjects refuse — the item rail owns them; action phrasings never
   match; vague subjects get an honest ask-for-a-name; unresolvable →
   422, never a guess). **Subject fidelity:** every significant subject
   token must appear in a match — "Phoenix" never returns Atlas
   material. Live work leads (permission-scoped exactly like My Work /
   Team Work: employees see only rows they are party to, managers
   org-wide); seeded background follows via a SUBJECT-MODE derivation
   beside the AIX-3 row-mode one (same pool, same AIX-2 suppression,
   same cap — one matcher family), manager/admin-only, confirmed-first,
   AIX-4 contract copy. Confidence never exceeds medium; the no-match
   answer says "nothing was guessed" — literally. The ambient bar
   routes these questions verbatim (recognizer mirrors the extractor);
   asking never mutates.
7. **DOC-EXTRACT ✅ SHIPPED 2026-07-05 — Review-first document
   extraction (the CS-5 extract_work:false successor):** an admin can
   explicitly ask Otzar to scan ONE seeded document for possible work —
   POST /otzar/context/extract-preview (admin_org-gated, READ-ONLY).
   **Lane decision: preview-only, zero persistence** — Dandelion
   APPROVE mints operational resulting_actions and Review Center is the
   dual-control send lane, both wrong semantics; candidates exist only
   in the response and deterministic re-derivation replaces persistence.
   Extraction reuses the ONE engine (extractFromCapturedText —
   structured LLM output or honest LOCAL_FALLBACK). Candidates are
   possibilities, never facts: Possible action / Possible decision /
   Possible blocker / Possible owner (info-only — ownership is never
   created from a document), per-kind cap 3 + overall cap 8, deduped,
   excerpt-anchored to real source lines, review promise repeated
   server-side, no UUIDs cross back. **Approval = the existing work
   rail:** a human-approved candidate lands as PROPOSED work, owned
   explicitly by the approver, with extraction lineage
   (source: document_extraction_review, source_document_ledger_id,
   human_reviewed: true, source_excerpt) — real work with NO seeded
   affordances. Rejection is a client-side dismiss: nothing persisted,
   nothing to clean. Seeding still creates no work — extraction only on
   explicit click, never on upload (test-locked).
8. **CTX-BOUNDARY ✅ SHIPPED 2026-07-05 — Context Boundaries (the admin
   boundary view, NOT a librarian queue):** `/setup/context-boundaries`
   ("See what company context Otzar has been given and how it is
   governed"), linked from /setup, /setup/data-flow, and /retention.
   Seven boundary groups with can/cannot copy (seeded history, seeded
   documents, reviewed extracted work, Twin calibration, writing style,
   live work, external context), backed by a read-only manager-gated
   FND projection (GET /work-os/context/boundaries): exact counts for
   the three ledger-derived groups + the 3 most recent seeded documents
   as AIX-1 labels only (never bodies/ids/enums). Groups without a safe
   existing projection are deliberately copy-only, not approximately
   counted. Retention is stated honestly ("Retention controls are not
   configurable in-product yet… nothing here deletes or archives
   sources") with a link to /retention. No classify/tag/retire/cleanup
   asks anywhere — admins govern boundaries; Otzar manages relevance.
9. **RETENTION ✅ SHIPPED 2026-07-05 — Governed context lifecycle
   (retire/restore, never delete):** admins can retire seeded context
   from active use via POST /work-os/ledger/:id/context-lifecycle —
   additive `details.context_lifecycle` JSON on seeded rows only
   (state active|retired, set_by, set_at, reason≤280, source
   admin_lifecycle). **Preservation is total:** the row, its capture,
   its audit trail, its source lineage, and any human-reviewed
   extracted work survive untouched (work lifecycle ≠ document
   lifecycle). **Suppression is total across active use:**
   `isContextRetired` gates the AIX-3 derivations, which removes
   retired context from candidates, AIX-4 clarity retrieval, AIX-5
   ambient answers, and AIX-6 named-subject answers; the extraction
   preview refuses retired sources (SOURCE_RETIRED). Idempotent,
   audited once per real change (SEEDED_CONTEXT_RETIRED/RESTORED — the
   free-text reason never enters audit), reversible via the same rail.
   Surfaces: /retention gains the lifecycle categories + the admin
   seeded-document lifecycle list (GET /work-os/context/documents;
   two-step confirm, nothing writes before explicit confirm); Context
   Boundaries counts retired context and reframes retention as
   "becoming governed lifecycle controls". **Deliberately NOT built:**
   hard delete, purge, legal hold, retention windows, automated
   expiry, compliance export/deletion — each stated honestly in copy.
10. Broader corpus extraction, connector sync, vector/corpus search,
   conflict-labeling, and true deletion/retention-window policy remain
   separate, later, and gated — each needs its own GO.

## Part 8 — What this protects

**Customer experience:** no new admin job — the copy now says so
explicitly on both seeding surfaces. **AIX:** the AI's world stays
legible — everything it will ever retrieve is dated, lineaged, scoped,
and confidence-labeled *before* retrieval is built, so Otzar's
intelligence compounds from governed context instead of guessing from a
pile. That is the domain-general-intelligence path: the corpus brain is
not built before the relevance model — and now the relevance model is
written down.
