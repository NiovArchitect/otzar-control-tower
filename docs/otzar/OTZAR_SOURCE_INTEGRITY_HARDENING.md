# Otzar Source Integrity & Context Continuity — Hardening Report

**Date:** 2026-07-07 · **Author:** niovarchitect <sadeil@niovlabs.com>
**FND:** `971d827` (PR #593, merged `main`) · **CT:** source-integrity commits
**Scope:** how Otzar defends against corrupted / missing / revoked / stale /
malicious / poisoned external and internal documents.

> **Deploy/live state:** FND `971d827` is **deployed live** to `api.otzar.ai`
> (operator-authorized deploy `dep-d96sq658nd3s73bkp5lg`) and the same-hash=
> current **live proof on Meridian is GREEN** (`test:e2e:live:source-integrity`,
> 2026-07-07, 40.6s: import real doc → revalidate → AVAILABLE, changed:false,
> no token leak → zero residue). Every mutation branch is proven in FND
> integration via an injected fetch seam (see Q15).

---

## The source lifecycle model (built on EXISTING fields — no schema migration)

A source-integrity state lives in the additive `details.source_integrity` JSON
on an imported `DOCUMENT_CONTEXT` row. No Prisma migration was needed or made:
ledger `status` and `AuditEvent.event_type` are validated **Strings**, and
`details` is additive JSON.

| State | Meaning | Where recorded |
|---|---|---|
| `AVAILABLE` | snapshot matches upstream (fresh import or revalidated-current) | `details.source_integrity.state` |
| `SNAPSHOTTED` | reserved active state (no path writes it today) | ″ |
| `CHANGED_UPSTREAM` | upstream hash diverged — **demoted**, snapshot preserved | ″ |
| `ACCESS_REVOKED` | upstream returned 403 / reauth — **demoted** | ″ |
| `SOURCE_DELETED` | upstream returned 404 — **demoted** | ″ |
| `CORRUPT_OR_INVALID` | revalidation re-fetch came back empty/unreadable — **demoted** | ″ |
| `UNREADABLE` | reserved demoted state for binary/undecodable content | ″ |
| `QUARANTINED` | a **rejected import** — **no row is ever created** | audit only (`IMPORT_QUARANTINED`) |
| `CANCELLED` | admin withdrew the row | ledger `status` |
| `RETIRED` | admin retired from active use (reversible) | `details.context_lifecycle` |

A row with **no** `source_integrity` (every manual seed + every pre-existing
row) is **active by definition** — absence never demotes.

---

## The 16 assurance questions

**Q1 — Can a corrupted/binary document be imported as trusted context?**
No. A pure `validateImportedText()` gate runs at the export seam
(`fetchGoogleDocTextForOrg`) **before** the content hash and before any row is
created: a null byte, or non-printable control chars exceeding 10% of length,
returns `SOURCE_UNREADABLE`. The import is refused, `IMPORT_QUARANTINED` is
audited, and **no `DOCUMENT_CONTEXT` row exists** — no partial trusted row.

**Q2 — Can an empty document be imported?**
No. Empty / whitespace-only text returns `SOURCE_EMPTY` at the same gate — no
row, `IMPORT_QUARANTINED` audited. (Previously the import path bypassed the
manual-paste empty gate; that hole is closed.)

**Q3 — Is the content hash computed before or after validation/size?**
The size refusal (`DOC_TOO_LARGE`) and the empty/binary validator both run
**before** the hash. A rejected export is never hashed and never stored.

**Q4 — Oversized documents — truncate or refuse?**
Refuse. `GOOGLE_DOC_EXPORT_MAX_CHARS = 20_000`; over that the export returns
`DOC_TOO_LARGE` and imports nothing. There is no silent truncation-into-trust.

**Q5 — Partial / interrupted exports?**
Transport-level failures (timeout, non-200, 404) return an honest error and
create no row. A 200 response whose body is empty/binary is caught by the Q1/Q2
validator. (A 200 with a *silently truncated but still-plausible* body remains
the one residual edge — flagged in the gap ledger; upstream `modified_time` +
hash give the revalidation path a later detection hook.)

**Q6 — What happens when the upstream document CHANGES after import?**
The admin-triggered revalidation re-fetches, and a diverging hash sets state
`CHANGED_UPSTREAM`, records the **new** hash as `upstream_hash`, and **preserves
the imported snapshot** (`import_hash`, body, and `external_source.content_sha256`
are never overwritten). The row is demoted out of active retrieval; audit
`SOURCE_CHANGED_UPSTREAM`.

**Q7 — Upstream DELETED (404)?**
Revalidation sets `SOURCE_DELETED`, demotes the row, audits `SOURCE_DELETED`.
The preserved snapshot remains as history but never answers as current.

**Q8 — Access REVOKED (403 / reauth)?**
Revalidation sets `ACCESS_REVOKED`, demotes, audits `SOURCE_ACCESS_REVOKED`.

**Q9 — How are stale / changed / revoked / corrupt sources demoted from
answers?**
All three answer-retrieval pools — `context-candidates`, `background-answer`,
`context-boundaries` — now **allowlist** to ledger `status === "VERIFIED"`
**and** skip any row where `isSourceIntegrityDemoted(details)` is true (the
demoted set = CHANGED_UPSTREAM / ACCESS_REVOKED / SOURCE_DELETED /
CORRUPT_OR_INVALID / UNREADABLE). Demotion is expressed via
`source_integrity.state`, **never** by mutating ledger status — the
load-bearing integration test proves a revalidated-changed row leaves all three
pools **while its `status` stays `VERIFIED`**.

**Q10 — Are withdrawn (CANCELLED) / retired / quarantined rows excluded from
answers?**
Yes — and this closed a real leak. Previously the pools filtered only
`org + ledger_type`, so a `CANCELLED` doc kept answering. The VERIFIED allowlist
excludes CANCELLED and every non-active terminal status; `isContextRetired`
(context-lifecycle) and `SUPPRESSED_STATES` (context-relevance) filters are
preserved; quarantined imports never became rows in the first place.

**Q11 — Permission / Twin boundary?**
Unchanged and intact: documents are ownerless reference context with
`extract_work:false` — they never mint work, never write a personal wallet,
never authorize a Twin action; the retrieval surface is manager/admin-gated
(non-managers get an empty candidate set) and always carries
`should_not_act:true`. Demotion only ever **removes** trust; it never grants any.

**Q12 — Admin-visible, not employee-visible?**
Revalidation and quarantine are admin-gated (`can_admin_org`) and their audit
events carry only `provider + file_id + state + reason`. Demoted/quarantined
sources simply **stop appearing** in employee-facing answers — an employee sees
silence, not an error surface; the admin sees the state + audit trail.

**Q13 — What audit events were added?**
Six, mirrored into the CT vocabulary as customer-facing labels:
`SOURCE_VERIFIED`, `SOURCE_CHANGED_UPSTREAM`, `SOURCE_ACCESS_REVOKED`,
`SOURCE_DELETED`, `IMPORT_QUARANTINED`, `IMPORT_FAILED`.

**Q14 — Was a schema migration required?**
No. Confirmed `status` and `event_type` are validated Strings and `details` is
additive JSON. Zero Prisma changes.

**Q15 — What is proven LIVE vs mocked, and why?**
Only **same-hash = current** is provable live against a real, unchanged founder
doc (`test:e2e:live:source-integrity` on Meridian: import one real doc →
revalidate → `AVAILABLE`, `changed:false`, no token leak → sweep-clean). The
mutation branches — CHANGED_UPSTREAM / SOURCE_DELETED / ACCESS_REVOKED /
CORRUPT_OR_INVALID — are proven in FND integration
(`tests/integration/source-integrity.test.ts`) via an **injected fetch seam**,
**not live**, because proving them live would require corrupting, deleting, or
revoking a real founder document, which is forbidden.

**Q16 — Source lineage / currentness / snapshot discipline?**
Every imported row carries full lineage (`external_source`: system, file_id,
modified_time, web_view_link, content_sha256) plus `source_integrity`
(import_hash == content_sha256, import_modified_time, last_verified_at). The
import hash is the **immutable snapshot anchor**; revalidation compares against
it and records divergence separately (`upstream_hash`) without ever overwriting
it. A transient/infrastructure error during revalidation returns
`REVALIDATION_UNAVAILABLE` and **leaves a good snapshot untouched** — a network
blip can never silently demote trusted context.

---

## Verification

- **FND:** typecheck 0 errors · unit 14 (10 prior + 4 new) · integration 17
  (13 prior + 4 new) · no-leak 2 · all 5 CI checks green on PR #593.
  Independently re-run: typecheck 0, source-integrity integration 4/4.
- **CT:** typecheck 0 · lint clean · 2244 unit tests pass · live spec
  typecheck + lint clean.
- **No schema migration.**

## Residual gaps (tracked, not silently closed)

1. A 200 export with a silently truncated-but-plausible body is not detected at
   import (only at the next revalidation, if the truncation changed the hash).
2. Revalidation is **manual** (admin-triggered) by design — no auto-sync daemon
   (consistent with the no-auto-sync doctrine). Bulk/scheduled revalidation is a
   future slice, not a v1 gap.
3. The revalidation HTTP route's admin gate is copied verbatim from the
   already-tested import route; the branch logic is fully covered at the service
   level via the fetch seam.
