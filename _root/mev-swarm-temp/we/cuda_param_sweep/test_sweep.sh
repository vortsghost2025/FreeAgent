#!/usr/bin/env bash
# test_sweep.sh  builds a known‑good configuration and checks the checksum

set -euo pipefail

# Build with a modest size that fits comfortably in both strategies
rm -rf build && mkdir build && cd build
cmake .. -DTOTAL_PARAMS=1024 -DKERNEL_PARAM_LIMIT=1024 > /dev/null
make -j > /dev/null

# Run once and capture the checksum column (4th field)
OUTPUT=$(./param_sweep)
CHECKSUM=$(echo "$OUTPUT" | cut -d, -f4)

# Expected checksum for the deterministic pattern (0‑255 repeated)
# Compute it in Python for safety
EXPECTED=$(python3 - <<'PY'
TOTAL=1024
s=0
for i in range(TOTAL):
    s+= i & 0xFF
print(s)
PY
)

if [ "$CHECKSUM" -eq "$EXPECTED" ]; then
    echo "✅ Regression test passed (checksum $CHECKSUM)"
else
    echo "⚠ Regression test failed – got $CHECKSUM, expected $EXPECTED"
    exit 1
fi

cd ..
rm -rf build
