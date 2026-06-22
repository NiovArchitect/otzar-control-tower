# Ambient Voice Capture Readiness

> Phase OTZAR-RETURN-3. This document describes the **readiness layer** added in
> `src/lib/voice/ambient-voice-capture.ts`. It prepares architecture and UI
> truth for ambient voice. It does **not** implement always-on listening or any
> wearable integration.

## 1. Product direction

Otzar is moving toward being a true ambient AI work companion — not just a web
page, inbox, or thread UI. The target surfaces are the desktop browser and
desktop app/tray **today**, and earphones, glasses, lenses, and goggles
**later**.

The intended loop: a user speaks naturally, Otzar captures the transcript
safely, routes the intended work (Chat, Ask Twin, Comms, Approval, Action
Runtime, Note Capture, Reminder), preserves context, and acts only within
governance (draft → confirm → approve). Voice should advance real work, never
fire blind external actions.

## 2. Current truth (honest boundaries)

- **Browser STT may use the browser/vendor speech service.** Some browsers send
  microphone audio to their own provider (e.g. the OS/vendor speech service) to
  produce a transcript.
- **Otzar receives the transcript text only.** In the browser STT path, Otzar's
  boundary never receives raw microphone audio — only the resulting string.
- **No always-on capture.** There is no background or wake-word listening. Voice
  is push-to-talk / explicit.
- **No wearable capture.** Earphones, glasses, lenses, and goggles are future
  device modes. No wearable device is connected or supported today.
- **No on-device-only STT claim.** The model and UI never claim local /
  on-device-only transcription.
- **No raw-audio persistence.** No raw audio is stored client-side.

> Note on the existing desktop (Tauri) path: the desktop app's
> `useDesktopVoiceCapture` records an utterance and sends it to the backend for
> transcription, so that specific path is **not** described by this model's
> "transcript text only" copy. This readiness model represents the browser/text
> path now and the wearable/tray paths as future — it deliberately does not
> model the current desktop Whisper path.

## 3. Readiness model

`src/lib/voice/ambient-voice-capture.ts` provides a small, local, deterministic
model — Otzar product infrastructure, not a protocol artifact.

### Device modes (`AmbientVoiceDeviceMode`)
`desktop_browser`, `desktop_app`, `earphones_future`, `glasses_future`,
`lenses_future`, `goggles_future`.

### Capture modes (`AmbientVoiceCaptureMode`)
`text_only`, `push_to_talk`, `browser_stt`, `desktop_mic_future`,
`wearable_future`.

### Statuses (`AmbientVoiceCaptureStatus`)
`ready`, `blocked`, `unsupported`, `provider_blocked`,
`future_device_not_connected`.

### Intended routes (`AmbientVoiceIntentRoute`)
`chat`, `ask_twin`, `comms`, `approval`, `action_runtime`, `note_capture`,
`reminder`, `unknown`.

### Structured capture event (`AmbientVoiceCaptureEvent`)
A transcript-only record. Key invariants:
- `event_schema: "OTZAR_AMBIENT_VOICE_CAPTURE_EVENT"`, `schema_version: "0.1"`
- `audio_sent_to_otzar: false` (always)
- `otzar_receives: "transcript_text_only"` (always)
- `confidence: "deterministic_local_hint"`
- carries `transcript_text` / `transcript_present`, `device_mode`,
  `capture_mode`, `status`, `intended_route`, optional `provider_note` — and
  **no** raw-audio or persistence fields.

### Helpers
- `describeAmbientVoiceMode(input)` → honest user-facing copy for the current
  state (browser ready / text only / provider blocked / future wearable /
  desktop tray future).
- `inferVoiceIntentRoute(transcript)` → deterministic local route hint.
- `createAmbientVoiceCaptureEvent(input)` → the transcript-only event above.
- `ambientVoiceDeviceOptions()` → the device matrix (current vs. planned) for
  honest UI. Wearable rows are always `planned` and never claim a connected
  device.

