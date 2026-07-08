# Meridian Investor / Customer Demo Script

**Tenant:** Meridian Field Systems (`69c07a00-2b39-4771-95c3-22c214e7ae6c`) — the
dedicated customer-sim org. **The demo org is never touched.**
**Live:** FND `971d827` (api.otzar.ai) · CT `9c95101` (app.otzar.ai).
**Companion:** `MERIDIAN_TECHNICAL_PROOF_APPENDIX.md` (every claim below has a
runnable proof).

---

## 0. Demo objective — the one sentence

> **Otzar is not a chatbot. It is an organizational intelligence layer that
> harmonizes the truth of a company** — who said what, who has the authority to
> decide it, which source is current, who is allowed to see it, and what can
> actually be acted on — and it refuses to blindly trust the newest document,
> the loudest executive, a sales promise, or a raw transcript.

Everything in this demo is **real**: a real org, real Google Workspace, real
Google Docs, real Google Calendar availability and a real approved calendar
event created and then cleaned up. Where something is honestly unavailable (Meet
transcripts on this account), Otzar **says so** rather than fabricating it.

---

## 1. The founder / investor talk track (say this out loud)

**Frame (30s).** "Every company already has the raw material of its own
intelligence — meetings, docs, decisions, org structure, who reports to whom,
who's allowed to approve what. The problem isn't a lack of data. It's that the
data disagrees with itself. The July plan contradicts the August plan. Sales
promised something Product never approved. A transcript captures a hallway idea
that was never a decision. Otzar is the layer that harmonizes all of that into
one governed, current, permission-aware truth."

**The five refusals (the memorable line).** "Otzar will not blindly trust:
1. the **newest document** — a fresh doc can be a draft or wrong;
2. the **loudest executive** — hierarchy is not the same as decision rights;
3. a **sales promise** — a commitment beyond someone's authority is flagged, not executed;
4. a **raw transcript** — a mention is not a decision;
5. a **stale plan** — superseded context is corrected, calmly, not repeated."

**The proof frame.** "I'm going to show you each of those refusals happening on
a real company with real Google data — and every one of them is written to a
tamper-evident audit log you can inspect."

**The close.** "This is the difference between a chatbot that answers and a
system that *governs*. A chatbot gives you a confident sentence. Otzar gives you
the current, authorized, permission-scoped truth — and shows its work."

---

## 2. The scenario (Meridian implementation project)

A customer-implementation project with deliberately conflicting reality:

| Element | Setup | What Otzar must do |
|---|---|---|
| **Stale July plan** | An old plan doc/notes | Lead with a calm supersession correction |
| **Approved August plan** | A newer *approved* plan supersedes July | Treat as current truth |
| **Sales overreach** | Sales "promised full automation" | Flag as beyond decision rights — not approved truth |
| **Product Phase-1 scope** | Product approved narrower scope | Outranks the sales promise |
| **Engineering timeline** | Eng pushed a date change | Owned by the technical decision-holder |
| **Finance budget cap** | Finance capped budget | Respected as a guardrail |
| **Compliance block** | Compliance blocked a shortcut | Policy/compliance outranks preference |
| **Out-of-scope ask** | Customer asked for a feature beyond scope | Contained, not silently accepted |
| **Calendar constraint** | Real free/busy | Real availability drives scheduling |
| **Source doc** | One real Google Doc imported | Full lineage + content hash |
| **Source integrity** | Revalidate the imported doc | AVAILABLE / changed:false, audited |
| **Real scheduling** | A meeting | Real calendar event only after all gates → deleted |
| **Ask Otzar** | "What's the current plan?" | Calm, current-truth answer, cites nothing it can't prove |

---

## 3. The flow — three acts

### ACT I — Admin builds the organization (the "young org → governed org" story)

Log in as the **admin** (Meridian admin). Walk, in order:

1. **Empty/young org → company profile + work schedule.** Set the operating
   profile: org timezone, working hours. *Talk:* "Otzar starts by learning how
   the company actually operates — hours, timezones — because 'schedule a
   sync' means nothing without them."
