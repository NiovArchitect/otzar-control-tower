# Otzar communication-ingestion model (ETL stage 1: Extract)

**Status:** Phase 4 (2026-07-01). Every capability below is grep-verified
against Foundation code. Anything not listed as SHIPPED does not exist —
no fake ingestion claims.

## What is SHIPPED today

| Source | Capability | Where |
|---|---|---|
| Talk to Otzar (voice/text) | full intake → governed work loop | conduct/comms pipeline |
| Transcripts (paste/import) | `POST /otzar/comms/ingest` → quality gate → work items, owners, seeds, evidence | comms-extract (live-proven) |
| Source-agnostic events | `POST /otzar/ingest/source-event` — SLACK / GMAIL / etc. event shapes → the ONE WorkLedger (dedupe keys like `SLACK:<channel>:<ts>`) | `source-event.ts` (Slice A, live-proven) |
| Slack (read connector) | **exactly 3 ops**: `channels.list`, `users.list`, `conversations.history` — channel history only. **NO DMs, NO thread expansion, NO groups, NO files/reactions** | `slack-read.provider.ts` |
| Google Workspace (read connector) | **metadata lists only**: `calendar.events.list`, `drive.files.list`, `gmail.messages.list`. **NO document content read** (no docs.get/files.export/messages.get) | `google-workspace-read.provider.ts` |
| Zoom + Calendar bridges | `listZoomRecordingsForOrg`, `getCalendarFreeBusyForOrg` — read-only, OAuth-token-backed, audited (`CONNECTOR_DATA_READ`) | `connector-data-read.service.ts` (Phase 1270) |
| Documents (OCR/Observe) | "Let Otzar read this" — capture → provider text extraction → the comms pipeline | Observe (Phase 1227) |
| Meeting captures | manual capture + caller-scoped transcript reopen | meeting-capture service |

## What does NOT exist yet (honest boundaries)

1. **No continuous puller**: nothing polls Slack channels or Drive on a
   schedule and feeds ingestion automatically. Slack/Google reads are
   on-demand, governed calls; the source-event intake is push-shaped.
2. **Slack DMs / threads / private groups**: not in the read vocabulary.
   Adding DMs is a consent + policy question before it is a code question.
3. **Google Docs content**: metadata only today. Content read (docs.get /
   files.export) is a scope + policy addition.
4. **Zoom transcript ingestion**: recordings can be LISTED; transcript
   pull → ingest is not wired (§23 future path).
5. **Meeting auto-join bots / twin attendees**: not built (§23).

## The intended pipeline (target model per the founder's ETL architecture)

Extract (above) → Transform/normalize (source, author, timestamp, org,
participants, permissions, source pointer — `source-event.ts` is the
normalized shape) → Entity resolution (identity reconciliation, live-proven:
email-grounded, unknown-never-matches) → Permission/policy check (RBAC ops,
org policy, hierarchy, tool access, approval class) → Route (P0R lanes;
owner/approver/manager/escalation) → Act (draft/approve/execute governed) →
Surface (Today/Action Center/My Work/Team Work/Blind Spots) → Audit (events
+ attempts + receipts) → **Load** into curated org knowledge (work-graph
memory, grounded recall) → Feedback loop (see OTZAR_FEEDBACK_LOOP_MODEL.md).

## Setup-required routing (shipped)

Blocked work names its missing tool (P0R `setup_required` lane) and
deep-links to Tools & Connections; tool gaps discovered in conversations
become Dandelion seeds ("Tools Otzar noticed you need"). Both live-proven.

## What requires what

- Admin setup: connector bindings + OAuth (Tools & Connections, UI-operable).
- User consent: anything DM/personal-scope (future; must be explicit).
- Approval: every outbound write (Slack posting live-proven approval-gated).
