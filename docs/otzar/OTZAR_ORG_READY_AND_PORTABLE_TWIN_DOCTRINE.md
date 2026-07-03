# Organization-Ready Otzar + Portable AI Twin Doctrine

Status: **GOVERNING DOCTRINE** · 2026-07-03 · audit-grounded (FND + CT
sweeps, file:line citations below). This document defines the target every
gap, slice, smoke, UI decision, backend model, connector, memory rail, and
audit surface is evaluated against. It makes NO claim that portability is
shipped — see §19 for the honest current state.

**The trust line:** *the employee's AI Twin becomes uniquely valuable,
while the company's data remains sovereign.*
**The core doctrine:** *the employee can take the SHAPE of how they work;
they cannot take the company's WORK.*

---

## 1. What "organization-ready" means

An organization can adopt Otzar when, provably (not aspirationally): every
ingested communication is org-scoped with source lineage and dedupe; every
privileged action runs the 4-stage audit-aware pattern; approvals and
escalations have honest queues; twins operate under org-ceiling-capped
authority with per-role tool readiness truth; employees see their own
twin's work; admins can audit everything without employees drowning in it;
cross-org isolation is test-locked at every rail (connectors, dedupe,
memory registry, retrieval); and every UI states honest states ("Not set
yet", "Source not recorded yet") instead of inventing. Readiness is
demonstrated by the live smoke battery, never claimed.

## 2. What "ambient AI Work OS" means

Work arrives without anyone pasting anything (connectors → canonical
spine); truth is quiet by default and available on demand (card →
Why → Ask Otzar → audit depth); Otzar routes work, answers "why is this
here", escalates for clarity laterally, and harmonizes collaboration —
fewer repeated questions, fewer unnecessary approvals, no new homework.
Ambient does NOT mean surveillance and does NOT mean showing every proof
detail everywhere.

## 3. What "portable AI Twin" means

Like a phone number moving between carriers: the employee's **agentic work
identity** — style, methods, preferences, skills — can eventually move
from Company A to Company X. What moves is the *shape* of how the person
works. The twin at Company X is re-grounded in Company X's org truth,
capped by Company X's policy, connected through Company X's own bindings.
Nothing of Company A's substance travels.

## 4. What belongs to the company

Everything the company's work produced or governs: WorkLedger rows and
evidence; MeetingCapture / ObserveCapture / AudioCapture transcripts;
WorkComms records; Slack/Zoom/Gmail/Drive source events and excerpts;
source lineage (`source_lineage`, source ids, dedupe keys); Dandelion
seeds and the org graph; projects, workspaces, hierarchy; approvals,
escalations, and their resolutions; audit events and receipts; connector
bindings, OAuth envelopes, credentials; org policies, role templates, org
ceilings; the ENTERPRISE wallet and every capsule in it (incl. DECISION
capsules); compliance/retention records; customer and coworker data.

## 5. What belongs to the employee

The PERSONAL wallet and its capsules (the Digital Work Wallet); their
TwinCorrectionMemory rows at PERSONAL scope (safe summaries + pointers,
never raw source); their preferences, communication tendencies, decision
style, work patterns, productivity rhythms; their skill profile; their
identity profile (EntityProfile); their consent decisions and revocation
rights over grants on their data.

## 6. What can be exported/ported (future)

Category A of the taxonomy (§12): personal work style, preferences,
communication tendencies, reusable NON-confidential workflows/methods,
skill graph, learned methods, productivity patterns, twin behavior
preferences, personal correction patterns **stripped of company source
data**, personal tool-use preferences (never credentials). Plus Category C
items ONLY after safe derivation (§12C).

## 7. What cannot be exported/ported (ever)

Category D and all of §4: raw transcripts, Slack messages, company
documents and emails, project data, customer data, internal decisions,
approval/rejection records, audit trails, source excerpts, evidence
quotes, company-specific knowledge and playbooks, org/team graph, coworker
data (names, threads, relationships), proprietary workflows the company
owns, credentials/tokens/secret_refs, connector bindings, org policies,
org memory (ENTERPRISE wallet), anything retention/compliance-bound,
Company A org ids / source ids / ledger ids (identifiers are lineage).

## 8. How org data and personal work memory stay separated (current substrate)

The separation already exists at the **wallet layer** — verified:

- `Wallet` is one-per-entity, typed `PERSONAL | ENTERPRISE | DEVICE`
  (FND schema:77, 446-450). MemoryCapsules carry `wallet_id` — the wallet
  type IS the ownership boundary.
- **The portability routing invariant** (observation.service.ts:229-235 +
  359-470; otzar.service.ts:1464-1489): `DECISION` capsules land in the
  ORG's enterprise wallet; `COMMITMENT`, `WORK_PATTERN`, `CORRECTION`,
  `CONVERSATION_LEARNING`, personal insights land in the EMPLOYEE's
  personal wallet. Write-time routing, already live.
- `TwinCorrectionMemory` carries the only explicit scope ladder:
  `scope_type PERSONAL|CONVERSATION|PROJECT|TEAM|ROLE|ORG` + org + owner
  keys, `safe_summary` (bounded), source **pointers** only (schema:2815).
- Org source truth (WorkLedger, captures, WorkComms) is `org_entity_id`-
  keyed everywhere and never enters wallets as raw content.
- Access is per-grant (`Permission` 3-tuple access_scope /
  can_share_forward / duration_type), revocable, receipt-proofed.

**Known boundary weaknesses (the gap, §S):** MemoryCapsule has NO
persisted scope/ownership_class column — personal-vs-org is implicit in
the wallet join and reconstructed per-capsule-type at write time;
OtzarConversation lacks org_entity_id; TwinConfig holds authority only
(no personal-preference fields). You cannot today QUERY "this employee's
personal-portable memory" without replaying routing logic.

## 9. How Twin learning happens without leaking company data

The learn-loop's shape is already right: TwinCorrectionMemory stores
**safe summaries + source pointers, never excerpts**; recipient
corrections live on org-owned FOLLOW_UP ledger rows (org-bound by
construction, work-graph-learning.ts:210); promotion is an explicit
ladder (PERSONAL → PROMOTED_TO_TEAM/ORG_PATTERN), never silent. Rule
going forward: **personal learning stores the method, org records store
the matter.** A personal capsule may say "prefers one focused question
over broadcast"; it may never say who was asked or quote what was said.
Any future skill derivation (Category C → A) is a governed, audited
transformation that strips names, customers, transcripts, excerpts, and
org identifiers — and it does not exist yet.

## 10. How the Digital Work Wallet becomes valuable across jobs

Value accrues in the PERSONAL wallet automatically today (work patterns,
corrections, conversation learnings, commitments-as-personal-history) and
in TwinCorrectionMemory (the taught work style). Across jobs, value =
the twin arriving at Company X already knowing HOW its person works —
tone, planning style, ambiguity habits, review preferences — so the
ramp-up is days not months. The wallet is the employee's career asset;
the company's sovereignty is what makes employers willing to let it exist.

## 11. How admins govern org data while employees keep personal agency

Already-live split, preserved: admins govern the ENTERPRISE wallet, org
policies, role templates, autonomy ceiling, connector bindings, retention,
audit (Security & Audit, Data & Knowledge, Reports); employees govern
their PERSONAL wallet — teach/correct (Preferences, PERSONAL-default
scope), revoke grants (AccessGrants: "revocation is enforced immediately
at read time"), consent to observation, see their twin's work (My AI
Twin). Twin AUTHORITY is org-governed (ceiling-capped); twin STYLE is
employee-taught. Neither side reaches across.

## 12. Memory scope taxonomy (canonical)

**A. Employee-portable** — communication tone/preferences, task style,
planning methods, accessibility preferences, productivity rhythms,
reusable non-confidential workflows, personal skill graph, correction
patterns stripped of company source data, personal (non-credential)
tool-use preferences, twin behavior preferences.
*Substrate today:* PERSONAL-wallet capsules of types PREFERENCE,
COMMUNICATION_PREF, DECISION_STYLE, WORK_PATTERN, BEHAVIORAL_PATTERN,
SESSION/TASK_LEARNING, CORRECTION, IDENTITY, FOUNDATIONAL,
DOMAIN_KNOWLEDGE (personal expertise); TwinCorrectionMemory PERSONAL rows.

**B. Org-bound** — project context, source excerpts (Slack/Zoom/email/
docs), customer/account data, internal decisions, audit/proof,
approvals/rejections, org policies, company playbooks, proprietary
workflows, team graph, source lineage, connector bindings, credentials,
compliance records.
*Substrate today:* WorkLedger, captures, WorkComms, ENTERPRISE-wallet
capsules (DECISION, COMPLIANCE_RECORD, and org-routed COMMITMENT/HANDOFF/
BLOCKER/RISK/RELATIONSHIP/CONVERSATION_LEARNING where org-written),
EscalationRequest, AuditEvent, ConnectorBinding, OAuth envelopes.

**C. Mixed — requires derivation.** "I usually write concise customer
updates after sales calls" is portable as a METHOD only after stripping
company names, customers, transcripts, excerpts, and identifiers. Raw
form: org-bound. Derived form: Category A. The derivation rail does not
exist; until it does, Category C is treated as B.

**D. Never portable** — raw transcripts, Slack messages, company
documents, customer data, secrets/tokens, audit logs, org approvals,
regulated data, coworker private data, org/source/ledger identifiers.

**Scope axes every memory must eventually answer:** personal / org /
project / team / tool / source-bound / compliance-bound. Today only
TwinCorrectionMemory answers most of these; MemoryCapsule answers none
on-row (wallet join only).

## 13. When an employee leaves Company A (offboarding model — target)

1. Disable the person's org access: membership deactivated, sessions
   revoked, org connector access severed (bindings are org property and
   never traveled anyway).
2. Company A keeps everything org-bound: WorkLedger, captures, audit,
   approvals, escalations, ENTERPRISE-wallet capsules, lineage — intact,
   retention-governed, twin's org history preserved for the org.
3. The employee's PERSONAL wallet + PERSONAL-scope corrections are
   computed into the **allowed portable profile**: Category A only,
   Category C stripped or excluded, D never; company names, customer
   names, coworker identities, source pointers into Company A, and org
   ids removed.
4. Export (when it exists) writes a portability **audit event + receipt**
   on both sides of the boundary; consent is the employee's, the strip
   is the platform's guarantee to Company A.
5. **Honest current state:** none of steps 1-4 exists as a flow today
   (§19). Users "Suspend" blocks login and leaves the twin minted; the
   personal DMW simply persists. No claims until built and proven.

## 14. When an employee joins Company X (onboarding model — target)

1. Only the portable personal profile imports — nothing of Company A.
2. Company X's role template + org autonomy ceiling cap the twin's
   authority (this rail is LIVE: applyTwinAutonomyCeiling).
3. Connector bindings are new, Company-X-scoped sealed envelopes (this
   rail is LIVE: per-org OAuth envelopes, cross-org isolation
   test-locked).
4. The twin re-grounds in Company X's org truth graph (roster, projects,
   hierarchy) — it knows HOW its person works, and learns WHAT Company X
   works on from Company X's own spine.
