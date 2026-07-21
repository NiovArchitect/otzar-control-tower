# YC RC — npm vulnerability assessment (Control Tower)

**Date:** 2026-07-21  
**Command:** `npm audit` (no `npm audit fix --force`)  
**Summary:** 11 total (2 critical, 5 high, 4 moderate)

## Inventory

| Package | Direct | Severity | Fix | Production reachability | Exploitability in live SPA | Recommended action |
|---------|--------|----------|-----|---------------------------|----------------------------|--------------------|
| `vitest` | yes (dev) | critical | major → 4.x | **Dev only** | Live app does not run Vitest | Defer major upgrade to post-RC window |
| `@vitest/ui` | yes (dev) | critical | major → 4.x | **Dev only** | UI server not exposed in production | Defer with vitest |
| `vite` | yes (dev/build) | high | major → 8.x | Build-time; not runtime SPA host on Render static | Path traversal is **dev server** class | Defer major; rebuild uses locked vite 5.x |
| `vite-node` | no (dev) | moderate | via vitest major | Dev only | N/A live | Defer with vitest |
| `esbuild` | no (dev) | moderate | via vite major | Dev only | Dev server request class | Defer |
| `brace-expansion` | no | high | minor/patch | Transitive (tooling) | Low on SPA edge | Accept residual; re-audit after RC |
| `form-data` | no | high | patch | Possible transitive | CRLF in multipart builders — not used for browser render path | Accept residual; pin when safe |
| `js-yaml` | no | high | patch | Tooling/config load | DoS on merge keys — not public attack surface | Accept residual |
| `ws` | no | high | patch | Transitive (dev tools) | Memory DoS — not Render static SPA | Accept residual |
| `react-router` | no | moderate | patch | **Production SPA** | Open redirect via `//` path | Prefer **safe minor** upgrade when tests green |
| `react-router-dom` | yes | moderate | patch | **Production SPA** | Same as react-router | Prefer **safe minor** upgrade when tests green |

## Production posture

- Live Control Tower on Render serves a **static Vite production bundle**.
- Critical / high items in **vitest / vite / esbuild / vite-node** do not execute as the live edge.
- Only **react-router / react-router-dom** are clearly production runtime; severity moderate (open redirect).

## Decision for YC RC1

1. **Do not** run `npm audit fix --force` (breaks major tooling).
2. Defer vitest/vite major upgrades to a dedicated post-RC dependency PR with full browser re-proof.
3. Optionally apply non-major `react-router-dom` patch in a follow-up if `npm run build` + YC browser still pass.
4. Record residual: `NPM_AUDIT_11_RESIDUAL` on RC freeze.

## Foundation note

GitHub Dependabot reports separate findings on `niov-foundation` (16). Tracked independently; API security is not closed by CT SPA audit alone.
