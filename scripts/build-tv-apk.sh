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
VERSION="$(sed -n 's/.*versionName = "\([^"]*\)".*/\1/p' app/build.gradle.kts | head -n 1)"
if [ -z "$VERSION" ]; then
  echo "无法从 app/build.gradle.kts 读取 versionName"
  exit 1
fi
NAME="iptv-client.v${VERSION}.apk"
rm -f "$ROOT/public"/iptv-client.v*.apk "$ROOT/public/iptv-tv.apk"
rm -f "$ROOT/release"/iptv-client.v*.apk "$ROOT/release"/IPTV终端-电视版.apk
cp -f "$APK" "$ROOT/release/$NAME"
cp -f "$APK" "$ROOT/public/$NAME"
echo "APK: $ROOT/release/$NAME"
echo "也可通过 http://127.0.0.1:43217/$NAME 下载"
