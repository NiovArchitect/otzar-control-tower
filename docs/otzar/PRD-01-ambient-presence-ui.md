# PRD-01 — Ambient Presence / UI

Area 2. Companion: `AMBIENT_INTERFACE_RECONCILIATION_MAP.md`,
`docs/product/otzar-ambient-work-os-design-law.md`. Code: `lib/stores/presence.ts`,
`components/otzar/AmbientEdgeGlow.tsx`, `AmbientNotificationStack.tsx`,
`AmbientOtzarBar.tsx`.

## Core rule

Otzar must feel like a **living AI presence, not a panel**. Present enough to help,
invisible enough not to distract, governed enough to trust. **Compress by default;
expand only when needed.** The web app is ONE surface — design so it could become a
lens/earbud experience. Same orchestrator across web / desktop / cloud / overlays /
meetings / earbuds / glasses / goggles / lenses / future spatial; surfaces choose only
presentation.

## Presence states (shipped model: `OtzarPresenceState` in `lib/stores/presence.ts`)

The store already derives 9 states from raw signals (pure `derivePresenceState`,
transient glow windows). Map the product vocabulary to the shipped enum:

| Product state | Shipped enum | Trigger |
|---|---|---|
| available / present | `IDLE` | nothing active |
| listening | `LISTENING` | mic capturing |
| processing / thinking | `THINKING` | request in flight |
| routing / communicating | `THINKING` (extend later) | resolving/sending |
| completed / confident | `SUCCESS` | confirmation outcome (auto-fades `SUCCESS_GLOW_MS`) |
| clarification needed | (panel today; extend store) | MISSING_CONTEXT / AMBIGUOUS / NEEDS_CLARIFICATION |
| approval needed | `APPROVAL_REQUIRED` | `approvalsCount > 0` |
| blocked / risk | `BLOCKED` / `FAILURE` | block / failed action (FAILURE auto-fades) |
| silent / background | `QUIET` | quiet/focus mode |

Phase 2.8 wires ambient executor outcomes (`surfaceOutcome` →
`decideAmbientVisibility`) into `markSuccess` / `markFailure`. A future increment may
add a transient "clarification/amber" state to the store (today those show in the panel
and must NOT mis-tint the glow red).

## Visual doctrine

Soft glowing borders; breathing light; translucent/glass surfaces; calm motion; low
visual weight; state-aware color; premium depth; disappearing confirmations;
non-blocking cards; no clutter; no surveillance feel. **Color is atmosphere, not
decoration:** pearl/warm-white = neutral; soft-gold = helpful completion; blue-violet =
intelligence; teal = communication/routing; amber = clarification/approval; rose/red =
true risk/block ONLY; muted-green = success; translucent-charcoal/glass = depth.

## Orb compression (Phase 2.8)

Replace the verbose "Heard / Action / Result / Status" wall with ONE compact outcome
line; move Heard/Transcription/Action/Status/Voice behind a collapsed "Details"
disclosure (kept in DOM for proof/debug + tests). Lead with the human outcome
(`actionResult`). Keep active / blocked / missing-context / approval / failed visible.
Successful low-risk confirmations fade at the presence layer (`SUCCESS_GLOW_MS`).

## Adaptive surfaces (same brain, different skin)

On-the-go → voice-first, minimal words, no panels, one focused question. Desk →
expandable context/threads/approvals/transcripts, still calm. Meeting → listen/capture
quietly, surface only urgent assist. Desktop → OS-like presence (tray, global shortcut,
edge glow, window context with permission). Glasses → edge cue + one-line + approval
chip, reality primary. Earbuds → voice-first short confirmations + quiet nudges.

## Acceptance

1. Successful send shows one compact outcome, not a Heard/Action/Result/Status wall.
2. Completed confirmations fade/collapse; do not become permanent clutter.
3. Approval / blocked / missing-context stay visible.
4. Details/proof only after expansion.
5. No backend terms in default copy.
6. Presence state maps correctly from ambient events (`presence.test`).
7. Quiet/focus behavior intact (`decideAmbientVisibility` quietMode/focusMode).
8. Nothing here would block reality in a lens or require staring at a screen on the go.
