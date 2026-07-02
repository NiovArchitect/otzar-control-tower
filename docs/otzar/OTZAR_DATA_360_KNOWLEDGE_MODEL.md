# Otzar Data-360 knowledge model (raw → curated → permissioned → used)

**Status:** Phase 4 (2026-07-01). Maps the founder's Data-360 lifecycle onto
what is actually persisted today (grep-verified); gaps are named, not
papered over.

## The lifecycle and its real backing

| Layer | Definition | What backs it TODAY |
|---|---|---|
| 1. Raw capture | source events as they arrived | transcripts on MeetingCapture (caller-scoped reopen); source-event payload summaries; NO raw-audio ever (policy) |
| 2. Normalized events | source, actor, participants, timestamp, permissions, source pointer | `source-event.ts` shape + WorkLedger `source_type`/`source_message_id`/evidence spans |
| 3. Entity resolution | person / team / twin / external seed / project | identity reconciliation (email-grounded; live-proven), Dandelion person seeds, hierarchy edges |
| 4. Curated knowledge | decisions, commitments, tasks, blockers, preferences, process/org memory | the ONE WorkLedger + work-graph memory + goals + twin preferences; grounded semantic recall (live-proven per-user-isolated) |
| 5. Permissioned access | who/which twin/report may use what | capsule permissions (3-tuple), org scoping, caller-scoped reads, access grants; twin role templates |
| 6. Action/routing | owner, approver, escalation, tool | P0R routing projection + governed Action executor (live-proven) |
| 7. Audit/lineage | who/what/when/why + proof | audit events, execution attempts, receipts (channel/ts/permalink), seed evidence |
| 8. Retention/deletion | what is kept, for how long | Retention surface + soft-delete/audit-retention discipline (RULE 10-class) |
| 9. Feedback | corrections improve routing + memory | work-graph-learning (see OTZAR_FEEDBACK_LOOP_MODEL.md) |

## Product distinctions the UI must keep (and where)

- **Raw sources** ≠ **curated knowledge**: Data & Knowledge lists sources;
  the WorkLedger/memory is the curated layer. UI framing updated this pass.
- **Organizational memory** ≠ **personal/twin memory** ≠ **portable memory**:
  org records stay with the org; the person's methods/skills/preferences are
  the portable Digital Work Wallet (§24 — Memory page reframed this pass; no
  self-service authority console).
- **Curation is admin-reviewed, not autonomous**: Dandelion seeds and
  approvals gate what becomes org structure. Nothing claims autonomy it
  doesn't have.

## Honest gaps

1. No separate "raw data lake" store — raw beyond transcripts/evidence spans
   is not persisted (by design for audio; by absence for connector reads).
2. Lineage is pointer-based (source_message_id, evidence, audit ids) — a
   full lineage graph view is future.
3. Confidence is persisted per-extraction (plan confidence, seed confidence)
   but not yet surfaced as a Data & Knowledge dimension.
4. Retention is a page + discipline, not yet a per-category policy engine
   (§11 regulator/compliance packages are structurally future).
