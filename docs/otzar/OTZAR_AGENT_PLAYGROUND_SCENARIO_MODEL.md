# Otzar Agent Playground — scenario-collaboration model

**1. Customer story.** "As an executive/admin, I want AI teammates to
simulate scenarios and collaborate on possible outcomes using permissioned
org knowledge, so the organization can make better decisions."

**2. Desired feeling.** A strategy room that's always on: pose a question,
watch the organization's own agents reason over its own governed knowledge,
get comparable paths with proof — never a toy, never a chat gimmick.

**3. Automatic:** ground every scenario in permissioned org data; generate
candidate paths; compare outcomes; recommend the best path with reasons;
simulate multi-agent interactions within role permissions.

**4. Ask the human:** the scenario question; approval before any recommended
path becomes REAL work (governed transition); scope choices when data access
is ambiguous.

**5. Data inputs:** curated org knowledge (WorkLedger, goals, hierarchy,
grounded recall), twin role templates/permissions, connector capability
states.

**6. ETL path:** scenario (input) → grounding (permissioned retrieval) →
candidate generation → outcome comparison → recommendation → optional
multi-agent simulation → **governed transition** into real work (Action
pipeline) → audit → outcomes feed org memory.

**7. Permissions:** agents act within their twin's role/template permissions;
grounding is caller/org-scoped (the shipped grounding refuses when
insufficient — live-proven); executives/admins gate the surface.

**8. Routing/escalation:** an adopted path becomes governed work through the
SAME executor + approval rails (never a bypass).

**9. Audit/proof:** scenarios, candidates, comparisons, recommendations, and
transitions are persisted rows with audit linkage (ADR-0077 pipeline).

**10. Feedback loop:** adopted vs rejected recommendations are signals for
the decision-recommendation layer.

**11. Shipped today (grep-verified — MORE than expected):** the full
ADR-0077 pipeline exists end-to-end: 6 Foundation routes — scenario CRUD
(Wave 4), candidates (5), outcome comparison (6), best-path recommendation
(7), **governed transition** (8), **multi-agent simulation** (9) — consumed
by CT `AgentPlayground.tsx` (the "enterprise decision cockpit"). Grounding +
per-user isolation live-proven separately.

**12. Not shipped / honest limits:** the surface is admin-IA-buried and its
language undersells the capability ("Playground" reads like a toy); no
scheduled/continuous scenario runs; simulation quality bounded by the LLM
layer; no executive-facing rollup of scenario history.

**13. Safe first slice (mostly positioning, not plumbing):** rename/reframe
the surface toward "Scenarios" / decision-cockpit language, add the customer
story to its header, and surface "recent scenario → recommendation →
adopted?" on the exec view — all over the existing 6 routes. No new backend.
