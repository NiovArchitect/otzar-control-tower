# Otzar desktop experience — verification (customer-first)

**Customer story.** "As a worker, I want Otzar beside my real workspace, not
trapped in a browser tab — listening, speaking, notifying, routing work, and
helping without interrupting my flow." **Desired feeling:** present, but not
in the way.

**Status (2026-07-02): Built, production-configured, launched process; manual
window verification PENDING.** — NOT "customer-verified".
- Build VERIFIED: `npm run tauri:build` → `Otzar.app` + `Otzar_0.1.0_x64.dmg`,
  from the current frontend (every ambient/CX change ships to desktop).
- Production-configured VERIFIED: rebuilt with
  `VITE_FOUNDATION_API_URL=https://api.otzar.ai/api/v1` (prod baked in;
  confirmed in the binary), replacing the earlier localhost-targeted build.
- Launch: `open` succeeded, process ran, macOS menu bar showed "Otzar" as the
  frontmost app (menus loaded — the app is alive, not crashed).
- NOT yet verified: the app WINDOW did not render in the headless automation
  session, and `osascript` was blocked from assistive access, so window
  contents (shell/login/orb/Team-Work/Scenario-Studio) and mic behavior are
  UNCONFIRMED. "Otzar runs on the desktop" is supported; "the customer
  desktop experience is verified" is NOT — that requires a founder to open it
  in a real desktop session (steps below).
Remaining claims are verified against `src-tauri/` + `desktop-capabilities.ts`.

## Founder manual verification steps (required before "desktop verified")

1. `open ".../src-tauri/target/release/bundle/dmg/Otzar_0.1.0_x64.dmg"`, drag
   Otzar → Applications, open it.
2. Unsigned dev build: if macOS says "cannot check it for malicious software",
   approve via System Settings → Privacy & Security → "Open Anyway" (quarantine
   was NOT stripped silently).
3. Confirm each: window appears (no blank white) · login screen or app shell ·
   Talk-to-Otzar orb appears and drags · ambient shell visible · Team Work
   shows "Your team right now" · "Scenario Studio" in nav · mic-permission
   prompt on first voice use.
4. Report any failure → it becomes a desktop fix slice.

## What is REAL today

| Area | State | Evidence |
|---|---|---|
| Shell | Tauri 2 app (macOS DMG + Windows MSI/NSIS targets), `tauri:dev`/`tauri:build` | `src-tauri/tauri.conf.json`, package scripts |
| Frontend | the SAME bundle as the web app (`frontendDist: ../dist`) — every PROD-UX/ambient/visual change ships to desktop automatically | tauri.conf.json |
| API reach | CSP `connect-src` includes `https://api.otzar.ai` (fixed `e5a2cef`) | tauri.conf.json |
| Voice in | MediaRecorder → `/otzar/voice/transcribe` (server STT; no Web Speech in WKWebView) — **live-verified** (LIVE-4A); `decideSttPath` preserves the desktop path exactly (unit-locked) | `useDesktopVoiceCapture`, stt-path tests |
| Voice out | same TTS layer as web (speak-back, auto-speak opt-in) | voice tests |
| Orb/dock | same draggable, per-device-persistent, non-blocking orb (P0H) | orb-position tests, live smoke |
| Security posture | conservative capabilities: `core:default` + `shell:allow-open` + `opener` ONLY — no fs write, no clipboard, no process spawn | `src-tauri/capabilities/default.json` |
| Honest gating | `desktop-capabilities.ts` renders NEEDS_NATIVE / NEEDS_PROVIDER / FALLBACK per capability — the UI never claims what the shell can't do | code |

## What is MISSING (exact gaps — the desktop is a working shell, not complete)

1. **Tray / menu-bar presence** — no tray plugin; the app is a window, not an
   ambient companion in the OS chrome. (Gap #1 for the "beside my workspace"
   feeling.)
2. **Native notifications** — NEEDS_NATIVE (in-app ambient cards only). The
   right person is notified in-app, not at the OS level.
3. **Global shortcut / quick-invoke** — no global hotkey to summon Talk to
   Otzar from another app.
4. **Deep links** (otzar:// protocol) — not registered.
5. **Secure storage** — no keychain plugin (sessions are in-memory by
   doctrine, so nothing is stored insecurely either).
6. **Background behavior / autostart** — none; closing the window closes
   Otzar.
7. **Screen/workflow observation** — not built (see
   OTZAR_WORKFLOW_OBSERVATION_MODEL.md; desktop is the eventual path).

## Customer-experience verdict (honest)

Today the desktop app = the full ambient web product in a native window with
BETTER voice (server STT is the primary path). It does **not** yet feel like
an OS companion: no tray, no OS notifications, no global summon. It is
correct to say "Otzar runs on the desktop"; it is NOT yet correct to say
"Otzar lives beside your workspace."

## Safe next slice (customer-first order)

1. **Tray icon + global shortcut** ("summon Otzar anywhere") — tauri tray +
   global-shortcut plugins; clicking/hotkey opens the orb dock. This single
   slice delivers most of the companion feeling.
2. Native notifications plugin wired to the EXISTING in-app notification
   feed (assignee/approver routing already works).
3. otzar:// deep links into work items.
Each is additive, plugin-scoped, and Founder-gated per repo rules
(native-capability changes).
