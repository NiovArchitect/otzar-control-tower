# Otzar Work OS — Gap Audit (Phase 1267)

This audit is the honest map of what the Otzar desktop Work OS executes
for real today, what it drafts/proposes, what renders a visible artifact
without backend persistence, and what is blocked by a missing backend
runtime. It exists because "unit tests pass" did not mean the desktop UX
worked — Phase 1267 closes the live UX gaps and names every remaining
bridge.

_Last updated: Phase 1267._

## 1. Commands that execute end-to-end (real)

| Command | Behavior | Backend |
| --- | --- | --- |
| "Take me to / open / show me <surface>" | Navigates immediately | frontend router |
| "What's connected?" / "summarize connectors" | Real connector/OAuth summary (no fake green) | `GET /connectors/oauth/status`, `/connectors/adapters` |
| "What needs my approval?" | Navigates + real pending count | `GET /escalations/pending` |
| "Open <external https url>" | Opens in browser (protocol-allowlisted) | `window.open` |
| Notification click | Routes to Action Center / Connector Rails / Collaboration / … | `notificationRoute()` + router |
| Notification mark-read | Real PUT; failure shows clean copy, never raw network code | `PUT /notifications/:id/read` |

## 2. Commands that draft/propose for approval (real governed action)

| Command | Artifact | Backend |
| --- | --- | --- |
| "Draft a message to <teammate> saying …" | Visible editable **WorkArtifactCard**; creates a governed `SEND_INTERNAL_NOTIFICATION` ProposedAction (policy-evaluated) when the teammate resolves | `POST /api/v1/actions` (ADR-0057) |
| "Send <teammate> this message" | Same — approval-gated ProposedAction; **never sends externally** | `POST /api/v1/actions` |
| Edit on the card | Re-proposes a governed action with the edited body | `POST /api/v1/actions` |

Status reflects the **real** policy decision: AUTO_APPROVE → "Approved —
standing authority"; REQUIRE_DUAL_CONTROL → "Approval required"; FORBIDDEN
→ "Blocked by policy".

## 3. Commands that render a visible artifact but lack backend persistence

| Command | Artifact | Missing backend |
| --- | --- | --- |
| "Schedule a meeting with <teammate>" | MeetingProposalCard (Edit/Confirm/Cancel; never routes to transcripts; no event created) | calendar free/busy + event-create route |
| "After <X> confirms, put it on the calendar" | MeetingProposalCard with preserved prerequisite | same |
| "Draft a Slack/email to <teammate>" | Draft card, "external send needs approval" | external Slack/email send route |
| "Draft a message to <unknown/ambiguous>" | Local draft card + "choose recipient in Work Comms" | voice→teammate disambiguation UI / picker |

## 4. Commands blocked by a missing backend runtime (honest block, no fake)

| Command | Block copy | Missing backend |
| --- | --- | --- |
| "Ask <teammate>'s Twin …" | Routes to Collaboration; "Twin-request runtime / teammate resolution from voice isn't wired" | collaboration target resolution + Twin intercession policy |
| "Pull latest Zoom recordings" | "Zoom is verified, but a recordings runtime isn't exposed yet" | Zoom recordings list route |
| "Turn this meeting into action items" | Routes to Conversations; "transcript capture from this voice session isn't wired" | meeting-transcript ingestion + action-item extraction |
| "Start the <X> workflow" | Routes to Workflows; "workflow-start runtime isn't exposed to voice" | workflow-start route |
| "Create a task / assign to <teammate>" | Routes to Projects; "task-write from voice isn't wired" | task create/assign route |

## 5. Missing UI surfaces

- Dedicated teammate chat / AI-Twin chat thread (today: Collaboration page + ProposedActions; no 1:1 thread surface).
- Meeting-proposal inbox (today: per-command card in the orb; no persistent list).
- Task-assignment board fed by voice (today: routes to Projects).
- After-call queue list (today: per-command card; no persistent queue surface).
- Draft inbox (today: per-command card + Work Comms; no unified draft list).

## 6. Missing backend routes (the next bridges)

1. **Calendar free/busy (read)** — `GET /api/v1/otzar/calendar/freebusy` (scopes + token already present for Google Calendar). Unblocks real availability.
2. **Calendar event proposal/create** — approval-gated create; unblocks real scheduling.
3. **External Slack/email send** — governed, approval-required; unblocks real outbound messaging.
4. **Zoom recordings list** — read-only; unblocks recording summaries.
5. **Meeting-transcript ingestion** — capture current session / uploaded transcript → action items.
6. **Task create/assign** — governed task ProposedAction type.
7. **Collaboration target resolution + Twin intercession policy** — resolve "David's Twin" + delegated-authority answering.

## 7. Recommended next bridge order

1. Calendar free/busy (read-only, lowest risk, highest scheduling value).
2. Task create/assign as a ProposedAction type (reuses ADR-0057 pipeline).
3. Meeting-transcript ingestion → action items (feeds drafts/tasks).
4. Calendar event create (approval-gated) once free/busy + confirmations land.
5. External Slack/email send (governed, approval-required).
6. Zoom recordings list.
7. Twin intercession policy.

## 8. Acceptance tests for handoff readiness

- Conversation thread: 10+ messages scroll + wrap; survives navigation/reload.
- Notification: long text wraps; mark-read failure shows clean copy; click routes; checkbox does not route.
- Draft/Send: visible editable card; real ProposedAction created on resolve; Edit re-proposes; Cancel dismisses; never sends externally.
- Schedule: MeetingProposalCard rendered; never routes to transcripts; "after X confirms" prerequisite preserved; no event created.
- Authority: status reflects real policy decision (standing authority vs approval required vs blocked).
- No Work-OS command falls into a generic LLM refusal.

