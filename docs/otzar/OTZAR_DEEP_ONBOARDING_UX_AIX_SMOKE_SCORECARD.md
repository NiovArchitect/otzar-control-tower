# Otzar Deep Onboarding UX + AIX Smoke Scorecard

**Status:** 2026-07-05 (Fable 5), deep-smoke consolidation pass.
**State at scoring:** FND `87d1bbd` · CT `6cad718`+ (this pass) — both live.
**Evidence layers:** Layer A = CT unit/fixture suite (2,22x tests, 205+
files, MSW `onUnhandledRequest:"error"`); Layer B = FND integration
battery (real Postgres, HTTP inject — 12 arc suites, 48 tests, rerun
green this pass); Layer C = production read-only live battery
(`otzar-live-pilot-journey.spec.ts` admin + employee walks,
org-setup, seed-corpus, source-lineage — zero non-GET writes enforced
in-spec).

**Doctrine being scored:** Admins govern boundaries. Otzar manages
relevance. Employees and workflows validate nuance. The customer
question: *"Was it easy and trustworthy to bring our company into
Otzar?"*

**Ratings:** ✅ Pass · 🟡 Pass with limitation · 🔴 Fail/repair needed ·
⚪ Not tested yet. Every rating cites its proof.

| # | Scenario group | Accuracy | Safety | Efficiency / admin burden | Customer clarity | AIX coherence | Repair path | Proof | Remaining gap → recommended repair |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Admin onboarding flow (empty → partial → ready → founder-gated) | ✅ | ✅ | ✅ one deterministic next step; coach groups repairs | ✅ | ✅ | ✅ every blocker links its fix | `org-setup.test` (empty/partial/ready flips, ladder), `setup-coach.test` (grouped, disappears-when-fixed, quiet org), live journey §1 | Founder actions remain founder-gated (correct, labeled) |
| 2 | People import (valid/invalid/dupes/forbidden/caps/partial) | ✅ | ✅ least-access by construction; no email-sent claim; no write before confirm | ✅ preview-first, 20/batch honest split | ✅ | n/a | ✅ results link back to /setup | `csv-import.test` (13 stories), live journey §7 render | HRIS/directory import = future (named in matrix) |
| 3 | Tool/data trust (connected ≠ ingesting) | ✅ | ✅ | ✅ | ✅ six trust fields per source, stated plainly | ✅ | ✅ per-source door | `data-flow.test` (six fields, honest retention line updated this arc), live journey §3 | Slack/Google/M365 ingestion honestly "not wired yet" |
| 4 | Go-live gate (3 verdicts, founder actions apart) | ✅ | ✅ | ✅ | ✅ "first workflow" ≠ pilot ≠ self-serve, never collapsed | n/a | ✅ per-item repair links | `go-live.test` (verdict ladder, warnings never fake-block, overclaim sweep), live journey §2 | — |
| 5 | Setup coach (derived, no chore queue) | ✅ | ✅ never enters operational Dandelion | ✅ one rec per category, deduped | ✅ | n/a | ✅ each rec = repair link | `setup-coach.test`; design decision recorded in smoke matrix story 9 | — |
| 6 | Org context seeding (history + documents, extraction OFF) | ✅ | ✅ zero tasks/follow-ups/seeds/capsules/external-trust (count-invariant locked) | ✅ paste-only, no classify/tag homework | ✅ boundary-first copy, confirmation-gated | ✅ stale-truth rule structural | ✅ | FND `seeded-context` + `document-context` (7); CT `seed-history` + `seed-corpus` tests; live seed-corpus spec (zero writes, never clicked) | Volume rails (connector sync) = gated future |
| 7 | Employee Twin calibration (personal, consent-gated) | ✅ | ✅ personal wallet only; self-scoped by construction (no target param); dual-control approve | ✅ | ✅ company-docs warning renders first | ✅ | ✅ revocable via My Memory | FND `twin-calibration.test`; CT `twin-calibration.test`; live employee walk (boundary visible, zero writes) | — |
| 8 | Writing style (raw sample never leaves browser) | ✅ | ✅ deterministic risky-token refusal (CS-4); no file input (asserted live) | ✅ | ✅ | ✅ style shape only, no company facts | ✅ | CT `writing-style.test`; live employee walk (`input[type=file]` count = 0) | — |
| 9 | Seeded lineage / AIX labels | ✅ | ✅ raw metadata never crosses the wire (test-locked) | n/a | ✅ "Seeded background", currentness, boundary, how-to-treat | ✅ live rows stay silent | ✅ validate in View/Why | CT `view-why.test` (seeded rows + validation row + retired label via FND projection tests); FND projection assertions in `document-context`/`context-lifecycle` | — |
| 10 | In-context validation (AIX-2) | ✅ | ✅ seeded-rows-only; party/admin authority; idempotent; audited once; note never in audit | ✅ in-context, never a queue | ✅ five human choices, honest done/failure copy | ✅ suppression feeds AIX-3+ | ✅ | FND `context-relevance.test` (4); CT `context-validation.test` (5) | — |
| 11 | Candidate relevance (AIX-3, derived) | ✅ subject fidelity: all tokens must match | ✅ zero writes; manager-scoped pool; external names never match | ✅ cap 3, one per source | ✅ "may relate — needs confirmation" only | ✅ AIX-2 states suppress/label | ✅ same AIX-2 buttons per candidate | FND `context-candidates.test` (5); CT `context-candidates.test` (4) | Non-manager employees see no candidates (correct v1 scope; deeper project scoping = future) |
| 12 | Governed retrieval (AIX-4/5/6) | ✅ ranking law codified; live work leads by position | ✅ `should_not_act` on every result; action phrasings never retrieve (7-phrase lock); confidence ≤ medium | ✅ | ✅ attribution + "live work wins" in every seeded answer; "nothing was guessed" honesty | ✅ deictic vs named-subject vs action all deterministic; no LLM priming | ✅ | FND `context-retrieval.test` (5 incl. action boundary) + `background-answer.test` (3); CT `clarity-phrases.test` (6 incl. wrong-subject refusals) + ambient tests (GET-only proofs) | Conflict-labeling (vs pure suppression) = gated future |
| 13 | Document extraction/review | ✅ | ✅ preview-only, zero persistence; retired sources refuse; CS-5 no-extraction-on-upload intact | ✅ per-kind cap 3 / overall 8 — never "42 tasks from one SOP" | ✅ "Possible …" labels; review promise server-side | ✅ approval = existing work rail, PROPOSED + human_reviewed + lineage | ✅ dismiss persists nothing | FND `document-extraction.test` (3); CT `document-extract-review.test` (2) | Multi-document sweeps = gated future |
| 14 | Context Boundaries | ✅ exact counts only where safe | ✅ no bodies/ids/enums; tenant-isolated; employee 403 | ✅ zero curation asks (test-swept) | ✅ seven can/cannot groups | ✅ | ✅ links from /setup, data-flow, retention | FND `context-boundaries.test` (2); CT `context-boundaries.test` (2) | Calibration/external counts copy-only (no safe projection — deliberate) |
| 15 | Retention lifecycle | ✅ | ✅ retire = stop active use, never delete; total preservation + total suppression test-locked; reviewed work survives source retirement | ✅ two-step confirm; nothing writes before it | ✅ "audit preserved, nothing deleted"; unbuilt controls named honestly | ✅ retired label in View/Why projection | ✅ reversible restore | FND `context-lifecycle.test` (2); CT `retention-lifecycle.test` (3) | True deletion/retention windows = gated future (honestly stated in-product) |
| 16 | Cross-surface coherence | ✅ | ✅ | ✅ | ✅ one story: governed lifecycle everywhere (4 surfaces + 7 test anchors reconciled this pass) | ✅ | ✅ | consolidation commit `f46ed1b`+`6cad718`; live journey sweep (admin + employee walks, banned-claims regex, zero writes) | — |

