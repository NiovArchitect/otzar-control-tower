# RC2 fresh admin + employee comprehension protocol

**Status:** Agent-runnable checklist for step 12 of `RC2_CONTROLLING_DIRECTION.md`.  
**Not** `FOUNDER_EXPERIENCE_APPROVED` — founder must still run `FOUNDER_RC2_VERIFY_PATH.md`.

Use a private window. Prefer credentials that already work (do not rotate founder passwords).  
Record: date, deploy SHA (or asset `index-*.js`), account role, PASS/FAIL per line.

---

## A. Fresh admin (Control Tower)

| # | Action | Pass when |
|---|--------|-----------|
| A1 | Login → land on admin shell | Home or clear next step visible in &lt;5s |
| A2 | Sidebar jobs only | Sees: Home, Organization, People/AI, Connections, Governance, Action Center, Intelligence, Security — not architecture dumps |
| A3 | Organization `/setup` | Activation path or Otzar found signal; no “Run Dandelion / Open Seeding” as primary |
| A4 | Connections | Page title/jobs say **Connections**; plug-and-play steps readable |
| A5 | Governance `/governance` | Overview cards for Access / Policies / Retention; tabs open full capability |
| A6 | Action Center `/approvals` | Overview + Approvals + Sensitive reviews; calm banner if empty |
| A7 | Intelligence `/intelligence` | Overview + Reports tab |
| A8 | Security `/security-audit` | Overview + Audit + System health |
| A9 | Deep links | `/policies`, `/reports`, `/organization-seeding` still load (capability not deleted) |
| A10 | Copy | No primary UI saying “Tools & Connections”, “Open Dandelion”, “SCALE_PROVEN”, “S2500” |

## B. Employee (Work OS)

| # | Action | Pass when |
|---|--------|-----------|
| B1 | Login → `/app` | Today / ambient home; needs-you signal or honest empty |
| B2 | First-use guide | Visible if first session; CTA does **not** dismiss the whole guide |
| B3 | Talk orb | Expand Talk works while guide is open (pointer not fully blocked) |
| B4 | People / Collaboration | People list; hover Shared projects shows preview or “No shared work yet” |
| B5 | Connections language | Connector health / reconnect copy says **Connections**, not Tools & Connections |
| B6 | No engineering leak | No harness / scale-proof copy on Home or People |

## C. Measured gates (automated / agent)

| Gate | How |
|------|-----|
| Capability map | `npx vitest run tests/unit/capability-preservation-regression.test.ts` |
| Admin nav jobs | `npx vitest run tests/unit/admin-nav-sections.test.tsx` |
| Live asset | Fetch app.otzar.ai; note `index-*.js`; confirm deploy notes |

## Outcomes

| Result | Meaning |
|--------|---------|
| All A+B PASS on **live** deploy | `LIVE_ROUTE_VERIFIED` for comprehension path — still not FOUNDER_APPROVED |
| Any A/B FAIL | File under `RC2_EXPERIENCE_DEFECT_REGISTER.md` with route + evidence |
| Founder completes FOUNDER_RC2_VERIFY_PATH | Only then `FOUNDER_EXPERIENCE_APPROVED` |

## Last agent run

| Date | Deploy | A | B | Notes |
|------|--------|---|---|-------|
| — | — | not run live | not run live | Protocol authored; unit gates only |

---

## Related

- `FOUNDER_RC2_VERIFY_PATH.md` — founder-only approval path  
- `RC2_CONTROLLING_DIRECTION.md` — execution order  
- `capability-preservation-regression.test.ts` — no capability deletion  
