# Otzar workflow-observation model (future capability)

**1. Customer story.** "As an employee, I want Otzar to learn how I work —
with my permission — so it can help me, train my twin, and preserve my
portable work methods without exposing company data improperly."

**2. Desired feeling.** "Otzar learned how I work, for ME." Never "I'm being
watched." Observation is a gift the employee switches on, sees running, and
benefits from.

**3. Automatic (once consented):** learn tool-usage patterns, writing style,
sequences ("how Annie triages"), best practices; convert into twin training
+ personal patterns; surface reusable methods back to the person.

**4. Ask the human:** explicit opt-in per session/class; what is in scope
(which apps/screens); when to stop; what was learned (reviewable, deletable).

**5. Data inputs:** governed screen-share frames (web `getDisplayMedia` —
inherently permission-prompted), desktop observation (Tauri native, future),
interaction telemetry (clicks/sequences), derived task/process-mining events.

**6. ETL path:** session capture (Extract) → interaction events (Transform;
frames become EVENTS + patterns, raw frames discarded per policy) → pattern
extraction (task/process mining) → permission split: **personal portable
memory** (methods, style, skills — the person's) vs **org process memory**
(only where policy allows) → twin training → feedback loop.

**7. Permissions:** org policy switches the capability on per role/class;
employee consent is per-session and revocable; a **visible active-observation
indicator is mandatory** whenever capture runs; admins can see THAT sessions
ran (audit), not the content, unless policy says otherwise.

**8. Routing:** learned patterns route to the person's twin; org-level best
practices (when permitted) route to admin review before entering org memory.

**9. Audit/proof:** session start/stop, scope, consent record, what was
derived — all audited; raw frames never retained beyond derivation.

**10. Feedback loop:** "that's not how I do it" corrections edit the learned
patterns; deletions are honored and audited.

**11. Shipped today (grep-verified):** NOTHING of this exists. The closest
assets: CT `Observe.tsx` = document OCR ("Let Otzar read this") — a
one-document, explicit action, NOT screen observation; twin preferences/
corrections (the training store the patterns would feed); the portable-
memory framing (Memory page, §24). Desktop native capture is NEEDS_NATIVE.

**12. Not shipped:** screen-share capture, telemetry, mining, indicators,
consent records, any observation policy.

**13. Safe first slice:** web-only, single-session "Show Otzar how you do
this" — employee starts a governed screen-share (browser permission prompt =
the consent), a persistent on-screen indicator shows capture, session ends →
Otzar produces a REVIEWABLE method summary the employee edits/keeps/discards
into their portable memory. No background capture, no org-level mining, no
frames retained.

## Hard boundaries (non-negotiable)
No invasive surveillance · no capture without explicit consent + visible
indicator · no employer raw data in portable memory (methods yes, documents
no) · org policy gates the capability entirely · everything audited.