This model is intentionally **separate** from the existing
`src/lib/voice/command-router.ts` (`routeVoiceCommand`, which navigates to admin
*surfaces*) and `src/lib/voice/voice-action-runtime.ts` (`classifyVoiceAction`).
It adds a higher-level **work-intent** hint, not a navigation or dispatch
decision.

## 4. Intent routing

`inferVoiceIntentRoute` maps a transcript to one of the routes below. Order is
deterministic and priority-sensitive — `remind me` resolves to **Reminder**
before the generic Action Runtime `remind`, and `ask twin` resolves to **Ask
Twin** before the Chat default. An empty transcript is `unknown`.

| Route | Example triggers |
| --- | --- |
| Ask Twin | "ask twin", "ask my twin", "what do I know" |
| Comms | "message", "reply", "send", "tell", "text", "email" |
| Approval | "approve", "approval", "deny", "decline", "sign off" |
| Action Runtime | "task", "complete", "follow up", "todo" |
| Note Capture | "note", "capture this", "remember this", "write this down" |
| Reminder | "remind me", "set a reminder", "later today", "tomorrow" |
| Chat | anything unmatched |

The hint is advisory: it is shown as "Intent route: …" and Otzar still confirms
before any governed action. It performs no external write.

## 5. Push-to-talk capture state machine (RETURN-4)

`src/lib/voice/push-to-talk-state.ts` is the first concrete step from the
readiness model toward real capture: a small, pure, deterministic state machine
for **explicit, user-initiated** voice capture.

### States
`idle`, `permission_required`, `permission_denied`, `arming`, `listening`,
`captured`, `blocked`, `error`. There is deliberately **no** `background` or
`always_on` state.

### Events
`ARM`, `PERMISSION_GRANTED`, `PERMISSION_DENIED`, `START_LISTENING`,
`TRANSCRIPT_CAPTURED`, `STOP`, `CANCEL`, `BLOCKED`, `ERROR`, `RESET`.

### Invariants
- `pushToTalkTransition(state, event)` is **total** — an unhandled pair returns
  the state unchanged, never throws.
- The **only** path into `listening` is `idle → ARM → arming → (permission) →
  listening`. There is no transition that begins capture in the background or on
  a wake word. Wake-word / always-on listening is **not** implemented or
  modelled.
- `CANCEL` returns to `idle` from any state; `BLOCKED`/`ERROR` are reachable
  from any state and clear via `RESET`.
- `pushToTalkCaptureEvent(transcript)` produces a `push_to_talk`
  `AmbientVoiceCaptureEvent` — reusing the RETURN-3 model, so `audio_sent_to_otzar`
  stays false and Otzar receives transcript text only.
- `describePushToTalkState(state)` copy never claims always-on / wake-word
  listening; the `idle` copy states plainly that there is no background
  listening.

The Voice page derives this state from real signals (mic support, permission,
live listening, captured transcript) and renders it as the honest "Capture
model: Push-to-talk" indicator — making the existing mic button visibly part of
an explicit, no-background-listening model.

## 6. Voice approval safety / confirm-before-act (RETURN-5)

Voice must never jump straight from a transcript to an action. The safe path is:

> spoken transcript → deterministic route hint → draft / proposed action →
> confirmation gate → governed action **only after explicit confirm**.

`src/lib/voice/voice-approval-safety.ts` adds the local confirm-before-act
safety layer. It is pure and deterministic, performs **no** API call, and makes
**no** external write (no send, no approve, no task change, no reminder create).

### Safety levels (per route)
| Route | Safety level | Behavior |
| --- | --- | --- |
| chat, ask_twin | `informational` | No privileged action; nothing to confirm. |
| note_capture | `draft_only` | Draft for review; no external write. |
| comms, approval, action_runtime, reminder | `confirm_required` | Explicit confirm before any action. |
| unknown | `blocked` | Otzar asks for clarification; never guesses. |

### Confirmation states
`not_required`, `required`, `confirmed`, `declined`, `expired`, `blocked`.

