# External Relationship & Third-Party Work Intelligence — Doctrine + Audit

Status: **DOCTRINE + AUDIT** · 2026-07-03 · grep-grounded (FND + CT sweeps,
file:line cited). No product code in this pass. Companion docs:
[`OTZAR_ORG_READY_AND_PORTABLE_TWIN_DOCTRINE.md`](./OTZAR_ORG_READY_AND_PORTABLE_TWIN_DOCTRINE.md),
[`OTZAR_LINEAGE_AWARE_CLARITY_ESCALATION_MODEL.md`](./OTZAR_LINEAGE_AWARE_CLARITY_ESCALATION_MODEL.md),
gap ledger §T.

**Core doctrine:** external communication is a source of business truth.
External data is company-owned, governed, permissioned, lineage-backed —
never employee-portable, never cross-client mixed, never another system
employees must manually update. This is the external side of the Work OS —
**not a CRM clone, not an account dashboard, not a customer portal.**

The experience: external communication → internal understanding → routed
work → proof-backed follow-up → fewer dropped promises → a client who
feels the company as more accurate, responsive, and aligned.

## 1. The headline audit finding

Otzar has **two external-party systems that do not talk to each other**:

- **`ExternalEntity`** (schema:1899) — the *observed* layer: an
  ingestion-auto-populated mention index (name, aliases, entity_type
  free-string CLIENT|PARTNER|VENDOR|COMPETITOR|REGULATOR, mention_count,
  sentiment), gated by `OrgSettings.track_external_entities`, written by
  observation.service.ts:632. No owner, no lifecycle, no commitments.
- **`ExternalCollaborator`** (schema:3621) — the *governed* layer:
  manual-only, workspace-gated, with the full party taxonomy
  (**`ExternalRelationshipType`: CLIENT, VENDOR, CONTRACTOR, PARTNER,
  INVESTOR, ADVISOR, AGENCY, REGULATOR, PROSPECT, CANDIDATE, OTHER** —
  schema:3580), `internal_owner_entity_id`, relationship context
  (needs_from_us / we_need_from_them), access lifecycle
  (TRACKED→INVITED→ACTIVE/REVOKED, policy-gated), soft-delete, and
  **`ExternalCommitment`** — bidirectional obligations
  (INTERNAL_OWES_EXTERNAL / EXTERNAL_OWES_INTERNAL) with bounded
  source_excerpt and an internal-notification follow-up rail.

**No bridge exists**: ingestion never creates a tracked external;
`company_name` is a free string, not a key; Dandelion's unknown-person
seed promotes toward *internal activation* (`confirm_or_activate_person`),
never toward tracking an external; and the one function written to
auto-record external commitments from ingestion —
`recordExternalCommitmentForCaller` (external-collaborator.service.ts:850)
— **has no callers (dead wiring)**.

## 2. The 12-item audit

1. **External person/entity substrate:** yes, twice (§1) — observed
   `ExternalEntity` + governed `ExternalCollaborator`, unlinked.
2. **Does Dandelion capture externals from ingestion?** No. Unknown
   actors become `confirm_or_activate_person` seeds (internal
   activation); the growth pipeline's `ASSIGN_INTERNAL_OWNER`
   recommendation fires only for already-manually-tracked collaborators.
3. **External person → external organization link:** free-string
   `company_name` only. **No external-org/account model.**
   `Entity.COMPANY` cannot represent an external firm — it IS the tenant
   root (`getOrgEntityId` resolves callers to their COMPANY ancestor).
4. **External person → project/workspace/account:**
   `WorkspaceExternalMembership` (many-to-many, access-leveled) links
   collaborators to workspaces; `ExternalCommitment` is workspace-scoped.
   No project/account FK.
5. **Can WorkLedger represent client/vendor obligations?** Not natively —
   no external-party column; owner/requester/target are internal ids. But
   `details Json` is the established soft-field extension point
   (team_hint, subject_name, dandelion_seed already read from it), so a
   safe `external_context` sub-object is idiomatic without migration.
   Manual `ExternalCommitment` rows exist but live beside, not in, the
   ledger.
