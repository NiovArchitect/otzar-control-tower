# RC2 experience defect register (active wave)

Status: `YC_RC1_REOPENED_FOR_SIGNAL_AND_FIRST_USE_REPAIR`  
Live base: `2df7d95` guide-vs-Talk preserved.  
Do not claim `FOUNDER_EXPERIENCE_APPROVED` / `YC_RELEASE_CANDIDATE_READY` / `OTZAR_YC_RC2`.

| ID | Area | Route | Severity | Status |
|----|------|-------|----------|--------|
| UX-2 | My Work surface load/empty/buckets | `/app/my-work` | P0 | code ready — **not live** until #201 deploy |
| UX-4 | Meeting-captures source panel | `/app/meeting-captures` | P0 | partial (nav harden) — live verify pending |
| UX-5 | Orb drag + re-login restore | `/app` | P1 | e2e login harden — live verify pending |
| PPL-1 | Shared projects preview names | `/app/collaboration` | P0 | code ready — **not live** (bundle pre-#201) |
| PPL-2 | Recent collab real details | `/app/collaboration` | P0 | code ready — **not live** |
| VOX-1 | Speak response after voice input | Talk bar + `/app/voice` | P0 | mic-turn auto-speak+unmute — **live prove required** |
| VOX-2 | Unified mic permission state | Talk bar + Voice | P0 | shared module — **live prove required** |
| VOX-3 | Talk composer below history | Talk dock | P0 | code ready — **not live** |
| VOX-4 | Otzar name STT normalize | Talk transcripts | P0 | code ready — **not live** |
| CPY-1 | Home presence copy clarity | `/app` | P0 | code ready — **not live** |
| CPY-2 | Roadmap / coming-next purge | employee + admin | P0 | partial |
| CPY-3 | Spatial readiness builder card | `/app` Today | P0 | removed — **not live** |
| AUD-E | Employee screen signal audit | all `/app/*` | P1 | ongoing |
| AUD-A | Admin screen signal audit | admin routes | P1 | ongoing |

**Live truth (2026-07-21):** app.otzar.ai still serves `index-B24Oy9v1.js` (#200 guide-talk only). Founder findings that “#201 features don’t work live” are correct — they are not on the deployed bundle yet.

Principle: user sees the useful conclusion, not the machinery.