2. **People.** Bring in the team (CEO, Ops, Product, CS, Engineering, Design,
   Sales, Finance, Compliance, …). *Talk:* "Real people, real roles."
3. **Hierarchy.** Show reporting lines. *Talk:* "This is who reports to whom."
4. **Decision rights — the key beat.** Show that decision rights are a
   **separate** map from hierarchy: the CEO reports to no one but does **not**
   own every decision; Product owns product scope; Finance owns budget;
   Compliance owns security/legal. *Talk:* "Here's the insight most tools miss:
   **hierarchy is not authority.** The loudest person in the room isn't
   automatically right. Otzar knows the difference."
5. **Connect Google + import selected docs only.** Show the Data & Knowledge /
   source-trust surface: Google connected + verified, and that Otzar imports
   **only the doc the admin selects** — no broad Drive sync. *Talk:* "We never
   vacuum your Drive. One selected doc, with full lineage."
6. **Source honesty.** Show the imported doc's lineage (source, file id,
   modified time, content hash, currentness) and that a document is *timestamped
   starting context* — never automatically 'current truth.'
7. **Security & Audit.** Show the audit log — every privileged action, including
   `SOURCE_VERIFIED`, is recorded. *Talk:* "Everything you're about to see is
   provable here."

### ACT II — The truth harmonization (the "five refusals" live)

Still as admin/manager, use **Ask Otzar** (clarity answer) and the work surfaces:

1. **Stale plan → calm correction.** Ask about the plan. Otzar leads with the
   supersession: the August approved plan supersedes July — stated calmly, no
   alarm, no invention.
2. **Sales overreach → contained.** The sales "full automation" promise surfaces
   as **beyond decision rights** — a recommendation/claim, never approved truth.
3. **Compliance outranks preference.** The compliance block holds over the
   convenient shortcut.
4. **Finance cap respected.** The budget cap is honored as a guardrail.
5. **Memory / open question / request ≠ truth.** A remembered aside, an open
   question, and a request do **not** become work or truth (zero-invention).

### ACT III — Employee + Twin + real scheduling (governed action)

Log in as an **employee** (or show the employee surfaces):

1. **Starter Twin.** The employee has a starter AI Twin from day one.
2. **"What changed?"** The Twin calmly explains current truth, what's approved,
   what's pending, and who owns each decision.
3. **Twin boundary.** The Twin cannot read restricted context or act beyond the
   human's permissions — non-party retrieval returns a safe 404 with no title
   leak.
4. **Real scheduling, fully gated — then the org feels led.** Schedule the sync:
   Otzar reads **real** Google free/busy, picks a clear slot, and creates a
   **real Google Calendar event only after every gate** (participants →
   confirmation → approval → caller-confirm → connected → write-scope). The
   moment it's created, Otzar **notifies exactly the right humans** — the creator
   and the resolved attendees, **nobody else** — with a calm "Scheduled after
   approval and calendar availability were confirmed — no action needed." It does
   **not** ask anyone to re-confirm what was already agreed. Delete re-notifies
   the same parties that it was cancelled. Then cleanup — idempotent, zero
   residue. *Talk:* "This is the autonomous feel: Otzar held the context, checked
   real availability, respected who had authority, scheduled it, and told the
   right people — without creating a single new task for anyone. And a non-party
   never sees it."
5. **Meet honesty.** If asked for a meeting transcript, Otzar returns an honest
   "not available / reconnect required" — it never fabricates a transcript.

---

## 4. Expected outputs (what the audience should see)

- Decision rights visibly **separate** from hierarchy.
- An imported Google Doc with **lineage + content hash**, marked as starting
  context (currentness), not auto-truth.
- A revalidation that returns **AVAILABLE / changed:false** and writes a
  **`SOURCE_VERIFIED`** row to the audit log (visible in Security & Audit).
- Ask-Otzar answers that **lead with the current approved truth** and calmly
  correct the stale plan.
- Sales overreach **flagged**, compliance/finance guardrails **held**.
- A **real** Google Calendar event id returned on create, then deleted; a
  second delete is idempotent (already-gone).
