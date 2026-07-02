# Comms/People P0 arc — final cross-surface verification

**Status:** 2026-07-02 (Fable 5). Verification-and-coherence pass over the
repaired arc — **no new features**. Every claim below was executed against the
LIVE product.

## Customer story

"I capture a conversation. Otzar turns it into work and drafted follow-ups. I
can walk away and come back — nothing is lost. If Otzar isn't sure about a
recipient, I can finish that review myself where it's my call, and I'm told
honestly when it isn't. When I send, governance routes it to a real approver.
My work, my team's view, my Action Center, and the audit trail all tell the
same story. And the People page never tells my admin that a colleague with a
manager and a team 'isn't connected'."

## State under verification

| | |
|---|---|
| Foundation `main` | `8e3423b` (BUG C `d280cfc` → BUG D `8e3423b`) |
| Control Tower `main` | `f80d106` (+ this verification pass) |
| Live bundle | `index-l51ZNusG.js` (app.otzar.ai) |
| API health | `/health` 200 · app 200 |
| Live accounts | `vishesh@niovlabs.com` (employee), `sadeil@niovlabs.com` (org admin/approver) |

## Suites executed (live, app.otzar.ai / api.otzar.ai)

1. `otzar-live-bugb-followup-durable.spec.ts` — durable follow-up path
2. `otzar-live-bugc-recipient-review.spec.ts` — recipient review completion
3. `otzar-live-bugd-connectedness.spec.ts` — S1–S5 People/governance scenarios
4. `otzar-live-arc-coherence.spec.ts` — **new** C1–C4 cross-surface coherence

## Pass/fail table (final runs)

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1a | Ingest → follow-up cards appear (durable section) | ✅ | bugb; `bugb-1-ingested.png` |
| 1b | Leave Comms → return → cards still there (**genuine** remount) | ✅ | bugb (navigation verified non-vacuous — see harness notes); `bugb-2-after-nav.png` |
| 1c | Dismiss → CANCELLED → stays gone across navigation | ✅ | bugb |
| 1d | Send outcome honest: queued send → row EXECUTED → drops from pending; a rejected send stays DRAFT/recoverable | ✅ | bugb (both branches encoded; queued branch exercised live) |
| 2a | out_of_scope card → "Confirm recipient" → confirmed | ✅ | bugc; `bugc-2-confirmed.png` |
| 2b | Confirmation persists after navigation (row carries `caller_confirmed`) | ✅ | bugc; server-truth assertion; `bugc-3-after-nav-still-confirmed.png` |
| 2c | Send unlocks after the recipient gate resolves | ✅ | bugc |
| 2d | cross-team/unauthorized NOT caller-overridable (UI: no affordance; API: 403) | ✅ | bugc + C3 |
| 3a | Managed employee send → `PROPOSED` + escalation (never `NO_ELIGIBLE_TARGET`) | ✅ | S5 + C2 |
| 3b | Approver's pending queue carries the escalation; approver resolves it | ✅ | C2 (`/escalations/pending` + governed reject) |
| 3c | Verdict reflects on the caller's Action | ⚠️ **FINDING** | C2: escalation flips REJECTED; the caller's Action **stays PROPOSED** — Action⇄Escalation reconciliation gap (pinned in the spec) |
| 4a | Caller's pending follow-ups ≡ My Work FOLLOW_UP rows (same ids, same count — one store) | ✅ | C1 |
| 4b | Doer-owned COMMITMENT separate from caller FOLLOW_UP (no double count) | ✅ | C1 |
| 4c | Manager Team Work sees the same ledger ids, no internal duplicates | ✅ | C1 |
| 5 | Action Center (employee) loads governed work; caller's PROPOSED action visible in its feed | ✅ | C2 (feed) + C4 (UI); `arc-1-action-center.png` |
| 6a | People & Collaboration: no "not connected" phrasing anywhere | ✅ | bugd S1/S2; `bugd-1-admin-people-collab.png` |
| 6b | Org placement acknowledged ("on M's team" / "in Leadership"); gap named precisely | ✅ | bugd S1/S2 |
| 6c | Employee never sees the admin growth card | ✅ | bugd S4; `bugd-3-employee-people.png` |
| 6d | "Hide for now" session-local + honest (hidden card returns on remount) | ✅ | bugd S3; `bugd-2-after-hide.png` |
| 7a | Recipient confirmation audit row exists (org audit: `ADMIN_ACTION`/`FOLLOW_UP_RECIPIENT_RESOLVED`, pointer on the ledger row) | ✅ | C3 |
| 7b | Approval/escalation proof exists (escalation lifecycle durable + auditable) | ✅ | C2 |
| 7c | No raw backend codes in customer UI | ✅ | C4 sweep + bugd S2 + unit sweeps |

**Gates:** CT typecheck 0 · lint 0 · full suite **2062/2062** · build ✓ · FND
health + route probes 200/401-as-designed.

## Findings (real, not fixed in this pass — verification only)