6. **Can lineage show external origin safely?** Partially — Gap J's
   `source_lineage` carries `source_actor` (a display name), and an
   external author lands `unresolved` in CE-1's strict roster resolution
   (honest, but unlabeled — "external" is not a state the system can
   *name*; it is indistinguishable from an unknown internal).
7. **Do UI surfaces show external context?** Exactly one rich surface:
   **Collaboration Workspace detail** (external stakeholders with
   relationship badges + company names + "Waiting on {name} ({company})" /
   "We owe {name}" commitments + internal-reminder button). **Nothing on
   work rows**: My Work/Team Work/WorkLedgerItem carry zero
   client/account/party context; `internal_owner_entity_id` exists on the
   external types but is never rendered ("Ask Jordan — account owner" has
   no surface).
8. **Third-party data separation:** tenant-level (org) only. No
   per-client/account partition below org; a workspace-per-account
   convention is usable for v1 but is not a modeled boundary.
9. **Do external commitments route to internal owners?** The rails exist
   (internal_owner_entity_id, ASSIGN_INTERNAL_OWNER growth rec,
   NEEDS_OWNER in reconciliation, "create internal follow-up reminder" →
   SEND_INTERNAL_NOTIFICATION) — but the ingestion path never populates
   them (dead wire, §1).
10. **Are client/prospect follow-ups governed?** Yes where they exist:
    recipient governance (external-ish recipients land
    ambiguous/out_of_scope — review, no override for unauthorized), the
    BUG-C confirm/choose pattern, and audit on every write.
11. **Is outbound to externals safe/governed?** Yes, **by construction**:
    there is NO executable external-send ActionType (only
    SEND_INTERNAL_NOTIFICATION + INVOKE_CONNECTOR); planner vocabulary
    (SEND_EXTERNAL_SLACK/EMAIL → REQUIRES_APPROVAL, reason EXTERNAL),
    connector rails (EXTERNAL_SEND / CUSTOMER_SENSITIVE operation classes
    with BLOCKED_BY_DEFAULT/DUAL_CONTROL modes), and draft-tone
    (EXTERNAL_SEND_REQUIRES_APPROVAL) all agree. Honest statement: "no
    standing authority for external sends" is structural, not a claim.
12. **What cannot be proven yet:** any end-to-end external story —
    ingestion→tracked external→obligation→routed owner→follow-up is
    manual at every step; external actors cannot be *named* external;
    no account rollup, no client exceptions, no "Waiting on Acme" outside
    workspace detail.

## 3. The external relationship truth graph (target, mapped to substrate)

Tenant org (`org_entity_id`) → external organization/account (**missing —
today a free string**) → external people (`ExternalCollaborator`; observed
candidates in `ExternalEntity`) → relationship type
(`ExternalRelationshipType` — already the full doctrine list) → source
communication (Slack/Zoom/Comms via the canonical spine + `source_lineage`;
email/Docs/Calendar as connectors land; WorkComms EXTERNAL threads carry
`external_collaborator_id` with consent states incl. UNKNOWN_EXTERNAL) →
project/workspace/account context (`WorkspaceExternalMembership`; v1
convention = workspace-per-account) → commitments/obligations/risks
(`ExternalCommitment` + WorkLedger rows with `external_context`) → internal
owner/approver (`internal_owner_entity_id`, CE-1 clarifier ranking, Review
Center) → WorkLedger/Action/Escalation/Audit (existing spine) →
customer-safe outcome.

## 4. External data classes & the portability boundary

- **A. External source data — company-owned:** client emails, Slack
  Connect messages, Zoom transcripts, support issues, contract notes.
  Lives in the org's source stores; excerpts bounded; never portable.
- **B. External relationship metadata — company-owned:** the collaborator
  records, company names, roles, account owner, relationship type,
  workspace links. Never portable; never cross-org merged (org-scoped by
  schema).
