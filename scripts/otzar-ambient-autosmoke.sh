#!/usr/bin/env bash
# FILE: otzar-ambient-autosmoke.sh
# PURPOSE: Ambient prove loop for app.otzar.ai after main lands.
#
# Contract (founder / Render):
#   1. Merge to main → GitHub CI (verify) must pass
#   2. Render Auto-Deploy starts AFTER CI is green (On Commit + lag is normal)
#   3. Live bundle fingerprint flips → run first-use Playwright smokes
#
# Default path does NOT force-trigger deploys. Optional --deploy is only for
# when Auto-Deploy is stuck (stale GitHub surface); prefer waiting for lag.
#
# Usage:
#   DEMO_SHARED_PASSWORD=… bash scripts/otzar-ambient-autosmoke.sh
#   bash scripts/otzar-ambient-autosmoke.sh --wait-ci          # wait main CI green first
#   bash scripts/otzar-ambient-autosmoke.sh --markers 'foo,bar'
#   bash scripts/otzar-ambient-autosmoke.sh --timeout-sec 900  # Render lag budget
#   bash scripts/otzar-ambient-autosmoke.sh --deploy           # emergency force only
set -euo pipefail
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin:${PATH:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DO_DEPLOY=0
WAIT_CI=0
# Default: generous — CI (~5m) + Render build lag is common.
MARKERS="${OTZAR_SMOKE_MARKERS:-people-structure-glance,100dvh,employee-shell-header,project-context-pulse}"
TIMEOUT_SEC="${OTZAR_SMOKE_TIMEOUT_SEC:-900}"
BASE="${OTZAR_SMOKE_BASE_URL:-https://app.otzar.ai}"
POLL_SEC="${OTZAR_SMOKE_POLL_SEC:-25}"

for arg in "$@"; do
  case "$arg" in
    --deploy) DO_DEPLOY=1 ;;
    --wait-ci) WAIT_CI=1 ;;
    --markers=*) MARKERS="${arg#--markers=}" ;;
    --timeout-sec=*) TIMEOUT_SEC="${arg#--timeout-sec=}" ;;
    --poll-sec=*) POLL_SEC="${arg#--poll-sec=}" ;;
  esac
done

# Password bootstrap (never print)
if [[ -z "${DEMO_SHARED_PASSWORD:-}" ]]; then
  if [[ -f /tmp/demo_pw_val ]]; then
    export DEMO_SHARED_PASSWORD="$(tr -d '\n' </tmp/demo_pw_val)"
  else
    BOOTSTRAP="${NIOV_BOOTSTRAP_SECRETS:-$HOME/dev/NIOV Labs/secure/bootstrap/.niov-bootstrap-secrets}"
    if [[ -f "$BOOTSTRAP" ]]; then
      export DEMO_SHARED_PASSWORD="$(python3 - <<PY
from pathlib import Path
lines=Path(r"""$BOOTSTRAP""").read_text(errors="ignore").splitlines()
for i,l in enumerate(lines):
  if "sadeil@niovlabs.com" in l and i+1 < len(lines):
    print(lines[i+1].strip()); break
PY
)"
    fi
  fi
fi

git fetch origin main -q 2>/dev/null || true
MAIN_SHA="$(git rev-parse --short origin/main 2>/dev/null || echo unknown)"
echo "[autosmoke] origin/main=$MAIN_SHA base=$BASE"
echo "[autosmoke] markers=$MARKERS timeout=${TIMEOUT_SEC}s (Render lag after CI is expected)"

