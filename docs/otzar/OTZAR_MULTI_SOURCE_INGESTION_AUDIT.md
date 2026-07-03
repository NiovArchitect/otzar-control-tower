# Otzar Multi-Source Ingestion Audit (Gap I)

**Status:** 2026-07-03 (Fable 5). Read-only audit — no product code changed.
Part of the canonical architecture — see
[`OTZAR_WORK_OS_BUILDING_BLOCKS.md`](./OTZAR_WORK_OS_BUILDING_BLOCKS.md) and
[`OTZAR_OPERATIONAL_GAP_LEDGER.md`](./OTZAR_OPERATIONAL_GAP_LEDGER.md) gap I.
All file:line references verified against FND `73a0099` / CT `31a066e`.

**Governing question:** for every source, does it follow the canonical loop —
source signal → normalized SourceEvent → extraction → identity/project/tool/
twin resolution → RBAC/ABAC/TAR/policy → durable WorkLedger/Action/Escalation/
Dandelion/Audit/Memory → correct surface → correction loop → live smoke proof.

---

## 1. The canonical spine (what "live" means here)

The ONE true intake core is **`ingestSourceEvent`**
(`comms-ingest.service.ts:176`): quality gate → governed extraction
(recipient governance + learn-loop priors) → cross-source identity
reconciliation → per-owner proof-gated planning → durable writes via
`createLedgerEntry` (COMMITMENT `:375`, FOLLOW_UP `:458`, MEETING `:500`,
Dandelion ORG_SEEDING `:537`) + `receiveMeetingCaptureForCaller` (`:327`) +
work-graph/memory events (`:526`). `ingestTranscript` (`:139`) is a thin
adapter over the same core.

**Only two entry points reach this spine:** `POST /otzar/comms/ingest`
(`otzar.routes.ts:337`) and `POST /otzar/ingest/source-event`
(`otzar.routes.ts:389`). `SourceSystem` (`source-event.ts:16`) names 13
systems and is honest about it: only TRANSCRIPT/MEETING are wired
(`source-event.ts:13`).

## 2. Source readiness map

Statuses: **LIVE** (full loop) · **PARTIAL** · **PLACEHOLDER** ·
**NOT WIRED**. Risk codes from §3.

