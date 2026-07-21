# YC RC2 status

**Experience status:** `YC_RC1_REOPENED_FOR_SIGNAL_AND_FIRST_USE_REPAIR`

**Not ready:** `YC_RELEASE_CANDIDATE_READY` (removed until signal gate passes)

## Preserved backend classifications

- `PROJECT_LOOP_FULL_CHAIN_PROVEN`
- `LIVE_DOCUMENT_CHANGE_PROPAGATION_PROVEN`
- `LIVE_DOC_PROVIDER_PROVEN`
- `LIVE_CALENDAR_PROVIDER_PROVEN`
- `BOUNDED_ENTERPRISE_WORK_OS_PROVEN`
- `LIVE_CROSS_TENANT_ZERO_LEAK`
- `WORK_STYLE_BEHAVIORALLY_PROVEN`
- `CT_FULL_CHAIN_UI_LIVE_VERIFIED` (technical deploy)
- `SCALE_PROVEN=no`
- `S2500=FOUNDER_DEFERRED`
- `MEET_PERMISSION_AVAILABLE_NO_ELIGIBLE_ARTIFACT`

## Founder-reported defects (this reopen)

1. Walkthrough disappeared when following it (root cause: CTA called complete)
2. Not world-class persistent reveal
3. People shared/collab badges had no hover content
4. Long dashes and technical copy
5. Engineering scale/test copy on admin Users
6. Billing / Marketplace / Federation too prominent

## RC2 repairs shipped

| Item | Status |
|------|--------|
| Persistent walkthrough (v3), CTA does not complete | Live (`9e50ceb` wave) |
| Shell-level mount across routes | Live |
| People hover previews | Live |
| Hide scale/pressure harness from Users | Live |
| Hide Billing/Marketplace/Federation from admin nav | Live |
| Collaboration plain language | Live |
| Human Home bands (needs / changed / handled / waiting / next) | In this branch |
| Human work state model | In this branch |
| Invite relationship + placement language | In this branch |
| Copy signal lint script + CI soft report | In this branch |
| Plain language register | In this branch |
| Founder verify path | `FOUNDER_RC2_VERIFY_PATH.md` |
| Strict dash/language CI | Soft until full cleanup |
| Project composition redesign | Partial (bands + project glance remain) |
| Fresh tester protocol execution | Open (requires humans) |
| `FOUNDER_EXPERIENCE_APPROVED` | **Not claimed** until founder re-login |

## Refreeze rule

Do not set `YC_RELEASE_CANDIDATE_READY` until:

- founder walkthrough no longer disappears mid-path;
- fresh user test without explanation passes;
- no S250/SCALE_PROVEN/harness copy on normal screens;
- People hover shows real work or honest empty state;
- admin first screen is operating, not commercial control-panel.


## Deep live smoke (2026-07-21, deploy `c80ee42` / asset `index-Dd2rdOxH.js`)

**Deploy:** app.otzar.ai last-modified ~2026-07-21 18:48 UTC. API `afe1491` health ok.

**Static fingerprint:** new plain-language markers present; old em-dash Home/Scheduled strings absent; no `SCALE_PROVEN` / `S2500` in bundle.

**Credentialed suite (workers=1, after lockout clear):** unique **24 PASS · 9 FAIL · 2 SKIP** (plus layer C docs/workos).

### PASS (RC2-critical)

- S-01 multi-role continuous walkthrough
- R-03 YC first-five (walkthrough + Home + team + project)
- L1–L4 login → Home / first-use skippable / deep-link Needs me
- Project context mission heart in viewport + J-04 coverage card present
- Viewport chrome; Tools/Comms reconnect honesty
- Employee rail minimal (no admin leak); admin nav fold
- Handoff one-tap ambient path
- Work OS loop capture/owner/execution/seed/memory (API layer)
- N-03 Docs create + append + edit detect

### FAIL (not READY blockers / residual)

1. **Walkthrough vs Talk collision:** `first-use-reveal` intercepts pointer events on ambient orb / Send → fails UX-5/6, ambient clarity, employee-flow Talk, calendar N-04 UI path when guide is open.
2. **People structure glance** not in viewport (element present, below fold).
3. **J-03** conversation → project heart anti-maze (Talk path blocked by guide / send).
4. **B-05 employee** + multi-role `vishesh@` login path (secondary accounts).
5. **UX-2 My Work / UX-4 conversation reopen** (product residual, not deploy miss).
6. **Eng residual signal:** page body still surfaces org name **R03 synthetic scale** (data, not SCALE_PROVEN claim).

### Explicitly not claimed

- `FOUNDER_EXPERIENCE_APPROVED` / `YC_RELEASE_CANDIDATE_READY`
- Founder still runs `FOUNDER_RC2_VERIFY_PATH.md`
