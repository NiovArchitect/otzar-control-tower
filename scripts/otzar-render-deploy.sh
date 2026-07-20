#!/usr/bin/env bash
# FILE: otzar-render-deploy.sh
# PURPOSE: Emergency force-trigger for Render when Auto-Deploy is stuck.
#
# Normal path: merge → CI green → Render Auto-Deploy (On Commit) with lag.
# Do NOT use this after every merge. Prefer scripts/otzar-ambient-autosmoke.sh
# which waits for CI + live fingerprint. Use this only when live stays on an
# old last-modified long after main CI is green (stale GitHub connection).
#
# Prefer RENDER_DEPLOY_HOOK_* when set; else RENDER_API_KEY deploy API.
# Loads key from NIOV bootstrap secrets if env is empty/stale.
#
# Usage:
#   bash scripts/otzar-render-deploy.sh              # otzar-app only
#   bash scripts/otzar-render-deploy.sh --api        # also otzar-api
#   bash scripts/otzar-render-deploy.sh --clear-cache
#
# Service IDs (docs/RENDER_DEPLOY_NOTES.md):
#   otzar-app  srv-d8t1qpj7uimc73db2il0
#   otzar-api  srv-d8t17sm7r5hc73ed5h6g
set -euo pipefail
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin:${PATH:-}"

APP_ID="${RENDER_OTZAR_APP_ID:-srv-d8t1qpj7uimc73db2il0}"
API_ID="${RENDER_OTZAR_API_ID:-srv-d8t17sm7r5hc73ed5h6g}"
DO_API=0
CLEAR_CACHE="do_not_clear"
for arg in "$@"; do
  case "$arg" in
    --api) DO_API=1 ;;
    --clear-cache) CLEAR_CACHE="clear" ;;
  esac
done

BOOTSTRAP="${NIOV_BOOTSTRAP_SECRETS:-$HOME/dev/NIOV Labs/secure/bootstrap/.niov-bootstrap-secrets}"

load_key_from_bootstrap() {
  if [[ ! -f "$BOOTSTRAP" ]]; then return 1; fi
  python3 - <<'PY'
from pathlib import Path
import os
p = Path(os.environ.get("BOOTSTRAP_PATH", ""))
if not p.is_file():
  raise SystemExit(1)
lines = p.read_text(errors="ignore").splitlines()
for i, line in enumerate(lines):
  if line.strip() == "RENDER_API_KEY:" and i + 1 < len(lines):
    print(lines[i + 1].strip())
    raise SystemExit(0)
  if line.startswith("RENDER_API_KEY="):
    print(line.split("=", 1)[1].strip().strip('"').strip("'"))
    raise SystemExit(0)
raise SystemExit(1)
PY
}

# Resolve API key
if [[ -z "${RENDER_API_KEY:-}" ]]; then
  export BOOTSTRAP_PATH="$BOOTSTRAP"
  if KEY=$(load_key_from_bootstrap 2>/dev/null); then
    export RENDER_API_KEY="$KEY"
  fi
fi

# If key looks set but is unauthorized, try bootstrap override
probe_key() {
  local code
  code=$(curl -sS -o /tmp/render-probe.json -w "%{http_code}" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Accept: application/json" \
    "https://api.render.com/v1/services/${APP_ID}" || echo "000")
  echo "$code"
}

if [[ -n "${RENDER_API_KEY:-}" ]]; then
  CODE=$(probe_key)
  if [[ "$CODE" != "200" ]]; then
    echo "[render-deploy] env RENDER_API_KEY HTTP $CODE — trying bootstrap secrets"
    export BOOTSTRAP_PATH="$BOOTSTRAP"
    if KEY=$(load_key_from_bootstrap 2>/dev/null); then
      export RENDER_API_KEY="$KEY"
      CODE=$(probe_key)
    fi
  fi
else
  CODE="000"
fi

trigger_via_hook() {
  local url=$1 name=$2
  echo "[render-deploy] hook → $name"
  local code
  code=$(curl -sS -o /tmp/render-hook.json -w "%{http_code}" -X POST "$url" || echo "000")
  echo "  HTTP $code"
  [[ "$code" == "200" || "$code" == "201" || "$code" == "202" ]]
}

trigger_via_api() {
  local sid=$1 name=$2
  echo "[render-deploy] API → $name ($sid)"
  local body code
  body=$(curl -sS -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    "https://api.render.com/v1/services/${sid}/deploys" \
    -d "{\"clearCache\":\"${CLEAR_CACHE}\"}")
  code=$(echo "$body" | tail -1)
  echo "  HTTP $code"
  echo "$body" | sed '$d' | python3 -c '
import json,sys
try:
  d=json.load(sys.stdin)
  dep=d.get("deploy") or d
  print("  deploy_id=", dep.get("id"), "status=", dep.get("status"), "commit=", (dep.get("commit") or {}).get("id","")[:8] if isinstance(dep.get("commit"), dict) else dep.get("commitId","")[:12])
except Exception:
  print("  body=", sys.stdin.read()[:200] if False else open("/dev/stdin").read()[:200] if False else "")
' 2>/dev/null || true
  [[ "$code" == "200" || "$code" == "201" || "$code" == "202" ]]
}

ok=0
# App
if [[ -n "${RENDER_DEPLOY_HOOK_OTZAR_APP:-}" ]]; then
  trigger_via_hook "$RENDER_DEPLOY_HOOK_OTZAR_APP" "otzar-app" && ok=1 || true
elif [[ -n "${RENDER_API_KEY:-}" && "${CODE:-000}" == "200" ]]; then
  trigger_via_api "$APP_ID" "otzar-app" && ok=1 || true
else
  echo "[render-deploy] FAIL: no working RENDER_API_KEY and no RENDER_DEPLOY_HOOK_OTZAR_APP"
  echo "  Fix: rotate key at https://dashboard.render.com/u/settings#api-keys"
  echo "  or set RENDER_DEPLOY_HOOK_OTZAR_APP from Static Site → Settings → Deploy Hook"
  exit 2
fi

# API optional
if [[ "$DO_API" == "1" ]]; then
  if [[ -n "${RENDER_DEPLOY_HOOK_OTZAR_API:-}" ]]; then
    trigger_via_hook "$RENDER_DEPLOY_HOOK_OTZAR_API" "otzar-api" || true
  elif [[ -n "${RENDER_API_KEY:-}" ]]; then
    trigger_via_api "$API_ID" "otzar-api" || true
  fi
fi

if [[ "$ok" != "1" ]]; then
  echo "[render-deploy] otzar-app deploy trigger failed"
  exit 1
fi
echo "[render-deploy] triggered — poll live with otzar-ambient-autosmoke.sh"
exit 0
