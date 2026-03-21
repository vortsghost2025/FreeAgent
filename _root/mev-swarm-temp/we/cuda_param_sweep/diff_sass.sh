#!/usr/bin/env bash
set -euo pipefail

# Compare build_ptx/main.sass against baseline/main.sass
HERE=$(cd "$(dirname "$0")" && pwd)
BUILD_DIR="$HERE/build_ptx"
BASELINE_DIR="$HERE/baseline"
CUR="$BUILD_DIR/main.sass"
BASE="$BASELINE_DIR/main.sass"

if [ ! -f "$CUR" ]; then
    echo "No current SASS ($CUR) - skipping"
    exit 0
fi

mkdir -p "$BASELINE_DIR"

if [ ! -f "$BASE" ]; then
    cp "$CUR" "$BASE"
    echo "Baseline created at $BASE"
    exit 0
fi

mkdir -p "$BUILD_DIR"

diff -u "$BASE" "$CUR" > "$BUILD_DIR/sass.diff" || true

if [ -s "$BUILD_DIR/sass.diff" ]; then
    echo "SASS diff saved: $BUILD_DIR/sass.diff"
    cat "$BUILD_DIR/sass.diff"
else
    echo "No SASS diff"
fi

exit 0
