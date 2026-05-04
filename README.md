# Otzar Control Tower

Administrative frontend for the NIOV Otzar platform. Talks to the
[`niov-foundation`](https://github.com/NiovArchitect/niov-foundation)
backend over HTTP.

## Stack

- **Framework**: Vite 5 + React 18 + TypeScript 5 (strict, with
  `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`)
- **Routing**: react-router-dom v6
- **Server state**: `@tanstack/react-query`
- **Client state**: `zustand` (auth + UI; never persisted to
  localStorage — JWT lives in memory only)
- **UI**: shadcn/ui (Radix primitives + Tailwind CSS)
- **Tests**: Vitest + Testing Library + MSW (unit) + Playwright (E2E)

## Architectural contracts

These four invariants are the contract that defines the frontend.
Every commit that touches them must keep them green.

1. **JWT in memory only.** No localStorage, no sessionStorage, no
   cookies. Page refresh = re-login. (Refresh-token-via-httpOnly-cookie
   lands in Section 16.)
2. **`src/lib/api.ts` is the only HTTP surface.** No `fetch()` outside
   that file. Every screen reads via TanStack Query + `api.*`.
3. **TypeScript contracts live in `src/lib/types/foundation.ts`.** When
   the Foundation API evolves, types update there and the build breaks
   at every stale call site.
4. **AuthGuard gates every protected route.** Redirects unauthenticated
   users to `/login`. Renders Access Denied when authenticated but
   without `can_admin_org`.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api → :3000
npm run build        # tsc -b && vite build
npm run test         # vitest run (unit)
npm run test:e2e     # playwright (auto-starts dev server)
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

## Environment

Copy `.env.example` to `.env.local` and adjust as needed:

```
VITE_FOUNDATION_API_URL=http://localhost:3000/api/v1
```

## Repo layout

```
src/
  components/    Layout, AdminSidebar, AuthGuard, ConnectionStatusIndicator, DataSovereigntyBadge, ui/*
  hooks/         use-mobile, use-toast, use-platform-health
  lib/
    api.ts       The single HTTP surface
    query.ts     TanStack Query client config
    utils.ts     cn() helper
    stores/      auth.ts (zustand, in-memory only)
    types/       foundation.ts (single source of truth for API shapes)
  pages/         16 main routes + Login + Approvals + 404
tests/
  unit/          Vitest + RTL + MSW
  e2e/           Playwright
  setup.ts       Vitest setup (RTL cleanup + jest-dom matchers)
```
