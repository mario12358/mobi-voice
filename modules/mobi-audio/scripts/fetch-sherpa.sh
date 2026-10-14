#!/usr/bin/env bash
# Downloads the official sherpa-onnx binaries (k2-fsa) for one platform and checks their SHA-256.
# Usage: fetch-sherpa.sh ios|android <output-dir>
set -euo pipefail

SHERPA_VERSION=1.13.8
ORT_VERSION=1.28.2

platform=$1
out=$2
mkdir -p "$out"

fetch() {
  local url=$1 sha=$2 file=$3
  if [ -f "$file" ] && echo "$sha  $file" | shasum -a 256 -c - >/dev/null 2>&1; then
    return
  fi
  curl -fsSL --retry 3 -o "$file.download" "$url"
  echo "$sha  $file.download" | shasum -a 256 -c - >/dev/null || {
    echo "Checksum mismatch for $url" >&2
    rm -f "$file.download"
    exit 1
  }
  mv "$file.download" "$file"
}

case "$platform" in
  ios)
    fetch "https://github.com/k2-fsa/sherpa-onnx/releases/download/xcframework/sherpa-onnx-v${SHERPA_VERSION}-ios-static.xcframework.zip" \
      6b8e769cb153343270fdccbe92e3b3db0d1c421d67fa0989ab01fdf5b2fcf2de "$out/sherpa-onnx.zip"
    fetch "https://github.com/csukuangfj/onnxruntime-libs/releases/download/v${ORT_VERSION}/onnxruntime-ios-static-xcframework-${ORT_VERSION}.xcframework.zip" \
      2c2299acbb461d26d4bac4bc85985d40e7c7177ed6072703ae0846d88b0b4599 "$out/onnxruntime.zip"
    [ -d "$out/sherpa-onnx.xcframework" ] || unzip -q -o "$out/sherpa-onnx.zip" -d "$out"
    [ -d "$out/onnxruntime.xcframework" ] || unzip -q -o "$out/onnxruntime.zip" -d "$out"
    ;;
  android)
    fetch "https://github.com/k2-fsa/sherpa-onnx/releases/download/v${SHERPA_VERSION}/sherpa-onnx-${SHERPA_VERSION}.aar" \
      633c24321e06b1fe79feafa03ea16cbc0f8a286641e2da3559bac91bdb13bd96 "$out/sherpa-onnx.aar"
    if [ ! -f "$out/classes.jar" ]; then
      unzip -q -o "$out/sherpa-onnx.aar" classes.jar 'jni/*' -d "$out"
    fi
    ;;
  *)
    echo "Unknown platform: $platform" >&2
    exit 1
    ;;
esac
