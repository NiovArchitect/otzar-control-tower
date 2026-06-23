# OTZAR-V1-LIVE-4 — Voice Input (speech-to-Otzar)

> Otzar is pronounced **"OatZar."** Voice is the ambient interface layer for
> corporate intelligence — the employee speaks, Otzar captures the intent, and the
> transcript enters the **existing governed Twin/work loop** (LIVE-2/LIVE-3).
> **Do not claim hands-free/ambient until a user can actually speak and the
> transcript routes into that loop.**

## Current truth (what works, what was broken)

- **Text input works. Otzar speaks back (TTS) works. User speech INPUT was the gap.**
- **Diagnosed root cause:** the client's server-STT path (`useDesktopVoiceCapture`
  → `api.otzar.voice.transcribe` → `POST /otzar/voice/transcribe`) hit a route
  that **did not exist** in Foundation (a dead call), and the existing
  `stt-provider.ts` adapters were `storage_ref` stubs returning `BLOCKED_BY_KEY`.
  So whenever browser Web Speech was unavailable (Tauri WKWebView, Firefox,
  non-secure HTTP context) or fell back, speech input failed.
- **Fix (LIVE-4A, Foundation):** real inline STT route
  `POST /api/v1/otzar/voice/transcribe` using **ElevenLabs (Scribe)**.

## v1 provider decision

- **ElevenLabs is the selected v1 voice provider — STT (Scribe) here + TTS for
  speak-back.** One coherent provider for the v1 experience.
- **Browser Web Speech remains the zero-secret fallback** where it works (Chrome,
  **HTTPS/secure context only**). The browser does the recognition; Otzar receives
  transcript text.
- **Deepgram is deferred / optional** (an explicit, non-default secondary —
  `VOICE_STT_PROVIDER=deepgram`); revisit only if streaming/cost requires it.

## Two speech paths

| Path | Engine | Key needed | Where it runs |
|---|---|---|---|
| Browser Web Speech | the browser's vendor STT | none | Chrome (HTTPS); not Firefox, not Tauri WKWebView |
| Server STT | ElevenLabs Scribe via Foundation | `ELEVENLABS_API_KEY` (backend) | everywhere the client can record audio |

The client (`AmbientOtzarBar`) prefers browser Web Speech when supported and uses
the server path otherwise.

## Required env (backend only — never in the frontend)

| Var | Purpose |
|---|---|
| `VOICE_STT_PROVIDER` | `elevenlabs` (v1). If unset, ElevenLabs wins when its key is present. |
| `ELEVENLABS_API_KEY` | ElevenLabs key — **server-side only**, never exposed to the client. |
| `ELEVENLABS_STT_MODEL` | Scribe model id (default `scribe_v1`). |

When no provider is configured, `POST /otzar/voice/transcribe` returns **503
`VOICE_STT_PROVIDER_NOT_CONFIGURED`** and the UI says *"Voice transcription is not
configured on this deployment yet. Text input remains available."* — never a fake
transcript.

## No raw audio storage

Raw audio exists in memory for the single provider call only. It is **never**
persisted — no DB row, no `MemoryCapsule`, no file. Otzar keeps **transcript text**.
Honest disclosure shown when the server path is active:
*"Audio is sent to the configured ElevenLabs speech provider for transcription.
Otzar stores transcript text, not raw audio."*

## Security model

- Provider keys are backend-only; the route never returns them.
- Bearer-authenticated; mime allowlist + 8 MB size ceiling.
- Transcribe **only** — it creates no work and executes nothing. The transcript
  re-enters the governed Twin/work loop through existing client surfaces (Ask Twin
  / ambient bar), where RBAC/ABAC/approval still apply.

## How to test voice locally

1. **Browser path (no key):** run Otzar over `http://localhost` (a secure context
   for Web Speech) in **Chrome**, press the mic in the ambient bar, speak — the
   transcript appears and routes to the Twin. (Firefox/Safari Web Speech support
   varies; Tauri WKWebView has none → use the server path.)
2. **Server path (ElevenLabs):** set `ELEVENLABS_API_KEY` + `VOICE_STT_PROVIDER=
   elevenlabs` on Foundation. In a context without Web Speech (or forcing the
   fallback), record → `POST /otzar/voice/transcribe` returns the transcript.
3. **Not-configured:** with no key, confirm the honest 503 copy and that **typing
   still works**.

## How to test voice on deployed Otzar

- Serve Otzar over **HTTPS** (browser Web Speech requires a secure context — plain
  HTTP breaks it; this is a common cause of "voice doesn't work" in the browser).
- Set the ElevenLabs env on Foundation for the server fallback.
- Run the §6 voice steps of `OTZAR_V1_TWO_COMPUTER_SMOKE.md`.

## Provider validation result (local, safe — no server boot)

Validated directly against the providers using the **stored backend keys** (read
from `niov-foundation/.env`, never printed/committed), replicating the exact
request shapes the service sends:

- **ElevenLabs STT (`scribe_v1`, multipart):** `HTTP 200` — key + model + format all
  work (sent 0.4 s of synthetic silence → transcript length 0, as expected). The
  speech-in path functions at the provider level.
- **Anthropic (`claude-sonnet-4-6`, Foundation's configured model):** `HTTP 200` —
  key authenticates and a message round-trips. The Twin's LLM brain works.

The full `POST /otzar/voice/transcribe` route was **not** exercised end-to-end
locally because `DATABASE_URL` in `.env` points at a **remote Supabase** — booting
the server would run auth/writes against the real DB. The route logic is covered by
unit + integration tests (CI-green) and delegates to the provider call proven above.

### Verify the route directly (against a running/deployed Foundation)

```bash
# 1) get a bearer token
TOKEN=$(curl -s -X POST "$FOUNDATION/api/v1/auth/login" \
  -H 'content-type: application/json' \
  -d '{"email":"sadeil@niovlabs.com","password":"<shared-pw>","requested_operations":["read","write"]}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# 2) POST a base64 audio utterance (a real recorded utterance gives real text;
#    silence returns an empty transcript)
curl -s -X POST "$FOUNDATION/api/v1/otzar/voice/transcribe" \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d "{\"audio_base64\":\"$(base64 -i utterance.webm)\",\"mime_type\":\"audio/webm\"}"
# expect: {"ok":true,"transcript":"…","provider":"ELEVENLABS"}
# or, if unkeyed: 503 {"ok":false,"code":"VOICE_STT_PROVIDER_NOT_CONFIGURED",…}
```

## Final pass/fail checklist

1. [ ] User can speak (mic captures).
2. [ ] Transcript appears.
3. [ ] Transcript routes to the Twin (Ask Twin / ambient bar).
4. [ ] Twin can route work (LIVE-2 loop).
5. [ ] Approval gate remains intact (LIVE-3).
6. [ ] Otzar can speak back (TTS) where configured.

## Where ElevenLabs vs Deepgram fit

- **ElevenLabs:** v1 STT (Scribe) + TTS. The coherent voice provider now.
- **Deepgram:** deferred secondary STT for a future streaming/cost path; supported
  but never the default.

## What remains for earbuds / glasses / lenses / goggles (later, not now)

The loop is architected so **any capture source** that can produce audio (or a
transcript) plugs into the same path: capture → `POST /otzar/voice/transcribe`
(or browser Web Speech) → transcript → governed Twin/work loop → optional TTS
speak-back. A wearable adapter would only need to (a) capture audio and (b) deliver
the spoken response — the governance, routing, approval, memory, and audit are
already real. Those device integrations are **explicitly out of scope for v1**.
