# Employee Flow Smoke Harness

**Purpose.** Prove Otzar's most important loop end-to-end, in employee language:
**communication → governed work movement** (the Extreme Polarity Ability, `PRD-00`).

**What this proves.** A messy meeting transcript becomes a digest → reviewable proposed
actions → governed saves/sends → honest tracking → correctable interpretation → a visible
correction history — without contextless artifacts, fake completion, backend jargon, or a
dashboard to operate.

**Sample transcript** (`tests/fixtures/otzar/employee-flow-transcript.txt`):

> Team, we decided to ship the onboarding flow next week. David is blocked on the API
> keys. I will prepare the action list by Friday. We need to follow up with William about
> the investor demo decisions. There is a risk the demo could slip if API access is not
> resolved. It is unclear who owns the launch checklist.

(The extraction is deterministic/keyword-based — see `transcript-intelligence.ts`. The
fixture is written to exercise the real patterns; it is honest about what the parser
catches, not staged.)

## Manual smoke (browser, `app.otzar.ai`)

| # | Do | Expect |
|---|---|---|
| 1 | Select/paste the transcript → "Add current context" | calm "Using current context" chip + Clear; no surveillance words |
| 2 | "Summarize this transcript." | "I found 1 decision, 2 follow-ups, and 1 blocker." + collapsed "View digest" (no raw dump) |
| 3 | "Create action items from this meeting." | "I found N proposed actions…" + a Proposed-actions section with Save / Send request / Ask / Dismiss; nothing auto-sent |
| 4 | Click **Save** on a follow-up | card → "Saved"; a PROPOSED Work Ledger item with context; no fake completion |
| 5 | Click **Send request** on the owned blocker | governed request to David; card → "Sent" (or "Needs approval"); no backend codes |
| 6 | "What is blocked?" / "Who is waiting on whom?" / "What follow-ups came out?" | compact tracking answers + "View tracking"; honest states (no faked stale/completed) |
| 7 | "No, Samiksha owns that." (ambiguous across items) | one focused question: "Which item should I update?" |
| 7b | "That's not blocked anymore." (when one blocker is obvious) | blocker reclassified; tracking recomputes; no fake completion |
| 8 | (after any applied correction) open **Recent corrections** | item shows the change + "Saved as correction/preference evidence" (or "Applied here (couldn't save evidence)"); no raw ids; no global-learning claim |
| 9 | Clear context → "Ask David to review this." | one focused question: "What should I use as the current context?" (no contextless artifact) |
| 10 | Review the whole flow | no `entity_id` / route names / policy codes / proof noise in normal UX |

## Automated coverage (no secrets, MSW-mocked)

`tests/unit/ambient-otzar-bar.test.tsx` →
*"end-to-end: context → digest → actions → save → send → tracking → correction → history
→ missing-context"* walks steps 1–10 in one render and asserts each, plus the
per-feature suites (`work-context`, `transcript-intelligence`, `transcript-actions`,
`work-tracking`, `work-corrections`, `ambient-visibility`). Run: `npm test`.

## Live credentialed smoke (manual / gated)

`tests/e2e/smoke.spec.ts` (`npm run test:e2e`, Playwright) and a real
standard-user browser run require **`DEMO_SHARED_PASSWORD`** + a provisioned account.
This proves the live governed rails (`/work-os/resolve-target` read-scope,
`collaboration-requests`, `/work-os/ledger`, `/otzar/my-twin/corrections`) against a real
session. **Open item:** this credentialed standard-user live smoke is not yet run in this
deployment; it needs the demo password. Do not claim it as verified until run.

## What NOT to claim yet

Full autonomous completion tracking · permanent/global learning · live meeting capture ·
live calendar/Zoom/Meet ingestion · background watchers · org-wide preference learning ·
full browser/computer control. These are forward work, not shipped.

## Next-phase recommendations

1. Credentialed live browser smoke (needs `DEMO_SHARED_PASSWORD`).
2. Phase 4B: typed preference/history readback via `correctionMemory.list`.
3. Phase 4A: employee-visible Work OS polish from smoke findings.
4. Phase 4C: real transcript ingestion, only if safe provider rails are ready.