if [[ "$WAIT_CI" == "1" ]] && command -v gh >/dev/null 2>&1; then
  echo "[autosmoke] waiting for latest main CI (verify) to be green…"
  # Latest workflow run on main — poll until completed success or budget slice
  ci_deadline=$(( $(date +%s) + 600 ))
  while [[ $(date +%s) -lt $ci_deadline ]]; do
    # conclusion empty while in progress
    line="$(gh run list --branch main --limit 1 --json databaseId,conclusion,status,displayTitle,headSha \
      --jq '.[0] | "\(.status)|\(.conclusion // "")|\(.headSha[0:7])|\(.displayTitle)"' 2>/dev/null || echo "")"
    status="${line%%|*}"
    rest="${line#*|}"
    conclusion="${rest%%|*}"
    rest2="${rest#*|}"
    sha7="${rest2%%|*}"
    title="${rest2#*|}"
    echo "[autosmoke] CI status=$status conclusion=${conclusion:-…} sha=$sha7 $title"
    if [[ "$status" == "completed" && "$conclusion" == "success" ]]; then
      echo "[autosmoke] CI green — Render Auto-Deploy may still lag minutes"
      break
    fi
    if [[ "$status" == "completed" && "$conclusion" != "success" && -n "$conclusion" ]]; then
      echo "[autosmoke] CI not green ($conclusion) — live may stay on prior bundle"
      break
    fi
    sleep 15
  done
fi

# Emergency only — default is wait for Auto-Deploy after CI
if [[ "$DO_DEPLOY" == "1" ]]; then
  echo "[autosmoke] --deploy: force trigger (use only when Auto-Deploy is stuck)"
  bash "$ROOT/scripts/otzar-render-deploy.sh" || {
    echo "[autosmoke] force trigger failed — continuing to poll live"
  }
fi

IFS=',' read -r -a MARKER_ARR <<<"$MARKERS"
echo "[autosmoke] polling live for markers (lag-tolerant)…"

deadline=$(( $(date +%s) + TIMEOUT_SEC ))
deployed=0
last_js=""
while [[ $(date +%s) -lt $deadline ]]; do
  HTML=$(curl -sS "${BASE}/?cb=$(date +%s)" -H "Cache-Control: no-cache" -H "Pragma: no-cache" || true)
  JS=$(printf '%s' "$HTML" | python3 -c 'import re,sys; m=re.findall(r"/assets/index-[A-Za-z0-9_-]+\.js", sys.stdin.read()); print(m[0] if m else "")')
  LM=$(curl -sI "${BASE}/?cb=$(date +%s)" 2>/dev/null | grep -i last-modified | tr -d '\r' || true)
  if [[ -n "$JS" ]]; then
    curl -sS "${BASE}${JS}" -o /tmp/otzar-live-index.js || true
    missing=0
    miss_list=()
    for m in "${MARKER_ARR[@]}"; do
      m="$(echo "$m" | xargs)"
      [[ -z "$m" ]] && continue
      if ! grep -qF "$m" /tmp/otzar-live-index.js 2>/dev/null; then
        missing=1
        miss_list+=("$m")
      fi
    done
    if [[ "$missing" == "0" ]]; then
      echo "[autosmoke] LIVE READY $LM bundle=$JS"
      deployed=1
      break
    fi
    if [[ "$JS" != "$last_js" ]]; then
      echo "[autosmoke] new bundle seen but markers incomplete: missing=${miss_list[*]} $LM $JS"
      last_js="$JS"
    else
      echo "[autosmoke] waiting (Render lag)… $LM $JS missing=${miss_list[*]} $(date -u +%H:%M:%S)"
    fi
  else
    echo "[autosmoke] waiting… no bundle yet $(date -u +%H:%M:%S)"
  fi
  sleep "$POLL_SEC"
done

if [[ "$deployed" != "1" ]]; then
  echo "[autosmoke] TIMEOUT after ${TIMEOUT_SEC}s — live still missing markers."
  echo "  origin/main=$MAIN_SHA — if CI is green, Render may still be building;"
  echo "  re-run later or check otzar-app Events. Force only if stuck: --deploy"
  exit 3
fi

if [[ -z "${DEMO_SHARED_PASSWORD:-}" ]]; then
  echo "[autosmoke] DEMO_SHARED_PASSWORD unset — fingerprint only (PASS)"
  exit 0
fi

echo "[autosmoke] running first-use live smokes…"
SPECS=(
  tests/e2e/otzar-live-viewport-chrome.spec.ts
  tests/e2e/otzar-live-project-context.spec.ts
  tests/e2e/otzar-live-people-structure.spec.ts
)
for extra in tests/e2e/otzar-live-tools-reconnect.spec.ts tests/e2e/otzar-live-first-use-role.spec.ts; do
  [[ -f "$extra" ]] && SPECS+=("$extra")
done

npx playwright test --config=playwright.live.config.ts "${SPECS[@]}"
echo "[autosmoke] done"
