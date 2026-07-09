# App navigation continuity — safe Back button + unsaved-work protection

**Block:** APP NAVIGATION CONTINUITY + SAFE BACK BUTTON + UNSAVED WORK
PROTECTION (2026-07-08, Opus 4.8). CT-only build; no Foundation change; no
schema; no client-side custody of enterprise data.

## What shipped

1. **Upper-left Back / Return affordance** (`AppBackButton`) in **both**
   authenticated shells — admin Control Tower (`Layout.tsx`, fallback `/`) and
   employee Otzar (`EmployeeLayout.tsx`, fallback `/app`). Premium frosted glass
   button, real `<button aria-label="Go back">`, keyboard-focusable. Never
   rendered on `/login` (it lives inside the authenticated shells). z-safe: sits
   in the header's normal flow, below the ambient orb (z-60) and the portaled
   notification dropdown (z-70) — no stacking conflict.

2. **Safe route-history behavior.** The button reads the incrementing `idx` that
   the data router stamps on `history.state`:
   - `idx > 0` → `navigate(-1)` walks the in-app history. Because login uses
     `replace`, `-1` never lands on `/login`, and the first in-app entry never
     steps back to an external referrer.
   - `idx === 0` (deep link / fresh tab) → `navigate(fallback)` goes to the
     shell's safe home instead of bouncing out of the app.
   - No dead button: it hides only when there's genuinely nowhere to go (no
     in-app history AND already on the fallback home).

3. **Unsaved-work protection** (`NavigationGuard` + `useUnsavedChanges`):
   - **In-app guard** — `useBlocker` (from the data router) intercepts **every**
     in-app navigation vector — sidebar links, the Back button, and programmatic
     `navigate()` — and shows one calm dialog: *"You have unsaved changes. Leave
     this page?"* with **Stay on page** / **Leave without saving**.
   - **Native guard** — a `beforeunload` listener is armed while any form is
     dirty, covering hard reload / tab close / cross-origin navigation (the one
     vector an in-app router cannot see). Browsers show their own generic prompt
     and ignore custom text by design — so we arm the flag only; the calm custom
     copy applies to in-app navigation.
   - **Never a silent discard, never a trap.** Esc / outside-click / the dialog
     X all resolve to **Stay** — an accidental dismiss never discards work.
   - Wired end-to-end on the **Writing style** calibration form
     (`/app/my-twin/calibration/writing-style`) as the reference adoption.

4. **Router migration** — `App.tsx` moved from `<BrowserRouter><Routes>` to
   `createBrowserRouter(createRoutesFromElements(<same tree>))` + `RouterProvider`.
   The entire route map is byte-for-byte the prior content (adapted via
   `createRoutesFromElements`); the migration is what unlocks a **stable**
   `useBlocker`. All ~70 routes + both guards regression-verified by the full
   suite.

## Security posture (non-negotiable, all honored)

- **No client-side custody of enterprise data.** The unsaved-work registry
  tracks only a per-form **boolean** ("is there unsaved input right now"), keyed
  by a stable string. It **never** reads, serializes, or persists form values,
  and writes **nothing** to `localStorage` / `sessionStorage` / cookies. Unit
  test asserts both storages stay empty while a form is dirty.
- **No durable-draft shortcut.** Durable drafts, if ever wanted, are a
  Foundation-backed feature (gap ledger) — deliberately NOT built here to avoid
  custodying content client-side.
- **Navigation convenience does not weaken security.** The Back button only ever
  targets in-app routes or the shell's safe home; guards and auth are unchanged.

## Coupling to session continuity (deep-link return) — deferred WITH Section 16

Deep-link *return-to-previous* after a hard reload is downstream of the
enterprise session-continuity work, which is **STOP-and-documented** (see the gap
ledger): the JWT is memory-only by design, a secure restore requires the Section
16 HttpOnly-cookie + `/auth/me` backend/CORS change, and `localStorage` is
prohibited. With a memory-only token the session cannot survive a reload
regardless of router work, so deep-link return stays deferred with Section 16.
**The Back button does not depend on it and ships independently** — exactly as the
directive instructed.

**UPDATE 2026-07-09:** the Section 16 preflight is complete and the earlier
"backend redesign" read was over-conservative — the stateful session machinery
already exists, so session continuity is a *transport addition* (HttpOnly cookie +
`GET /auth/me`), SAFE TO IMPLEMENT, awaiting founder GO. Once it lands, deep-link
return works via `/login?returnTo=<path>` on restore failure. Full plan:
[`OTZAR_SECTION_16_SESSION_CONTINUITY_PLAN.md`](./OTZAR_SECTION_16_SESSION_CONTINUITY_PLAN.md).

## Verification

- `npm run typecheck` — 0 errors. `npm run lint` — 0 warnings. `npm run build` —
  success. Full `npm run test` — green (12 new unit tests for the primitive, the
  Back button, and the guard).
- **Unit** proves the safety-critical paths that don't complete a data-router
  navigation (block, Stay, registry cleanup, Back-history logic). **Live E2E**
  (`otzar-live-nav-continuity.spec.ts`, real Chromium) proves the
  navigation-completing paths — Back walks history, clean page shows no prompt,
  Stay keeps the work, Leave proceeds — because a completed data-router
  navigation under jsdom+undici+MSW hits an `AbortSignal instanceof` env
  incompatibility. Each property is proven where it can be proven reliably.
- Live-verified on **Meridian only**; demo org untouched; no Meridian mutation
  (the typed sample never leaves the page and "Propose" is never clicked).

## Known limitation (honest)

- `beforeunload` yields the **browser's generic** prompt for reload/close; the
  calm custom copy applies to in-app navigation only. This is a browser
  constraint (custom `beforeunload` text is ignored), not a gap we can close.
- The guard is armed per-form via `useUnsavedChanges`; the **Writing style** form
  is the reference adoption. Other input-bearing pages adopt the one-line hook
  incrementally — the primitive is trivially reusable and the guard + Back button
  already cover every navigation vector for any form that opts in.
