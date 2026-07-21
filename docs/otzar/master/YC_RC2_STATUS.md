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

## RC2 repairs in progress / shipped this branch

| Item | Status |
|------|--------|
| Persistent walkthrough (v3), CTA does not complete | Implemented |
| Shell-level mount across routes | Implemented |
| Step progress local + server best-effort | Implemented |
| People hover previews | Implemented |
| Hide scale/pressure harness from Users | Implemented |
| Hide Billing/Marketplace/Federation from admin nav | Implemented |
| Collaboration envelope copy plain language | Partial |
| Full copy dash lint + prohibited register | Open |
| Invite flow redesign | Open |
| Fresh tester protocol | Open |

## Refreeze rule

Do not set `YC_RELEASE_CANDIDATE_READY` until:

- founder walkthrough no longer disappears mid-path;
- fresh user test without explanation passes;
- no S250/SCALE_PROVEN/harness copy on normal screens;
- People hover shows real work or honest empty state;
- admin first screen is operating, not commercial control-panel.
