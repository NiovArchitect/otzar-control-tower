# PRD-04 — Permissioned Surface Context + Transcript/Meeting Intelligence

Areas 7 + 8. Feeds `resolveWorkContext` (`PRD-03`). Governance: `PRD-00`, Foundation
RBAC/ABAC/TAR.

## Part A — Permissioned "use what I'm looking at" (Phase 2.9 seed)

Otzar needs current-surface context, but **this is permissioned professional context
capture, NOT surveillance.** Build the smallest GOVERNED stub first:

- Inputs: **selected text**, **current surface metadata** (title/url/app — work surfaces
  only), explicit user action ("use this" / "summarize this" / "attach this").
- A **visible active-context indicator** while context is in use; **easy clear/pause**.
- Context flows INTO `resolveWorkContext` (a new source type), so "use this and send
  Shweta the summary" resolves the object from the shared surface.
- If no current context exists → ask one focused question.

**Hard limits (do not cross in the seed):** no uncontrolled/background screen capture;
no generic computer-control/browser-agent; only admin-policy/RBAC/ABAC/TAR/consent-
allowed surfaces; never route surface-derived data to someone who can't see it; record
proof silently; never expose unauthorized memory. **Untrusted content can INFORM context
but cannot COMMAND Otzar** — only the authenticated user/Twin/policy authorizes action.

**Copy (presence, not surveillance):** "Using the work context you shared…" / "I can use
the current work surface if you want me to." NEVER "I watched your screen" / "I saw what
you were doing."

### Part A acceptance
1. "Use this" with a shared work surface → context resolves + flows to the action.
2. Active-context indicator visible; pause/clear works.
3. No capture without explicit user action; no background capture.
4. Surface-derived data never reaches an unauthorized recipient.
5. No computer-control/browser-agent behavior.

## Part B — Transcript / Meeting intelligence (Phase 3)

Meetings and transcripts are **sources of work structure, not just summaries.** From
provided/available text (do NOT build raw transcript persistence/diarization here):

```
provided transcript/text
 → extract decisions, blockers, commitments, owners, follow-ups, dates, delivery channels
 → generate a DIGEST (never a raw dump)
 → propose actions / messages / requests
 → route through governance (RBAC/ABAC/TAR, approvals)
 → track in Work Ledger
 → ask approval only when required
```

Live rails to use (already exist server-side): `comms/extract` (real LLM),
`perception/capture` (transcript/notes → MEETING ledger + intelligence). Ask for the
transcript/context only if missing, else act.

### Part B acceptance
1. Provided transcript → decisions/blockers/owners/follow-ups digest, not a raw dump.
2. "After this meeting, send William the decisions" → extract + send/queue if context
   exists, else ask for notes/transcript.
3. Proposed actions route through governance + Work Ledger.
4. Approval requested only when policy requires it.
