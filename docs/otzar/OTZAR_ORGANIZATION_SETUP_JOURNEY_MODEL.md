# Otzar Organization Setup Journey — Doctrine + Audit

**Status:** 2026-07-04 (Fable 5). Doctrine + audit only — no product code in
this pass. **State at authoring:** CT `main` `751fe2c` · FND `main` `1e21709`
(both live). P0-ONBOARD (activation loop) is CLOSED; this is the next layer.
**Companion docs:** `OTZAR_ORG_READY_PILOT_READINESS_AUDIT.md` (the readiness
evidence this builds on), `OTZAR_OPERATIONAL_GAP_LEDGER.md` (Gap U),
`OTZAR_MULTI_SOURCE_INGESTION_AUDIT.md`, `OTZAR_ROLE_TEMPLATE_WIRING_AUDIT.md`.

**The question:** a company says yes to Otzar tomorrow. How do their people,
roles, hierarchy, tools, data policies, AI Twins, and first workflows actually
get set up — without founder babysitting?

**Hard rule:** a company saying "yes" should lead to a guided setup
experience, not founder babysitting. Customer experience → setup journey →
code → smoke proof.

---

## Part 1 — Audit: what exists today (code-grounded)

### 1. Where organization setup exists today

| Step | Where | State |
|---|---|---|
| Org creation (Phase 0) | `POST /platform/orgs` (`can_admin_niov` + dual control) | API-ONLY, NIOV-operated — no self-serve, no runbook |
| First admin | Phase 0 output / `auth/admin-register` | API-ONLY |
| Invite users | CT Users → InviteWizard (3 steps) + activation links (P0-ONBOARD) | LIVE — one at a time |
| Bulk user add | `POST /org/members/bulk` | **API-ONLY — no UI, no CSV** |
| Hierarchy/manager | Wizard Step 1 placement + Users reporting editor (`POST /org/hierarchy/assign`) | LIVE, per person |
| Roles | `role_title` + `resolveRoleArchetype` preview; role template on twin | LIVE (display + provisioning default only) |
| AI Twin provisioning | Auto-minted at Phase 3 invite; manual via AITeammates CreateTwinDialog | LIVE |
| Twin authority | `OrgSettings.twin_autonomy_ceiling` caps template defaults (Gap G slice 1) | LIVE backend; **no admin UI for the ceiling** |
| Tool readiness | `AgentTemplate.required_tools` vs enabled `ConnectorBinding` | LIVE + honest (never fake-ready) |
| Connectors | Tools & Connections → ConnectorRailsAdmin (Slack/Zoom/Google OAuth, sealed envelopes) | LIVE for Zoom end-to-end; Slack = handshake only |
| Projects/workspaces | WorkProjects + CollaborationWorkspaces + assignment rails | LIVE |
| Org policies | `OrgSettings` (mfa, ip_whitelist, auto_approve_low_risk, audit_ai_actions, require_human_approval, dept_data_isolation, track_external_entities, industry, default_jurisdiction) via GET/PATCH `/org/settings` | LIVE backend; partial UI |
| Data retention | — | **MISSING — no retention model or field exists** |
| First ingestion | Comms paste / MeetingCaptures upload / Zoom ingest | LIVE |
| Go-live readiness check | — | **MISSING** (fragments exist: twin readiness, connector status, activation_status) |

### 2. Setup steps scattered across CT pages (the "12 admin pages" problem)

An admin standing up an org today must visit, in no guided order: **Users**
(invite, hierarchy, activation links) → **AI Teammates** (twins, templates,
skills) → **Tools & Connections** (OAuth, MCP) → **Organization Seeding**
(review seeds, Zoom ingest) → **Onboarding** (Dandelion tier preview) →
**People & Collaboration** (assignment queues) → **Access Control / Access
Hub** (grants) → **Data & Knowledge** (ownership statements) → **Security &
Audit** → **Settings**. Ten surfaces, zero sequence, no progress state, no
single "what's left" view. Each page is individually honest; the journey
between them exists only in the founder's head.

### 3. Missing entirely

- Bulk/CSV/HRIS/directory import (any form).
- Data retention policy (model, config, and UI).
- Go-live readiness checklist / setup score.
- A setup sequence of any kind (guided or documented).
- Twin "repair" action (readiness links out to Tools & Connections only).
- Admin UI for `twin_autonomy_ceiling` and several OrgSettings policies.
- Org-chart / document-based people import.
- Offboarding flow (doctrine exists in the portability model; no rail).

