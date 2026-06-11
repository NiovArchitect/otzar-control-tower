# Otzar Ambient Work OS — Design Law

**Status:** Founder Design Law (Phase 1251, 2026-06-11). This is not
cosmetic guidance — every employee-facing UI decision is tested
against it. If the UI feels like a crowded dashboard, keep hardening.

## 1. The law

Otzar runs in the background. The user's real work stays in the
foreground. Otzar lives around the border, edge, topbar, tray, and
voice layer. It should feel alive, present, calm, and intelligent
without blocking the user.

A user should feel: *"Something intelligent is with me. I can just
talk to it. It is helping without getting in my way. This is not
another SaaS dashboard."*

Otzar's visual language is its own — edge-glow and ambient presence
are interaction inspirations from the broader industry, never copies
of any third-party UI.

## 2. The edge presence

One Otzar presence is always available and collapses everything else
until needed. Implemented today (web/CT shell):

- **`AmbientEdgeGlow`** — a pointer-safe halo at the viewport's top
  edge plus a corner aura above the orb. It speaks state through
  tint and motion, never captures clicks, and honors
  `prefers-reduced-motion` (static tints only).
- **The orb** (collapsed `AmbientOtzarBar`) — a calm pill with a
  state-tinted halo: "Talk to Otzar" by default, "Otzar · needs you"
  when decisions wait, "Otzar · listening/thinking" during voice,
  "Otzar · quiet" in meetings.
- **`AmbientNotificationStack`** — at most two small frosted cards
  above the orb, plain language only, dismissible, keyboard
  accessible, deep-linked, and silent unless a signal is true.

## 3. The state model

One store (`src/lib/stores/presence.ts`) folds raw signals into nine
states; every ambient surface speaks the same language:

| State | Meaning | Edge language |
|---|---|---|
| IDLE | available, not demanding | barely-there neutral shimmer |
| LISTENING | mic live | cool breathing pulse |
| THINKING | request in flight | slow breathe |
| RECOMMENDATION | something useful (unread notes) | gentle teal |
| APPROVAL_REQUIRED | decisions waiting | warmer amber pulse |
| SUCCESS | just completed | brief emerald shimmer, collapses |
| BLOCKED | voice/setup unavailable | soft static amber + honest copy |
| QUIET | meeting/focus | muted, nearly off |
| FAILURE | something failed | calm static rose, truthful copy |

Priorities are design decisions: live voice activity always wins;
fresh outcomes flash briefly; quiet mutes attention pulses (a meeting
is not the moment); approvals outrank recommendations; blockers
outrank idle.

## 4. Voice-first

Voice is the primary input; click/text is the fallback, always
available and honest about why ("Voice needs microphone access — you
can type instead"). Voice NEVER bypasses Foundation governance: every
voice-originated action rides identity → DMW authority → COSMP
memory permission → policy → approval where needed → governed Action
→ notification → audit. Quiet mode (manual or calendar-driven)
pauses voice visibly and offers text.

## 5. Employee vs admin

**Employee:** border-first, low-click, progressive disclosure. Seven
primary nav items + a collapsed "More"; the orb, glow, and cards are
the ambient layer. No developer vocabulary anywhere (test-enforced
ban list including COSMP, capsule_id, wallet_id, payload, adapter).

**Admin:** more tools, never buried. The `AdminCommandLayer` (⌘K /
"Ask") maps plain-language questions ("What is blocking production?",
"Show me transaction readiness") to the right surface. Navigation
only — no privileged action fires from the palette.

## 6. Dandelion propagation (root-first)

Dandelion is not a mass-invite tool and not a generic onboarding
wizard. The admin plants the root; Otzar spreads where execution
needs it most — authority, decision impact, handoffs, coordination
centrality, project relevance — never message volume. The employee
Welcome surface says this in plain language; growth recommendations
carry the "why".

## 7. Observe / shared-screen (governed)

Otzar can understand the work the user already sees — any document,
tool, or proprietary system — without per-platform integrations. The
product story (process whisperer, cross-tool bridge, shadow coach,
compliance guardian, performance helper) lives behind progressive
disclosure on the Observe page and stays HONEST: today pasted text +
samples work end-to-end; live screen sharing arrives with identical
governance. Nothing is read without the user choosing it; nothing
acts without approval; everything is audited.

## 8. The four tests

- **ADHD test:** what matters is visible in 5 seconds; talking beats
  clicking; everything else waits quietly.
- **Grandma test:** plain words, natural help, no scary jargon,
  truthful errors, safe fallbacks.
- **Enterprise trust test:** the UI shows when AI is active, when
  voice listens or pauses, what is governed/audited, and never
  pretends mock/demo is production.
- **Boardroom test:** it looks like the future and a new interaction
  model — premium, calm, inevitable; not a SaaS control panel.

## 9. Implemented now vs native follow-up

**Now (web/CT shell):** presence store + nine states, edge glow,
orb, ambient cards, admin command layer, root-first Dandelion copy,
governed shared-screen story, reduced-motion support, full test
locks.

**Native Tauri follow-up (documented, not yet built):** the current
window is standard (decorations on, opaque, normal stacking). A
native lens-like edge companion needs: `transparent: true`,
`decorations: false`, `alwaysOnTop: true` on a secondary slim window,
tray icon + menu, a global shortcut (push-to-talk), mic permission
plumbing, and screen-edge docking. Tauri v2 supports all of these;
they are deliberately a separate slice so the web shell ships the
experience first. STT inside the Tauri webview is currently
unsupported (detected and surfaced honestly in the dock).
