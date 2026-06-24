# Live Smoke Evidence

Proof that the deployed Otzar app embodies the **Communication → Governed Work Movement**
loop (`PRD-00`). Two tiers: **non-credentialed** (run anywhere, no secrets) and
**credentialed** (real standard-user browser session; env-gated).

## Deployed app (last verified 2026-06-23)

- App: `https://app.otzar.ai` → **HTTP 200**
- Bundle: **`assets/index-CZq49S0n.js`** (Phase 4C)
- API: `https://api.otzar.ai/api/v1`

## Phase coverage live

`2.5 → 2.5+ → 2.6 → 2.7 → 2.8 → 2.9 → 3A → 3B → 3C → 3D → 3E → 4A → 4B → 4C`
(3F + 4D are harness/docs). Employee loop: current context / latest meeting transcript →
digest → proposed actions → save/send → tracking → correction → correction history +
saved-corrections readback → governed work movement.

## Automated coverage (no secrets, deterministic — `npm test`)

- **1720 unit/integration tests passing**, incl. the Phase 3F end-to-end walkthrough
  (`tests/unit/ambient-otzar-bar.test.tsx` → "end-to-end: context → digest → actions →
  save → send → tracking → correction → history → missing-context").
- Per-feature suites: `work-context`, `transcript-intelligence`, `transcript-actions`,
  `transcript-ingestion`, `work-tracking`, `work-corrections`, `ambient-visibility`.
- MSW-mocked; asserts no backend terms / raw ids / global-learning copy.

## Non-credentialed live evidence — `npm run smoke:evidence`

Verifies the **deployed** app without any login. Captured run (2026-06-23):

```
app HTTP: 200
bundle:   assets/index-CZq49S0n.js
markers present: "Using the latest transcript", "Proposed actions",
                 "Recent corrections", "Saved corrections",
                 "What should I use as the current context", "Save, send, or dismiss each"
auth-gated rails: otzar/meeting-captures -> 401
                  otzar/my-twin/corrections -> 401
                  work-os/resolve-target -> 404 (POST-only; GET not served)
=> OK (exit 0). User-flow pass NOT claimed without the credentialed run.
```

This proves: the deployed bundle contains the shipped employee-flow surfaces, and the
governed rails are not openly readable. It does **not** prove the user-level flow — that
needs the credentialed run below.

## Credentialed live smoke — `npm run test:e2e:live` (env-gated)

Playwright spec `tests/e2e/otzar-employee-flow-live.spec.ts` + config
`playwright.live.config.ts`. **Skips cleanly when creds are absent**; never logs secrets;
**read-mostly** (the one write — a preference correction to the user's own scoped memory —
runs only with `OTZAR_SMOKE_ALLOW_WRITES=1`).

Required env (no defaults invented; secrets never committed):

```
OTZAR_SMOKE_EMAIL=<demo user email, e.g. a provisioned standard user>
DEMO_SHARED_PASSWORD=<demo password>
# optional, to exercise the one scoped-memory write:
OTZAR_SMOKE_ALLOW_WRITES=1
# optional override:
OTZAR_SMOKE_BASE_URL=https://app.otzar.ai
```

Run:

```
OTZAR_SMOKE_EMAIL=… DEMO_SHARED_PASSWORD=… npm run test:e2e:live
```

It verifies, against the live app: (A) login/session loads the shell with no auth error;
(C) "Use the latest transcript" → one honest outcome (loaded / missing-text / not-found /
which-one); (I) "Ask David to review this" with no context → "What should I use as the
current context?"; (F) "What is blocked?" → honest tracking; (G/H, gated) a preference
correction → "Recent corrections"; (H) "Saved corrections" readback loads / empty / calm
error; and that no `CROSS_ORG_DENIED` / `correction_capsule_id` / `meeting_capture_id`
appears in the employee-facing DOM.

## Status

| Check | State |
|---|---|
| App + bundle live | ✅ verified |
| Bundle markers present | ✅ verified |
| Governed rails auth-gated | ✅ verified (meeting-captures/corrections 401; resolve-target POST-only) |
| Automated employee-flow (mocked) | ✅ 1720 passing |
| **Credentialed standard-user live flow** | ⏳ **runnable, NOT yet run** — needs `OTZAR_SMOKE_EMAIL` + `DEMO_SHARED_PASSWORD` |

**Not claimed without the credentialed run:** the real user-level pass across login →
governed rails (resolve-target read-scope, collaboration, ledger, correctionMemory,
meeting-captures). Everything else above is verified.
