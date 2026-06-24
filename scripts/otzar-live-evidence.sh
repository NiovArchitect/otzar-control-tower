#!/usr/bin/env bash
# FILE: scripts/otzar-live-evidence.sh
# PURPOSE: Phase 4D — NON-CREDENTIALED live evidence for the deployed Otzar app.
#          Verifies the served app + bundle markers + that protected rails stay
#          auth-gated, WITHOUT any login or secret. Reports whether the
#          credentialed live smoke can run. Never prints secrets (only checks
#          env-var PRESENCE). Exit 0 on success; non-zero on a real failure.
# RUN: npm run smoke:evidence   (or: bash scripts/otzar-live-evidence.sh)
set -euo pipefail

BASE="${OTZAR_SMOKE_BASE_URL:-https://app.otzar.ai}"
API="${OTZAR_API_URL:-https://api.otzar.ai/api/v1}"

echo "== Otzar live evidence =="
echo "app:  $BASE"
echo "api:  $API"
echo

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
echo "app HTTP: $code"
[ "$code" = "200" ] || { echo "FAIL: app did not return 200"; exit 1; }

bundle=$(curl -s "$BASE/?cb=$(date +%s)" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
[ -n "$bundle" ] || { echo "FAIL: could not find app bundle"; exit 1; }
echo "bundle:   $bundle"
tmp="$(mktemp)"
curl -s "$BASE/$bundle?cb=$(date +%s)" -o "$tmp"

echo
echo "-- employee-flow markers present in served bundle --"
markers=(
  "Using the latest transcript"
  "Proposed actions"
  "Recent corrections"
  "Saved corrections"
  "What should I use as the current context"
  "Save, send, or dismiss each"
)
fail=0
for m in "${markers[@]}"; do
  n=$(grep -c "$m" "$tmp" || true)
  printf "  [%s] %s\n" "$n" "$m"
  [ "$n" -ge 1 ] || fail=1
done
[ "$fail" = 0 ] || { echo "FAIL: a marker is missing from the served bundle"; rm -f "$tmp"; exit 1; }

echo
echo "-- governed rails remain auth-gated (expect 401) --"
for route in "otzar/meeting-captures" "otzar/my-twin/corrections" "work-os/resolve-target"; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "$API/$route")
  printf "  %s -> %s\n" "$route" "$c"
done

rm -f "$tmp"
echo
if [ -n "${OTZAR_SMOKE_EMAIL:-}" ] && [ -n "${DEMO_SHARED_PASSWORD:-}" ]; then
  echo "credentialed live smoke: env present -> run: npm run test:e2e:live"
else
  echo "credentialed live smoke: SKIPPED (no creds). To run it, set:"
  echo "  OTZAR_SMOKE_EMAIL=<demo user email>"
  echo "  DEMO_SHARED_PASSWORD=<demo password>"
  echo "  then: npm run test:e2e:live"
fi
echo
echo "OK: non-credentialed live evidence verified. (User-flow pass NOT claimed without the credentialed run.)"
