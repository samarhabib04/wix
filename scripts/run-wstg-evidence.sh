#!/usr/bin/env bash
# Runs both WSTG evidence suites from THIS repo on disk (no placeholders).
set -euo pipefail

ROOT="/Users/husnainali/Documents/daimboo-labs/Dog-quest-nextDev"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "ERROR: missing $ROOT/.env.local (needs NEXT_PUBLIC_SUPABASE_URL + anon key)"
  exit 1
fi

# Optional: load passwords from gitignored file (create from wstg-secrets.local.sh.example)
if [[ -f scripts/wstg-secrets.local.sh ]]; then
  # shellcheck source=/dev/null
  source scripts/wstg-secrets.local.sh
fi

# Real test identities from your pentest matrix (emails + buyer2 UUID — not secret)
export WSTG_IDNT_TEST_EMAIL="${WSTG_IDNT_TEST_EMAIL:-buyer1@dogquest.com}"
export WSTG_ATHZ_EMAIL="${WSTG_ATHZ_EMAIL:-buyer1@dogquest.com}"
export WSTG_ATHZ_OTHER_USER_ID="${WSTG_ATHZ_OTHER_USER_ID:-29eb54e6-de51-4f66-a595-6f450f803a11}"

if [[ -z "${WSTG_IDNT_TEST_WRONG_PASSWORD:-}" ]]; then
  echo "WARN: WSTG_IDNT_TEST_WRONG_PASSWORD not set — IDNT-04-known-wrong will SKIP."
  echo "      Create scripts/wstg-secrets.local.sh from scripts/wstg-secrets.local.sh.example"
fi
if [[ -z "${WSTG_ATHZ_PASSWORD:-}" ]]; then
  echo "WARN: WSTG_ATHZ_PASSWORD not set — ATHZ-04-profiles will SKIP."
  echo "      Put buyer1 password in scripts/wstg-secrets.local.sh"
fi

echo ""
echo ">>> Repo: $ROOT"
echo ""

npm run wstg:idnt:evidence
echo ""
npm run wstg:athz:evidence
