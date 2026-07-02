# Otzar ambient UI visual system

**Status:** Phase 5 (2026-07-01). The single visual language, its tokens, and
where each piece is applied. Rule zero: **no glow without a backing state.**

## Tokens (all in `src/lib/ambient/`)

| Token | What it is | File |
|---|---|---|
| `AMBIENT_FIELD` | the luminous silver field behind a shell — calm, alive, never flat white/gray | `glass.ts` |
| `GLASS_SURFACE` / `GLASS_CHIP` | frosted translucent panels/chips (blur + saturate + soft ring) | `glass.ts` |
| `panelAccent(intensity)` | per-intensity left accent for glass panels (ambient/working/attention/critical) | `glass.ts` |
| `presenceRing(state)` | the orb/dock 9-state palette: bloom + glow + dot per presence state | `presence-ring.ts` |
| `routingLaneEdge(routing)` | work-card left edge from the P0R lane — attention forward, silent recede | `work-os/routing-lane.ts` |

## State → color (one vocabulary everywhere)

listening=sky · thinking=indigo · recommendation/routing=teal ·
approval-required=amber · blocked/setup=amber(-500)/rose · success=emerald ·
failure=rose · quiet/idle=slate. Used by: presence ring (orb/dock),
AmbientEdgeGlow (employee shell edges), lane chips, lane edges, needs-you
panel intensity. Never neon, always low-opacity/blurred.

## Where it is applied (Phase-5 state)

- **Employee shell** (pre-existing): AMBIENT_FIELD + frosted header +
  AmbientEdgeGlow mounted + GlassPanel surfaces on Today.
- **Admin shell** (THIS pass): AMBIENT_FIELD behind everything; frosted
  sidebar + header (blur + saturate over the field) — the flat
  `bg-background`/`bg-card` dashboard treatment is gone.
- **Work cards** (THIS pass): frosted (`bg-background/60 backdrop-blur-sm`,
  rounded-xl) with a 2px stateful left edge from `routingLaneEdge` — the SAME
  lane that drives the chip; silent lanes recede to the neutral border.
- **Today "What changed"** panel escalates to attention intensity only when
  counted suggestions exist (Section-25 fix).

## Visual smoke checklist (run on every visual change)

1. Real state drives glow — flip an item's lane and the edge/chip move
   together; no state, no color.
2. No neon noise — all accents are /60–/80 opacity or blurred blooms.
3. No generic gray dashboard — both shells sit on AMBIENT_FIELD with frosted
   chrome; `bg-background` never appears as a full-shell backdrop.
4. Ambient border visible — employee shell edge glow reacts on
   listening/thinking/approval (drive via the orb).
5. Important work has subtle presence — attention lanes read first in a
   mixed list; silent items recede.
6. Hidden/low-priority stays quiet — zero-count panels render NOTHING.
7. Contrast — dark text on the field ≥ AA on the frosted surfaces.

## Honest boundaries

- Dark-mode variants of the frosted admin chrome are not tuned yet (the
  field + white-glass treatment is light-first, like the employee shell).
- Desktop/Tauri native presence (tray/native notifications) is planned
  separately (NEEDS_NATIVE remains honest).
- Remaining flat surfaces (deep admin detail pages) adopt GLASS_SURFACE
  opportunistically in later slices; the shells + work surfaces carry the
  language now.
