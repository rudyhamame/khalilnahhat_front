#!/usr/bin/env bash
# Runs on the OVH server (piped in by the GitHub workflow): activates an uploaded build of the site and
# restores the previous index.html if the public site does not serve the new build. Old hashed assets are kept
# so tabs that are already open keep working.
set -euo pipefail
SHA=${1:?commit sha}
ROOT=/srv/rh/projects/khalil-front
NEW=$ROOT/ci-dist/$SHA
[ -f "$NEW/index.html" ] || { echo "missing upload $NEW"; exit 1; }
REL=$ROOT/releases/$(date -u +%Y%m%d-%H%M%S)-${SHA:0:8}
mkdir -p "$REL"; cp -p "$ROOT/dist/index.html" "$REL/previous-index.html"
rsync -a --exclude index.html "$NEW/" "$ROOT/dist/"
install -m 664 "$NEW/index.html" "$ROOT/dist/index.html"   # last, so the page never points at files that are not there yet
ASSET=$(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' "$NEW/index.html" | head -1)
for i in 1 2 3 4 5; do
  if curl -fsS -m 15 https://djkhalilnahhat.ca/ | grep -q "$ASSET"; then echo "deployed web $SHA ($ASSET)"; break; fi
  if [ "$i" = 5 ]; then echo "site does not serve $ASSET, restoring previous index.html"; install -m 664 "$REL/previous-index.html" "$ROOT/dist/index.html"; exit 1; fi
  sleep 3
done
ls -dt "$ROOT"/ci-dist/*/ | tail -n +4 | xargs -r rm -rf   # keep the last 3 uploads
