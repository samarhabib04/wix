#!/usr/bin/env bash
# Sources gitignored scripts/wstg-secrets.local.sh so npm run wstg:idnt:evidence sees IDNT env vars.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ -f scripts/wstg-secrets.local.sh ]]; then
  set -a
  # shellcheck source=/dev/null
  source scripts/wstg-secrets.local.sh
  set +a
fi
export WSTG_IDNT_TEST_EMAIL="${WSTG_IDNT_TEST_EMAIL:-buyer1@dogquest.com}"
node scripts/wstg-idnt-evidence-header.mjs
exec node --env-file=.env.local scripts/wstg-idnt-verify.mjs
