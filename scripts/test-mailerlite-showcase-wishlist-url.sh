#!/usr/bin/env bash
# Trigger MailerLite automation "notify of showcase wishlist" with a real listing URL.
# Mirrors supabase/functions/_shared/notify-showcase-watchers.ts (PUT fields → leave group → rejoin).
#
# Prereqs: curl, python3
#
# Usage:
#   export MAILERLITE_API_KEY="your_connect_api_key"
#   ./scripts/test-mailerlite-showcase-wishlist-url.sh \
#     sp23-bse-077@cuilahore.edu.pk \
#     763c81bb-273b-4d31-aeb6-98805e800e6b
#
# Optional third argument — public site origin (no trailing slash). Emails must NOT use localhost.
#   ./scripts/test-mailerlite-showcase-wishlist-url.sh email@x.com <listing-uuid> https://dog-quest-may-2025.vercel.app
#
# Optional env:
#   SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID (default: 178467872657376265)
#   MAILERLITE_LISTING_URL_FIELD_KEY (default: listing_url)

set -euo pipefail

EMAIL="${1:?Usage: $0 <email> <listing-uuid> [public_base_url]}"
LISTING_UUID="${2:?}"
BASE_URL="${3:-${PUBLIC_SITE_URL:-https://dog-quest-may-2025.vercel.app}}"
BASE_URL="${BASE_URL%/}"

LISTING_URL="${BASE_URL}/listing/${LISTING_UUID}"
GROUP_ID="${SHOWCASE_WISHLIST_NOTIFICATION_GROUP_ID:-178467872657376265}"
FIELD_KEY="${MAILERLITE_LISTING_URL_FIELD_KEY:-listing_url}"
API="https://connect.mailerlite.com/api"

if [[ -z "${MAILERLITE_API_KEY:-}" ]]; then
  echo "Set MAILERLITE_API_KEY (MailerLite Connect API key)." >&2
  exit 1
fi

echo "Listing URL that will be sent in field '${FIELD_KEY}': ${LISTING_URL}"
echo "Group ID: ${GROUP_ID}"
echo ""

ENC_EMAIL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${EMAIL}'''))")

SUBSCRIBER_ID=""
RESP=$(curl -sS -H "Authorization: Bearer ${MAILERLITE_API_KEY}" \
  -H "Content-Type: application/json" \
  "${API}/subscribers?email=${ENC_EMAIL}") || true

SUBSCRIBER_ID=$(python3 -c "
import json, sys
try:
    d = json.loads(sys.argv[1])
    data = d.get('data') or []
    print(data[0]['id'] if data else '')
except Exception:
    print('')
" "${RESP}")

if [[ -n "${SUBSCRIBER_ID}" ]]; then
  echo "Subscriber exists (${SUBSCRIBER_ID}). PUT fields, then remove → re-add group…"

  PUT_BODY=$(python3 -c "
import json
print(json.dumps({'fields': { '${FIELD_KEY}': '''${LISTING_URL}''' }}))
")

  curl -sS -o /tmp/ml_put.json -w "PUT subscribers/:id → HTTP %{http_code}\n" \
    -X PUT \
    -H "Authorization: Bearer ${MAILERLITE_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "${PUT_BODY}" \
    "${API}/subscribers/${SUBSCRIBER_ID}" || true
  sleep 1

  curl -sS -o /tmp/ml_del_group.json -w "DELETE group → HTTP %{http_code}\n" \
    -X DELETE \
    -H "Authorization: Bearer ${MAILERLITE_API_KEY}" \
    -H "Content-Type: application/json" \
    "${API}/subscribers/${SUBSCRIBER_ID}/groups/${GROUP_ID}" || true
  sleep 1
else
  echo "New subscriber (no prior id). POST will create + set fields + join group…"
fi

POST_BODY=$(python3 -c "
import json
print(json.dumps({
  'email': '''${EMAIL}'''.lower().strip(),
  'fields': { '${FIELD_KEY}': '''${LISTING_URL}''' },
  'groups': ['''${GROUP_ID}''']
}))
")

curl -sS -o /tmp/ml_post.json -w "POST subscribers (upsert) → HTTP %{http_code}\n" \
  -X POST \
  -H "Authorization: Bearer ${MAILERLITE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${POST_BODY}" \
  "${API}/subscribers"

echo ""
echo "Done. Check ${EMAIL} inbox and MailerLite subscriber profile field '${FIELD_KEY}'."
echo "If HTTP codes are not 200/201, see: /tmp/ml_put.json /tmp/ml_del_group.json /tmp/ml_post.json"
