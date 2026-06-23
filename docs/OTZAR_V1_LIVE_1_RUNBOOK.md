# OTZAR-V1-LIVE-1 — Two-User Validation Runbook

> Goal: stand up a reachable Otzar where **two real teammates in one organization
> log in from two different computers**, the product identity reads **Otzar**, and
> intake runs the **real LLM path** (never a scripted demo). This runbook is the
> bridge from the code that LIVE-1 lands to an actual two-laptop session.
>
> This document does **not** require any secrets to be committed. Every secret
> below is supplied at deploy time via the hosting platform's secret store.

## What LIVE-1 makes true (code)

- **Reachable:** the Otzar frontend reads its API origin from
  `VITE_FOUNDATION_API_URL` (canonical), with `VITE_API_BASE_URL` as a
  backward-compatible fallback, defaulting to `http://localhost:3000/api/v1` for
  local dev. The Docker build arg is `VITE_FOUNDATION_API_URL` (matches source).
- **Branded:** browser tab title, the login card, and the admin sidebar all read
  **Otzar** (employee shell and the Tauri window already did).
- **Honest intake:** scripted/fixture demo intake (`DEMO_SCRIPTED` / `DEMO_FIXTURE`)
  is refused in staging/production unless `ALLOW_DEMO_MODE=true`
  (`[OTZAR-V1-LIVE-1A-FOUNDATION]`). Real LLM intake is the default path.
- **Calm nav:** placeholder ("coming soon") admin screens are hidden from the nav
  by default (`VITE_SHOW_COMING_SOON=false`); their routes stay registered.

## What stays MANUAL after LIVE-1 (no code yet)

- Actual cloud hosting + secret injection (no IaC in this chunk).
- Org bootstrap + second-teammate provisioning + credential handoff
  (no self-serve signup / invite email yet — that is LIVE-6).
- Session does **not** survive a browser refresh (deliberate no-web-storage
  security posture in `src/lib/stores/auth.ts`; httpOnly refresh-cookie work is a
  later scoped chunk). During validation, **avoid hard refreshes**.

---

## 1. Required environment

### Foundation (backend) — server-side only, never in any bundle

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection (pooled). |
| `DIRECT_URL` | Direct Postgres connection (migrations / `prisma db push`), if pooled. |
| `JWT_SECRET` | Session token signing. In production must meet the boot-validation entropy gate. |
| `ENCRYPTION_KEY` | Required in `NODE_ENV=production` (no dev fallback). |
| `REDIS_URL` | Nonce/session store. |
| `ANTHROPIC_API_KEY` | **The live LLM brain.** Without it, intake returns `LOCAL_FALLBACK`/`EXTRACTION_FAILED` and "the Twin understands" cannot be demonstrated. |
| `CONTROL_TOWER_URL` | Exact origin of the deployed Otzar frontend (CORS allowlist). |
| `FOUNDATION_COMMAND_URL` | Secondary allowed origin, if used. |
| `NODE_ENV=production` | Enables production gates; also makes the demo-mode guard active. |
| `ALLOW_DEMO_MODE` | Leave **unset / false** for an honest validation. Set `true` only for a deliberate scripted demo. |

### Otzar (frontend) — baked at build time

| Var | Purpose |
|---|---|
| `VITE_FOUNDATION_API_URL` | The deployed Foundation origin, e.g. `https://api.example.com/api/v1`. |
| `VITE_SHOW_COMING_SOON` | Leave `false` for validation. |

### Org bootstrap (one-time, server-side)

| Var | Purpose |
|---|---|
| `ALLOW_FOUNDER_BOOTSTRAP=true` | Permits `scripts/founder-bootstrap.ts` to run outside localhost. |
| `FOUNDER_BOOTSTRAP_EMAIL` | Founder/admin email (default `sadeil@niovlabs.com`). |
| `FOUNDER_BOOTSTRAP_PASSWORD` | Optional; blank → the script generates and prints a one-time password. |
| `FOUNDER_BOOTSTRAP_ORG_NAME` / `_ORG_DOMAIN` | Org identity (default `NIOV Labs` / `niovlabs.com`). |

> **Do not commit any of these values.** `.env` is gitignored; inject via the
> platform secret store.

---

## 2. Deploy steps

1. **Provision Postgres + Redis** (managed or container).
2. **Deploy Foundation** (`niov-foundation/Dockerfile`):
   - Set all backend env vars above (incl. `ANTHROPIC_API_KEY`,
     `CONTROL_TOWER_URL`, `NODE_ENV=production`).
   - Apply schema: `prisma db push` (Foundation uses push, not migration files).
   - Confirm boot: the server fail-fast boot validation passes (JWT/DB/Redis/
     ENCRYPTION_KEY present).
   - Smoke: `GET /api/v1/health` (or the documented health route) returns OK.
