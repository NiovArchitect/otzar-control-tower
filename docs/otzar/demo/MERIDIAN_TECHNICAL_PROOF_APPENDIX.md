# Meridian Demo — Technical Proof Appendix

Every claim in `MERIDIAN_INVESTOR_DEMO_SCRIPT.md` maps here to a live,
reproducible proof. Nothing is mocked in the live rehearsal except where noted
as an honest boundary.

## Environment

| | |
|---|---|
| FND live | `971d827` (api.otzar.ai, `otzar-api` srv-d8t17sm7r5hc73ed5h6g) |
| CT live | `9c95101` (app.otzar.ai, `otzar-app` srv-d8t1qpj7uimc73db2il0) |
| Tenant | Meridian Field Systems `69c07a00-2b39-4771-95c3-22c214e7ae6c` |
| Demo org | **untouched** (every mutating call asserts org == Meridian) |
| Google | VERIFIED, 10 scopes incl `calendar.events` (read+write) |

## Phase 0 pre-flight (this rehearsal, 2026-07-07) — 10/10

| # | Check | Result |
|---|---|---|
| 2 | Meridian admin login | 200 |
| 11 | Tenancy = Meridian (demo untouched) | org `69c07a00…` |
| 3 | Google VERIFIED + `calendar.events` | status VERIFIED, 10 scopes, write=true |
| 4 | Calendar free/busy (no title leak) | 200, provider=google, 0 busy, no `summary`/`title`/token |
| 5 | Calendar create→delete→delete-again | real `event_id`, deleted, idempotent, no residue |
| 6 | Drive Docs list | 200 |
| 7 | Revalidate route live | bogus id → `{ok:false, code:"NOT_FOUND"}` |
| 8 | `SOURCE_VERIFIED` in audit log | 1 event, target `69c07a00…`, `details.state=AVAILABLE` |
| 9 | Pending escalations | 0 |
| 10 | Active `DOCUMENT_CONTEXT` residue | 0 active (28 total, all CANCELLED) |

## Required proof points → evidence

| # | Proof point | Where proven | Status |
|---|---|---|---|
| 1 | Google Doc import has lineage + content hash | v2 spec Drive import (`external_source`: system/file_id/modified_time/web_view_link/content_sha256) | ✅ |
| 2 | Source revalidation returns AVAILABLE / changed:false | source-integrity spec + preflight #5 route | ✅ |
| 3 | `SOURCE_VERIFIED` in audit log | preflight #8 + source-integrity live | ✅ |
| 4 | Stale plan → calm supersession lead | v2 truth engine (`supersession-lead`) | ✅ |
| 5 | Sales overreach → beyond decision rights | v2 truth engine (`sales-overreach-flag`) | ✅ |
| 6 | Policy/compliance outranks preference | v2 decision-rights + guardrails | ✅ |
| 7 | Finance budget cap respected | v2 budget arc | ✅ |
| 8 | Memory/open-question/request ≠ truth | v2 (`memory/question/request-not-work`) | ✅ |
| 9 | Calendar free/busy used | v2 + preflight #4 | ✅ |
| 10 | Real calendar create only after all gates | v2 real-write branch + preflight #5 | ✅ |
| 11 | Calendar event deleted | v2 + preflight #5 | ✅ |
| 12 | Twin boundary holds | v2 employee/Twin boundaries (starter twins, admin 403s) | ✅ |
| 13 | Non-party retrieval → safe 404, no title leak | v2 non-party 404 no-leak | ✅ |
| 14 | No UUID/enum/mechanics leak in normal copy | v2 `expectNoFakeGoogle` + copy assertions | ✅ |
| 15 | Cleanup leaves zero active residue | v2 + source-integrity sweeps + preflight #10 | ✅ |

## Rehearsal runs (this session, 2026-07-07 — dress rehearsal)

- **`test:e2e:live:customer-sim:v2`** — **1 passed (14.0m)**. Real Drive list
  (25 docs), real Google Doc lineage, 6 seeded reference docs (supersession
  pair + policy + scope + stale + budget), truth engine (supersession-lead +
  sales-overreach-flag + memory/question/request-not-work + zero-invention),
  employee/Twin boundaries (starter twins, admin 403s, non-party 404 no-leak),
  **real calendar event created (`0himpisre6…`) → deleted → delete-again
  idempotent → zero residue**, Meet honest branch (409 SCOPE_REAUTH_REQUIRED,
  no fabricated transcript). Cleanup cancelled 14 run rows.
- **`test:e2e:live:source-integrity`** — **1 passed (34.6s)**. Imported one real
  Google Doc → `source_integrity` AVAILABLE; revalidated unchanged upstream →
  state AVAILABLE, `changed:false`, no token leak; cleanup swept 1 row.

**Post-rehearsal residue check (live):** pending escalations **0** · active
`DOCUMENT_CONTEXT` rows **0** (of 36, all CANCELLED) · `SOURCE_VERIFIED` audit
events **2** (original proof + this rehearsal). Meridian clean; demo org
untouched.

_(Run serially — both touch `DOCUMENT_CONTEXT` rows on the same tenant.)_

## Google / Calendar proof detail

- **Free/busy** is a real read over a 72h window; the response carries `busy`
  intervals with **no titles** and **no tokens** (asserted).
- **Create** runs a real Google `events.insert` only when the full gate ladder
  is satisfied; returns `source_kind:"google_calendar_event"` + a real
  `event_id` + `calendar_id:"primary"`, with **no `access_token`/`refresh_token`
  in the payload**.
- **Delete** runs a real `events.delete`; a second delete is idempotent
  (already-gone) — **zero calendar residue**.
- **Meet** is honestly `SCOPE_REAUTH_REQUIRED` / `NO_TRANSCRIPT` — never faked.

## Source-integrity proof detail

- Import validation rejects empty/binary content **before** the content hash →
  `IMPORT_QUARANTINED`, **no trusted row** (unit-proven).
- Revalidation is **snapshot-preserving**: same-hash→AVAILABLE (`SOURCE_VERIFIED`);
  changed→CHANGED_UPSTREAM (records new hash, preserves snapshot); 404→SOURCE_DELETED;
  403→ACCESS_REVOKED; transient→`REVALIDATION_UNAVAILABLE` (never demotes a good
  snapshot). The 3 answer-retrieval pools allowlist `status:"VERIFIED"` +
  source-integrity-active, so a demoted doc leaves active use **while status
  stays VERIFIED** (load-bearing FND integration test).
- Full write-up: `../OTZAR_SOURCE_INTEGRITY_HARDENING.md` (16-question report).

## Audit proof detail

`SOURCE_VERIFIED` (and `CONNECTOR_DATA_READ`) are queryable from the durable
security log via `GET /api/v1/audit/events?event_type=SOURCE_VERIFIED`, filtered
server-side (the query returning a match rather than `422 invalid_fields` also
proves the new type is registered in the deployed backend). Event carries
`target=<org>`, `outcome=SUCCESS`, `details={provider, state, file_id}`.

## Tenant safety

- Every mutating call asserts `org_entity_id == Meridian`; a mismatch aborts.
- No direct DB writes; no schema migration; no broad Drive sync.
- Demo org is never a target in any command in this appendix.

## Remaining honest gaps

1. A 200 export with a silently-truncated-but-plausible body is caught only at
   the next revalidation (if the truncation changed the hash), not at import.
2. Revalidation is manual (no auto-sync daemon) — by design.
3. Meet REST transcript path is unavailable for this Google account (honest
   `NO_TRANSCRIPT` / `SCOPE_REAUTH_REQUIRED`).
