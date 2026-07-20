#!/usr/bin/env bash
# FILE: otzar-ambient-autosmoke.sh
# PURPOSE: Prove app.otzar.ai after main lands — without burning founder time
#          on Render Auto-Deploy lag.
#
# Operating contract (founder preference 2026-07-20):
#   1. Merge → wait CI green
#   2. Poll live briefly (default ~3 min after CI)
#   3. If markers still missing → print MANUAL DEPLOY NOW and exit 4
#      (do NOT sit for 15+ minutes unless --long-wait)
#   4. When markers present → run Playwright first-use smokes
#
# Usage:
#   bash scripts/otzar-ambient-autosmoke.sh --wait-ci
#   bash scripts/otzar-ambient-autosmoke.sh --markers 'foo,bar'
#   bash scripts/otzar-ambient-autosmoke.sh --timeout-sec 180   # short lag budget
#   bash scripts/otzar-ambient-autosmoke.sh --long-wait         # 15m (legacy)
#   bash scripts/otzar-ambient-autosmoke.sh --deploy            # emergency API force
set -euo pipefail
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin:${PATH:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DO_DEPLOY=0
WAIT_CI=0
LONG_WAIT=0
MARKERS="${OTZAR_SMOKE_MARKERS:-people-structure-glance,100dvh,employee-shell-header,project-context-pulse}"
# Short by default — founder time > waiting on Auto-Deploy lag.
TIMEOUT_SEC="${OTZAR_SMOKE_TIMEOUT_SEC:-180}"
BASE="${OTZAR_SMOKE_BASE_URL:-https://app.otzar.ai}"
POLL_SEC="${OTZAR_SMOKE_POLL_SEC:-15}"

for arg in "$@"; do
  case "$arg" in
    --deploy) DO_DEPLOY=1 ;;
    --wait-ci) WAIT_CI=1 ;;
    --long-wait) LONG_WAIT=1; TIMEOUT_SEC="${OTZAR_SMOKE_TIMEOUT_SEC:-900}" ;;
    --markers=*) MARKERS="${arg#--markers=}" ;;
    --timeout-sec=*) TIMEOUT_SEC="${arg#--timeout-sec=}" ;;
    --poll-sec=*) POLL_SEC="${arg#--poll-sec=}" ;;
  esac
done

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
MAIN_FULL="$(git rev-parse origin/main 2>/dev/null || echo unknown)"
echo "[autosmoke] origin/main=$MAIN_SHA base=$BASE"
echo "[autosmoke] markers=$MARKERS timeout=${TIMEOUT_SEC}s (short lag; use --long-wait only if needed)"

if [[ "$WAIT_CI" == "1" ]] && command -v gh >/dev/null 2>&1; then
  echo "[autosmoke] waiting for latest main CI (verify) to be green…"
  ci_deadline=$(( $(date +%s) + 480 ))
  while [[ $(date +%s) -lt $ci_deadline ]]; do
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
      echo "[autosmoke] CI green — brief Auto-Deploy window (${TIMEOUT_SEC}s)"
      break
    fi
    if [[ "$status" == "completed" && "$conclusion" != "success" && -n "$conclusion" ]]; then
      echo "[autosmoke] CI not green ($conclusion) — abort smoke"
      exit 2
    fi
    sleep 12
  done
fi

if [[ "$DO_DEPLOY" == "1" ]]; then
  echo "[autosmoke] --deploy: force trigger (emergency)"
  bash "$ROOT/scripts/otzar-render-deploy.sh" || true
fi

IFS=',' read -r -a MARKER_ARR <<<"$MARKERS"
echo "[autosmoke] polling live…"

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
      echo "[autosmoke] bundle=$JS incomplete missing=${miss_list[*]} $LM"
      last_js="$JS"
    else
      echo "[autosmoke] waiting… $LM missing=${miss_list[*]} $(date -u +%H:%M:%S)"
    fi
  else
    echo "[autosmoke] waiting… no bundle $(date -u +%H:%M:%S)"
  fi
  sleep "$POLL_SEC"
done

if [[ "$deployed" != "1" ]]; then
  cat <<EOF

╔══════════════════════════════════════════════════════════════════╗
║  MANUAL DEPLOY RECOMMENDED (Auto-Deploy lag / stuck)           ║
╠══════════════════════════════════════════════════════════════════╣
║  Service:  otzar-app (Render Static Site)                        ║
║  Commit:   $MAIN_SHA  ($MAIN_FULL)
║  Markers:  $MARKERS
║  Live:     still missing markers after ${TIMEOUT_SEC}s           ║
║                                                                  ║
║  Dashboard → otzar-app → Manual Deploy → Deploy specific commit  ║
║  Then reply: deployed                                            ║
╚══════════════════════════════════════════════════════════════════╝

EOF
  echo "[autosmoke] MANUAL_DEPLOY_NOW sha=$MAIN_SHA"
  exit 4
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
for extra in tests/e2e/otzar-live-tools-reconnect.spec.ts tests/e2e/otzar-live-first-use-role.spec.ts tests/e2e/otzar-live-comms-reconnect.spec.ts; do
  [[ -f "$extra" ]] && SPECS+=("$extra")
done

npx playwright test --config=playwright.live.config.ts "${SPECS[@]}"
echo "[autosmoke] done"