5. Import writes an audit event; no Company A org ids / source ids may
   appear anywhere in Company X's environment (test-locked when built).

## 15. What must be audited

Every future export/import event (both sides, receipt-chained like DMW
ConsentGrant→Receipt); every promotion PERSONAL→TEAM/ORG in the learn
loop; every derivation run (Category C→A) with what was stripped; wallet
reclassification of any capsule; offboarding disposition; admin access to
personal-wallet metadata (counts only today — keep it that way).

## 16. What must be consented

Employee consent: export of their portable profile; observation capture
(already modeled — consent card records nothing today); any org read of
personal-wallet content beyond counts. Org consent (policy): what leaves
at offboarding beyond the platform-guaranteed strip; promotion of personal
patterns into org playbooks.

## 17. What must never be portable

§7 / Category D, plus structurally: connector bindings and secret_refs
(env-var names are infrastructure); audit chains; escalation records;
`source_lineage` blocks and everything behind them; the org roster and
any coworker-derived signal; anything a retention/compliance policy
binds. **Portability must never become data leakage — if a strip cannot
be proven, the item does not travel.**

## 18. What future UI surfaces must communicate

- **The vocabulary already exists and must be rendered**:
  WalletProvenanceBadge's "Enterprise wallet — stays with company" /
  "Personal wallet — travels with employee" is built but rendered in
  exactly ONE hardcoded place (TwinDetailDrawer) — dead copy today.
