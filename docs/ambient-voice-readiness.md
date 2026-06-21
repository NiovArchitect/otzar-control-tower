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

## 5. Future chunks

This layer is the foundation for, in rough order:

1. Desktop tray microphone permission (honest, OS-prompted).
2. Push-to-talk / wake-state machine.
3. Local transcript buffer (in-memory, non-persistent).
4. Voice approval safety (confirm-before-act for privileged routes).
5. Wearable adapter interface (transport-agnostic capture input).
6. Privacy controls (per-device capture consent, retention boundaries).
7. Background capture policy boundaries (what may ever be captured, and when).
8. Earphones / glasses / lenses / goggles transport adapters.

Until those land, Otzar's voice surfaces describe exactly what is true today and
represent wearables as planned — no always-on listening, no on-device-only STT,
no wearable support claims.
