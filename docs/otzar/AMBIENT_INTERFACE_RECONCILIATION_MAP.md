# Ambient Interface Reconciliation / Rebuild Map

Status: living document. Purpose: reimagine the **visible** Otzar layer from first
principles — a calm, luminous, future-facing ambient presence that compresses by
default and expands only when needed — **without removing any backend, governance,
proof, or depth** (those move behind detail-on-demand, never deleted).

Governing doctrine: `otzar-ambient-presence-multisurface-ui`,
`otzar-ambient-visibility-policy`, `otzar-flow-over-forms`,
`otzar-communication-is-work-formation` (memory).

Core rules:
- **Compress by default, expand only when needed.** Default view shows only: the next
  useful thing, the smallest confirmation, the current attention item, the active
  voice state, approval needed, blocker, what changed, what Otzar handled, what the
  user asked to see. Everything else → silent / collapsed / grouped / digest /
  detail-on-demand.
- **Presence, not panel.** Same orchestrator across web / desktop / voice / glasses /
  earbuds / cloud; surfaces choose only presentation.
- **No backend machinery in normal UX.** No route/rail names, ids, policy codes,
  proof noise, "Heard / Action / Result / Status" walls.
- **Adaptive:** when the human sits, expand; when they move, compress to voice / cue /
  glow / flow; never lose state.

Visibility levels (from `ambient-visibility.ts`): `silent | confirmation | interrupt |
digest | detail_on_demand`. Presence states: available / listening / thinking / acting /
complete / needs-assist / blocked / digest / silent.

Legend for the per-surface tables — each element is reclassified to a target:
`SILENT` · `CUE` (edge/badge) · `CONFIRM` (short, fades) · `INTERRUPT` (clear, compact) ·
`DIGEST` · `DETAIL` (on-demand) · `FADE` · `COLLAPSE` · `ADMIN` (deep view).

---

## 1. AmbientOtzarBar (the orb — primary presence)

Current: the orb appends a running **conversation log** of `user / action / otzar`
entries, each carrying `Heard`, `Action`, `Result`, `Status`, sometimes `runtimeNote`.
Action/work-plan cards render inline and persist. This is the single biggest source of
"busy enterprise app" feeling.

| Current element | Problem | Target | Smallest safe patch |
|---|---|---|---|
| Verbose `Heard / Action / Result / Status` stack per outcome | Wall of text; reads like a debug log | One short outcome line (CONFIRM) + DETAIL | Render a single calm line by default; put Heard/Result/Status behind a "Details" disclosure on the entry |
| Completed confirmations persist in the log | Permanence = clutter; no "fade when done" | FADE / COLLAPSE | Auto-collapse entries older than the last 1–2; fade success entries after a few seconds into a compact "✓ Sent" chip |
| Inline action/work-plan cards stay expanded | Heavy cards block flow | COLLAPSE + DETAIL | Default to a one-line summary chip; expand on click |
| `runtimeNote` proof bits (msg/ledger ids) | Backend proof in confirmation | SILENT (✅ done Phase 2.7) | Removed; proof recorded silently |
| Self-task / message confirmations | Already short post–Phase 2.6/2.7 | CONFIRM | Keep; ensure they fade |
| Ambiguity / missing-context | Good (one focused question) | INTERRUPT (compact) | Keep; ensure no candidate list >2 |
| Proof / "Why" inline | Should be on-demand | DETAIL | Behind "Why" / "Show proof" only |

Spatial/desktop mapping: the orb IS the presence layer. On desktop → edge glow + tray;
on glasses → edge cue + one-line; on earbuds → spoken confirmation only. The log is a
**desk-mode-only** expansion; on-the-go it never renders.

## 2. ambient-edge-presence (existing component + test)

Current: an `ambient-edge-presence` component already exists (17 tests). This is the
**seed of the presence layer** — grow it into the canonical state surface
(available / listening / thinking / acting / complete / needs-assist / blocked /
digest), mapped to the emotional palette (pearl / gold / blue-violet / teal / amber /
rose / muted-green / glass). Smallest safe patch: audit its current states vs the 9
presence states; add missing states as CSS/border treatments; route orb status through it.

## 3. NotificationBell / Notifications

| Current element | Problem | Target | Smallest safe patch |
|---|---|---|---|
| Flat list, equal weight | Second inbox burden | DIGEST + grouped | Group by: needs-approval / needs-reply / assigned / blocker / FYI / handled |
| Unread counts that can't be acted on | Noise | CUE | Badge only; no count if not actionable |
| Per-item dismiss exists (good) | — | keep | Keep; ensure swipe/one-tap dismiss |
| Routine "handled" notifications | Shouldn't surface | SILENT/DIGEST | Fold into "what changed" digest |

Spatial mapping: glasses → single highest-priority cue ("approval needed"); earbuds →
"3 updates, want the short version?".