### Invariants
- The route hint is **advisory**. Privileged routes produce a `VoiceProposedAction`
  with `confirmation_state: "required"` and `can_execute_without_confirmation:
  false`.
- `createVoiceProposedAction` / `applyVoiceConfirmation` set
  `external_write_performed: false` **always**. Confirming is **local-only** in
  this build — the Voice page's "Confirm locally" / "Decline" buttons update
  local state and copy ("Confirmed locally. No external write has been performed
  in this build." / "Voice action declined.") and nothing else.
- A `blocked` route cannot be confirmed into an executable state; an
  informational route never becomes an external write on confirm.
- No raw-audio fields; transcript text only; no AVP²/Federation references.

A future chunk can connect a *confirmed* action to a governed Foundation API
(through the existing audit-aware action pipeline) — but only behind this gate.

## 7. Local transcript buffer + confirmed-action handoff scaffold (RETURN-6)

RETURN-6 adds the session memory layer and the inert execution seam.

### Local voice turn buffer — `src/lib/voice/voice-turn-buffer.ts`
- An **in-memory, session-only** buffer of `VoiceTurn`s. Each turn holds the
  transcript text, the `AmbientVoiceCaptureEvent`, the `VoiceProposedAction`,
  and its confirmation state for the current session.
- It stores **no raw audio** (`raw_audio_present: false`) and **does not
  persist** (`persisted: false`, `retention: "in_memory_session_only"`). It
  never writes to localStorage, sessionStorage, IndexedDB, a backend, or the
  filesystem — it lives in React state and is gone on reload.
- `external_write_performed` is always false. The buffer is bounded (`max_turns`,
  default 10, minimum 1) and immutable (`addVoiceTurn` returns a new buffer).
- `updateVoiceTurnConfirmation` applies confirm/decline/expire locally; a blocked
  turn can never become executable.

### Confirmed-action handoff scaffold — `src/lib/voice/confirmed-action-handoff.ts`
- `createConfirmedVoiceActionHandoff(turn)` produces a typed
  `ConfirmedVoiceActionHandoff` **only** for a genuinely-confirmed
  `confirm_required` turn; informational / draft-only / blocked / unconfirmed
  turns get an honest refusal.
- The handoff is **inert**: `execution_status: "not_executed"`,
  `external_write_performed: false`, `governed_api_called: false`,
  `ready_for_future_governed_execution: true`, `requires_governed_runtime: true`.
  It is the seam a future chunk would connect to the existing governed /
  audit-aware action runtime — it does not execute now.
- Copy: "Confirmed locally and ready for future governed execution. No external
  write has been performed in this build."

### Voice page
The Voice page holds the live turn in this buffer, shows the latest turn (route,
safety level, confirmation state) with the retention line ("in-memory session
only. No raw audio is stored. No external write has been performed."), and — once
a privileged turn is confirmed locally — displays the inert handoff copy. A
"Clear local voice turns" button empties the in-memory buffer only. Nothing is
persisted, no API is called, nothing is sent/approved/completed/created.

This prepares future governed execution without enabling it.

## 8. Governed note capture behind the confirm gate (RETURN-7)

RETURN-7 is the **first governed voice EXECUTION** route. Governed voice
*control* already existed (RETURN-3..6: capture, routing, confirm-before-act,
turn buffer, inert handoff); RETURN-7 activates exactly one low-risk governed
*write*.

- **Scope: `note_capture` only.** `src/lib/voice/voice-note-execution.ts`
  executes a note capture for the `note_capture` route and **refuses every other
  route** (comms, approval, action_runtime, reminder, chat, ask_twin, unknown) —
  the governed write is never called for them.
- **It saves an internal note, not an external message.** It reuses the SAME
  governed, audit-aware write the Observe page already performs:
  `POST /api/v1/otzar/observe` with `event_type: "NOTE"`, which writes the
  caller's own memory capsule and emits a `CAPSULE_CREATED` audit. No external
  message / email / Slack / calendar. No approval decided, no task completed, no
  reminder created.
- **No raw audio.** Transcript text only. `external_write_performed` is always
  false (internal capture, not an external send). `governed_api_called` is true
  only when the note API was actually invoked; refused routes never call it.
- **Behind explicit user confirmation.** The Voice page shows a "Save internal
  note" button for `note_capture` only; it is click-triggered (never auto-run).
  Success copy: "Internal note saved to your memory. No external message was
  sent." Duplicate content is honest ("already captured", `internal_note_created:
  false`). A note id (capsule) is shown; an audit id/link is shown if the
  endpoint returns one.
- Other privileged routes remain refused/inert until future chunks. No Foundation
  change was required — RETURN-7 consumes the existing internal observe path.

## 9. Voice note provenance and undo (RETURN-8)

RETURN-8 closes the loop around the first governed voice write **without widening
execution** — `note_capture` remains the only voice route that can write.

### A key finding about `note_capture`
`POST /otzar/observe` is an **LLM extraction pipeline**, not a single-row insert.
A single `event_type: "NOTE"` can **fan out to multiple memory capsules**, and
per Foundation's PORTABILITY ROUTING invariant **decisions route to the ORG
wallet** while commitments/insights route to the caller's wallet. RETURN-7
recorded only `capsule_ids[0]`; RETURN-8 carries the **full `capsule_ids[]`** so
provenance is honest.

### Provenance
After a saved note, the Voice page shows: all capsule ids (and, when >1, that the
note was extracted into N capsules, some possibly in the org wallet), event type
`NOTE`, source `voice_note_capture`, "No external message was sent", "No raw
audio was stored", and an audit link **only if** the endpoint returns one (it
does not today). `external_message_sent` and `raw_audio_stored` are always false.

### Read-back
Reported **unavailable**: there is no safe by-id read that spans the caller +
org wallets a NOTE can mint into (`cosmpCapsules.list` is a paginated,
caller-wallet-scoped scan and returns a redacted `payload_summary`, not the
verbatim note). The capsule ids are shown for provenance instead.

### Undo — investigated, intentionally not wired
A safe undo is **not available** in this build, and RETURN-8 performs **no
revoke/delete**. The existing revoke (`POST /cosmp/capsules/:id/revoke`) is a
genuinely safe, audit-aware, owner-scoped **soft** revoke — but it is
**per-capsule and caller-wallet-scoped**, so it cannot cleanly revoke a fanned-
out note: org-wallet decision capsules would be `NOT_OWNER` for the caller, and
revoking one capsule while claiming the note was removed would be a false claim.
Instead the UI states honestly: "Undo is not available in this build. A governed
revoke path is required before Otzar can remove this note safely," backed by a
typed `VoiceNoteUndoContractProposal` (a NOTE-scoped, audited, soft revoke that
tombstones **every** minted capsule with per-wallet authorization). No fake undo
button is shown. No external sends, no approval/task/reminder execution, no raw
audio. No Foundation change was made.

## 10. Future chunks

This layer is the foundation for, in rough order:

1. Desktop tray microphone permission (honest, OS-prompted).
2. ~~Push-to-talk / wake-state machine.~~ **Push-to-talk state machine delivered
   (RETURN-4).** A real wake-state engine remains future and is intentionally
   not implemented.
3. ~~Local transcript buffer (in-memory, non-persistent).~~ **In-memory voice
   turn buffer + inert confirmed-action handoff delivered (RETURN-6).**
4. ~~Voice approval safety (confirm-before-act for privileged routes).~~
   **Local confirm-before-act delivered (RETURN-5).** Connecting a confirmed
   action to a governed API remains future.
5. Wearable adapter interface (transport-agnostic capture input).
6. Privacy controls (per-device capture consent, retention boundaries).
7. Background capture policy boundaries (what may ever be captured, and when).
8. Earphones / glasses / lenses / goggles transport adapters.

Until those land, Otzar's voice surfaces describe exactly what is true today and
represent wearables as planned — no always-on listening, no on-device-only STT,
no wearable support claims.
