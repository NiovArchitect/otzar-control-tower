# Section 16 — Enterprise session continuity (HttpOnly cookie + `/auth/me`)

**Status:** ✅ **GO'd (A1 + B1) and IMPLEMENTED, 2026-07-09 (Opus 4.8).** Foundation
half is **LIVE** on api.otzar.ai (merged PR #597, `54db932`), live-probed green.
CT half implemented + deploying. The preflight verdict below (SAFE TO IMPLEMENT,
no STOP condition) held end-to-end. Original plan preserved for the record.

**Auto-lockout hardening (FND `95cf937`, PR #598, 2026-07-09):** the residual gap
is CLOSED — the 5-failed-attempt auto-lockout now also calls
`invalidateEntitySessions`, so ALL THREE suspension paths (admin suspend,
AI-teammate deactivate, auto-lockout) invalidate live sessions immediately (an
existing Bearer on another device fails on the next request, not just restore).

**Live-probe of deployed FND (2026-07-09):** login sets `otzar_session` (`HttpOnly;
Secure; SameSite=Lax; Path=/`, host-only, expires with session); `/auth/me`
cookie-only → 200 + `no-store` + fresh caps; no cookie → 401; **Bearer route
`/auth/validate` cookie-only → 401** (invariant holds in prod), with Bearer → 200;
logout → 200 then `/auth/me` old cookie → 401. Decisions shipped: **A1** (reuse the
8h session JWT in the cookie) + **B1** (`invalidateEntitySessions` on suspend).

---

## (original) PLAN — awaiting GO

**Status:** Phase-0 preflight COMPLETE, 2026-07-09 (Opus 4.8). Grep-first across
both repos (FND `71c3fa7`, CT `fdb30d37`). **Verdict: SAFE TO IMPLEMENT — no STOP
condition fires. No code written. Awaiting founder GO on two decisions below.**

> This reverses the earlier conservative STOP ("safe restore requires a backend
> redesign"). Deeper inspection shows the stateful machinery already exists — this
> is a **transport addition, not a redesign.**

---

## 1. Current auth architecture (evidence)

**FND is NOT a stateless-JWT design.** It already has:
- A server-side `sessions` table — Prisma `model Session` (`packages/database/prisma/schema.prisma:283-307`): `session_id`, `entity_id`, `tar_hash_at_creation`, `allowed_operations[]`, `clearance_ceiling`, `issued_at`, `expires_at`, `last_activity_at`, `idle_timeout_minutes`, `status` (ACTIVE/EXPIRED/TERMINATED/INVALIDATED).
- **Per-request revocation** — `validateSession` (`apps/api/src/services/auth.service.ts:409-543`) on every request verifies the JWT signature+expiry, **then** re-reads the DB session row (rejects absent/TERMINATED/INVALIDATED/EXPIRED), enforces idle-timeout, **re-fetches the live TAR and rejects on `tar_hash` mismatch**, and requires a Redis nonce keyed by `session_id`. Middleware `requireAuth` (`apps/api/src/middleware/auth.middleware.ts:56-90`) reads `Authorization: Bearer` and calls it.
- **Real logout** — `POST /auth/logout` (`auth.routes.ts:240-250`) → `authService.logout` terminates the DB row + deletes the Redis nonce + audits (`auth.service.ts:382-399`).
- **Password-change session invalidation** — `POST /auth/change-password` sets all OTHER active sessions to INVALIDATED in-txn (`auth.routes.ts:147-154`).
- **TAR rehydration function** — `getTARByEntityId(entityId)` (`packages/database/src/queries/tar.ts:297-319`) + `narrowOperations(tar, requested)` (`auth.service.ts:171-182`) → current `allowed_operations` + `clearance_ceiling`. This is exactly what `/auth/me` reuses.
- An existing `GET /auth/validate` (`auth.routes.ts:252-265`) — effectively `/auth/me` **behind Bearer** — and a `POST /auth/refresh` (rolling-window; NOT what we want, see §4).

**The access token is NOT short-lived.** `jwt.sign` with `expiresIn` from `OrgSettings.session_timeout_minutes`, **default 480 min / 8h** (`auth.service.ts:303-346`), HS256, `JWT_SECRET` from env (`server.ts:303-308`). Claims: `session_id, entity_id, allowed_operations, clearance_ceiling, tar_hash, expires_at, issued_at`.

**CORS is already credentialed + exact-origin.** `@fastify/cors` registered with **`credentials: true`** (`server.ts:734-750`), origin is an **exact-match allowlist** driven by `CONTROL_TOWER_URL=https://app.otzar.ai` (`render.yaml:42-43`) — never `*`. Locked by test `tests/integration/cors-allowlist.test.ts:143`. **No CORS change needed.**

**CT holds the token in memory only.** `src/lib/stores/auth.ts` — Zustand, no persist, header comment explicitly bans localStorage/sessionStorage/cookies and names Section 16. `isLoading` field + guards already render an "Authenticating…" state (`AuthGuard.tsx:24-34`, `EmployeeGuard.tsx:26-36`). `deriveCapabilities()` maps `allowed_operations`. `api.ts request()` injects Bearer from memory; **no `credentials:'include'` anywhere; no `/auth/me` method; no `returnTo` capture; guards `<Navigate to="/login" replace/>`; `Login.tsx` redirects via `landingPathFor`, no `returnTo`.**

## 2. Why hard reload still bounces

By design: the JWT lives in memory-only Zustand; a page reload wipes it; nothing restores it on boot (`main.tsx` just mounts `<App/>`; `App.tsx` renders `RouterProvider` immediately — no boot `/auth/me`). The guards then see `isAuthenticated:false` and redirect to `/login`.

## 3. Safe Section 16 architecture

**One-line:** login *additionally* sets an HttpOnly·Secure·SameSite=Lax cookie carrying the existing session JWT; on boot CT calls `GET /auth/me` **with credentials** to re-validate server-side and rehydrate the memory-only store; everything else (Bearer API auth, per-request revocation, logout) is unchanged.

```
Login (POST /auth/login)
  → body: { token, session_id, expires_at, allowed_operations, clearance_ceiling }   (unchanged)
  → ALSO Set-Cookie: otzar_session=<session JWT>; HttpOnly; Secure; SameSite=Lax; Path=/   (host-only on api.otzar.ai)

CT boot (SessionBootstrap wrapper, before RouterProvider)
  → GET /auth/me  (credentials:'include', Cache-Control honored)
       FND: read cookie ONLY here → validateSession(jwt) [existing per-request revocation]
            → reject if entity suspended  → 200 { token, entity, allowed_operations, clearance_ceiling, org_shell }
       CT: setState(memory token + capabilities) → render app on the intended route
  → 401 / network-error / timeout → render app; guards redirect to /login?returnTo=<path>

API calls  → Authorization: Bearer <memory token>   (UNCHANGED — cookie NEVER authenticates these)
Logout     → POST /auth/logout (terminates session) + clears cookie server-side + clears CT memory
```

### CRITICAL INVARIANT (security guardrail)
**The cookie authenticates `GET /auth/me` and NOTHING else. `requireAuth` (every mutation/read route) stays Bearer-only.** Because app.otzar.ai and api.otzar.ai are **same-site** (shared eTLD+1 `otzar.ai`) — the very property that lets SameSite=Lax work for restore — SameSite=Lax provides **no CSRF protection** on api.otzar.ai (and a second same-site frontend `FOUNDATION_COMMAND_URL` exists in the origin builder). If the cookie could authenticate mutations, every POST/PATCH/DELETE would be CSRF-reachable. Mutations stay safe **only** because they require the in-memory Bearer token, which no other-subdomain/cross-origin attacker can read. `/auth/me` itself is CSRF-safe: it is an idempotent GET, a cross-site fetch can neither read its body (CORS exact-origin) nor send the cookie (Lax blocks cross-site fetch).

### Domain / SameSite (unambiguous)
app.otzar.ai ↔ api.otzar.ai are **same-site** (SameSite is classified by registrable domain, not host). So a same-site `fetch` sends `SameSite=Lax` cookies. Correct combination: **`HttpOnly; Secure; SameSite=Lax`, host-only on api.otzar.ai (no `Domain` attribute).** `SameSite=None` and `Domain=.otzar.ai` are **not** needed (and `Domain=.otzar.ai` would needlessly widen the surface to every otzar.ai subdomain).

### Cookie value: reuse the session JWT (no `COOKIE_SECRET`)
The cookie carries the existing session JWT, which is **already HS256-signed by `JWT_SECRET`** and tamper-evident. Register `@fastify/cookie` **unsigned** (for `request.cookies` parsing only) → **no `COOKIE_SECRET`, no new env, no Render dashboard action.** (COOKIE_SECRET is optional defense-in-depth double-signing, not required.)

## 4. Storage / custody decision

| Concern | Decision |
|---|---|
| Access token | **Memory-only** (unchanged). |
| Session/restore credential | **HttpOnly·Secure·SameSite=Lax cookie** — NOT JS-readable → immune to XSS storage theft. |
| localStorage / sessionStorage for auth | **None** (unchanged; CT live sweep already 0/0 keys). |
| Google tokens / documents / transcripts / org context / source content | **Never in browser storage** (unchanged; out of scope). |
| Permissions | **Rehydrated from Foundation on every restore** via `validateSession` (live TAR re-check) — never trust stale client permissions. |
| Logout | Clears **server** (terminate session + Redis nonce) **and client** (memory + cookie). |

**`/auth/me` reuses the existing session — it does NOT mint a new session row** (that's why we reject `POST /auth/refresh`, whose rolling-window would bloat the `sessions` table on every reload). It validates the cookie's session and returns that token, with capabilities re-derived server-side.

## 5. Cookie / CORS / domain requirements

- **CORS:** none — `credentials:true` + exact-origin app.otzar.ai already in place.
- **Cookie:** add `@fastify/cookie` dep, register unsigned; set cookie in login route; clear in logout route.
- **Domain:** host-only api.otzar.ai, `SameSite=Lax`, `Secure`, `HttpOnly`.
- **`secure: true` set EXPLICITLY (never `'auto'`).** The container serves HTTP internally behind Render's TLS edge and Fastify has no `trustProxy` (`server.ts:689`); `'auto'` reads `req.protocol==='http'` and would silently drop the Secure flag → cookie never sets. `secure:true` is correct.
- **`Cache-Control: no-store` on `/auth/me`** (it returns a token in its body).
- **Env / dashboard:** **NONE** (no COOKIE_SECRET, no COOKIE_DOMAIN, no CORS edit).

## 6. Schema requirements

**NONE.** The `sessions` table (`schema.prisma:283-307`) already holds the full session lifecycle. No migration.

## 7. Security risks & mitigations

- **CSRF** → cookie authenticates `/auth/me` only; mutations stay Bearer (see §3 invariant). SameSite=Lax + CORS exact-origin + idempotent GET.
- **XSS token theft** → cookie is HttpOnly (not JS-readable); access token is memory-only (dies on reload); no token in JS storage.
- **Stale permissions** → every restore re-validates the live TAR (`validateSession` tar_hash check); capabilities never trusted from the client.
- **Suspended/revoked restore** → password-change (invalidates other sessions) ✓, TAR revocation (tar_hash mismatch) ✓. **Suspension gap (see Decision B).**
- **Idle-timeout** → `validateSession` enforces `idle_timeout_minutes`; a restore after idle-expiry will still legitimately bounce to login. **Documented expected behavior, not a bug.**

## 8. Exact implementation sequence (Foundation FIRST, per cross-repo discipline)

### Commit 1 — `[SECTION-16-FOUNDATION]` (FND; PR + CI + squash; manual Render deploy)
1. Add `@fastify/cookie` to `apps/api/package.json`; register unsigned in `buildApp` near CORS (`server.ts:~734`).
2. `POST /auth/login` (`auth.routes.ts:35-77`): on success, `reply.setCookie('otzar_session', token, { httpOnly:true, secure:true, sameSite:'lax', path:'/' })`. Body unchanged.
3. New `GET /auth/me` (`auth.routes.ts`): read `request.cookies.otzar_session` → `authService.validateSession(token)` → **reject if entity status ≠ ACTIVE** (Decision B) → `reply.header('cache-control','no-store')` → return `{ ok, token, entity:{ email }, allowed_operations, clearance_ceiling, org_shell }`. 401 on missing/invalid/revoked cookie. **This is the only route that reads the cookie.**
4. `POST /auth/logout` (`auth.routes.ts:240-250`): also `reply.clearCookie('otzar_session', { path:'/' })`.
5. (Decision B, recommended) call existing `invalidateEntitySessions(entityId)` (`tar.ts:496-505`) on the suspend path.
6. Integration tests (§9). Merge, deploy, live-verify `/auth/me` behind the cookie.

### Commit 2 — CT (after FND live; manual Render deploy)
1. `api.ts`: add `credentials:'include'` to the shared `request()` `RequestInit`; add `api.auth.me()` → `GET /auth/me`, with 401 handled as **"no session"** (silent, not the scary `SESSION_INVALID` toast — respect `login-auth-route.test.ts`).
2. `App.tsx`: add a `<SessionBootstrap>` wrapper gating the first render — on mount call `api.auth.me()`; success → `setState(authed)`; 401 / **network-error / timeout (bounded, e.g. 8s)** → fall through and render `RouterProvider` (guards redirect). **Must never hang on "Authenticating…" forever.** Store initial state untouched (so the ~90 seeding tests are unaffected).
3. Guards (`AuthGuard.tsx:37`, `EmployeeGuard.tsx:39`): capture attempted location → `/login?returnTo=<path>`.
4. `Login.tsx`: read `returnTo` (via `useLocation`/searchParams) and prefer it over `landingPathFor` after login.
5. Logout: unchanged in CT (server now clears the cookie).
6. Tests (§9). Deploy, live-verify on Meridian.

## 9. Test plan

- **FND integration:** login emits `Set-Cookie` with HttpOnly/Secure/SameSite=Lax; `/auth/me` valid cookie → 200 + fresh caps; no cookie → 401; after logout → 401; after password-change (other session) → 401; suspended entity → 401 (new check); after TAR change → 401; `no-store` header present; existing `cors-allowlist.test.ts` stays green.
- **CT unit:** `SessionBootstrap` (loading → success → authed render; 401 → guards redirect; timeout/error → fall through, no infinite spinner); `api.auth.me` 401 handled silently; `returnTo` capture + `Login` honors it; existing `auth-guard` / `employee-guard` / `login-auth-route` contracts preserved.
- **CT live (Meridian):** hard reload on a protected page **stays authenticated** (the headline win); deep link → restores; logout → reload → bounces to login; storage sweep stays 0/0 (cookie is HttpOnly, invisible to JS); demo org untouched; zero residue.

## 10. Deployment order & prerequisites

Foundation lands first (`[SECTION-16-FOUNDATION]` PR → 5 CI checks → squash → manual Render deploy → live `/auth/me` probe), THEN CT (manual Render deploy → Meridian live-verify). **No Render dashboard/env/CORS/domain action required.** New FND dependency (`@fastify/cookie`) → `npm install` clean-check applies.

## 11. Stop conditions — NONE fire

- Unsafe browser storage required? **No** (HttpOnly cookie + memory token).
- Cookie/CORS/domain ambiguous? **No** (CORS already credentialed+exact-origin; same-site Lax host-only; no dashboard action).
- Schema migration required? **No** (sessions table exists).
- Backend auth boundary unclear? **No** (per-request revocation + TAR rehydrate already exist; cookie scoped to `/auth/me` only).
- Token/secret exposure risk? **No** (HttpOnly, Secure, memory-only access token, no new secret).
- Demo-org mutation risk? **No** (auth infra; live-verify on Meridian only).

## 12. TWO DECISIONS FOR THE GO GATE

**Decision A — token model.** The preferred-architecture premise ("short-lived access token") does not match reality: the token is **8h**, and the backend does **per-request revocation** instead of relying on short TTL.
- **A1 (recommended):** reuse the existing 8h session JWT in the cookie. Lower-risk *here* because a leaked token is already server-revocable on every request; minimal code. Diverges from the literal "short-lived" wording.
- **A2:** build a true short-lived access token + separate refresh cookie. More work — decouples access TTL from `session_timeout_minutes`, new refresh semantics. Only worth it if you want the memory token itself to be short-lived independent of server revocation.

**Decision B — suspension fix scope.** Today a plain suspend neither invalidates sessions nor is re-checked per request (`validateSession` never reads `entity.status`).
- **B1 (recommended):** call the existing `invalidateEntitySessions(entityId)` on the suspend path → closes suspension for **every** request, reuses existing code. Fully meets "suspended cannot restore" and more.
- **B2 (minimal):** only add an `entity.status` check inside `/auth/me` → meets "suspended cannot **restore**", but the **per-request suspension gap stays open** (a suspended user's existing Bearer token keeps working until expiry/TAR change). Must be documented as out-of-scope-remaining if chosen.

**Recommendation: A1 + B1.** Await GO before any code.