## 4. Ask My Twin / Conversation panel

| Current element | Problem | Target | Smallest safe patch |
|---|---|---|---|
| Full conversation transcript persistent | Heavy | COLLAPSE + DETAIL | Show last exchange; "history" on demand |
| Governed-chat answers | Keep (core) | CONFIRM/DETAIL | Keep concise; depth on demand |

## 5. Work plan / Action cards (WorkArtifactCard, ProposedActionCard)

| Current element | Problem | Target | Smallest safe patch |
|---|---|---|---|
| "Task proposal — not assigned…no fake completion" | Defensive over-copy | CONFIRM | ✅ done → "Task proposal" |
| "Saved to Work Ledger" / "Work Ledger id" / "Action ID" | Backend terms + raw ids | SILENT/CONFIRM | ✅ done → "✓ Saved"; ids removed |
| Persistent success card | Should fade | FADE | Collapse to a chip + auto-dismiss after a moment |
| "Include others" partial picker | Unfinished clutter | COLLAPSE/ADMIN | Hide until fully wired |
| Inspect panel (proof/extraction/coordination) | OK as DETAIL | DETAIL | Keep behind View/Why; humanize machine labels later |

## 6. Collaboration / My Work / Action Center / Approvals

| Current element | Problem | Target | Smallest safe patch |
|---|---|---|---|
| "Open Work Comms to pick…" handoff | Page handoff | INTERRUPT inline | Resolve inline with one question (≤2 names) |
| Approve/reject error persists | Blocks | CONFIRM/FADE | Toast + auto-dismiss; keep list |
| Approvals list | Core, keep visible | INTERRUPT/DIGEST | Keep; group; calm copy |
| My Work density | Can be heavy | DIGEST + DETAIL | Lead with "what needs you"; rest on demand |

## 7. Observe / Comms / transcript & meeting surfaces

| Current element | Problem | Target | Smallest safe patch |
|---|---|---|---|
| Raw transcript / artifact lists | Dump risk | DIGEST | Lead with decisions/blockers/owners/follow-ups; raw on demand |
| Meeting intelligence panel | Good shape | DIGEST/DETAIL | Keep; ensure no raw dump by default |

Spatial mapping: meeting mode = listen/capture quietly, surface only urgent assist;
digest after.

## 8. Admin / authority surfaces (TwinDetailDrawer, permissions, grants)

| Current element | Problem | Target | Smallest safe patch |
|---|---|---|---|
| `entity_id (UUID)` placeholder | Backend term | ADMIN, humanized | ✅ done → "Approver ID, or leave empty"; later: lookup field |
| Raw RBAC/ABAC/TAR matrices | Necessary for admins | ADMIN/DETAIL | Keep in admin role only; never in employee flow |

---

## Backend-term leak register (normal UX only — admin/detail panels exempt)

- ✅ Fixed Phase 2.7: proof ids in confirmations; "Work Ledger" badge/inspect id;
  "Action ID"; fake "no fake completion" copy; "entity_id (UUID)" placeholder.
- ⏳ Deferred (tested state-key / honest-extraction design, low priority, in
  detail-on-demand panels): `"Participant unresolved"` status key (→ "Which David?" at
  the copy layer via `calendar-gate-copy`); `"BEAM fanout"` / `"Python enrichment"`
  attempt labels (humanize to "Coordination" / "Enrichment check" only if it doesn't
  break the honest-extraction tests).

## Sequenced cleanup plan (smallest-safe, highest-impact first)

1. **Orb log compression** — replace the per-outcome Heard/Action/Result/Status stack
   with one short outcome line; details behind a disclosure. (Highest impact; touches
   AmbientOtzarBar render + several tests — do as its own commit.)
2. **Fade/auto-collapse completed confirmations** — success entries fade to a chip; keep
   active/blocked/approval visible.
3. **Presence-state layer** — grow `ambient-edge-presence` to the 9 states + palette;
   route orb status through it.
4. **Notification grouping** — group by usefulness; dismiss/digest.
5. **Card density** — default chips, expand on demand; hide unfinished "Include others".
6. **Inline ambiguity everywhere** — kill remaining "Open X to route it" handoffs.
7. **Calm/focus mode** — a simple toggle that raises the silent/digest threshold
   (wires to `decideAmbientVisibility` quietMode/focusMode, already supported).

## Acceptance tests (per founder)

1. Send → short confirmation, not a verbose log.
2. Self-task → "Saved. I'll track it." not a full stack.
3. Approval-needed → clear + compact, stays visible.
4. Completed confirmations fade/collapse.
5. Details expand on demand.
6. Proof/audit not shown by default.
7. Notifications group/dismiss, never clutter.
8. No backend terms in default copy.
9. Feels compatible with desktop/glasses/earbuds.
10. User stays in flow.