### 4–5. What Dandelion already helps with — and what it is optimized for

Dandelion today is **three disconnected things**, none of which is a setup
coach: (a) the **Onboarding page tier preview** — honest ("This preview does
not activate tools, users, permissions… until you authorize") but a one-shot
suggestion, not a sequence; (b) the **Organization Seeding queue** — genuinely
useful *operational* signals (activate-person seeds, tool-access-needed seeds,
external-party review with the T-3C chooser) driven by ingested work, i.e. it
helps AFTER communication flows, not before; (c) the **employee Welcome memory
form**. Verdict: Dandelion is optimized for **growth/operations
suggestions from ingested work**, not for setup. Its seed substrate (grouped,
prioritized, approval-gated queues on the WorkLedger) is exactly the right
machinery for a setup coach — but no setup-state seeder exists (nothing mints
"3 invited members never activated" or "engineering role requires GitHub,
which isn't connected" as seeds; those derivations exist as scattered
projections at best).

### 6. Bulk import — NO

`POST /org/members/bulk` accepts an array (API-only, same per-row shape as
single add, now credential-less per P0-ONBOARD). No CSV parsing, no UI, no
dedupe/mapping step, no HRIS/Google/Microsoft directory import, no document
extraction. **A 1,000-person org cannot be onboarded today; a 20-person org
means 20 wizard runs.**

### 7. Roles/hierarchy in one flow — PARTIAL

The invite wizard captures title + department + manager (one person at a
time); the Users reporting editor edits one edge at a time. No org-chart
view-and-fix flow, no bulk role/template assignment, no "manager email"
column mapping (blocked on bulk import).

### 8. Twin role-templating at provisioning — YES, honestly capped

Phase-3 invite mints the twin; role templates recommend autonomy;
`twin_autonomy_ceiling` (default APPROVAL_REQUIRED) caps defaults with
provenance stored + audited (Gap G slice 1). `skill_packages` remain unwired;
templates gate the readiness badge and provisioning defaults, **not runtime
authority** (enforcement stays ActionPolicy + dual control — correct, but
must be stated honestly in any setup UI).

### 9. Twin repair — NO

Readiness is honest (`ready | needs_setup | not_configured`) but the only
"fix" is a link to Tools & Connections. No re-template, no re-provision, no
repair endpoint. (A founder-side script `repair-live-demo-twins.ts` exists
untracked — evidence the need is real and currently founder-operated.)

### 10. Tool requirements ↔ connector setup — WIRED and honest

`required_tools` (per role template, seeded per role family) match against
enabled org `ConnectorBinding`s; readiness flips only on real bindings;
test-locked needs_setup→ready→disabled-regression. The gap is guidance:
nothing tells the admin *which roles* are blocked by *which missing
connector* in one place.

### 11. Connector setup: org-level, user-level, or both? — ORG-LEVEL ONLY

Every live OAuth connector (Slack/Zoom/Google) is an **org-level sealed
credential** (`IntegrationCredential`, AES-256-GCM envelope) connected by an
org admin in ConnectorRailsAdmin. **No user-level delegated connector rail
exists.** Nothing today acts "as the employee" in an external tool. This is
a real doctrine boundary (Part 3E) and must never be blurred in setup copy.

### 12. MCP/tool injection — MODELED, mock-proven

Real substrate: MCP server connections with `secret_ref`, per-tool
`McpToolPolicy`, governed `INVOKE_CONNECTOR` actions, JSON-RPC client. Only
the local-mock path is live-verified; external servers are architecturally
wired but unproven. So MCP is **modeled as governed capability, not implied**
— but setup must not present any MCP tool as production-ready.

### 13. Data retention — NOT VISIBLE, NOT CONFIGURABLE, NOT MODELED

No retention field on OrgSettings, no retention policy model, no UI. Related
honesty rails exist (soft-delete RULE 10, source lineage, wallet boundary,
audit) but "how long do we keep X" is unanswerable today.

### 14. Data source direction — PARTIALLY CLEAR, NOT IN ONE PLACE

Per-source truth exists in code and doctrine: pull-only connectors (no
inbound webhook anywhere), everything lands via `ingestSourceEvent` into the
single WorkLedger, source lineage per row, three-wallet memory boundary,
company-owned external data, audit trail. What's missing is the **admin-
facing statement**: a per-connector "what we pull / where it lands / who can
see it / what is retained" panel. Data & Knowledge states ownership but not
flow direction or retention.

### 15–16. LLM/provider selection — NIOV env-selected; keep it that way for pilot

Evidence: `llm.service.ts` — Anthropic primary (`ANTHROPIC_API_KEY`,
model from `ANTHROPIC_MODEL` ?? `MODEL_ROUTER_DEFAULT_MODEL` ?? default
Sonnet-class), OpenAI secondary, circuit breaker, mock/fixture for CI. No
org or user selection surface exists. **Pilot policy (recommended, now
documented):** NIOV chooses the stack — primary Anthropic Sonnet-class,
fallback per env config; org does not choose the model; no model-choice UI
until governance/billing/legal are ready. Enterprise model choice is a
future substrate-ready decision, not a pilot one.

### 17. What must be ready for a real company onboarding (P0 set)

1. Phase-0 rehearsed runbook (org + first admin + baseline OrgSettings) —
   already P0-4 in the readiness audit.
2. Activation loop — ✅ CLOSED (P0-ONBOARD).
3. **CSV people import** (names/emails/title/department/manager-email/role
   template) with dedupe + activation-link generation — P0 for any pilot
   above ~15 people; P1 below that (wizard runs are tolerable at 10–15).
4. **Setup checklist surface** (even static) that sequences the ten pages
   and shows real readiness states from existing projections.
5. Connector truth for the pilot's tool set (Zoom today; Slack ingest UI
   wire if the pilot needs Slack).
