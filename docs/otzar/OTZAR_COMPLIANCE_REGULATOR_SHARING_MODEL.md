# Otzar compliance / regulator-sharing model (future capability)

**1. Customer story.** "As a regulated company (e.g. a bank obligated to the
SEC), I want to securely prepare and share policy-bound data with regulators
in near real time, without uncontrolled data leakage — even when the next
meeting is months away."

**2. Desired feeling.** Compliance is a standing, provable state — not a
quarterly fire drill. The regulator sees exactly what policy binds, nothing
else, with proof of every access.

**3. Automatic:** maintain policy-bound data packages (the queries/documents
a policy declares shareable); keep them current from curated org knowledge;
record every regulator access; alert admins on policy drift.

**4. Ask the human:** which policy binds which data classes; approval for
each package publication/update; revocation decisions.

**5. Data inputs:** curated org knowledge (never raw capture), policy
definitions, retention rules, audit chain.

**6. ETL path:** curated knowledge → policy filter (the BINDING step: only
fields/records the policy names) → package assembly with lineage → approval →
external access surface → access audit → retention clock.

**7. Permissions:** a new EXTERNAL viewer role class (regulator) with access
to bound packages ONLY; org admins own binding + approval; Foundation
enforces org boundary — the regulator role can never traverse into the org
graph.

**8. Routing/escalation:** access anomalies and expiring obligations route
to the compliance admin (Action Center lane).

**9. Audit/proof:** package composition (what, from which lineage), every
regulator access (who/when/what), every approval and revocation.

**10. Feedback loop:** regulator requests that fall OUTSIDE current bindings
become policy-review items for admins.

**11. Shipped today (grep-verified):** the substrate primitives — capsule
permissions (3-tuple), access grants/revocations (Access Control hub), audit
chain + retention discipline, org-boundary isolation (CI-proven), policy
pages (internal/collaboration/approval classes). Marketplace/Federation
Cohorts exist as labeled future surfaces.

**12. Not shipped:** the regulator role class, policy-bound package objects,
any external access path (API/plugin/app), package approval flow, external
access audit views. **No regulator integration exists — none is claimed.**

**13. Safe first slice:** an INTERNAL "compliance package preview" — an admin
defines a policy-bound query over curated knowledge, sees exactly what a
regulator WOULD see, with lineage + a simulated access log. Zero external
access; proves the binding model before any external door opens. The
external path (Foundation/Federation API or approved app) comes after.
