#!/usr/bin/env bash
# FILE: otzar-gate-rebind.sh
# PURPOSE: Continuous regression re-bind of master-gate LIVE deep smokes
#          against deployed app.otzar.ai (R-02 discipline).
# REQUIRES: DEMO_SHARED_PASSWORD (or /tmp/demo_pw_val)
# RUN: bash scripts/otzar-gate-rebind.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DEMO_SHARED_PASSWORD:-}" ]]; then
  if [[ -f /tmp/demo_pw_val ]]; then
    export DEMO_SHARED_PASSWORD
    DEMO_SHARED_PASSWORD="$(cat /tmp/demo_pw_val)"
  else
    echo "Set DEMO_SHARED_PASSWORD or place password in /tmp/demo_pw_val" >&2
    exit 1
  fi
fi

export OTZAR_SMOKE_BASE_URL="${OTZAR_SMOKE_BASE_URL:-https://app.otzar.ai}"

SPECS=(
  tests/e2e/otzar-live-meet-residual-n02.spec.ts
  tests/e2e/otzar-live-relay-boundary-t01.spec.ts
  tests/e2e/otzar-live-spatial-d03.spec.ts
  tests/e2e/otzar-live-defect-regression-r02.spec.ts
  tests/e2e/otzar-live-enterprise-pressure-r01.spec.ts
  tests/e2e/otzar-live-cross-tenant-q01.spec.ts
  tests/e2e/otzar-live-multi-org-isolation-i02.spec.ts
  tests/e2e/otzar-live-person-types-e03.spec.ts
  tests/e2e/otzar-live-memory-redaction-h02.spec.ts
)

echo "[gate-rebind] base=$OTZAR_SMOKE_BASE_URL specs=${#SPECS[@]}"
npx playwright test --config=playwright.live.config.ts --retries=0 --workers=1 "${SPECS[@]}"
echo "[gate-rebind] complete"
