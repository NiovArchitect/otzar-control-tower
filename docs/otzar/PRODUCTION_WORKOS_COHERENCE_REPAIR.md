# Production Work OS Coherence Repair (PROD-UX-AMBIENT) — checklist

**Status:** living — updated 2026-07-01 (second pass; Fable session). P0D/P0E/P0A/P0B/P0C
are LANDED (see per-item status lines); this pass adds **P0R (routing/autonomy decision
layer)**, desktop continuity, ambient visual redesign, and the runtime-boundary register,
then completes P0F/P0G/P0H/P1/P2 + the scenario smoke suite + deploy + live verify.
North star: `AMBIENT_WORK_OS_PRODUCT_DOCTRINE.md`. Acceptance
standard: a real user in a real org completes the flow end-to-end — no fake data, no dead
buttons, no hidden source, no terminal, no policy violation, no card spam. **"Passes" =
real end-to-end.** Every flow carries the 11-point spec; a flow is not complete until all
11 hold and a scenario smoke proves it.

**11-point spec per flow:** 1 user story · 2 route/path · 3 data source · 4 owner/scope ·
5 UI state(s) · 6 available actions · 7 backend rail used · 8 success state · 9 failure/
blocked state · 10 audit/source evidence · 11 live/integration smoke.

**Verification labels (strict):** Live verified · Integration verified · Locally verified ·
Not verified · Skipped(reason) · Deferred boundary(reason). Never "should/likely/ready".

**Do-not-break:** the one WorkLedger, the Action executor + dual-control approval wire, the
connector/binding/Dandelion/identity/grounding/goal/audit services (A–F). Reuse, expose,
never rebuild. No duplicate systems, no UI-only fake state, no hardcoded demo names.

---

## Recon truth (what already exists — reuse, don't rebuild)

- **Action Center / My Work**: `src/pages/app/ActionCenter.tsx`, `MyWork.tsx`,
  `components/work-os/WorkLedgerItem.tsx`. Backend routes EXIST: `POST /work-os/ledger/:id/execute`,
  `POST /work-os/ledger/:id/reconcile-execution`, `GET /actions/:id`, `GET /actions/:id/attempts`.
  **Missing in CT**: api methods for execute/reconcile/attempts; `proposed_action_id` +
  `execution_plan` on `WorkLedgerEntryView` (foundation.ts:4524); execute/receipt buttons.
- **Today**: `FocusHome.tsx` / `MyDay.tsx` — headline only; attention count NOT a clickable
  route. Data available via presence store + `blindSpotsFeed`.
- **Comms**: `Comms.tsx` + `commsRecentArtifacts()`. Transcript IS stored
  (`meetingCapture.transcript`) but **no route exposes it** (`MeetingCaptureSafeView` omits
  it). Need `GET /otzar/meeting-captures/:id/transcript` (caller-scoped) + CT viewer.
- **Dandelion**: `OrganizationSeeding.tsx` flat cards; `dandelion-seed.service.listOrgSeeds`
  (take 200, no group/dedup/pagination). Seed has `subject_entity_id` in details but it's
  NOT projected. Dup seeds created at source (`work-graph-memory.ts:162-179`, one per mention).
- **Identity**: `work-item-planner.ts:95` (`Follow-up owned by ${name}` — no pronoun guard),
  `comms-extract.service.ts:345` (keeps ungrounded `display_name`), `work-graph-memory.ts`
  (no seed dedup), `recipient-governance.ts` has a proof-path model used for RECIPIENTS but
  NOT for owners.
- **Tools & Connections**: `ToolsConnections.tsx` + `ConnectorsAdmin.tsx` +
  `ConnectorRailsAdmin.tsx` — real CRUD (register/enable/disable/soft-delete/test, OAuth
  connect/verify/revoke, MCP). Leaks impl language (C2/C3 codes, `SLACK_READ` types,
  `binding_id`, "MCP"). Slice-F `slack-write` route NOT wired.
- **Voice**: `Voice.tsx` browser STT + honest text fallback; NO server-STT fallback. The
  `/otzar/voice/transcribe` server route exists (LIVE-4A).
