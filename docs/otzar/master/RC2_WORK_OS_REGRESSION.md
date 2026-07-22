# RC2 Full Work OS regression (step 13)

Agent-runnable checklist. Not founder approval.

## Automated (always before live)

```bash
npx vitest run tests/unit/capability-preservation-regression.test.ts
npx vitest run tests/unit/message-compose.test.ts
npx vitest run tests/unit/ambient-otzar-bar.test.tsx -t "ping David"
npx vitest run tests/unit/admin-nav-sections.test.tsx
npx vitest run tests/unit/governance-hub.test.tsx
npx vitest run tests/unit/action-center-admin.test.tsx
npx vitest run tests/unit/intelligence-security-hubs.test.tsx
```

## Live Work OS loop (employee)

| # | Action | Pass |
|---|--------|------|
| W1 | `/app` loads Today | Needs / next or honest empty |
| W2 | Talk expands | Mic + text input usable |
| W3 | `Yes, ping <teammate> for a status update` | Professional draft card (see `RC2_TALK_PING_DAVID_PROOF.md`) |
| W4 | Needs me / Action Center | Opens without maze |
| W5 | People hover | Preview or honest empty |
| W6 | Connector honesty | Reconnect language says Connections |

## Live Control Tower (admin)

| # | Action | Pass |
|---|--------|------|
| C1 | Jobs nav | Governance, Action Center, Intelligence, Security hubs |
| C2 | Organization | Otzar found / setup path |
| C3 | Connections | Plug-and-play steps |
| C4 | Deep links | `/policies`, `/organization-seeding` still work |

## Related

- `RC2_COMPREHENSION_PROTOCOL.md`  
- `RC2_TALK_PING_DAVID_PROOF.md`  
- `FOUNDER_RC2_VERIFY_PATH.md`  
