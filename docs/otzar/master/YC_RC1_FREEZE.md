# OTZAR_YC_RC1 freeze marker

**Declared:** 2026-07-21  
**Phase:** `YC_RELEASE_CANDIDATE_HARDENING` → **`YC_RELEASE_CANDIDATE_READY`**

## Pinned SHAs

| Component | SHA | Tag |
|-----------|-----|-----|
| Foundation (live API) | `afe1491d882cbca4b0ce95db6f85ec0ad85dd16f` | `OTZAR_YC_RC1` |
| Control Tower (main) | `c57052a00c8d1d6fbf0fc281d1e04fcd82f5046b` | `OTZAR_YC_RC1` |
| Control Tower full-chain UI build | `80e36b4e1bc5694fb68b134cbb971411e7ca86fe` | (contained in history before memory commits) |

## Live deployments

| Service | ID | Notes |
|---------|-----|--------|
| otzar-api | `srv-d8t17sm7r5hc73ed5h6g` | health `git_commit=afe1491d…` |
| otzar-app | `srv-d8t1qpj7uimc73db2il0` | static SPA |

## Live bundle hashes (app.otzar.ai)

| Asset | Path | Status |
|-------|------|--------|
| JS | `/assets/index-D8TMNmma.js` | 200 |
| CSS | `/assets/index-CyE4kMZQ.css` | 200 |
| HTML | `/` | 200 |

## Trust residual close-out (this RC)

| Residual | Result |
|----------|--------|
| A Create idempotency | **PROVEN** live double-create same key → same `document_id`, `already_applied=true` (FND `#732` / `afe1491`) |
| B Intent ledger 404 | **RECONCILED** — party-scope + missing `project_id`; manager patch + project-member read; reviewer GET 200 on doc/cal intents |
| C npm audit 11 | **ASSESSED** — `YC_RC_SECURITY_ASSESSMENT.md`; no force upgrade; residual `NPM_AUDIT_11_RESIDUAL` |
| D Google Meet | **HONEST** — `MEET_PERMISSION_AVAILABLE_NO_ELIGIBLE_ARTIFACT` |

## Walkthrough

Unscripted YC reviewer browser (2026-07-21): **0 FAIL** on login, R-03 shell, nav (Today/Talk/Needs me/People/Memory), no Meridian leak, no page errors. Twin free-text chat input not found on those shells (SKIP) — use Talk/voice path for conversational Q&A.

## Classifications

- `YC_RELEASE_CANDIDATE_READY`
- `BOUNDED_ENTERPRISE_WORK_OS_PROVEN`
- `PROJECT_LOOP_FULL_CHAIN_PROVEN`
- `LIVE_CROSS_TENANT_ZERO_LEAK`
- `LIVE_DOCUMENT_CHANGE_PROPAGATION_PROVEN`
- `CT_FULL_CHAIN_UI_LIVE_VERIFIED`
- `SCALE_PROVEN=no`
- `S2500=FOUNDER_DEFERRED`

## Freeze rule

Do not deploy unrelated feature work without reopening acceptance and re-proving the YC five-minute journey + provider links.
