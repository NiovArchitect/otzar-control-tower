# Render deploy notes — `otzar-app` (app.otzar.ai)

> Written after the 2026-06-29 deploy saga so it cannot recur.

## Services (do not confuse them)
- **Frontend** — Render **Static Site `otzar-app`**, ID `srv-d8t1qpj7uimc73db2il0`,
  repo `NiovArchitect/otzar-control-tower`, branch `main`, build `npm ci && npm run build`,
  publish dir `./dist`, custom domain **app.otzar.ai** (CNAME → `otzar-app.onrender.com`).
- **Backend** — Render **Web Service `otzar-api`**, ID `srv-d8t17sm7r5hc73ed5h6g`,
  repo `NiovArchitect/niov-foundation`, branch `main`, domain **api.otzar.ai**.
- **Redis** — Render Key Value `otzar-redis`. Do not touch when deploying app code.

## What went wrong (root cause)
`otzar-app` stayed **live on an old commit** (`c3d13b3`, bundle `index-VAIPRndE.js`) and
repeated "Deploy latest commit" kept rebuilding the *same* old commit — its **GitHub
connection was not surfacing new `main` commits**. It was NOT a build cache, NOT Cloudflare,
NOT a duplicate service, NOT the backend. Pushing a fresh commit (`de1e103`) forced Render to
see a new latest commit; deploying it published the new bundle (`index-BEABBrBB.js`).

## Branch-verification workflow (founder directive, 2026-07-01)

Render Auto-Deploy is **"On Commit"** — it deploys when a new commit reaches the
branch the service watches. A local commit deploys nothing; a feature-branch
commit deploys nothing until merged into the watched branch. PR creation does
NOT deploy production (no preview environments configured). Before claiming any
deploy, verify in order:

1. Confirm which branch each Render service watches (`otzar-app` → CT `main`;
   `otzar-api` → Foundation `main`).
2. Confirm the final commit is actually ON that branch at `origin` —
   `git fetch && git log --oneline -1 origin/main` must show the expected SHA.
3. After a PR merge into the watched branch, verify: `origin/main` contains the
   expected SHA → Render Events shows a deploy for that commit → the deploy
   succeeded → live health/product checks pass (bundle-hash flip for the static
   site; a new-route/behavior probe for the API).
4. If the commit is only local or only on a feature branch, report exactly:
   "Not deployed yet. Commit has not reached the Render deploy branch."
5. Never claim Render deployed from a local commit.

Every deploy report must state: local branch · origin branch · latest commit
SHA · the Render deploy branch · whether the expected SHA is on that branch ·
whether Render deployed that SHA.

## How to deploy + verify (reliable procedure)
1. Merge to `main` (CI green). Confirm `git rev-parse --short origin/main`.
2. With **Auto-Deploy = Yes** on the service, Render should start a deploy for
   that commit automatically. Confirm Events → Deploy shows the expected SHA.
3. If no deploy appears within ~2 minutes, GitHub connection is stale (see
   Hardening) — reconnect the repo, then Manual Deploy → **Deploy a specific
   commit** → the exact SHA (not an ambiguous "latest").
