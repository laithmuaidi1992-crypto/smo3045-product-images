#!/usr/bin/env bash
# Builds the new app as a web preview served at /v2/ from the existing Netlify site.
set -euo pipefail
cd "$(dirname "$0")/.."
npx ng build --base-href /v2/
rm -rf ../orders-app/v2 && cp -r dist/app-v2/browser ../orders-app/v2
echo "built → orders-app/v2"