## Customer-experience findings

**Coherent:** the journey reads as one story — govern boundaries, seed
context, calibrate personally, watch Otzar propose softly, validate where
the work is, retire what's stale. Every surface states what it can and
cannot do, and the walk from /setup to /retention never contradicts
itself (live-verified after this pass's copy reconciliation).

**Remaining friction (honest):** (1) ~~activation links are admin-copied —
no email delivery~~ **REPAIRED 2026-07-05 ([ACT-EMAIL]):** activation
emails ship on the existing token rail (Users row send/resend + CSV
result batch send, both explicit-click; honest "not configured" until
the founder sets the Resend env; copy-link fallback always remains); (2) seeded documents are managed from /retention and boundaries
but have no browsing surface beyond recent/20 — acceptable for pilot
volume, not for corpus scale; (3) non-manager employees see no candidate
relevance (correct conservatism, but managers carry validation load
until project-scoped visibility is modeled); (4) founder-gated org
bootstrap means the first hour is founder-operated by design.

## AIX findings

The AI's world is legible end-to-end: every context object it can
retrieve is dated, lineaged, scoped, confidence-labeled,
human-validatable, and lifecycle-governed BEFORE it reaches an answer —
and answers always lead with live work. Action boundaries hold under
adversarial phrasing (seven action shapes test-locked against
retrieval). Humans validate nuance exactly where work happens; no
admin-librarian surface exists anywhere.

## Safety findings

Zero writes across both live walks (spec-enforced). Cross-org isolation
test-locked on every read/write rail in the arc. Personal wallets
count-invariant across all seeding/extraction/lifecycle suites. No
open-work pollution (exclusion lists + count locks). External trust
never auto-promoted. Retire is suppression-with-preservation, never
deletion.

## Verdict (unchanged from consolidation, now deeper-evidenced)

1. **Ready for first workflow: YES.**
2. **Controlled founder-operated pilot: YES**, subject to standing
   founder actions (smoke org + Phase-0/rollback rehearsal,
   RENDER_API_KEY rotation, two stale escalation rejections).
3. **Founder-free self-serve onboarding: NO** — email delivery, org
   bootstrap, HRIS import, Slack ingest UI, webhooks, billing remain
   future; the go-live gate itself says so.

**Recommended next build slice: email delivery for activation links** —
the highest-leverage repair of the top remaining friction, narrow and
rail-shaped (tokens exist; one provider + one template + audit).
