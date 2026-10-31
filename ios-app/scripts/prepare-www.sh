#!/usr/bin/env bash
# Copies the customer app from ../orders-app into www/ for the iOS build.
# Product images are NOT bundled (34 MB): inside the app they load from https://3045orderapp.netlify.app/img/.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=../orders-app
rm -rf www && mkdir -p www
cp "$SRC/index.html" "$SRC/privacy.html" "$SRC/manifest.webmanifest" www/
cp "$SRC"/icon-*.png www/
cp -R "$SRC/vendor" www/vendor
# Capacitor runtime (gives window.Capacitor.registerPlugin to the plain-JS app)
cp node_modules/@capacitor/core/dist/capacitor.js www/capacitor.js
# load it before the app's own script
python3 - <<'PY'
p = 'www/index.html'
s = open(p, encoding='utf-8').read()
tag = '<script src="capacitor.js"></script>'
if tag not in s:
    s = s.replace('<head>', '<head>\n' + tag, 1)
open(p, 'w', encoding='utf-8').write(s)
PY
echo "www ready: $(du -sh www | cut -f1)"
