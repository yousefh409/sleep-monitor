#!/usr/bin/env bash
# Saves the full DB (telemetry + nights + reports) to a timestamped JSON file
# under data/backups/. Uses the password-gated /api/export endpoint, so no
# Postgres exposure is needed — just the dashboard password.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p data/backups

URL="https://web-production-22ee.up.railway.app"
PASSWORD="${DASHBOARD_PASSWORD:-sleep}"
COOKIE=$(mktemp)
trap 'rm -f "$COOKIE"' EXIT

# 1. Login → save session cookie
curl -fsS -X POST "$URL/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$PASSWORD\"}" \
  -c "$COOKIE" -o /dev/null -m 10

# 2. Download full DB snapshot
TS=$(date +%Y%m%d-%H%M%S)
OUT="data/backups/sleep-backup-${TS}.json"
curl -fsS "$URL/api/export" -b "$COOKIE" -o "$OUT" -m 60

SIZE=$(du -h "$OUT" | cut -f1)
ROWS=$(python3 -c "import json; d=json.load(open('$OUT')); c=d['counts']; print(f\"telemetry={c['telemetry']} nights={c['nights']} reports={c['reports']}\")")
echo "✓ Saved $OUT ($SIZE) — $ROWS"
