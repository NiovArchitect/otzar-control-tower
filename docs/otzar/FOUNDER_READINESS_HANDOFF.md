# Otzar — Founder / Investor Readiness Handoff

One-page status. Full detail: [`LIVE_COLLABORATION_MATRIX.md`](./LIVE_COLLABORATION_MATRIX.md).

- **Date:** 2026-06-24 · **Live:** `https://app.otzar.ai` (HTTP 200) · **Bundle:** `assets/index-D4ZZRLi7.js` (deploy `dep-d8to6f3tqb8s73eiu54g`)
- **Verdict:** **Enterprise-demo ready, with honest caveats.** The complete governed Work-OS loop is proven live; the two properties that can't be safely shown on the production tenant are proven at the stronger Foundation authorization-guard tier. Nothing is faked.

## Final scores
| Check | Result |
|---|---|
| Live collaboration matrix (`test:e2e:live:matrix`, with writes) | **64 PASS / 1 FAIL / 5 SKIP** |
| Admin RBAC (`test:e2e:live:admin`) | **7 PASS / 0 FAIL / 2 SKIP** |
| Standard employee smoke (`test:e2e:live`) | **PASS** |
| Non-credentialed evidence (`smoke:evidence`) | **PASS** |
| Unit suite | **1741 passing** |
| Foundation authorization guards (DB-backed) | **79 passing** (cross-org + escalation + resolver) |

The single matrix FAIL is the **intentional in-memory session** (hard refresh → re-login), not a defect.

## Live-proven (against app.otzar.ai)
- **Communication → governed work movement** end-to-end: context → digest → proposed actions → save/send → tracking → correction → memory readback.
- **Dynamic, org-scoped people resolution** — real org people resolve; unknown → asks; **no demo-name fallback, no cross-tenant leak**.
- **Governed routing to real people by name** (no raw IDs) and a **two-human round-trip**: sender sees "sent", **recipient sees the inbound request** (Accept/Reject).
- **Per-action owner attribution at team scale** — a 7-person transcript yields 7 owned actions (no collapsing).
- **Card-send feedback** — Send/Save show in-flight "Sending…/Saving…" then a governed terminal state (no dead buttons).
- **Admin RBAC** — Founder/admin reaches the Control Tower; standard user is denied; **admin/member asymmetry holds**; no backend leakage.
- **Correction memory** — applies, asks when ambiguous, no global-learning claim, no raw IDs; saved-corrections readback.
- **Natural-language intent coverage** — owner/due/supersession corrections, escalation/approval, vague-endpoint guard route to governed handlers, not generic chat.
- **Prompt-injection refused; no fake completion; no backend/policy-code leakage** anywhere in the audited flows.

## Foundation-guard proven (DB-backed integration tier — the real authorization guards)
- **Cross-org isolation** — `govsec-7-tenant-isolation-guard` (17): denies cross-org capsule / hive / escalation / department access; denies orphans.
- **Resolver org-scope** — `authority-context` (12): unknown name → NOT_FOUND, never a fallback.
- **Approval-positive** — `escalation` (38) + `escalation-target-resolver` (12): create PENDING → **approve / reject**, the real gate-creation path, and dual-control (caller ≠ approver).

Reproduce: `cd niov-foundation && npx vitest run --config vitest.unit.config.ts tests/unit/govsec-7-tenant-isolation-guard.test.ts tests/unit/authority-context.test.ts tests/unit/escalation.test.ts` → **79 passed**.

## Intentionally NOT faked (no green theater)
- **No second demo org created in production.** No live `Isolation Demo Org` / `otzar-isolation-user`.
- **No escalation row seeded** (would bypass the real gate-creation path).
- **No dedicated demo admin** (would require changing the Founder-locked provisioning allowlist).
- **No production authority, account, or allowlist mutated.** The Founder account was used **read-only** for admin verification.
- These two live matrix SKIPs (cross-org, approval click-through) are **deliberate**, with the proof moved to the stronger guard tier above.

## Why production was kept clean
The demo-org seed scripts are **localhost-fail-closed by design** and the prod provisioner is **Founder-allowlist-locked** ("exact allowlist only") — the architecture deliberately withholds prod multi-org/demo data. A new prod-writing seed would manufacture a withheld path and **permanently pollute the investor production tenant** (Rule 10: soft-delete only → a fake org could surface in the live demo). The integration-tier proof is both safer and *more* rigorous than a prod click-through. The one remaining choice — accepting a permanent demo org in the **production** tenant — is the Founder's to make consciously, not an autonomous one.

## Remaining caveats
- **Session durability** — in-memory auth by design; hard refresh logs out (secure refresh-cookie is forward work). *P2.*
- **Cross-org + approval live click-through** — not shown on prod (by design); proven at the guard tier.
- **Dedicated demo admin** + **admin user-management live write** — rails exist; deferred (Founder-gated / durable prod mutation).

## Recommended next environment
**Phase 6D — a staging / demo tenant (or a local Foundation instance), never the investor production tenant.** There, run the sanctioned demo second-org + approval-escalation seed and the live `cross-org` + `approval` click-through end-to-end. This converts the two deliberate SKIPs into a live demo **without** polluting production. Production stays exactly as it is today: one real org, clean, investor-ready.