6. Retention/policy honesty: if retention is not configurable, the setup
   surface must SAY "retention controls ship later" — never imply
   configurability.

### 18. Safest first implementation slice

**A read-only "Org Setup" checklist page** (admin) that composes EXISTING
projections into phase-ordered readiness — members invited/activated
(`activation_status`), twins ready/needs-setup (readiness), connectors
connected/missing (OAuth status), projects/workspaces assigned (queues),
policies set (OrgSettings), first ingestion done (WorkLedger presence). Zero
new write paths, zero new truth, no fake buttons — every row links to the
existing page that fixes it. That single slice converts "12 pages, good
luck" into a guided path and exposes honestly what is missing. Second slice:
CSV import. Third: setup-coach Dandelion seeds.

---

## Part 2 — The Organization Setup Journey (target doctrine)

The journey maps to the architecture; every phase has a truth source, a
governed action, and an honest readiness state. Nothing "completes" by being
clicked — only by the underlying truth changing.

- **Phase 0 — Organization bootstrap** (NIOV-operated for pilot): company
  name, industry, default_jurisdiction, first admin, baseline policies
  (audit_ai_actions ON, require_human_approval ON, twin_autonomy_ceiling
  APPROVAL_REQUIRED, retention default once modeled). Output: an org an
  admin can log into.
- **Phase 1 — People**: invite + bulk import (CSV first; HRIS/directory
  later), name/email mapping, duplicate detection, activation links (the
  P0-ONBOARD rail), roles/titles, departments, manager edges, employment
  status; external collaborators explicitly separate (the T-1→T-4 governed
  rail, never org members).
- **Phase 2 — Roles & AI Twins**: role templates per person, provision/
  repair twins, authority ceiling visible, tool requirements per role,
  honest per-twin state (ready / needs tools / needs role / not
  configured), explicit "what your twin can and cannot do" (draft-and-
  approve; no autonomy claims).
- **Phase 3 — Work structure**: projects, workspaces, teams, owners/
  reviewers, first assignments; client/vendor workspaces via the external
  rail where relevant.