- The Digital Work Wallet (MyMemory) already states the doctrine
  correctly ("Your methods, skills, and preferences are YOURS — your
  organization's records stay with the organization") — keep it the
  anchor surface.
- Per-capsule-type personal/org/device tagging in the ONE label map
  (capsule-types.ts) so every capsule display inherits the boundary.
- Fix the **pronoun flip**: "your data" means the employee on MyMemory
  and the company on admin surfaces (DataSovereigntyInline) — the owner
  must be named, not pronouned.
- Chat's "Correct this conversation" must say where learning lands
  (Preferences already does this right: "Personal items stay personal").
- Offboarding surfaces (Users "Suspend") must eventually state wallet
  disposition — today they are silent.
- **No "Export Twin" button, no portability claim, until the rail exists
  and its ten proofs pass (§20).**

## 19. Honest current state (verified, no readiness theater)

Portability is **doctrine + substrate, not a feature**:
`proof-of-access.service.ts:114` hard-codes
`memory_portability_supported: false`; the DMW registry is an org-scoped
counts-only read-view whose cross-org lookups return NOT_ALLOWED; no
export/import/transfer path exists; no human offboarding flow exists (the
kill-switch covers AI employees only); MemoryCapsule lacks an on-row
scope field; the boundary vocabulary is largely unrendered. What IS live
and correct: the three-wallet model, the write-time routing invariant,
TwinCorrectionMemory's scope ladder, per-org sealed connector envelopes,
org-scoped ingestion + lineage, revocable grants with receipts.

## 20. Testing doctrine for future portability

A portability feature ships only when it proves: (1) no org source data
exported; (2) no source excerpts exported; (3) no connector secrets
exported; (4) no customer/coworker data exported; (5) no Company A
org/source ids imported into Company X; (6) personal preferences survive
the round-trip; (7) skill graph survives where non-confidential; (8) the
new org's policy caps authority on arrival; (9) audit records the
export/import events with receipts; (10) employee consent and company
permissions are both respected. Plus the standing invariants: cross-org
isolation, RULE 10 (revocation preserves evidence), no secrets in any
projection.

---

*Connected architecture: WorkLedger · source_lineage · ingestSourceEvent ·
ConnectorBinding/OAuth envelopes · AuditEvent/Receipt · TwinConfig/
AgentTemplate/org ceiling · TwinCorrectionMemory · MemoryCapsule/Wallet
(DMW) · Data & Knowledge · org graph/hierarchy · RBAC/ABAC/TAR ·
approvals/escalations · learn-loop · My AI Twin · AI Teammates ·
Security & Audit · Reports/Operational Health.*
