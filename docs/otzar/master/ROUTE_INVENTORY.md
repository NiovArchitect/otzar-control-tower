# C-01 Route / control inventory

**Requirement:** Full employee+admin route and control inventory; every screen earns existence.

**Source of truth (code):** `src/lib/nav/route-inventory.ts` — generated matrix from `EMPLOYEE_NAV`, `NAV`, redirects, route-only surfaces, and cull candidates.

**Unit proof:** `tests/unit/route-inventory.test.ts`

## Classes

| Class | Meaning |
| --- | --- |
| `primary` | Daily employee loop (Today · Talk · Needs me · People · Memory [· Team]) |
| `more` | Reachable from More drawer; not the daily path |
| `route_only` | Deep-link / power surface; not primary nav |
| `redirect` | Legacy alias → real surface |
| `cull_candidate` | Explicit hide / redirect / keep-deep-link decision |
| `admin_*` | Control Tower admin IA (`src/lib/nav.ts`) |

## Earns existence

| Value | Meaning |
| --- | --- |
| `yes` | Ships real product value; keep |
| `thin` | Valid deep-link or power surface; do not promote |
| `no` | Should not be a destination (cull / hide) |
| `redirect` | Not a destination; rewrite to primary |

## Cull decisions (this slice)

| Path | Recommended | Reason |
| --- | --- | --- |
| `/app/welcome` | redirect | Superseded by first-use walkthrough on Today |
| `/app/my-day` | redirect | Already → `/app` |
| `/app/workspace` | redirect | Already → `/app` |
| `/app/observe` | keep_deep_link | Operator surface; not employee daily path |
| `/admin/playground` | hide | Already hidden from primary admin nav (C-02) |

## Regenerating summary

```bash
npx vitest run tests/unit/route-inventory.test.ts
```

Inventory row count and class breakdown are asserted in unit tests; extend `EMPLOYEE_ROUTE_ONLY` / `CULL_CANDIDATES` when App.tsx gains or loses routes.