- **C. Internal work derived from external communication —
  company-owned:** the ledger rows, follow-ups, escalations, clarity
  records this pipeline mints.
- **D. Personal method derived from external work — potentially portable
  ONLY after the Category-C derivation rail exists:** "prefers client
  recap bullets", "asks one clarifying question before proposals" —
  stripped of client names, messages, excerpts, account data.
- **Never portable:** client data, source excerpts, customer names,
  contract terms, account history, the external contact graph, support
  details, client strategy. The portable-twin doctrine (§12/§17 there)
  applies verbatim — external truth is the *most* company-owned data in
  the system.

## 5. UI doctrine (three levels, ambient, low-noise)

- **Employee:** only what helps them act — one calm fragment on work rows
  ("For Acme", "Client follow-up", "Waiting on vendor"), richer context in
  the existing Why panel ("Prospect asked for this", "Ask Jordan — he
  owns this account"), the existing clarity ask. Mirror the
  source-lineage pattern exactly: one label map, null → silence.
- **Manager:** account/project exceptions only, on the existing Team Work
  exception box ("3 client commitments at risk", "Vendor dependency
  blocking delivery") — never a message feed.
- **Admin/security:** full lineage/proof (source system, external
  org/contact, access boundary, audit, retention, policy) on the existing
  audit surfaces.
- **Future surfaces** (Client Work Health, Account Pulse, Relationship
  Map): NOT justified by this audit yet — the minimal need is row-level
  context + manager exceptions, both of which land on existing surfaces.

## 6. The audit questions, answered

- **Is Dandelion the right starting point for external people?** No — it
  is deliberately an *internal activation* funnel. The right starting
  points are the two existing external stores; Dandelion later gains an
  external-party seed type ("Track {name} ({company}) as a client
  contact?") that promotes observed→governed with admin approval.
- **Do we need ExternalOrganization/ExternalContact models later?** An
  **ExternalOrganization/account model: yes, later** (T-3) — free-string
  company names cannot power account rollups or cross-workspace identity.
  ExternalContact: no — `ExternalCollaborator` already IS it.
- **Can project/workspace serve as account context for v1?** Yes, as a
  convention (workspace-per-account) — usable, not a modeled boundary;
  documented as such, never claimed as isolation.
- **Can WorkLedger details carry safe external_context for v1?** Yes —
  idiomatic (team_hint/subject_name precedent), no migration, names only,
  keyed losslessly to a future collaborator/org record.
- **Does recipient governance distinguish external vs internal?** Not
  explicitly — externals land ambiguous/out_of_scope by absence from the
  roster. An explicit "external" classification is part of T-2.
- **Where is client/vendor/prospect assigned?** Today: manually at track
  time (`relationship_type`). Future: proposed by the observed layer's
  entity_type, confirmed by a human (never auto).
- **Smallest customer-visible slice:** T-1 below.

## 7. Recommended build order (each needs GO; nothing built in this pass)

- **T-1 — External-context projection on work rows (read-only).** When a
  ledger row's details carry external context (or its workspace links an
  external commitment), project
  `external_context { external_party_type, external_org_label?,
  external_person_label?, relationship_label?, safe_source_label? }`
  and render one calm fragment ("For Acme" / "Client follow-up") +
  Why-panel rows — the exact Gap J pattern (one label map, null →
  silence). Zero mutation; no new surfaces.
- **T-2 — Wire the dead ingestion path.** `recordExternalCommitmentForCaller`
  gets its caller: when the workspace comms-import resolver classifies a
  commitment's party as EXTERNAL, record the `ExternalCommitment`
  (source_excerpt bounded, internal owner from the resolver) instead of
  only a RESTRICTED internal row. Plus: identity reconciliation learns to
  *name* the external state (distinct from unknown-internal), and an
  external-party Dandelion seed type proposes observed→governed promotion
  (admin-approved, never auto).
- **T-3 — ExternalOrganization/account model.** First-class org record
  (org-scoped, soft-delete, relationship type), `ExternalCollaborator.
  company_name` gains a real key, workspace/account linkage becomes
  modeled — the prerequisite for account rollups and manager client
  exceptions ("3 client commitments at risk" needs an account to group
  by).
- **T-4 — Manager client exceptions** on the existing Team Work exception
  box (reuses T-3 + the CE-4B pattern).

## 7b. Identity is layered: person, org membership, twin, external collaborator, external organization, pairwise relationship

**Names are labels, not identity. Identifiers are evidence, not identity
by themselves. Evidence suggests a match; it never auto-merges.**

The layers, mapped to real substrate:

1. **Platform person identity** — the durable human: an `Entity` (PERSON)
   with its personal wallet (DMW). Binds the twin and the portable
   personal memory. Never exposes org data by default.
2. **Org membership identity** — the person inside one company: the
   active `EntityMembership` (org→person) plus role/hierarchy/TAR/
   projects. The same person in two orgs is two membership contexts;
   Company A data never travels into Company X.
3. **AI Twin identity** — an `AI_AGENT` Entity bound to its human via the
   person→twin `EntityMembership` edge (the Gap H owner projection reads
   exactly this), with authority always org-scoped (`TwinConfig` +
   org ceiling). The twin's portable memory follows the portability
   doctrine; its company access never travels.
4. **External party identity** — a third party is a LOCAL, org-owned
   record: `ExternalCollaborator` (person) and, since T-3,
   `ExternalOrganization` (account key, unique per
   (org, normalized_name) — the same "Acme" in two Otzar customer orgs
   is two rows forever). Observed signals (`ExternalEntity`, source
   actors) are evidence that mints T-2 review seeds — never trusted
   identity.
5. **Evidence identifiers** — `ExternalOrganizationIdentifier` (typed:
   domain/Slack team/Zoom account/CRM id/alias; confidence; verified-by
   provenance). Personal email domains are never organization
   identifiers. Collaborator-level identifiers are T-3B.
6. **Pairwise / limited-disclosure match (FUTURE)** — when both sides use
   Otzar, a pairwise reference could confirm "same verified party"
   without exposing either org's graph: no global merge, no data
   crossing, no access granted, org-approved only. The T-3 schema
   reserves this as nullable additive columns
   (`pairwise_identity_ref` / `counterpart_org_ref` /
   `platform_person_ref`) — nothing built, nothing blocked.

Identity rules (locked): twin binds to person, not just permissions;
external collaborators stay local-org records even if the external
person uses Otzar; cross-org matching is pairwise and permissioned,
never global; verified identifiers improve matching but grant no
access; matching never imports the counterpart's data; every verified
link carries provenance/audit.

## 8. Test doctrine (for any future implementation)

External party org-scoped; same contact in two orgs never merges;
lineage stays safe (no raw payloads/domains/emails unless policy-safe);
client data never enters personal wallets (count-invariance, the CE-4A
pattern); external commitments route to internal owners; no cross-client
leak within an org's workspaces; no fake CRM claims (no "pipeline",
"deal stage" copy without models); manager sees exceptions only; admin
sees audit depth; no noisy UI (silence when no external context).

## 9. Risks if ignored & production-readiness impact

Consulting/agency/sales/CS organizations — most real buyers — get an
internal-only Work OS: external asks enter as unlabeled NEEDS_OWNER noise,
client commitments live in a side surface nobody opens from their work
list, and dropped external promises (the highest-cost failure for a
services business) stay invisible until the client notices. The
substrate is unusually strong (governed collaborator model, bidirectional
commitments, structural send-safety); the gap is almost entirely
**wiring and projection** — which is why T-1/T-2 are small slices, not a
CRM build.

**Hard rule:** Otzar makes organizations better at serving third parties
without making employees manage another system. If a slice adds a
dashboard to maintain, it violates this doctrine.