| # | Source | Status | Entry / substrate | Durable output | Surface | Tests/smoke | Biggest gap | Risk |
|---|---|---|---|---|---|---|---|---|
| A | Manual Comms transcript | **LIVE** | `/otzar/comms/ingest` → spine | Full spine set | Comms (+My Work/Team Work/People) | integration + 2 live specs | none material — **reference implementation** | — |
| B | MeetingCapture (standalone route) | **PARTIAL** | `/otzar/meeting-capture/receive` (`otzar-meeting-capture.routes.ts:79`) → storage + consent audit ONLY | MeetingCapture rows; **zero work rows** | none (until re-ingested) | integration | no extraction hop — a captured meeting seeds nothing | R2, R3 |
| B′ | Observe / OCR / screenshot | **PARTIAL** ⚠️ | `/otzar/observe/extract` → `ObserveCapture` + Collaboration* tables (`observe-intake.service.ts:174/315/326`) — **bypasses the spine** | A PARALLEL store, not WorkLedger | Workspace import | integration; **no live e2e** | private truth outside the ledger; cloud OCR engines are status-only stubs (`ocr-provider.ts:12`) | **R1**, R10 |
| C | Zoom recording ingest | **LIVE** (provenance FIXED, FND `51d8700`) | `/zoom/recordings/ingest` (`connector-data.routes.ts:106`, admin-gated, real Zoom API + WebVTT) → `ingestComms` | Full spine set | Comms etc. | unit | ~~provenance loss~~ FIXED 2026-07-03: now sourceSystem ZOOM / CONNECTOR via the spine, dedupe ZOOM:<meeting_id>, re-ingest → honest 409 ALREADY_INGESTED, rows carry source lineage | — |
| D | Slack — read | **WIRED (admin-triggered) — FIXED 2026-07-03 [SLACK-INGEST-1]** | `POST /api/v1/slack/messages/ingest` (admin-gated): org sealed OAuth envelope → `fetchSlackMessageForOrg` (public-only gate before any content read) → `slackMessageToSourceEvent` → spine | dedupe `org + SLACK:<team>:<channel>:[<thread_ts>:]<ts>`; 409 `ALREADY_INGESTED`; cross-workspace + cross-org isolation test-locked | WorkLedger / follow-ups / Dandelion (spine surfaces) | unit + integration (spine lineage, idempotency, isolation, thread non-collision, route refusal chain) | admin-pull only: DMs/private channels parked by policy; no Events-API webhook yet (the ambient push wire is still gap N) | R3 partially closed |
| D′ | Slack — write (executor) | **LIVE** | `INVOKE_CONNECTOR` action handler → `SlackWriteProvider` `chat.postMessage` (`slack-write.provider.ts:149`) | Action/audit rail | Action Center | unit + prior live smokes | outbound only — this is execution, not intake | — |
| E | Google Docs | **NOT WIRED** | no `documents.get` anywhere | — | — | — | no content read exists at all | R9 |
| F | Google Drive | **PARTIAL** | `drive.files.list` **metadata only** (`google-workspace-read.provider.ts:290`) | — | Tools & Connections status | unit | metadata can't seed work; no ingest hop | R3, R9 |
| G | Google Calendar | **PARTIAL** | free/busy + events.list read; gated OUTBOUND event create (`calendar-event.routes.ts`) | — (read side) | scheduling signal | unit | events never normalize to SourceEvents | R3 |
| H | Gmail / email | **PARTIAL** | `gmail.messages.list` **IDs only, no bodies** (`google-workspace-read.provider.ts:296`) | — | Tools & Connections status | unit | no content read; email can't produce work | R3, R9 |
| I | GitHub | **PARTIAL** | real read adapter (`github-read.provider.ts`); connector-invoke only | — | Tools & Connections status | unit | no intake wiring; issues/PRs never become work | R3 |
| J | Jira | **PARTIAL** | real read adapter (`jira-cloud-read.provider.ts`); connector-invoke only | — | Tools & Connections status | unit | same as GitHub | R3 |
| K | Notion | **PLACEHOLDER** ⚠️ | in provider catalog (`provider-registry.ts:172`) + CT OOTB catalog (`ootb-catalog/data.ts:254`) with **zero adapter substrate** (absent from `connector-adapter-registry.ts`) | — | Tools & Connections catalog | — | **presented as connectable with nothing behind it** | **R10**, R9 |
| L | Voice / Talk to Otzar | **PARTIAL** ⚠️ | `/otzar/voice/transcribe` (real ElevenLabs/Deepgram STT; audio never stored) → transcript **returned to client only** (`useDesktopVoiceCapture.ts:28`); `conductSession` writes MemoryCapsules (a parallel durable store) | none from voice; capsules from conduct | Talk to Otzar / My Twin | unit; UX-only specs | transcript dead-ends — never auto-normalized to a SourceEvent | **R1** (conduct store), R2 (voice) |
| M | Workflow observation | **NOT WIRED** | docs + CT consent-session stub only; no backend model/route | — | — | — | honestly future (do-not-build per doctrine) | — |
| N | Tool/connector inbound events | **NOT WIRED** ⚠️ | NO inbound webhook/MCP-event route exists anywhere; connector rails are config + OUTBOUND only; `MCP`/`WEBHOOK` SourceSystems are aspirational (`source-event.ts:27`) | — | — | — | **the structural gap**: every "connector" is outbound-only; nothing can arrive ambiently | **R3**, R9 |
| O | Approval / rejection events | **LIVE** (native) | escalation resolve → paired-Action reconciliation → audit + sender-visible reason (this session) | Escalation/Action/Audit | Action Center, Approvals, Review Center | integration + live smokes | outcome-learning deliberately unread (correction taxonomy Q6) | R6 (by design, parked) |
| P | Assignment events | **LIVE** (native) | `/org/assignments` → canonical membership + `via_org_admin` audit → growth recompute | Membership/Audit | People & Collaboration, AI Teammates | integration + reversible live smokes | none material | — |
| Q | Recipient corrections / learn-loop | **LIVE** (native) | resolved FOLLOW_UP rows ARE the store → ingest priors → provenance in "Why" | WorkLedger + audit | Comms "Why", My Twin | unit/integration + live probes | expansion types parked (taxonomy doc) | — |