4. Verify from the shell (Render builds its OWN hash — do NOT wait for the local build's hash):
   ```sh
   curl -s "https://app.otzar.ai/?cb=$(date +%s)" | grep -oE 'index-[A-Za-z0-9_-]+\.js'   # must change
   B=$(curl -s "https://app.otzar.ai/assets/<newhash>.js"); for s in recipient-trust "Future auto-send" "Review recipient"; do echo "$s: $(printf '%s' "$B" | grep -c -F "$s")"; done
   ```
   The origin `last-modified` header must advance to the new deploy time.

## Auto-Deploy contract (2026-07-16)

Both blueprints ship with `autoDeploy: true` on the `main` branch:

| Service | Repo | Domain | Blueprint |
| --- | --- | --- | --- |
| `otzar-app` | otzar-control-tower | app.otzar.ai | `otzar-control-tower/render.yaml` |
| `otzar-api` | niov-foundation | api.otzar.ai | `niov-foundation/render.yaml` |

**Blueprint alone does not flip an existing service.** After merging the yaml
change, either re-apply the Blueprint or set each live service:

Settings → Build & Deploy → **Auto-Deploy = Yes** (On Commit) · Branch = `main`.

CI still gates merges (branch protection / required checks). Auto-deploy ships
only commits that already landed on `main`.

## Hardening (prevent recurrence)
- **Keep Auto-Deploy On** on `otzar-app` and `otzar-api` so `main` merges deploy
  without a manual nudge.
- If "latest commit" ever lags `origin/main`, **disconnect & reconnect the GitHub repo** on the
  static site (Settings → Build & Deploy), which refreshes the connection.
- **Remove any stale/duplicate Static Site** bound to (or competing for) `app.otzar.ai`. As of
  2026-06-29 the evidence showed only ONE service serving the domain; if a second `otzar-app-*`
  exists with no domain, archive it so the domain can never be re-bound to the wrong service.
- **Refresh `RENDER_API_KEY`** (it was 401 during the saga) so deploys can be verified/triggered
  via the API: `curl -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/services`.
  Needs a key with read+deploy scope on these services.

## Incident log — 2026-07-18 (acceptance gate / #171)

| Fact | Value |
|------|-------|
| CT `origin/main` | `a5c526d` — Login CTA **Sign in** (#171, merged 18:36Z, CI green 18:40Z) |
| Prior live | Phase F wave-2 bundle `index-4BPnPgW8.js` / CSS `index-DzNUeESq.css`, last-modified **18:22:57Z** |
| Live button string | still **Continue** (pre-#171) while heading already said Sign in |
| `RENDER_API_KEY` | **401 Unauthorized** — cannot list services or `POST …/deploys` |
| Service IDs | `otzar-app` `srv-d8t1qpj7uimc73db2il0` · `otzar-api` `srv-d8t17sm7r5hc73ed5h6g` |
| Why lag matters | Investor e2e clicks `button /sign in/i` and times out on Continue |
| Repair | Fresh commit on `main` to re-signal Auto-Deploy (same class of fix as 2026-06-29 stale GitHub surface). Operator must rotate Render API key for observability. |

**Acceptance rule:** do not claim #171 live until HTML last-modified advances and live JS contains `Signing in…":"Sign in"` (not `Continue`) as the login submit label.

## Incident log — 2026-07-20 (viewport chrome / #175)

| Fact | Value |
|------|-------|
| CT `origin/main` | `e3df5ae` — Pin Otzar chrome in view + project mission heart (#175) |
| Nudge | `135ae35` empty chore commit to re-signal Auto-Deploy |
| Prior live | last-modified **04:35:34Z**, viewport meta without `viewport-fit=cover`, bundle without `100dvh` / `employee-shell-header` |
| `RENDER_API_KEY` | **401 Unauthorized** — still cannot list services or `POST …/deploys` (`srv-d8t1qpj7uimc73db2il0`) |
| Why lag matters | Product bug is chrome **outside visual viewport** (Otzar / Work OS / Talk / notif count). Cannot prove fixed until new static bundle ships. |
| Repair | Fresh content commit on `main` + operator: rotate Render API key, Manual Deploy **specific commit** `e3df5ae` or later if Auto-Deploy still silent. Reconnect GitHub if latest commit lags. |

**Acceptance rule:** do not claim #175 live until HTML includes `viewport-fit=cover` and live JS contains `100dvh` + `employee-shell-header` / `project-context-pulse`.

## Auto-Deploy lag model (2026-07-20)

Render **auto-deploys after CI checks pass** on the watched branch (`main`). There is
often multi-minute lag between:

1. `origin/main` SHA advances  
2. GitHub Actions `verify` completes green  
3. Render Events starts a deploy  
4. `app.otzar.ai` `last-modified` + bundle hash flip  

**Operator / agent procedure:**

| Step | Action |
|------|--------|
| 1 | Merge PR; confirm `git rev-parse --short origin/main` |
| 2 | Wait for main CI green (`gh run list --branch main`) |
| 3 | Poll live fingerprints — **do not force-deploy yet** |
| 4 | Run `bash scripts/otzar-ambient-autosmoke.sh --wait-ci` (default timeout 15m) |
| 5 | Only if still stale after CI green + ~10–15m: reconnect GitHub or `bash scripts/otzar-render-deploy.sh` (emergency) |

Force deploy is the exception, not the default path.
