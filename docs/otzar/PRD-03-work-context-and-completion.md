# PRD-03 — Work Context Resolution + Completion Tracking

Areas 4 + 5. Code: `lib/work-os/work-context.ts` (`resolveWorkContext`,
`detectWorkReference`, `contextLabel`). Tests: `tests/unit/work-context.test.ts`,
`ambient-otzar-bar.test.tsx`.

This PRD is the heart of the **Extreme Polarity Ability** (`PRD-00`): communication →
governed work movement. Context resolution (no contextless artifacts) + completion
tracking (no faked completion) are what turn "this/that/what I received" and meetings
into *moving, owned, tracked* work rather than dead summaries or empty tasks.

## Part A — Work context resolution (no contextless artifacts)

**Otzar must understand what work the words REFERENCE, not just route them.** When a
user says a deictic placeholder — `this / that / it / what I received / this client note
/ the transcript / this meeting / the latest message / the current thread / what David
sent / this approval / the investor demo / the current project` — Otzar resolves the
referenced work object BEFORE acting.

Pipeline (shipped seed):
1. `detectWorkReference(text)` — detect a deictic reference + its expected type; a
   NAMED object ("the Q3 budget") is not deictic → proceed normally.
2. `resolveWorkContext(text)` — search available, read-scoped context: inbox (latest
   received message, via `notifications.list`), recent conversation-derived artifacts
   (`commsRecentArtifacts`, `MEETING_CAPTURE` for transcript/meeting). Returns a
   `WorkContextRef { resolved, contextType, contextId, displayName, owner, ...,
   needsClarification, clarificationQuestion }`.
3. If resolved → act + attach/link the context (e.g. self-task `notification_id` +
   confirm "linked to the message you received from Sadeil"; collaboration `safe_summary`
   `(re: the transcript)` + confirm "for the transcript").
4. If unresolved → **ask ONE focused question** ("Which client note should I attach?") —
   never a contextless artifact, never pretend, never meta-work.

Expansion path: current-thread / project / uploaded-document / **selected-text + current
surface** (see `PRD-04`) add as typed sources land. Never fabricate; never expose
unauthorized data.

### Part A acceptance
1. "validate what I received" → self-task linked to the latest inbox message, else one
   focused question.
2. "review this client note" → request with note context if available, else
   "Which client note should I attach?".
3. "summarize the transcript" → request with transcript context, else "Which transcript?".
4. Named objects proceed without a context round-trip.

## Part B — Completion tracking (work completion, not artifact creation)

**The goal is work completion, not artifact creation.** Every work action should track
toward an endpoint, not stop at "saved". Internal model (forward target; seed the shape
now, do not overbuild the runtime):

```ts
completionTracking: {
  trackResponse: boolean; trackDueDate: boolean;
  trackReadReceipt?: boolean; trackOwnerAcceptance?: boolean;
  followUpPolicy: "none" | "gentle_reminder" | "digest" | "escalate_if_blocked";
  endpoint: string;
  currentState:
    "created" | "sent" | "received" | "read" | "accepted" |
    "in_progress" | "blocked" | "approval_pending" | "completed" | "stale";
}
```

Otzar must know what is pending, who owns it, who is waiting, what is blocked, what needs
approval, when to follow up / escalate / summarize / close the loop. Today the Work
Ledger + governed rails record the artifact + proof; completion-state transitions and
follow-up policy are the forward build (cloud / BEAM watches). Confirmations already
say "I'll track the response here" — that promise must become a tracked state.

### Part B acceptance
1. A sent collaboration request is tracked, not just created.
2. The user can ask "what's waiting / what changed / what's blocked" and get real state.
3. Nothing is marked complete that isn't (no fake completion).
4. Overdue / blocked items can surface as interrupts/digests per `PRD-02`.