Columns 4–14 of the founder template that are uniform across LIVE sources:
identity resolution = strict roster + cross-source reconciliation
(`comms-ingest.service.ts:234`); project resolution = `isActiveProjectMember`;
governance = `classifyRecipient` + policy evaluator; proof = `details.source_*`
pointers + evidence quotes (`source-event.ts:90`); correction loop =
learn-loop read-path. Sources not reaching the spine inherit NONE of these —
that is precisely what the table's "gap" column records.

## 3. Architecture-risk classification (instances found)

- **R1 private truth**: Observe/OCR (`ObserveCapture` + Collaboration*
  tables) and `conductSession` MemoryCapsules — two parallel durable stores
  beside the WorkLedger.
- **R2 extracts-but-doesn't-persist**: voice transcripts (client-only);
  standalone MeetingCapture (stores raw, extracts nothing).
- **R3 persists/reads-but-doesn't-route**: Slack/GitHub/Jira/Drive/Gmail/
  Calendar reads; no inbound event route (N).
- **R4 routes-without-approval/audit**: none found — the Action/escalation
  rails are consistently enforced. ✅
- **R5 UI-shown-but-not-actionable**: none found on ingest surfaces. ✅
- **R6 no correction loop**: approval-outcome learning (parked by design).
- **R7 no proof/lineage**: Zoom-as-TRANSCRIPT loses source provenance +
  idempotency; Data & Knowledge lists adapters (env presence), not per-row
  `details.source_*` lineage — rows carry proof the customer cannot browse.
- **R8 cross-org/private leakage**: none found — org-scoped queries +
  banned-field sweeps hold on every audited route. ✅
- **R9 unmodeled credentials**: Docs/Notion (nothing), Slack read (binding
  exists but unused for intake).
- **R10 fake/placeholder claims**: **Notion in the catalogs with zero
  substrate**; OCR cloud engines as status-only stubs.

## 4. The canonical adapter contract (binding for every future source)

Every ingestion adapter MUST produce/call, in order:

1. `source_id` + `source_type` (SourceSystem vocab) 2. `org_entity_id`
3. actor/person/twin context when known 4. source timestamp
5. source pointer / proof reference (`details.source_*`) 6. raw-payload
boundary (raw never enters the ledger) 7. normalized safe text
8. participant list (per-source identifiers for reconciliation)
9–12. extracted decisions / commitments / blockers / follow-ups
13. external people 14. confidence + ambiguity metadata
15. governance envelope (recipient governance + policy, learn-loop priors)
16. durable write result (WorkLedger et al. via the spine — never a private
table) 17. audit/proof id 18. correction/readback hooks.

**Hard rules:** no connector bypasses this contract; none writes to UI state
or private tables; none creates work without WorkLedger+audit+proof; none
resolves people by display name; none bypasses RBAC/ABAC/TAR; none claims to
work without a live smoke; none exposes raw payloads/tokens/OAuth secrets or
private documents; none creates a new source of truth where the Org Truth
Graph already has one. In practice: **an adapter is ~50 lines that builds a
`WorkSourceEvent` and calls `ingestSourceEvent` — anything bigger is
probably violating the contract.**

## 4b. Connector doctrine — org-scoped, never global (founder-directed, binding)