1. **Action⇄Escalation status reconciliation gap — CLOSED
   (PROD-UX-APPROVAL-LOOP: FND #525 `8c10788` + CT `85237d0`).** Rejected
   escalations now reconcile the paired Action to REJECTED (audited, with the
   approver's reason); the CT card reads "Submitted for approval" until the
   send is genuinely past approval; the sender's Action Center shows "Sent" /
   "Not approved" truthfully. Live-proven both legs — including the first
   delivered governed send. C2's pinned assertion was intentionally updated.
   Bonus catch from that slice's smoke: org entity reads leaked
   `password_hash` — fixed (FND #526 `9dce631`), leak-closure verified live.
2. **Two pre-existing pending `INVOKE_CONNECTOR` escalations** in the
   approver queue (not created by this pass; left untouched — likely earlier
   Slice-F artifacts, founder to disposition).

## Flaky-harness notes (product unaffected — server-truth checks green)

- **Vacuous navigation caught and fixed:** the bugb helper originally clicked
  rail labels that don't exist ("My Day"/"Action Center"/"My Work") — the
  ambient rail's real labels are Today/Needs me/People/Memory — so earlier
  "survived navigation" reads were vacuous. Now navigates genuinely and
  throws loudly if it can't.
- **Live latencies:** LLM ingest can exceed 15s (raise API timeouts); the
  send POST ran ~8s and the EXECUTED PATCH ~4s after the "Sent" confirmation
  — count assertions must poll on settled reads, not fixed waits; an empty
  feed reads a false "stable 0" while loading (wait for the section first).
- **Idempotency keys must be per-run** — a reused key replays the prior
  (already-resolved) action and breaks approver-queue assertions.
- **Residual intermittency:** in full 4-suite sequence runs, bugb's
  leave-Comms navigation occasionally fails to complete despite forced
  clicks + detach-waits (suspected toast/render contention under pileup);
  standalone it passes consistently (2/2 tonight). Durable fix = stable
  product testids on the rail links (a product change — out of scope here).
- **LLM extraction variance:** the same transcript yields different
  suggested-action counts/governance verdicts run-to-run; suites branch
  honestly on what extraction actually produced, and deterministic fixtures
  (product-API-created) carry the assertions that must not vary.

## The six answers

1. **Can a real user ingest a conversation and return later without losing
   work?** Yes — proven live with genuine remounts; the cards are durable
   FOLLOW_UP rows; dismiss/send transitions persist.
2. **Can a real user resolve recipient review without breaking governance?**
   Yes — confirm/select completes durably with a distinct `caller_confirmed`
   proof source and a real audit row; policy/approval boundaries reject with
   honest copy (UI has no override affordance; API 403s).
3. **Can governed sends route to approvers correctly?** Yes — `PROPOSED` +
   escalation into the approver's pending queue, never `NO_ELIGIBLE_TARGET`
   (regression fixed + regression-tested). Caveat: the verdict does not yet
   reconcile onto the caller's Action (finding #1).
4. **Do People & Collaboration cards state true org placement?** Yes —
   "already part of your organization on M's team / in DEPT … needs a first
   project or workspace", structured per-fact context, zero disconnection
   language, honest session-local hide.
5. **Do the affected pages agree on the same organizational truth?** Yes for
   Comms / My Work / Team Work / People / audit (same ledger ids, same
   counts, same statuses). The one disagreement is finding #1
   (Action Center's PROPOSED vs the escalation's verdict).
6. **What is still not built?** Action⇄Escalation reconciliation (+ truthful
   "submitted for approval" send copy); approver/admin queue UX; durable
   server-side recommendation dismiss; correction-memory learn-loop into
   ingest; project/workspace assignment flow from People & Collaboration;
   future gap categories (NEEDS_MANAGER / NEEDS_DEPARTMENT / NEEDS_AI_TWIN /
   NEEDS_ROLE_TOOLS); desktop window manual verification.

## Recommended next slice

**Approver/admin queue UX for governed sends + Action⇄Escalation
reconciliation** — one coherent slice. Rationale: the dual-control fix just
turned on a real approval pipeline (sends now queue), which makes the approver
experience the live bottleneck AND finding #1 the freshest coherence break:
the caller is told "Sent" and forever sees PROPOSED while the approver has
already ruled. This slice completes the loop the arc opened
(send → queue → verdict → both parties see the same truth → notification
delivered on approve), directly unblocks the demo's "completed send," and is
the prerequisite for trusting every later autonomy step. (Runner-up:
project/workspace assignment from People & Collaboration — it makes BUG D's
"Assign" next-step executable.)

## Screenshot index

`bugb-1-ingested` · `bugb-2-after-nav` · `bugb-3-send-outcome` ·
`bugb-4-after-dismiss` · `bugb-5-cleaned` · `bugc-1-blocked` ·
`bugc-2-confirmed` · `bugc-3-after-nav-still-confirmed` ·
`bugd-1-admin-people-collab` · `bugd-2-after-hide` · `bugd-3-employee-people` ·
`arc-1-action-center` (all under `screenshots/`).

## Cleanup confirmation

Pending follow-ups: 0. Smoke escalations: all rejected via the approver's
governed path (idempotency-keyed, no pileup). Remaining pending approvals: 2
pre-existing `INVOKE_CONNECTOR` items (not this pass's — founder to
disposition). ARC-SMOKE ledger rows cancelled.
