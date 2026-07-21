# Otzar YC Proof Packet (internal)

**Phase:** `YC_RELEASE_CANDIDATE_HARDENING`  
**Status language:** bounded enterprise Work OS + full project loop proven; not unlimited scale.

> Credentials live only in operator secrets / `.r03-s250-state` (gitignored). **Never paste passwords into this packet.**

---

## 1. Product claim

> Otzar turns real organizational communication into governed execution. It resolves people, projects, decisions, ownership, permissions, AI collaboration, documents, meetings, changes, and reporting within one organizational source of truth.

## 2. Architecture summary (one screen)

| Layer | Role |
|-------|------|
| **Control Tower** (`app.otzar.ai`) | Human surface: Home, Talk, Needs Me, projects, Action Center, AI Teammates |
| **Foundation API** (`api.otzar.ai`) | Authority: identity, ledger, governance, connectors, extraction |
| **Connectors** | Google Docs / Calendar (and scopes for Meet when artifact exists) |
| **Work Ledger** | Tenant-scoped commitments, meetings, documents, blockers, obligations |

## 3. Exact live proof (pins — update at freeze)

| Pin | Value |
|-----|--------|
| Foundation SHA | `afe1491d882cbca4b0ce95db6f85ec0ad85dd16f` (`OTZAR_YC_RC1`) |
| Control Tower SHA | `c57052a00c8d1d6fbf0fc281d1e04fcd82f5046b` (`OTZAR_YC_RC1`) |
| Full-chain UI SHA | `80e36b4e1bc5694fb68b134cbb971411e7ca86fe` |
| otzar-api health | `git_commit=afe1491d…` |
| otzar-app | Render `srv-d8t1qpj7uimc73db2il0` |
| Live JS | `/assets/index-D8TMNmma.js` |
| Live CSS | `/assets/index-CyE4kMZQ.css` |
| R-03 org | `d7a270ed-d772-41f1-95bd-a8281bf0b2af` |
| Pilot project | `9481e76b-b618-46bc-93aa-3e63d4a0ac1a` |
| Google Doc | `1-Tyn5pAkU-fXOjMmh8Tkp9AN9rtncwhj3Xa46A7emX8` |
| Calendar event | `rqlod8caefrs7o7vkttqn49fes` (2026-09-18) |
| Material BLOCKER | `d44dc0ed-9bac-48b5-80e4-04f52bd56a95` |

## 4. Five-minute reviewer journey (backup script)

1. Login as YC reviewer (fresh browser / private window).
2. Land on **Home / Today** — org name R-03 visible; no Meridian leakage.
3. Open **Talk** — conversation that produced the pilot brief.
4. Open **project** — owners, decisions, Sep 18 date (not rejected Sep 11).
5. Open **Google Doc** link — real document with material risk note.
6. Open **Calendar** link — Sep 18 event.
7. Ask Twin: *What is my team doing?* / *Who owns this?* — answers cite live work.
8. Open **Needs Me / Action Center** — material reflection blocker if open; no formatting noise.
9. Work-style: show learned preference if present.
10. Cross-tenant: switch/login foreign demo principal — R-03 objects 404/403, zero content.

## 5. Demo accounts (roles only — passwords out of band)

| Role | Purpose |
|------|---------|
| YC Reviewer | Product walkthrough |
| R-03 Scale Admin | Manager / org admin proofs |
| R03P1 / R03P4 | Employee owners of extracted work |
| vishesh (demo tenant) | Cross-tenant negative |

## 6. Provider proof

| Capability | Classification |
|------------|----------------|
| Google Doc create + body | `LIVE_DOC_PROVIDER_PROVEN` |
| Calendar event 2026-09-18 | `LIVE_CALENDAR_PROVIDER_PROVEN` |
| Material vs formatting change | `LIVE_DOCUMENT_CHANGE_PROPAGATION_PROVEN` |
| Create retry no-dup (post-trust PR) | server `already_applied` |
| Meet | `MEET_PERMISSION_AVAILABLE_NO_ELIGIBLE_ARTIFACT` until eligible artifact |

## 7. Scale boundaries

| Claim | Status |
|-------|--------|
| ~200 live synthetic persons/Twins | Proven (R-03) |
| Bounded enterprise Work OS | `BOUNDED_ENTERPRISE_WORK_OS_PROVEN` |
| Unrestricted scale | **no** (`SCALE_PROVEN=no`) |
| S2500 | `FOUNDER_DEFERRED` |

## 8. Privacy / tenant isolation

- Adversarial pack: `LIVE_CROSS_TENANT_ZERO_LEAK`
- Foreign Google Doc append: `DOC_ARTIFACT_NOT_FOUND` (no existence leak of foreign content through Otzar)
- Employee ledger party-scope; project members may read project-linked connector artifacts after trust PR

## 9. Honest remaining limitations

- Meet not proven without eligible artifact
- npm audit residual (see `YC_RC_SECURITY_ASSESSMENT.md`)
- Historical create duplicates before idempotency PR may still exist in Drive (primary retained)
- Intent ledger deep-links require project linkage for non-owner reviewers
- Relay / compliance programs not in this RC

## 10. Fallback if Google unavailable

1. Show extraction → work → AI collab → reports on **provider-independent** path.
2. State honestly: Docs/Calendar need workspace reconnect.
3. Do not fabricate provider objects.
4. Use stored screenshots + proof links only if still valid.

## 11. Classifications (RC language)

Use:

- `YC_RELEASE_CANDIDATE_READY` (only after freeze)
- `BOUNDED_ENTERPRISE_WORK_OS_PROVEN`
- `PROJECT_LOOP_FULL_CHAIN_PROVEN`
- `LIVE_CROSS_TENANT_ZERO_LEAK`
- `CT_FULL_CHAIN_UI_LIVE_VERIFIED`

Do **not** claim: unlimited scale, Meet without artifact, regulated certification, Relay complete, unrestricted autonomy.
