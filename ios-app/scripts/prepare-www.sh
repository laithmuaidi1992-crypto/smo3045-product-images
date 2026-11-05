#!/usr/bin/env bash
# Builds the Angular/Ionic app (../app-v2) into www/ for the iOS build.
# Product images are NOT bundled (34 MB): inside the app they load from https://3045orderapp.netlify.app/img/.
set -euo pipefail
cd "$(dirname "$0")/.."
( cd ../app-v2 && { [ -d node_modules ] || npm ci --no-audit --no-fund; } && npx ng build --base-href / )
rm -rf www && cp -R ../app-v2/dist/app-v2/browser www
echo "www ready: $(du -sh www | cut -f1)"