3. **Build + deploy Otzar** (`otzar-control-tower/Dockerfile`):
   - `docker build --build-arg VITE_FOUNDATION_API_URL=https://<foundation-origin>/api/v1 -t otzar-web .`
   - Serve the static bundle; note the public URL.
   - Set `CONTROL_TOWER_URL` on Foundation to **exactly** this URL, then redeploy
     Foundation if needed so CORS admits it.
4. **Verify reachability:** open the Otzar URL; the login page renders, the tab
   title says **Otzar**, and the network tab shows requests going to the deployed
   Foundation origin (not `localhost`).

---

## 3. Org + teammate provisioning (one-time)

1. **Bootstrap the org + founder admin** (server-side, once):
   - `ALLOW_FOUNDER_BOOTSTRAP=true FOUNDER_BOOTSTRAP_EMAIL=<founder> ... npx tsx scripts/founder-bootstrap.ts`
   - **Capture the one-time password** printed to stdout (never written to disk).
2. **Founder logs in** at the Otzar URL with that email + password.
3. **Create the second teammate** via the admin UI:
   - Go to **Users → Invite** (the InviteWizard, 3 steps). Set name, email,
     `is_admin` as appropriate (employee/collaborator → not admin).
   - On confirm, Foundation creates the member entity + mints their AI Twin and
     returns an `activation_credential`.
   - **Capture the `activation_credential`** from the confirmation step
     (currently returned to the admin's browser; not yet emailed — LIVE-6).
4. **Hand the teammate their credential out-of-band** (the manual workaround until
   invite-email lands).

> If the confirmation UI does not surface a copyable credential, that is a LIVE-1C
> follow-up (see `docs/OTZAR_V1_LIVE_1_RUNBOOK.md` updates and the LIVE-1C task).

---

## 4. Two-laptop validation steps

1. **Computer A:** founder logs in. Confirm header reads **Otzar**.
2. **Computer B:** teammate logs in with their credential. Confirm same org.
3. Founder opens **Users** and sees the teammate listed (shared org hierarchy).
4. Founder speaks or types a request (browser voice / ambient bar / chat), e.g.
   *"Ask <teammate> to review this client note and prepare the next action."*
5. Confirm the intake ran the **real LLM path** (see §5), not demo.
6. Founder confirms the drafted teammate work request; it is delivered through
   internal Otzar communication.
7. **Computer B:** the teammate's notification bell / inbox shows the request
   (poll latency up to ~30s).
8. The teammate responds / drafts the next action.
9. If an action needs the founder's authority, an approval request appears for the
   founder; the founder approves.
10. Work ledger / memory / audit update; **both** users can see the final state.

> The deeper scoped-Twin and permissioned-execution proofs are LIVE-2 / LIVE-3.
> LIVE-1 proves only: reachable, branded, honest intake, two real users in one org.

---

## 5. Verifying the REAL (non-demo) intake path

- On the deployed (staging/production) box, `ALLOW_DEMO_MODE` is unset, so:
  - An explicit demo request (`force_mode: "DEMO_SCRIPTED"` or
    `provider: "DEMO_FIXTURE"`) returns **HTTP 422 `DEMO_MODE_NOT_ALLOWED`**.
  - Canonical-fixture text does **not** silently return scripted output; the
    extractor uses the real LLM (or `LOCAL_FALLBACK` if the LLM is misconfigured).
- For an honest demo, **do not** use the `/app/comms` scripted-demo surface; drive
  intake through the real Voice / ambient / chat path.
- If extraction returns `LOCAL_FALLBACK` everywhere, the LLM key is missing or
  wrong — fix `ANTHROPIC_API_KEY` on Foundation.

---

## 6. Verifying both humans can see memory / audit / work state

- **Work:** both users open **My Work**; the founder additionally sees team work
  if manager-scoped. The routed request appears as a work-ledger item.
- **Audit:** **Security & Audit** shows the self-scoped audit events for each
  user's own actions (route, approval, execution).
- **Memory:** **My Memory** shows capsule counts updating as the conversation /
  note is captured (scoped per user; company decisions route to the org wallet).

---

## 7. Known limitations after LIVE-1

- Refresh = re-login (no token persistence by security design).
- No self-serve signup / invite email (admin provisions; credential handed over).
- Tauri desktop app CSP still hardcodes localhost — **use the browser** for v1.
- Connectors (Slack/Google/Zoom/MS365), ElevenLabs TTS, and desktop voice are
  not required for this validation.
- Real-time delivery is ~30s polling, not push.
