# External Identity — Dynamic Customer-Journey Smoke Plan

Status: **ACTIVE PLAN** · 2026-07-03 · governs T-1/T-2/T-3 closeout and all
future external-identity slices. Rule: **customer experience → code →
dynamic proof.** A slice in this area is production-credible only when the
smoke behaves like a real organization — dynamic per-run fixtures, journeys
not endpoints, edge cases not happy paths.

## Smoke classes

- **A. Read-only live honesty** — safe on every deploy; proves no fake
  context, no leaks, no noise, honest empty states.
- **B. Integration happy-path** — real Postgres through the real adapters/
  spine; proves every mutation path without live residue.
- **C. Reversible live** — ONLY with proven canonical-rail cleanup.
  **Current honest state: external-identity mutations are NOT cleanly
  reversible live** (no collaborator/organization delete route; soft-delete
  is admin-future), so no live mutation is performed — Class B carries the
  happy path, Class A carries live truth. This is stated, not hidden.
- **D. Cross-org isolation** — integration with two tenant orgs.
- **E. Journey E2E with screenshots** — the live read-only UI battery.

## Fixture doctrine

Dynamic names per run (`Acme Smoke {runId}`, `Jordan Smoke {runId}`,
`Vendor Smoke {runId}`) — stale fixtures can never mask a false merge, and
dedupe is proven intentionally. Integration fixtures are `__niov_test__`-
prefixed and deleted in setup/teardown. Live smokes mutate nothing.

## Journey → proof map

| # | Journey | Class | Where proven |
|---|---|---|---|
| J1 | Consulting/client full chain: observe → review seed (never auto) → admin promote → track for account → governed commitment → calm row context ("Waiting on Acme Smoke {run}") → audit chain → zero wallet writes | B | `external-journeys.test.ts` J1 (dynamic); pieces also locked in `external-promotion` / `external-organization` |
| J2 | Same name, two customer orgs — two rows forever; no cross-org read/approve | B+D | `external-organization.test.ts` (two-rows-forever), `external-promotion.test.ts` (cross-org seed/approval refusal), `external-context.test.ts` (no context leak) |
| J3 | Ambiguity inside one org: two same-name people → lineage SILENT; Acme Inc vs Acme Labs → two accounts | B | `external-journeys.test.ts` J3 |
| J4 | External person also uses Otzar — honest current boundary: local record only, no counterpart data, pairwise = FUTURE (doctrine §7b) | B (by absence) + doctrine | schema reserves nullable refs; no UI claims cross-org verification (Class A copy sweeps) |
| J5 | Twin portability boundary: client names/excerpts/contact graph never in portable memory; labels stay honest | B + A | count-invariance across the FULL J1 journey; S-1 wallet-boundary live smoke + labels |
| J6 | Commitment directions: we-owe-them = "Client follow-up"; they-owe-us = "Waiting on {account}"; internal owner stays internal | B | `external-journeys.test.ts` J6 |
| J7 | Manager exceptions: one calm box, patterns not feeds | A + B | CE-4B suite + `otzar-live-team-clarity-health.spec.ts` (screenshot) |
| J8 | Admin/security audit: promotion/org/commitment audited, no secrets | B + A | audit assertions across T-2/T-3 suites; live secret sweeps in every spec |
| J9 | Missing connector/source: honest setup-required, no fake context | A | Slack/Zoom NOT_CONFIGURED probes; `otzar-live-external-context.spec.ts` (silence) |
| J10 | Ambient asks ("who is this for / who can clarify / what's next") from selected work, no mutation | A + E | `otzar-live-ambient-clarity.spec.ts` + `otzar-live-clarity-answer.spec.ts` (screenshots, Review-Center count invariance) |

## Edge-case register (locked or honestly open)

Locked by tests: same name across orgs (2 rows); same name in one org with
different evidence (distinct normalized → distinct accounts); same person
name from two companies (ambiguity → silence); personal email domains never
org identifiers; corporate domain evidence org-scoped; Slack/Zoom/
transcript display names alone never verify (roster-first + governed-record
+ unique-only); revoked collaborator never matches; soft-deleted account
never silently reuses (honest refusal, restore = future admin action);
duplicate import never duplicates the obligation (source_conversation_id
anchor); cross-org approval refused; non-admin promotion refused at the
route gate; no external send exists (structural); no auto access; no client
data in wallets (count-invariance); no raw ids/enums/emails/excerpts in
customer copy (leak sweeps at both layers); no CRM words (copy sweeps).
Honestly open (ledgered): T-3B collaborator identifiers + admin-approved
aliases; account restore flow; two-governed-records-for-one-human dedupe
(J1 asserts the current truth rather than hiding it); pairwise
limited-disclosure matching (J4, future).

## Live battery (Class A/E — run after every external-identity deploy)

`otzar-live-external-context.spec.ts` · `otzar-live-external-promotion.spec.ts`
· `otzar-live-team-clarity-health.spec.ts` · `otzar-live-ambient-clarity.spec.ts`
— all read-only, all screenshot-bearing, all sweeping for leaks/CRM copy,
all asserting mutation-free reads (queue/pending counts unchanged).
