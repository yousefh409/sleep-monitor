#!/usr/bin/env bash
# Dumps the Railway Postgres to a timestamped .sql file under data/backups/.
# Usage:
#   ./scripts/backup-db.sh          # full pg_dump (schema + data)
#   ./scripts/backup-db.sh data     # data-only (smaller)
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p data/backups

# Get the public TCP proxy URL for the Postgres service.
# (DATABASE_URL we use in the Railway app uses .railway.internal which is
# only reachable from Railway-side; for external dumps we need the public proxy.)
set -a; source .env; set +a

PG_SVC=679f495a-0372-494c-8f7f-f454b54d8982
ENV_ID=0f46cecb-eaa1-4ad0-a2f6-eb403de62cec

PUBLIC_HOST=$(curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" -H "Content-Type: application/json" \
  -d "{\"query\":\"{ variables(projectId:\\\"69c5fd28-b01e-4fa2-bce2-cd2f722124e9\\\", environmentId:\\\"$ENV_ID\\\", serviceId:\\\"$PG_SVC\\\") }\"}" \
  | python3 -c "import sys, json; v=json.load(sys.stdin)['data']['variables']; print(v.get('RAILWAY_TCP_PROXY_DOMAIN',''), v.get('RAILWAY_TCP_PROXY_PORT',''))")

HOST=${PUBLIC_HOST% *}
PORT=${PUBLIC_HOST##* }

if [[ -z "$HOST" || -z "$PORT" ]]; then
  echo "ERROR: Could not resolve Postgres public proxy. You may need to enable TCP proxy on the Postgres service in Railway dashboard." >&2
  exit 1
fi

PG_PASSWORD=$(curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" -H "Content-Type: application/json" \
  -d "{\"query\":\"{ variables(projectId:\\\"69c5fd28-b01e-4fa2-bce2-cd2f722124e9\\\", environmentId:\\\"$ENV_ID\\\", serviceId:\\\"$PG_SVC\\\") }\"}" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['variables'].get('POSTGRES_PASSWORD',''))")

TS=$(date +%Y%m%d-%H%M%S)
OUT="data/backups/sleep-${TS}.sql"
MODE="${1:-full}"

EXTRA=()
[[ "$MODE" == "data" ]] && EXTRA+=(--data-only)

PGPASSWORD="$PG_PASSWORD" pg_dump \
  -h "$HOST" -p "$PORT" -U postgres -d sleep \
  --no-owner --no-acl "${EXTRA[@]}" > "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "✓ Saved $OUT ($SIZE)"