- **Phase 4 — Tools & data connections**: org-level OAuth (scopes shown,
  pull/push direction shown, "what Otzar can do with it" + "what still
  requires approval" shown), missing connectors shown honestly, MCP tools
  as governed capabilities only.
- **Phase 5 — Data policy & governance**: retention (once modeled), audit
  level, approval policy, external-data rules, personal-vs-company memory
  boundary, portability boundary, offboarding policy, who-sees-what.
- **Phase 6 — First workflows**: first transcript ingested, first
  commitment routed, first follow-up approved/rejected, first clarity
  question, manager sees the first exception, employee sees My Work / My
  AI Twin.
- **Phase 7 — Go-live readiness**: users activated, roles assigned, twins
  configured, tools connected, policies set, test ingestion green, audit
  verified, notification expectations set (in-app only today), support
  contact known, **known limitations shown honestly** (the readiness
  audit's do-not-overclaim list, rendered to the customer).

**Setup UX doctrine (when built):** guided checklist + real progress states
+ setup score + blockers with one-click-safe fixes ONLY where a governed
rail exists; AI assistance framed as "Otzar noticed…" seeds (below); never
a fake wizard step that doesn't change truth.

---

## Part 3 — Standing doctrines locked by this pass

### C. Dandelion split

Three roles, one substrate: **Setup Coach Dandelion** (setup-state seeds:
"5 invited members never activated", "3 roles without twin templates",
"engineering requires GitHub — not connected", "8 employees without
projects" — each actionable via an existing rail, each truthful, each
approval-gated); **Growth/Operations Dandelion** (today's Organization
Seeding: ingestion-driven people/tool/external seeds); **Recommendation
queue** (the grouped review UX both share). Setup coach seeds derive from
setup-state projections, NOT from ingested comms — a different seeder, the
same governed seed lifecycle. Current placement issue: the "Onboarding"
admin page (tier preview) and "Organization Seeding" read as one system but
answer different questions; the setup checklist should absorb the preview's
job.

### D. Admin consolidation

Yes — one **Org Setup command center** (checklist-first, links out to the
existing pages; never a parallel write surface). The ten pages remain the
depth surfaces; Setup is the sequence + readiness layer over them. No page
merger in v1.

### E. Connector / tool / MCP doctrine

- **Org-level connector:** the company authorizes Otzar to read/write
  org-level work data (today's only rail: sealed org OAuth envelopes,
  admin-connected).
- **User-level delegated connector:** an individual authorizes Otzar/their
  Twin to act or read within their own account. DOES NOT EXIST YET — never
  imply it. When built, it is a separate credential class with its own
  consent, scopes, and revocation.
- **AI Twin tool access** = intersection of org policy ∧ user permission ∧
  connector availability ∧ role template requirement ∧ approval policy ∧
  TAR/RBAC/ABAC ∧ action risk. A twin never gains a tool by any single
  switch.
- **MCP tools are governed capabilities, not attachments:** tool manifest →
  scope → owner → allowed actions (`McpToolPolicy`) → approval policy →
  audit → secret boundary (`secret_ref`, never inline) → role/twin
  readiness → execution receipt (ActionAttempt). Anything that can't
  satisfy the chain doesn't ship as a tool.

### F. LLM provider policy (pilot)

NIOV-managed, env-selected: primary Anthropic Sonnet-class, documented
fallback, circuit-breaker degradation to honest `LLM_UNAVAILABLE`. No org- or
user-facing model choice until governance/billing/legal exist. Documented
here as binding pilot policy; substrate for future org selection exists
(provider abstraction) but is not surfaced.

### G. Data flow setup doctrine

The setup surface (and Data & Knowledge) must be able to answer, per source:
what is connected → what is pulled (pull-only today; no push, no webhook) →
what becomes WorkLedger → what becomes memory (and WHOSE wallet) → what is
audit-only → what is company-owned → what can never become personal →
what is retained (honest "not yet configurable" until modeled) → what can be
deleted (soft-delete only) → who can see it. Every answer from existing
truth; no invented labels.

---

## Implementation note — Slice 1 (2026-07-04)

**Shipped:** the read-only Organization Setup page (`/setup`, nav "Organization
Setup" in Overview). It is setup VISIBILITY, not setup automation:

- **Read-only.** Composes seven existing GET projections (org/entities with
  activation_status, org/hierarchy, org/ai-teammates with tool_readiness +
  ceiling, connectors/oauth/status, org/dandelion/seeds, org/analytics,
  org/settings) through one pure derivation module
  (`src/lib/setup/setup-journey.ts`). Zero write paths, zero schema, zero
  backend changes (one read-only client method added for the existing
  GET /org/settings route).
- **What it intentionally does NOT do:** bulk import (labeled "not available
  yet"), retention controls (labeled honestly, links to the existing
  /retention page), setup-coach seeds (blockers render directly from truth),
  AI setup assistant (page structure is ambient-consumable later), email
  claims (none), self-serve onboarding claims (none).
- **Least-access spine:** "Minimum access first — capability by role, scope
  by data, authority by policy, action by approval" renders at the top;
  hierarchy≠permission and twin-authority≠human-title are explicit copy;
  admin authority renders as "admin-level authority… limit to trusted
  operators." This adopts the least-access administrative pattern, not
  Salesforce parity.
- **P1/P2 remaining:** CSV people import (next; write path — founder GO),
  setup-coach seed lane, per-source data-flow panel, external-scope panel,
  go-live gate view, twin repair rail, ceiling/policy admin UI.

## Implementation note — Slice 2: CSV people import (2026-07-04)

**Shipped:** `/setup/import-people` — the first write-path setup slice.
Preview-first, confirmation-gated, least-access by construction:

- **Columns:** full_name + email required; title, department, manager_email
  optional; role_template parsed for PREVIEW ONLY (assigned later from AI
  Teammates). **Forbidden and hard-refused:** password, admin/authority,
  permissions, tools, autonomy, data scopes, clearance, connector, wallet.
- **Rails only, zero backend changes:** POST /org/members/bulk
  (credential-less create, per-row audit, partial-success) → POST
  /org/onboarding/invite per person (twin + ONE-TIME activation link — the
  P0-ONBOARD rail) → POST /org/hierarchy/assign for manager/department
  (cycle-safe, audited). Batch cap 20 (admin rate budget), honest split
  copy for bigger files.
- **Activation semantics:** imported people are passwordless until they
  activate; links revealed once in the results ("copy all" supported); "No
  email is sent" stated at confirm AND results.
- **Not in this slice:** HRIS/directory import, org-chart upload, role
  assignment writes, updating existing members (existing emails are
  skipped with repair copy), >20-row batches.

## Implementation note — Slice 3: per-source data-flow trust panel (2026-07-05)

**Shipped:** `/setup/data-flow` ("How your data flows") — read-only, one live
GET (connector OAuth status) merged with a STATIC capability matrix that
states only what the product does today. Per source (manual communications,
Zoom, Slack, Google Workspace, Microsoft 365, external & client context,
memory & AI Teammate learning): what Otzar pulls, what it pushes back
(nothing without approval; most sources: nothing), where data lands, who
owns it (company-owned / company-governed / split wallet boundary), who can
see it, and honest retention ("not configurable in-product yet" + link to
/retention). Linked from the Tools & data and Governance cards on /setup.
Nothing inferred beyond evidence: connected ≠ ingesting is explicit per
source; unavailable capabilities say "not available yet". No writes, no
schema, no backend changes. Closes smoke-matrix stories 7 and 11 at the
setup-panel level; deeper per-account external views remain future.

## Implementation note — Slice 4: Go-Live Readiness Gate (2026-07-05)

**Shipped:** `/setup/go-live` — the launch confidence artifact. Read-only;
consumes the SAME seven GET projections through a shared
`computeSetupFacts` (extracted from the journey derivation — zero duplicated
readiness logic). Three readiness levels kept strictly apart: (A) ready to
run a first workflow — deterministic verdict from live truth (Not ready /
Needs admin setup / Ready for first workflow); (B) controlled pilot — A
plus the founder/operator runbook items, listed as founder actions, never
as customer blockers; (C) founder-free self-serve onboarding — NOT
complete, stated on every render. Warnings never fake-block (roles,
managers, teammate readiness, connectors stay warnings while the manual
communications route carries the first workflow). Positive proof (ready
signals) renders alongside problems. What the gate does NOT prove: email
delivery, retention controls, org-creation self-service, ambient
ingestion — all named. Remaining structural gap: the setup-coach seed lane
(smoke-matrix story 9 full form).

## Implementation note — Slice 5: setup coach + coherence sweep (2026-07-05)

**Shipped:** the setup coach ("Otzar noticed") on /setup — DERIVED, typed,
grouped recommendations from the shared computeSetupFacts. **Doctrine
decision:** persisted Dandelion setup seeds were rejected — the
approve/reject seed lifecycle is the wrong shape for repair items
("approving" an activation stall changes no truth, which the no-fake-step
rule bans). Derivation gives the noise rules by construction: one grouped
recommendation per category, stable keys, disappears when fixed, never
re-mints, zero writes, zero cross-org risk. The operational Dandelion lane
(activate-person, tool-grant, external review — real approval semantics)
stays untouched and separate; the coach card says so on its face.

**Coherence sweep results:** first-workflow path now points at the REAL
route (Comms in the Otzar workspace) from the journey card, the go-live
gate, and the coach; cross-links verified (setup ↔ import ↔ data-flow ↔
go-live ↔ repair surfaces; Home → setup pointer); overclaim grep across all
setup surfaces clean (rendered copy — only code comments match); least-
access anchors present on every setup surface; smoke matrix reconciled to
14/14 with remaining maturity items named (HRIS/org-chart import,
per-account external views, printable gate handoff, >20-row batches).

**Setup arc status: coherent enough to receive starting context.** The
next layer (Org Context Seeding + Employee Twin Calibration) can begin its
doctrine/audit on top of: activation rails, least-access import, data-flow
boundaries, go-live gating, and setup coaching — with wallet/lineage/
external boundaries already rendered and test-enforced.

## Part 4 — Final report

1. **Current setup surfaces:** ten unsequenced admin pages + two API-only
   rails (bulk add, Phase 0) — table in Part 1.1.
2. **Current flow, empty org → live org:** NIOV runs Phase 0 → admin logs
   in → per-person invite wizard × N → copy activation links × N → manual
   role/hierarchy edits × N → twins auto-minted → admin connects Zoom →
   templates applied by hand → projects/workspaces created by hand → first
   transcript pasted → live. Works; entirely founder/admin-stitched.
3. **Major friction:** no sequence, no bulk import, no readiness rollup,
   activation links copied one by one, twin repair is a link-out, policies
   split between backend-only fields and scattered pages.
4. **Missing bulk import:** everything (Q6/A). Safe first version: CSV with
   name, email, title, department, manager email, role template, optional
   location/project — mapped, deduped, credential-less create + activation
   links, all through the EXISTING bulk + hierarchy + invite rails.
5. **Missing tool/data clarity:** per-connector direction/scope/landing/
   access/retention panel (doctrine G); org-vs-user credential distinction
   stated (only org exists).
6. **Twin role-template readiness gaps:** ceiling has no admin UI;
   skill_packages unwired; no repair rail; employee-side readiness
   projection still org-level.
7. **Dandelion gaps:** no setup-state seeder; three roles conflated across
   two pages; split doctrine in Part 3C.
8. **Consolidation:** one checklist-first Setup command center over the
   existing pages (Part 3D); no page merger.
9. **Retention/policy gaps:** retention unmodeled (P1 to model, P0 to be
   HONEST about); OrgSettings partially surfaced; jurisdiction/industry
   captured but not in any setup flow.
10. **MCP/tool governance doctrine:** locked (Part 3E).
11. **LLM recommendation:** NIOV-managed Anthropic-primary stack, no org
    choice for pilot (Part 3F) — matches current code exactly; zero build.
12. **P0 blockers for real onboarding:** Phase-0 runbook (readiness P0-4);
    setup checklist surface (18); CSV import IF pilot >15 people;
    per-pilot connector truth; honest retention copy. (Activation ✅.)
13. **P1 improvements:** setup-coach Dandelion seeds; twin repair rail;
    ceiling + policy admin UI; retention model; user-level delegated
    connectors; HRIS/directory import; org-chart import; offboarding rail.
14. **Recommended build order:** (1) P0-OPS [already queued — smoke org +
    deploy rail], (2) Phase-0 runbook rehearsal, (3) read-only Org Setup
    checklist page, (4) CSV people import, (5) setup-coach seeds, (6)
    retention model + policy UI, (7) twin repair rail. Each slice: grep →
    plan → gates → live smoke, per the standing discipline.
15. **Do-not-overclaim list (setup edition):** never "import your whole
    company" (no bulk UI yet) · never "Otzar sets itself up" (coach seeds
    don't exist) · never "connect your tools" plural beyond Zoom (Slack =
    handshake only) · never "your twin is ready" without the real readiness
    state · never "retention configured" (unmodeled) · never "user-level
    tool delegation" (doesn't exist) · never "choose your AI model"
    (NIOV-managed) · never "email invites" (admin-copied links) · never a
    setup step that completes without the underlying truth changing.

**This doctrine does not replace P0-ONBOARD (closed) or P0-OPS (next build
slice).** It defines the layer above them so every subsequent setup slice
lands inside one coherent journey instead of adding an eleventh page.
