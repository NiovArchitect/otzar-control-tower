# OTZAR v1 — Deployment Checklist (to run the LIVE-5 two-computer validation)

> The one remaining v1 step is a **live two-computer run** on a deployed,
> HTTPS-reachable Foundation + Otzar. This checklist is what a human with deploy
> access executes. **Secrets are never committed or pasted in chat** — set them in
> the deployment platform's secret store (or, locally, in the gitignored
> `niov-foundation/.env`). The autonomous agent has **no deploy target / hosting /
> DB / cloud creds**, so it cannot run this; it is documented for you to run.

## 0. Current state
- Foundation `main` (incl. LIVE-1A/2A/4A) · Otzar `main` (incl. LIVE-0…LIVE-5).
- v1 voice provider = **ElevenLabs** (STT Scribe + TTS). The transcribe route is real.

## 1. Foundation deployment requirements
- Container from `niov-foundation/Dockerfile` (Node 22, non-root, healthcheck).
- A reachable **HTTPS** origin, e.g. `https://api.<domain>`.
- A Postgres database (+ Redis). Apply schema with `prisma db push` (Foundation
  uses push, not migration files).
- `NODE_ENV=production` (activates the **demo-mode guard** and the **action
  scheduler** that executes approved work — it is NO-OP in test).

## 2. Otzar deployment requirements
- Static bundle from `otzar-control-tower/Dockerfile`, served over **HTTPS**
  (required for browser Web Speech), e.g. `https://app.<domain>`.
- The API origin is **baked at build time** (a Vite SPA can't read runtime env).

## 3. Required env vars (Foundation, server-side only)
`DATABASE_URL`, `DIRECT_URL` (if pooled), `REDIS_URL`, `JWT_SECRET`,
`ENCRYPTION_KEY` (required in production), `ANTHROPIC_API_KEY`,
`CONTROL_TOWER_URL` (the Otzar origin, for CORS), `FOUNDATION_COMMAND_URL` (if
used), `NODE_ENV=production`, and voice: `VOICE_STT_PROVIDER=elevenlabs`,
`ELEVENLABS_API_KEY`, `ELEVENLABS_STT_MODEL=scribe_v1` (+ `ELEVENLABS_TTS_VOICE_ID`
if you want a specific speak-back voice). Leave `ALLOW_DEMO_MODE` **unset**.

## 4. Required secrets (never in git / never in chat)
`JWT_SECRET`, `ENCRYPTION_KEY`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, DB
credentials. Set them in the host's secret store. **Rotate any key that has been
pasted into a chat.** Locally, the gitignored `niov-foundation/.env` is the proper
location (already holds `ELEVENLABS_API_KEY`; `VOICE_STT_PROVIDER=elevenlabs` and
`ELEVENLABS_STT_MODEL=scribe_v1` are set there).

## 5. Required commands
```
# Foundation (after env + DB are set)
prisma db push
# start the server image (host-specific)

# Otzar build pointing at the deployed Foundation origin
docker build \
  --build-arg VITE_FOUNDATION_API_URL=https://api.<domain>/api/v1 \
  -t otzar-web ./otzar-control-tower
# serve the static bundle over HTTPS (host-specific)

# Provision the two validation users (server-side, once)
DATABASE_URL=<foundation db> \
DEMO_SHARED_PASSWORD=<choose a strong shared password> \
NIOV_APPROVE_DEMO_TEAM_ACCOUNTS="APPROVE FULL DEMO TEAM ACCOUNTS — exact allowlist only" \
npx tsx scripts/provision-demo-team-accounts.ts        # add --dry-run first
```

## 6. Required URLs
- Foundation API: `https://api.<domain>/api/v1`
- Otzar app: `https://app.<domain>`
- Health: confirm the Foundation health route returns OK before proceeding.

## 7. How to set `VITE_FOUNDATION_API_URL`
Build-time **build arg** on the Otzar image (see §5). It is the canonical var the
app reads (`src/lib/api.ts`); it must be the **deployed** Foundation origin, not
localhost.

## 8. How to set `CONTROL_TOWER_URL`
Foundation **server env** = the exact Otzar app origin (`https://app.<domain>`). It
drives the CORS allowlist; a mismatch blocks the browser from calling the API.

## 9. How to configure `ELEVENLABS_API_KEY`
Foundation **server env / secret store** (never the frontend). Locally it lives in
the gitignored `niov-foundation/.env`. With it set, the transcribe route uses
ElevenLabs; without it, the route returns `503 VOICE_STT_PROVIDER_NOT_CONFIGURED`
and typing still works.

## 10. How to configure `ANTHROPIC_API_KEY`
Foundation **server env / secret store**. Without it, intake returns
`LOCAL_FALLBACK`/`EXTRACTION_FAILED` — "the Twin understands" cannot be shown.

## 11. How to provision Sadeil and the teammate
Run `provision-demo-team-accounts.ts` (§5): creates the **NIOV Labs** org +
founder `sadeil@niovlabs.com` (admin) + `david@niovlabs.com` (teammate) with real
memberships + minted Twins, all logging in with the shared `DEMO_SHARED_PASSWORD`.
`--dry-run` first (no creds, mutates nothing).

## 12. How to run the two-computer smoke
Follow `OTZAR_V1_TWO_COMPUTER_SMOKE.md` steps §1–§10 across two computers:
login (both, product says **Otzar**) → My Twin scope → speak/type a request →
governed routing to David → David receives + responds in scope → permissioned
action → escalation → founder approves (no self-approval) → approved work executes
→ both see result + audit. Drive voice in **HTTPS Chrome**; otherwise the
ElevenLabs server path or typing.

## 13. Evidence to capture
For each step: a screenshot of the observed state. Specifically — the **Otzar**
brand (tab + login); the **My Twin "can/cannot do"** panel on both accounts; the
routed item in David's inbox; the **approval card + "View why"**; the executed
work-ledger item; the **Security & Audit** entries (routing + approval) on both
sides; and (if voice) the transcript appearing + routing. Record date/time,
Foundation commit, Otzar commit in the smoke doc's "Live Validation Result".

## 14. What triggers LIVE-6 (blocker-only)
A LIVE-6 fix is allowed **only** for a real failure observed during this live run,
e.g.: frontend can't reach the API (env/CORS); login fails (auth/provisioning);
teammate can't see the work request; notification/thread continuity breaks; Twin
scope panel fails on real data; audit missing for the validated path; approval
blocks incorrectly; voice transcript fails to route; TTS breaks; demo mode leaks;
brand still says "Control Tower" somewhere user-facing; a critical env/runbook gap;
permissions too broad/narrow for the scenario. **No speculative hardening, no new
features, no polish.**

---

### What Sadeil must provide next (the only blockers to a live run)
1. A **deploy target** (host for Foundation + Otzar over HTTPS) + a **Postgres**
   (and Redis).
2. The **secrets** in that host: `JWT_SECRET`, `ENCRYPTION_KEY`,
   `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY` (rotated), DB creds.
3. The two **app/api URLs** (so `VITE_FOUNDATION_API_URL` + `CONTROL_TOWER_URL` can
   be set).

Provide those (or run the commands above) and the two-computer validation can be
executed and its pass/fail recorded — with LIVE-6 reserved for any real blocker found.