## Phase 1268 Gap Discovery — Toward AGI-Like Context Orchestration

Closed this phase: the draft→Action Center **lifecycle** (the opened
action no longer "disappears" — Action Center now reads `?focus=<id>`,
auto-selects the tab, scrolls + ring-highlights the action, and offers
real **Approve/Reject** on pending actions via the linked escalation).
WorkArtifactCard gained **Include others** (picker input, not a prompt)
and inline **Edit** with a SAFE edit-feedback signal. Context-first
"no-homework" defaults are locked by tests (internal channel default;
Slack/email only when named; no upfront interrogation).

Remaining bridges, by dimension (status → symptom → next bridge → acceptance):

| # | Dimension | Status | Next bridge / acceptance |
| --- | --- | --- | --- |
| 1 | Personal work queue | Partial (Action Center) | Persisted "my drafts/proposals" filter; AT: my pending actions list |
| 2 | Team work queue | Missing | Org/team action list (admin scope); AT: team pending actions |
| 3 | AI Twin inbox | Missing | Twin-addressed collaboration list; AT: requests to my Twin |
| 4 | Human teammate inbox | Partial (Notifications) | Threaded teammate inbox; AT: 1:1 thread view |
| 5 | Collaboration threads | Partial (Collaboration page) | Per-request thread + focus; AT: open request by id |
| 6 | Action Center | **Done** (focus + approve/reject) | Detail drawer + body surface (privacy-bounded) |
| 7 | Project/goal context | Missing | Active-project selector + artifact.attach; AT: artifact shows project |
| 8 | Meeting intelligence | Partial (conversation→actions) | Transcript ingestion + extraction; AT: transcript→action items |
| 9 | Calendar availability | Missing (backend) | `POST /calendar/freebusy` (Google scopes present); AT: candidate slots |
| 10 | External comms | Missing (backend) | Approval-gated Slack/email send; AT: no send without approval |
| 11 | Notifications | **Done** (wrap/scroll/route/clean error) | Detail modal |
| 12 | Authority/approval | Partial (policy evaluator surfaced) | Standing/short/long grant UI; AT: status reflects grant tier |
| 13 | Long-term delegation | Missing | Authority-grant create from card; AT: grant persists |
| 14 | Short-term delegation | Missing | Time-boxed grant; AT: expiry honored |
| 15 | Standing authority | Partial (AUTO_APPROVE shown) | Grant management surface |
| 16 | Audit + memory | Partial (audit events + edit feedback) | Surface action audit timeline |
| 17 | Desktop OS actions | N/A this phase | — |
| 18 | Browser/URL actions | Done (safe open) | — |
| 19 | File/document actions | Missing | Attach/preview; AT: artifact attachment |
| 20 | Connector health | Done (summary) | — |
| 21 | Agent performance | Missing | Per-agent action metrics |
| 22 | Feedback/learning loop | Started (edit signal) | Default-improvement from feedback |
| 23 | Admin setup gaps | Partial | Teammate invite/activation surface |
| 24 | Employee setup gaps | Partial (onboarding) | — |
| 25 | Handoff readiness | See §8 acceptance tests | Run full E2E lifecycle |

Recommended next bridge order (unchanged + refined): calendar free/busy
→ task create/assign as a ProposedAction type → meeting transcript
ingestion → calendar event create (gated) → external Slack/email send →
Zoom recordings → project/goal attach → Twin intercession policy.

## Domain-General Intelligence Orchestration Standard (Phase 1269)

Otzar's "AGI effect" is **domain-general intelligence through
orchestration**, not autonomous magic. It is produced by capturing
enough governed enterprise context that the next step is obvious, and
by executing it within policy — drafting/proposing where authority is
needed, executing where authority is standing, and never faking.

**1. Signals captured:** voice, chat, meetings/transcripts, notifications,
projects/goals, tasks, calendars, connector state, approvals/escalations,
artifact edits (feedback), decisions, blockers, follow-ups.

**2. Context graph (entities + edges):** people · AI Twins · agents ·
projects · goals · conversations · meetings · decisions · tasks ·
approvals · artifacts · connectors. Resolution today: `org/entities`
roster (people + AI). Edges (artifact→project, meeting→owner) are the
next bridges.

**3. Execution loop:** detect (classifier) → infer (context-first
defaults) → draft (local artifact) → propose (Confirm → governed
ProposedAction) → approve (escalation policy) → execute (only when
authorized) → verify (action status) → notify → learn (edit-feedback
signal). Phase 1269 makes draft/propose/approve correct and distinct.

**4. Priority alignment:** every artifact should attach to its
project/goal when known; every meeting action should carry an
owner/deadline; every teammate request should carry status; every
blocker should be visible. Project/goal attach + owner/deadline are
named bridges.

**5. Human-load minimization (no-homework):** infer first; draft first
when safe; ask only targeted questions (unresolved target, external
send, policy gate); internal-first; policy-driven approvals; standing
authority where safe. Locked by tests.

**6. Acceptance for the AGI effect:** a user should not have to remember
every promise from a meeting (after-call artifacts); a teammate should
not hunt for work (Action Center + Collaboration inbox); an admin should
see risk/approval/action status (Action Center); the org should meet or
exceed priorities by coordinating every communication + execution
surface. Current coverage + remaining bridges are tracked in the tables
above; the orchestration standard is the bar each future phase is
measured against.