- Non-party retrieval → **404, no title leak**; no UUIDs/enums/data-model words
  ("Entity", "Capsule", "Twin" as a primitive, "Permission", "Wallet") in
  normal-facing copy.

## 5. Honesty boundaries (say these plainly — they build trust)

- **Meet transcripts** are honestly unavailable on this account
  (`SCOPE_REAUTH_REQUIRED` / `NO_TRANSCRIPT`) — never fabricated.
- **Calendar is write-capable but approval-gated** — no event is ever created
  without the full gate ladder; on a tenant without the write scope it answers
  `EVENT_WRITE_SCOPE_MISSING` honestly.
- **Revalidation is manual** (admin-triggered) by design — no background
  auto-sync daemon.
- The mutation branches of source integrity (a doc that *changed*, was *deleted*,
  or lost *access* upstream) are proven in the backend test suite via a mocked
  upstream — **not** demonstrated live, because that would mean corrupting or
  deleting a real founder document.

## 6. Cleanup (leave zero residue)

The rehearsal specs cancel every run row (cast suspended, seed docs + import
proofs cancelled) and delete every calendar event they create; the Google
connection persists VERIFIED. After the demo, confirm: pending escalations 0,
zero active `DOCUMENT_CONTEXT` rows, no calendar residue. Exact commands +
verification are in the technical appendix.

## 7. Exact run commands (the rehearsal that backs this script)

```
# Full org reality run (cast, hierarchy, decision rights, Google Docs, calendar
# read+write, honest Meet, truth engine, Twin boundary, cleanup):
OTZAR_CUSTSIM_ADMIN_PASSWORD=… npm run test:e2e:live:customer-sim:v2

# Source integrity: import one real doc → revalidate → AVAILABLE + SOURCE_VERIFIED
# audit → sweep clean:
OTZAR_CUSTSIM_ADMIN_PASSWORD=… npm run test:e2e:live:source-integrity
```

(Run them one at a time — both touch `DOCUMENT_CONTEXT` rows on the same tenant.)

---

## 8. UI route reference (app.otzar.ai)

Two shells (router: `src/App.tsx`). Admin lands at `/`, employees at `/app`.

| Beat | Route | Notes |
|---|---|---|
| Login | `/login` | Prod build only — run a **production build** so dev-only quick-fill buttons don't show |
| Company profile / work schedule | `/setup/company-profile` · employee `/app/work-schedule` | Org timezone, working hours, decision-rights editor |
| People + hierarchy | `/users` | Live `/org/hierarchy`; young-org empties render "—", never invented |
| Decision rights (3A) | `/setup/company-profile` (admin) · `/app/work-schedule` (self read-only) | Owns / Can approve / Recommend-only — **separate from hierarchy** |
| Data & Knowledge / source-trust | `/data-knowledge` · `/setup/data-flow` | Live OAuth status; honest "what Otzar pulls/pushes/owns/retains" |
| My Twin | `/app/my-twin` (+ `/app/my-twin/calibration`) | Starter-twin state graceful; "Calibrate / teach" pointer |
| Action Center / Needs you / What changed | `/app` (ambient home) · `/app/action-center` | "You're all caught up. Otzar is listening." when empty |
| Ask Otzar | the ambient **orb** (both shells) · admin ⌘K palette | Asks one focused clarification when ambiguous |
| Security & Audit | `/security-audit` | **Renders the new source-integrity labels** ("Source Verified", "Source Changed Upstream", "Import Quarantined") via `getAuditEventLabel` |

**Walk confidently:** all of the above are solid and honest — no overclaims; every
unbuilt feature is explicitly hedged in copy.
**No dedicated calendar/Meet UI** — scheduling is proposal-only copy in the UI;
the real calendar create/delete is proven via the API/rehearsal, not a UI button.
**Demo watch-item (not blocking):** the employee notification dropdown
(`NotificationBell.tsx:423`) is an un-portaled `z-50` inside a `backdrop-blur`
header (z-40 stacking context) and *can* be overlapped by the orb (z-60) /
ambient nav — verify visually on the demo screen; a portal fix is the durable
remedy (tracked in the gap ledger).
