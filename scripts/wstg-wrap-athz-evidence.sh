#!/usr/bin/env bash
# Sources gitignored scripts/wstg-secrets.local.sh so npm run wstg:athz:evidence sees WSTG_ATHZ_PASSWORD.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ -f scripts/wstg-secrets.local.sh ]]; then
  set -a
  # shellcheck source=/dev/null
  source scripts/wstg-secrets.local.sh
  set +a
fi
export WSTG_ATHZ_EMAIL="${WSTG_ATHZ_EMAIL:-buyer1@dogquest.com}"
export WSTG_ATHZ_OTHER_USER_ID="${WSTG_ATHZ_OTHER_USER_ID:-29eb54e6-de51-4f66-a595-6f450f803a11}"
if [[ -z "${WSTG_ATHZ_PASSWORD:-}" ]]; then
  echo ""
  echo "WARN: WSTG_ATHZ_PASSWORD not set — ATHZ-04-profiles will SKIP."
  echo "  cp scripts/wstg-secrets.local.sh.example scripts/wstg-secrets.local.sh"
  echo "  Edit it: buyer1 password in single quotes for WSTG_ATHZ_PASSWORD (gitignored)."
  echo ""
fi
node scripts/wstg-athz-evidence-header.mjs
exec node --env-file=.env.local scripts/wstg-athz-verify.mjs
