#!/usr/bin/env bash
# FILE: otzar-clear-lockout.sh
# PURPOSE: Recover sole-admin 5-strike lockout on production (otzar-postgres).
#          When the only org admin is SUSPENDED after failed logins, they cannot
#          clear it via Control Tower. This uses Render connection-info + SQL.
#
# Usage:
#   bash scripts/otzar-clear-lockout.sh sadeil@niovlabs.com
#   RENDER_API_KEY=… bash scripts/otzar-clear-lockout.sh someone@org.com
#
# Requires: RENDER_API_KEY (or bootstrap secrets), psql, network to Render PG.
set -euo pipefail
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin:${PATH:-}"

EMAIL="${1:-}"
if [[ -z "$EMAIL" || "$EMAIL" != *"@"* ]]; then
  echo "Usage: $0 <email>"
  exit 2
fi

BOOTSTRAP="${NIOV_BOOTSTRAP_SECRETS:-$HOME/dev/NIOV Labs/secure/bootstrap/.niov-bootstrap-secrets}"
PG_ID="${RENDER_OTZAR_PG_ID:-dpg-d9chaemcjfls73dei7ug-a}"

if [[ -z "${RENDER_API_KEY:-}" && -f "$BOOTSTRAP" ]]; then
  export RENDER_API_KEY="$(python3 - <<PY
from pathlib import Path
lines=Path(r"""$BOOTSTRAP""").read_text(errors="ignore").splitlines()
for i,l in enumerate(lines):
  if l.strip()=="RENDER_API_KEY:" and i+1 < len(lines):
    print(lines[i+1].strip()); break
  if l.startswith("RENDER_API_KEY="):
    print(l.split("=",1)[1].strip().strip('"').strip("'")); break
PY
)"
fi

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "RENDER_API_KEY required (or bootstrap secrets with RENDER_API_KEY:)."
  exit 2
fi

export DATABASE_URL="$(curl -sS -H "Authorization: Bearer ${RENDER_API_KEY}" \
  "https://api.render.com/v1/postgres/${PG_ID}/connection-info" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["externalConnectionString"])')"
export EMAIL

echo "[clear-lockout] target=$EMAIL (status check + unlock if SUSPENDED)"

python3 - <<'PY'
import os, subprocess
from urllib.parse import urlparse

email = os.environ["EMAIL"]
url = os.environ["DATABASE_URL"]
u = urlparse(url)
env = os.environ.copy()
env["PGPASSWORD"] = u.password or ""
base = [
  "psql", "-h", u.hostname, "-p", str(u.port or 5432),
  "-U", u.username or "otzar", "-d", (u.path or "/otzar").lstrip("/"),
  "-v", "ON_ERROR_STOP=1", "-t", "-A", "-F", "|",
]

def q(sql: str) -> str:
  r = subprocess.run(base + ["-c", sql], capture_output=True, text=True, env=env)
  if r.returncode != 0:
    raise SystemExit(r.stderr[:800] or r.stdout[:800])
  return r.stdout.strip()

before = q(
  f"SELECT status, failed_auth_attempts FROM entities WHERE email = '{email.replace(chr(39), chr(39)+chr(39))}'"
)
print("[clear-lockout] before:", before or "(not found)")
if not before:
  raise SystemExit(1)
if before.startswith("ACTIVE|"):
  print("[clear-lockout] already ACTIVE — nothing to do")
  raise SystemExit(0)

out = q(
  f"""UPDATE entities
SET status = 'ACTIVE', failed_auth_attempts = 0, suspended_at = NULL
WHERE email = '{email.replace(chr(39), chr(39)+chr(39))}' AND status = 'SUSPENDED'
RETURNING status, failed_auth_attempts;"""
)
print("[clear-lockout] unlock:", out or "(no row updated — not SUSPENDED?)")
after = q(
  f"SELECT status, failed_auth_attempts FROM entities WHERE email = '{email.replace(chr(39), chr(39)+chr(39))}'"
)
print("[clear-lockout] after:", after)
if not after.startswith("ACTIVE|"):
  raise SystemExit(1)
print("[clear-lockout] OK — try sign-in again (do not spray wrong passwords).")
PY
