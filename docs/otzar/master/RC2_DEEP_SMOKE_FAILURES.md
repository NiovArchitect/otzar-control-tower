# RC2 deep smoke failure ledger (24 PASS / 9 FAIL)

Status: `YC_RC1_REOPENED_FOR_SIGNAL_AND_FIRST_USE_REPAIR`  
Deploy measured: `c80ee42` / `index-Dd2rdOxH.js` · API `afe1491`  
Do not claim `FOUNDER_EXPERIENCE_APPROVED` / `YC_RELEASE_CANDIDATE_READY` / `OTZAR_YC_RC2`.

| ID | Spec | Role | Route | Workflow | Expected | Actual | First wrong interaction | Severity | Class | Cluster | Regression | Repair status |
|----|------|------|-------|----------|----------|--------|-------------------------|----------|-------|---------|------------|---------------|
| F1 | `otzar-live-workos-ux-coherence` UX-6 | admin | `/app` | Expand Talk orb; read voice honesty | Orb expands; voice mode line visible | Click blocked: `first-use-reveal` intercepts | Click `ambient-otzar-bar` | P0 | pointer interception / stacking | guide-vs-Talk | guide+Talk expand | repaired (code) |
| F2 | `otzar-live-workos-ux-coherence` UX-5 | admin | `/app` | Drag orb left; persist | Drag snaps left; dock closed | Drag/click geometry fights guide overlay | pointerdown on orb under guide | P0 | pointer interception | guide-vs-Talk | orb drag with guide open | repaired (code) |
| F3 | `otzar-live-ambient-clarity` | admin | `/app` (+ work) | Open Talk; ask about work | Send + answer | Send click intercepted by guide | click Send | P0 | pointer interception | guide-vs-Talk | guide open + send | repaired (code) |
| F4 | `otzar-employee-flow-live` Communication→Work | admin | Talk path | Governed communication flow | Talk usable end-to-end | Orb/Talk blocked by guide | expand Talk | P0 | pointer interception | guide-vs-Talk | employee flow Talk | repaired (code) |
| F5 | `otzar-live-project-j03` J-03 | admin | Talk→Projects | Conversation resolves project heart | One-hop project open | Talk send path blocked / maze | Talk send under guide | P0 | pointer + route | guide-vs-Talk | J-03 with compact guide | repaired (code) |
| F6 | `otzar-live-people-structure` | admin | `/app/collaboration` | Structure glance in viewport | `people-structure-glance` in first paint viewport | Card present but below fold (after AI collab cards) | initial paint layout | P1 | layout / composition | people-viewport | glance above fold | repaired (code) |
| F7 | `otzar-live-workos-ux-coherence` UX-2 | admin | My Work | Governed loop live-only actions | Ledger actions render | Timed out / surface incomplete (trace) | open My Work under guide noise | P1 | control / timing | my-work | UX-2 after guide fix | pending |
| F8 | `otzar-live-workos-ux-coherence` UX-4 | admin | Conversations | Reopen saved conversation source | Source reopens | Timed out | open conversation | P1 | route state | conversation-reopen | UX-4 after guide fix | pending |
| F9 | `otzar-live-role-home-b05` employee | employee `vishesh@` | `/app` | Home `data-home-role` | Login + role presence | Login timeout (INVALID_CREDENTIALS / stuck login) | submit login | P1 | authorization / test account | multi-role-auth | B-05 employee login | pending |

### Adjacent (layer C, not in original 9)

| ID | Spec | Notes | Cluster |
|----|------|-------|---------|
| F10 | N-04 calendar | Send under guide — same intercept | guide-vs-Talk |
| F11 | multi-role first5 employee | Login for `vishesh@` | multi-role-auth |

### Shared clusters

1. **guide-vs-Talk** (F1–F5, F10): walkthrough `z-[60]` fixed bottom overlaps Talk `z-[60]` bottom-right; guide receives clicks.
2. **people-viewport** (F6): structure glance not first content.
3. **my-work / conversation** (F7–F8): re-verify after cluster 1.
4. **multi-role-auth** (F9, F11): employee account login path.

### Layer architecture (repair target)

1. Application content  
2. Target emphasis  
3. **Talk / active work surface — `z-[70]`**  
4. **Walkthrough coach — `z-[45]`, pointer-events only on card bounds; anchor left / compact when Talk open**  
5. Modal / safety confirmations — above coach  

No full-screen walkthrough overlay with capture. Background dim (if any) uses `pointer-events: none`.