Every organization connects ITS OWN tools. Otzar never connects to "the"
Zoom or "the" Slack — it connects each org's governed workstream into its
own private Org Truth Graph. **Org apps are org-scoped, permissioned,
governed data sources**: Zoom for Org A is not Zoom for Org B; a user's
personal Google/Slack/Zoom account is never automatically org authority.

Canonical model: Org → ConnectorBinding (provider + account/workspace
identity + scopes + status + audit) → source event → `ingestSourceEvent` →
WorkLedger/Action/Audit/Memory → surface. Ingestion always resolves through
the org's OWN binding/grant; no cross-org leakage; no shared-global-app
assumption; no hardcoded provider behavior that ignores org policy.

Seven org-scoping requirements every adapter must test:
1. binding/credentials belong to the caller's org (Zoom: sealed per-org
   OAuth envelope via `getProviderAccessTokenForOrg`);
2. the source event carries org identity (spine resolves org from the
   governed caller);
3. dedupe is org-scoped (`findCaptureByExternalId(orgEntityId, key)`);
4. the SAME provider source id in two orgs never collides (test-locked for
   Zoom, FND PR #538);
5. a revoked/never-connected org has no envelope → honest
   NOT_CONNECTED/NOT_CONFIGURED (live-probed);
6. missing connector → honest setup-required copy, never a silent failure;
7. no secrets, tokens, or tokenized URLs cross the API (test-locked).

Slack (next): source ids must be workspace+channel+message-scoped; dedupe
org/workspace/channel/message-scoped; private/DM channels need separate
policy; the org's OWN workspace binding gates every read. Google
Meet/Calendar/Drive/Docs/Gmail: same rules — content becomes a SourceEvent
only when org policy allows, with safe proof pointers, never casual raw
exposure.

## 5. Verdicts

- **Strongest source:** A — manual Comms transcript. The reference
  implementation of the whole loop.
- **Weakest / most misleading:** K — Notion: catalog-visible, zero substrate
  (R10). (M is equally unbuilt but honestly labeled future.)
- **Highest-risk structural gap:** N — no inbound event route exists, so no
  source can ever arrive *ambiently*; plus the two R1 parallel stores
  (Observe/OCR, conduct capsules) that erode the single-ledger contract.

## 6. Recommended next build slice (by customer impact)

**Slice 1 (small, correctness): Zoom → CONNECTOR provenance.** Route the
already-live Zoom ingest through `sourceSystem:"ZOOM"` with `source_id` +
`dedupe_key` so re-ingesting a recording is idempotent and rows carry real
provenance. Touches one route; the spine already supports it.

**Slice 2 (the flagship): Slack read → canonical ingest.** ✅ SHIPPED
2026-07-03 `[SLACK-INGEST-1]` (FND PR #539): admin-triggered public-channel
message ingest via the org's sealed OAuth envelope through the canonical
adapter into the spine, with the doctrine dedupe identity
`org + SLACK:<team>:<channel>:[<thread_ts>:]<ts>` (cross-workspace +
cross-org isolation and thread non-collision test-locked). The safe first
slice is pull-based and consent-recorded (the admin trigger). Remaining
honest: the Events-API webhook (signature-verified inbound push — the
pattern that closes N and makes arrival truly ambient), channel-sample
ingest, and DM/private-channel policy — all parked deliberately.

Then, in impact order: Data & Knowledge per-row lineage (multiple sources
already write proof customers can't browse — closes part of Gap J/R7);
voice-transcript → optional ingest hop (L); observe/OCR convergence onto the
spine (retire the parallel store, R1); Notion catalog honesty fix (either
remove or mark "not yet available" — one-line copy truth).

## 7. What remains honest

Docs/Gmail/Calendar content reads don't exist; GitHub/Jira reads exist but
feed nothing; workflow observation is future by doctrine; approval-outcome
learning is deliberately unread pending its own boundary design; the OCR
engines are stubs. None of these may be claimed as working until they
traverse the full loop with a live smoke.