- **Orb**: `AmbientOtzarBar.tsx` fixed `bottom-20 right-4 z-[60]`, collapsible, NOT draggable.
- **AI Teammates**: `AITeammates.tsx` already shows owner+friendly policy; raw entity_id
  fallback + "EXECUTIVE_OVERRIDE" label leak. **People & Roles**: `Users.tsx` flat, no
  hierarchy (`/org/hierarchy` endpoint exists, used by AITeammates).
- **Frontend doctrine rails**: `lib/work-os/ambient-visibility.ts` (`decideAmbientVisibility`,
  `findBackendTermLeak`), `lib/work-os/work-context.ts`. Presence store `lib/stores/presence.ts`.

---

## P0D — Identity truth (stop generating junk owners/people)  [FIRST]
1 **Story**: a transcript that says "he'll follow up" or names "Zephyr"/"Dishant" must NOT
produce a work item owned by a pronoun or a hallucinated person; unknown-but-grounded
participants become ONE grouped person-setup suggestion. · 2 backend extraction path (no
route change) · 3 transcript + org roster · 4 org-scoped · 5 owner shows "Owner needs
review" (not a pronoun/ungrounded name) · 6 admin confirm/hold/reject the person seed · 7
`work-item-planner`, `comms-extract`, `work-graph-memory`, `dandelion-seed` (reuse) · 8
proven owner → owned item; unproven → NEEDS_OWNER with neutral title + review reason ·
9 pronoun/ungrounded → held for review, never owner · 10 seed carries source_evidence +
confidence + subject_entity_id · 11 integration tests (deterministic).
**Fixes**: (a) pronoun/non-name guard before `titleFromWork` — pronouns → neutral
"Needs owner confirmation" title, never "owned by his"; (b) ungrounded name (not in source
evidence + no entity) → `identity_needs_review`, not owner display; (c) dedup seeds by
`ownerName`(normalized) in `work-graph-memory` — one grouped `confirm_or_activate_person`
seed per person with merged evidence + count; (d) project `subject_entity_id` + a stable
`subject_key` on the seed view for grouping.
**Status**: LANDED — FND `0e08d32` (PR #516): pronoun/non-name guard in
`work-item-planner.ts`, seed clustering in `work-graph-memory.ts`, `subject_key`
projection in `dandelion-seed.service.ts`; unit tests included. **Integration verified**
(PR CI). Live re-verification runs with the ux-coherence smoke.

## P0E — Dandelion scale (grouped queues, not 75-card spam)
1 admin reviews org-seeding at enterprise scale · 2 `OrganizationSeeding.tsx` +
`GET /org/dandelion/seeds` · 3 ORG_SEEDING ledger rows · 4 admin/org-scoped · 5 grouped
queues (People to review / Access-tool setup / Role-project-team / Ambiguous / Low-conf /
Held / Applied) · 6 approve-selected / hold / reject / merge / search / filter / paginate ·
7 `dandelion-seed.service` (extend list: project subject_entity_id + subject_key; group;
paginate) · 8 same person = one grouped surface · 9 empty/loading honest · 10 per-seed
evidence preserved · 11 integration (grouping) + CT unit (grouped render) + live smoke.
**Status**: LANDED — CT `4b09592`: `seed-grouping.ts` (`groupSeeds()` → prioritized
queues), `OrganizationSeeding.tsx` grouped render; unit tests (`seed-grouping.test.ts`,
`organization-seeding.test.tsx`). **Locally verified (CT unit)**; live grouped-count
assertion pending the ux-coherence smoke.

## P0A — My Work / Action Center actionable (surface the governed loop)
1 employee opens a work item and acts · 2 `MyWork.tsx`/`ActionCenter.tsx` +
`/work-os/my-work`, `/work-os/ledger/:id/execute`, `/reconcile-execution`, `/actions/:id[/attempts]` ·
3 WorkLedger + Action · 4 per-user (owner/target/requester); admin broader by policy · 5
states: human_task · otzar_can_draft · execute_with_approval · pending_approval · approved/
executing · executed · blocked_tool · blocked_permission · owner_needs_review · failed · 6
Open source · Ask Otzar · Approve/Reject/Edit · Mark done · Request/Connect tool · View
receipt/audit (only the ones valid for the item's state; no dead buttons) · 7 execution
bridge + Action executor + escalation approve (reuse) · 8 executed → receipt shown · 9
blocked → clear reason + next step · 10 proposed_action_id + attempt delivery_metadata +
source evidence · 11 CT unit (state→actions map) + live smoke (open, mark-done, approve→receipt).
**Status**: LANDED — CT `b6b6ce1`: `WorkLedgerItem.tsx` execution surface,
`work-item-execution.ts` (state→actions map), api execute/reconcile/attempts methods;
unit tests. **Locally verified (CT unit)**; live open→act→receipt assertion pending the
ux-coherence smoke. P0R (below) extends each item with the routing decision + why.

## P0B — Today attention routes to the backing item
1 Today says "N need attention" and clicking routes there · 2 `FocusHome`/`MyDay` →
Action Center (filtered) or the single item · 3 same query that backs Action Center /
blind-spots · 4 per-user · 5 calm cue; count matches · 6 click → deep link · 7 presence +
work-os feeds · 8 1 item → item; N → filtered · 9 0 → no card · 10 n/a · 11 live smoke
(count matches; click routes).
**Status**: LANDED — CT `1e1e1fa`: `today-attention.ts` + `FocusHome.tsx` (real-signal
count, deep link, no-card-when-zero); unit tests. **Locally verified (CT unit)**; live
count-matches + click-routes assertion pending the ux-coherence smoke.

## P0C — Comms reopen source conversation + transcript
1 after import, reopen the capture + view original transcript · 2 `Comms.tsx` +
`GET /otzar/meeting-captures`, new `GET /otzar/meeting-captures/:id/transcript` · 3
`meetingCapture.transcript` · 4 caller-owned only (no leak) · 5 list → open → transcript +
derived work + evidence · 6 open, view transcript, jump to work items/seeds · 7
meeting-capture service (add caller-scoped transcript route) · 8 transcript visible to
authorized user · 9 unauthorized → 404/denied (no leak) · 10 source evidence spans · 11
integration (route + no-leak) + live smoke (import → return → reopen → transcript).
**Status**: LANDED — FND `e8017eb` (PR #517): caller-scoped
`GET /otzar/meeting-captures/:id/transcript` + integration tests (incl. no-leak);
CT `3b8f6a5`: `MeetingCaptures.tsx` `SourceTranscript` viewer + unit tests.
**Integration verified** (FND) + **Locally verified (CT unit)**; live import→reopen→
transcript assertion pending the ux-coherence smoke.

## P0R — Routing/autonomy decision layer (added this pass; the core product behavior)
1 every My Work / Action Center item carries the routing decision Otzar made and why ·
2 `GET /work-os/my-work` items + `GET /work-os/ledger/:id/routing-decision` · 3 the
*existing* deciders — `computeAutonomyDecision` (autonomy.ts), `planExecution`
(execution-planner.ts), `computeCapabilityState` (connector-capability.ts), pronoun/
identity guards (work-item-planner.ts) · 4 per-user; org-scoped · 5 one routing lane per
item: `silent_capture | silent_routing | notify_owner | draft_ready |
execute_when_allowed | ask_approval | escalate | blocked | setup_required |
identity_review` · 6 the lane maps to the item's valid actions (P0A map) · 7 **compose,
do not duplicate** — a pure projection over A+B+C outputs; no second autonomy system ·
8 low-risk owned item = silent_routing (no approval demanded); governed external write =
ask_approval with reason; missing tool = setup_required with the tool named · 9 unknown
identity = identity_review; unresolvable = blocked with why · 10 decision carries reason,
evidence refs, risk, confidence, policy basis, owner, next best action, audit pointer ·
11 FND unit tests (lane matrix) + CT unit (lane→UI chip) + live smoke (lane visible).
**Status**: BUILT (third pass; Fable session) — FND PR #518 (branch
`prod-ux-p0r-routing-decision`): `routing-decision.ts` pure projection +
`GET /work-os/ledger/:id/routing-decision` + `getMyWork` attaches `routing`;
31 FND unit tests + typecheck clean; **all 5 CI checks green — awaiting founder
squash-merge** (agent self-merge is permission-blocked). CT `682027d`:
`routing-lane.ts` lane→chip (silent lanes render NO chip; why in View/Why) +
`WorkLedgerItem` chip + routing-why block; 13 CT unit tests.
**Integration verified (FND CI) + Locally verified (CT unit)**; live lane
assertion = UX-3 in the ux-coherence smoke (skips with the PR named until the
FND merge deploys).

## P0F — Tools & Connections UI-operable + human copy
1 admin connects/verifies/revokes a tool from UI, sees blocked work · 2 `ToolsConnections.tsx`
+ existing connector routes + Slice-F `slack-write` route · 3 ConnectorBinding + OAuth +
work-os blockers · 4 admin-only · 5 human copy (Connect Slack / Verify / Revoke / "Used by
N blocked items" / "Needs admin setup" / "Missing chat:write" / "Bot not in channel") · 6
connect/verify/revoke/rotate/test/set-default · 7 connector-binding + oauth + connector-
capability (reuse) · 8 binding active + verified · 9 honest Slack error class surfaced · 10
audit on binding ops · 11 CT unit + live (register slack-write from UI; verify).
Impl language (C-codes, `SLACK_READ`, `binding_id`, "MCP") → Advanced details.
**Status**: LANDED — CT `db3e01f`: SlackWriteSetupCard (UI registration of the
Slice-F SLACK_WRITE binding; honest created/already/FEATURE_DISABLED/
ADMIN_REQUIRED states; REAL blocked-work count from blind-spots),
`connector-error-copy.ts` (machine failure → admin next step) wired into the
invoke dialog, SLACK_WRITE chat.postMessage test op with payload_fields through
the governed pipeline, C-codes/binding_id/RULE-10 copy → Advanced details.
**Locally verified (CT unit: 103 across 7 connector files)**; live = UX-8
(read-only route probe) in the ux-coherence smoke.

## P0G — Browser voice → server STT fallback
1 voice works or degrades to server STT with honest state · 2 `Voice.tsx` +
`/otzar/voice/transcribe` · 3 mic audio · 4 per-user · 5 Listening/Transcribing/Server
transcription/Error · 6 speak; on browser-STT fail, capture+POST audio to server · 7
existing ElevenLabs transcribe route · 8 text appears from server · 9 no mic/network →
useful fix + text still works · 10 no raw-audio storage (policy) · 11 CT unit (fallback
path) + live (HTTPS) or Deferred boundary(HTTPS+key).
**Status**: LANDED — CT `7a13fe8`: `decideSttPath()` matrix (Tauri flow
preserved EXACTLY; browser Web Speech primary; server STT fallback on the
'network' error, primary when Web Speech absent), one-time auto-switch,
review-then-send draft flow, allowlist MIME selection, honest disclosure copy;
wired into AmbientOtzarBar + Voice.tsx. **Locally verified (CT unit: stt-path
23)**; live honest-state = UX-6; real-mic transcription = Deferred
boundary(headless browsers have no mic — desktop path was live-verified in
LIVE-4A).

## P0H — Talk-to-Otzar orb non-blocking
1 orb never blocks capture/CTAs · 2 `AmbientOtzarBar.tsx` · 3 n/a · 4 per-device · 5
draggable + collapsible + remembers position · 6 drag/collapse/reset · 7 n/a · 8 CTAs
clickable · 9 off-screen → reset · 10 n/a · 11 CT unit (position persistence) + live (orb
does not overlap capture).
**Status**: LANDED — CT `7a13fe8`: `orb-position.ts` pure clamp/snap/validate/
persist (versioned key; off-screen stored positions reset), pointer-capture
drag with tap-vs-drag threshold, edge snap, safe-area anchoring, Reset control,
dock follows the orb's edge with 88vh clamp; pointer-events-none halo +
content-sized wrapper so nothing outside the pill blocks clicks.
**Locally verified (CT unit: orb-position 23)**; live drag+persist = UX-5.

---

## P1 (scale/usability) · P2 (copy/IA)
- **P1 Admin IA**: hide the 6 `comingSoon` pages from nav (keep routes deep-link-safe);
  move impl language to Advanced; ensure diagnostics separate. (`nav.ts`)
- **P1 AI Teammates**: never show raw entity_id (fallback to "Unassigned"); "Behavior:
  autonomous/approval" not "EXECUTIVE_OVERRIDE". (`AITeammates.tsx`)
- **P1 People & Roles**: render `/org/hierarchy` (teams/managers/reports) + person actions.
  (`Users.tsx`)
- **P1 Ambient visual pass** (added this pass): apply the existing glass/presence language
  (`GlassPanel`, `presenceRing`, edge animations) consistently to the employee surfaces —
  state-colored borders (calm / needs-me / waiting / blocked / executing / done / risk /
  memory-updated / tool-needed), frosted panels, calm motion. Reuse
  `src/lib/stores/presence.ts` states; do not add a second state system; do not make it
  noisy.
- **P2 Copy**: run `findBackendTermLeak` over normal-flow strings as the gate; replace
  env-var/binding/rail/envelope/entitlement/preview/raw-IDs with human copy. Known leak
  sites: `Comms.tsx:494` ("Owned by …" when owner needs review), `ConnectorsAdmin.tsx`
  (env-var/binding), `ConnectorHealth.tsx:271,347` ("connector rails"), employee-visible
  "envelope" mentions.

## Desktop continuity (register — honest boundary, no fake support)
Desktop shell EXISTS: `src-tauri/` (Tauri 2, `tauri:dev`/`tauri:build`, macOS DMG +
Windows MSI/NSIS, docs/desktop.md). Voice: desktop uses MediaRecorder →
`/otzar/voice/transcribe` via `useDesktopVoiceCapture`; browser used Web-Speech-only
(P0G closes that gap by reusing the same hook as fallback). **Known drift**: committed
`src-tauri/tauri.conf.json` CSP `connect-src` allows only `localhost:3000/4000` —
docs/desktop.md claims the prod API host is allowed. A desktop build pointed at
`api.otzar.ai` would be CSP-blocked. Fix = add `https://api.otzar.ai` (+ `wss:` if
needed) to `connect-src`. Native notifications/tray/screen-capture remain NEEDS_NATIVE
(honest in `desktop-capabilities.ts`) — not faked.

## Runtime/language boundary register (per docs/operations/otzar-polyglot-runtime-architecture.md)
- Orchestration/API/governance/policy/executor — **already_correct** (TypeScript; ADR-0090 §3).
- Frontend + ambient UI — **already_correct** (React/Vite + Tauri shell).
- Classification/priority/drift/embeddings — **keep_typescript_orchestration_but_call_worker**
  (Python intelligence scaffold exists; `PYTHON_INTELLIGENCE_RUNTIME_URL`-gated, TS fallback).
- Realtime presence/notifications/Work Comms actors — **do_not_move_yet_but_define_boundary**
  (BEAM apps exist; `BEAM_RUNTIME_ENABLED`-gated; WorkOsEvent→BEAM dispatch is the defined
  next bridge; inline dispatch remains the shipped path).
- Native mic/notifications/screen capture — **move_to_rust only at the Tauri boundary**
  (native plugins, Founder-gated per repo rules).
- Nothing is rewritten for novelty in this slice; boundaries above are the doctrine.

## Scenario smoke suite (acceptance layer)
`test:e2e:live:workos:ux-coherence` + focused specs (ux-action-center, ux-comms-source,
ux-identity-dandelion, ux-tools-connections, ux-today-routing, ux-voice, ux-floating-
assistant, ux-admin-cleanup). Each proves its P0 end-to-end; skips clean when creds-gated;
the deep Work OS suite (36) + baseline must stay green throughout.

## Sequence (each: grep → build → test → commit → verify → next; A–F preserved)
1 docs (this + doctrine) → 2 P0D identity truth → 3 P0E Dandelion scale → 4 P0C Comms
reopen → 5 P0A Action Center → 6 P0B Today routing → 7 P0F Tools UI → 8 P0G voice → 9 P0H
orb → 10 P1 IA/teammates/hierarchy → 11 P2 copy gate → 12 scenario smokes → deploy →
live-verify. Ordered so backend-truth fixes (D/E/C) land before the surfaces (A/B) that
render them.

**Second-pass sequence (2026-07-01, Fable session):** steps 1–6 above are LANDED. This
pass: 1 doc statuses (this edit) → 2 **P0R routing decision layer** (FND compose + CT
surface) → 3 P0G voice fallback + P0H orb (CT) → 4 P0F Tools UI (CT) → 5 P1 IA/teammates/
hierarchy + ambient visual pass + P2 copy gate (CT) → 6 desktop CSP fix → 7 scenario
smokes (`test:e2e:live:workos:ux-coherence` + focused specs) → 8 gates (CT vitest+tsc;
FND targeted unit/integration) → 9 push/deploy → 10 live verify (Deep Work OS suite +
ux-coherence against app.otzar.ai) → 11 handoff updates.
