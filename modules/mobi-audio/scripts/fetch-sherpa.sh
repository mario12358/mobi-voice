#!/usr/bin/env bash
# Downloads the official sherpa-onnx binaries (k2-fsa) for one platform and checks their SHA-256.
# Usage: fetch-sherpa.sh ios|android|kws <output-dir>
# kws: the "stop" keyword model (English GigaSpeech zipformer; Polish "stop" sounds the same), int8 encoder
# and joiner, renamed to fixed names the native code loads.
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
    # CocoaPods links a vendored xcframework by its directory name, which must match the framework inside.
    if [ ! -d "$out/SherpaOnnxC.xcframework" ]; then
      unzip -q -o "$out/sherpa-onnx.zip" -d "$out"
      mv "$out/sherpa-onnx.xcframework" "$out/SherpaOnnxC.xcframework"
    fi
    [ -d "$out/onnxruntime.xcframework" ] || unzip -q -o "$out/onnxruntime.zip" -d "$out"
    ;;
  android)
    fetch "https://github.com/k2-fsa/sherpa-onnx/releases/download/v${SHERPA_VERSION}/sherpa-onnx-${SHERPA_VERSION}.aar" \
      633c24321e06b1fe79feafa03ea16cbc0f8a286641e2da3559bac91bdb13bd96 "$out/sherpa-onnx.aar"
    if [ ! -f "$out/classes.jar" ]; then
      unzip -q -o "$out/sherpa-onnx.aar" classes.jar 'jni/*' -d "$out"
    fi
    ;;
  kws)
    if [ ! -f "$out/kws-tokens.txt" ]; then
      fetch "https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01.tar.bz2" \
        f170013b4716e41b62b9bfd809687c207cef798ef9bc6534d524e17af9b6561a "$out/kws.tar.bz2"
      model=sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01
      tar -xjf "$out/kws.tar.bz2" -C "$out" \
        "$model/encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx" \
        "$model/decoder-epoch-12-avg-2-chunk-16-left-64.onnx" \
        "$model/joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx" \
        "$model/tokens.txt"
      mv "$out/$model/encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx" "$out/kws-encoder.onnx"
      mv "$out/$model/decoder-epoch-12-avg-2-chunk-16-left-64.onnx" "$out/kws-decoder.onnx"
      mv "$out/$model/joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx" "$out/kws-joiner.onnx"
      mv "$out/$model/tokens.txt" "$out/kws-tokens.txt"
      rm -rf "$out/$model" "$out/kws.tar.bz2"
    fi
    ;;
  *)
    echo "Unknown platform: $platform" >&2
    exit 1
    ;;
esac
