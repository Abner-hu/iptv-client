#!/usr/bin/env bash
# Build a standalone Windows x64 portable EXE (Next.js server + Electron shell).
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
  rsync -a --exclude 'iptv-client.v*.apk' --exclude 'IPTV-Client-*.exe' public/ "$STANDALONE/public/"
else
  cp -a public/. "$STANDALONE/public/"
  rm -f "$STANDALONE/public"/iptv-client.v*.apk "$STANDALONE/public"/IPTV-Client-*.exe
fi
cp -a .next/static/. "$STANDALONE/.next/static/"

export CSC_IDENTITY_AUTO_DISCOVERY=false
export WIN_CSC_LINK=""

echo "Packing Windows x64 app directory…"
npx electron-builder --win dir --x64
if [[ ! -f "release/win-unpacked/IPTV Client.exe" ]]; then
  echo "electron-builder did not produce release/win-unpacked/IPTV Client.exe" >&2
  exit 1
fi
if [[ ! -d release/win-unpacked/resources/standalone/node_modules/next ]]; then
  echo "standalone node_modules/next missing from the Windows package" >&2
  exit 1
fi

VERSION="$(node -p "require('./package.json').version")"
EXE_NAME="IPTV-Client-${VERSION}-portable.exe"
ZIP_NAME="IPTV-Client-${VERSION}-win-x64.zip"
LAUNCHER="/tmp/iptv-win-launcher.exe"
PAYLOAD="/tmp/iptv-win-payload.zip"

if ! command -v x86_64-w64-mingw32-gcc >/dev/null; then
  echo "x86_64-w64-mingw32-gcc is required to stamp a 64-bit EXE stub" >&2
  exit 1
fi
x86_64-w64-mingw32-gcc -O2 -s -municode -mwindows electron/win-launcher.c -o "$LAUNCHER" -lshell32 -lole32

echo "Compressing unpacked app…"
rm -f "$PAYLOAD" "release/$ZIP_NAME" "release/$EXE_NAME"
(
  cd release/win-unpacked
  7z a -tzip -mx=7 "$PAYLOAD" . -x!elevate.exe
)
cp -f "$PAYLOAD" "release/$ZIP_NAME"

python3 - <<PY
from pathlib import Path
import struct
launcher = Path("$LAUNCHER").read_bytes()
payload = Path("$PAYLOAD").read_bytes()
out = launcher + payload + struct.pack("<Q", len(payload)) + b"IPTVZIP1"
dest = Path("release/$EXE_NAME")
dest.write_bytes(out)
print(f"wrote {dest} ({dest.stat().st_size} bytes)")
PY

echo "EXE: $ROOT/release/$EXE_NAME"
echo "ZIP: $ROOT/release/$ZIP_NAME"
echo "GitHub Release: https://github.com/Abner-hu/iptv-client/releases/latest/download/$EXE_NAME"
ls -lh "release/$EXE_NAME" "release/$ZIP_NAME"
