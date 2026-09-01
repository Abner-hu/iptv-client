#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
export PATH="$JAVA_HOME/bin:$PATH"

if [ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "Android SDK 不在 $ANDROID_HOME，请先安装 commandlinetools。"
  exit 1
fi

printf 'sdk.dir=%s\n' "$ANDROID_HOME" > "$ROOT/android-tv/local.properties"
mkdir -p "$ROOT/release" "$ROOT/public"
cd "$ROOT/android-tv"
./gradlew assembleRelease --no-daemon
APK="$(find app/build/outputs/apk/release -name '*.apk' | head -n 1)"
cp -f "$APK" "$ROOT/release/IPTV终端-电视版.apk"
cp -f "$APK" "$ROOT/public/iptv-tv.apk"
echo "APK: $ROOT/release/IPTV终端-电视版.apk"
echo "也可通过 http://127.0.0.1:43217/iptv-tv.apk 下载"
