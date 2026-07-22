# RC2 Talk path — “ping David” professional draft

**Defect (controlling direction):** Talk “ping David” professional draft needs  
`LIVE_ROUTE_VERIFIED` on the live Talk artifact path.

**Code truth (unit, not live):**

| Layer | Gate |
|-------|------|
| `message-compose.ts` | Intent → professional body; never raw “ping david…” |
| `voice-action-runtime` | `draftPayload` is composed, not the command |
| `ambient-outbound` | Same for ambient outbound interpretation |
| Talk dock UI | `work-artifact-body` must show composed draft |

Automated: `tests/unit/message-compose.test.ts` + ambient-otzar-bar  
`Yes, ping David for a status update` card test.

---

## Live proof steps (employee session)

Use a private window on **app.otzar.ai** after deploy of the commit that includes the card test.

1. Login as an employee/admin who can see **David** (or a real teammate) on the org roster.  
2. Open `/app`. Expand **Talk**.  
3. Type exactly: `Yes, ping David for a status update` (or substitute a real teammate name).  
4. Send.

| Check | PASS when |
|-------|-----------|
| L1 | Work artifact card appears |
| L2 | Body is a professional message (Hi/Hey + status request dimensions) |
| L3 | Body does **not** contain “ping david” / the raw command |
| L4 | Confirm / Submit for approval is available; no silent external send |
| L5 | Twin chat is **not** the primary outcome for this intent |

5. Optional Confirm path: only if dual-control / internal message is expected for that org.

---

## Outcomes

| Result | Claim allowed |
|--------|----------------|
| Unit green only | coded / tested — **not** LIVE_ROUTE_VERIFIED |
| L1–L4 on live deploy | **LIVE_ROUTE_VERIFIED** for this Talk artifact path |
| Founder happy | FOUNDER_VISIBLE for this path only |

## Last run

| Date | Environment | Result |
|------|-------------|--------|
| 2026-07-22 | unit | message-compose + ambient bar card for “Yes, ping David…” — **coded** (ping/notify → draft card, not auto-send) |
| 2026-07-22 | origin/main | **merged** #222 · SHA `f564227` |
| 2026-07-22 | app.otzar.ai | HTML last-modified ~08:15 UTC · asset `index-DmQQIMEk.js` contains `Review it and Confirm` + ping\|notify path markers — **deployed candidate**; authenticated L1–L5 **not** run in agent session → still need LIVE_ROUTE_VERIFIED |

Do **not** claim FOUNDER_EXPERIENCE_APPROVED from this doc alone.
