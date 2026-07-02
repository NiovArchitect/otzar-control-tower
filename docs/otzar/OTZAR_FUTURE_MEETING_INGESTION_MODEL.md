# Otzar meeting-ingestion model (future capability)

**1. Customer story.** "As an admin or employee, I want Otzar to join or
ingest approved meetings, identify participants, extract commitments,
discover external people, route follow-ups, and improve org memory — without
manual meeting-capture pages."

**2. Desired feeling.** The meeting ended and the work already moved: owners
have their items, externals are queued as seeds, nobody transcribed anything.

**3. Automatic (with permission):** detect the meeting from the calendar;
obtain the transcript; resolve participants against the org; extract
commitments/decisions/blockers; route to owners; seed externals; attach
source proof.

**4. Ask the human:** consent per meeting class (org policy default + host
confirmation); ambiguous identity ("Is this the Annie in Engineering?");
approval for any outbound follow-up.

**5. Data inputs:** calendar events, Zoom recordings/transcripts, participant
rosters, org roster + hierarchy.

**6. ETL path:** calendar/Zoom (Extract) → normalized source-event (source,
speakers, timestamps, participants) → identity resolution (member vs external
seed) → permission check → comms-extract pipeline (the SAME one transcripts
use today) → WorkLedger + seeds → routing lanes → surfaces → audit → curated
memory.

**7. Permissions:** org policy defines which meeting classes may be ingested;
host consent recorded; participant visibility of ingestion status; caller-
scoped transcript access (already the shipped rule).

**8. Routing/escalation:** commitments route by the shipped owner-resolution
+ P0R lanes; unowned → identity review → admin (manager-chain consult is a
named routing gap).

**9. Audit/proof:** ingestion event, consent record, source pointers on every
derived item (the shipped evidence model).

**10. Feedback loop:** corrections ("that was Walter, not Will") feed
work-graph-learning; external seeds accepted/ignored teach discovery.

**11. Shipped today (grep-verified):** `listZoomRecordingsForOrg` (read-only
Zoom recordings list, audited); Google `calendar.events.list`; the FULL
transcript→work pipeline (comms-extract, live-proven); external-collaborator
service (Phase 1221) + Dandelion person seeds; caller-scoped transcript
reopen; Meeting Captures page (demoted to route-only — manual capture is not
the product story).

**12. Not shipped:** Zoom transcript PULL → ingest; calendar-triggered
detection; any bot/twin meeting attendee; consent records per meeting;
automatic post-meeting ingestion of any kind.

**13. Safe first slice:** admin-triggered "Ingest this recording" — list Zoom
cloud recordings (shipped bridge), admin picks one, Otzar pulls its
transcript via the Zoom API and feeds the EXISTING `comms/ingest` pipeline
with consent + audit recorded. No bots, no auto-join, no new pipeline — one
new transcript-fetch step composed onto shipped rails.

## Attendee-model options (decision pending)
(a) org bot attendee ("Otzar (NIOV Labs)") — clearest identity, needs Zoom
app approval; (b) user's twin as attendee ("Sadeil's Otzar Twin") — clearest
representation, higher consent bar; (c) **no attendee: post-meeting
transcript ingestion** — lowest risk, no live presence. Recommended order:
(c) → (a) → (b).
