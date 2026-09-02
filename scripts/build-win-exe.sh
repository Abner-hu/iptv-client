#!/usr/bin/env bash
# Build a standalone Windows portable EXE (Next.js server + Electron shell).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d node_modules ]]; then
  npm install
fi

python3 - <<'PY'
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location("genicons", Path("scripts/generate-icons.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
dest = Path("electron/icon.ico")
dest.parent.mkdir(parents=True, exist_ok=True)
mod.launcher(256).save(
    dest,
    format="ICO",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
print(f"wrote {dest}")
PY

echo "Building Next.js standalone…"
npm run build

STANDALONE=".next/standalone"
if [[ ! -f "$STANDALONE/server.js" ]]; then
  echo "next build did not produce .next/standalone/server.js" >&2
  exit 1
fi

rm -rf "$STANDALONE/public"
mkdir -p "$STANDALONE/public" "$STANDALONE/.next/static"
if command -v rsync >/dev/null; then
  rsync -a --exclude 'iptv-client.v*.apk' public/ "$STANDALONE/public/"
else
  cp -a public/. "$STANDALONE/public/"
  rm -f "$STANDALONE/public"/iptv-client.v*.apk
fi
cp -a .next/static/. "$STANDALONE/.next/static/"

export CSC_IDENTITY_AUTO_DISCOVERY=false
# Avoid hanging on optional Windows code signing.
export WIN_CSC_LINK=""

echo "Packing Windows portable EXE…"
if npx electron-builder --win portable --x64; then
  echo "Windows portable EXE is in release/"
  ls -lh release/*.exe 2>/dev/null || true
  exit 0
fi

echo "portable target failed (often needs Wine on Linux). Falling back to zip…"
npx electron-builder --win zip --x64
echo "Windows zip is in release/. Unpack on Windows and run IPTV Client.exe"
ls -lh release/*.zip 2>/dev/null || true
