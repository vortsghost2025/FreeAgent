#!/usr/bin/env bash
# Usage: TOTAL_PARAMS=1024 ./generate_ptx_sass.sh
set -euo pipefail

if [ -z "${TOTAL_PARAMS:-}" ]; then
    echo "❌ Set TOTAL_PARAMS env‑var before running"
    exit 1
fi

mkdir -p build_ptx && cd build_ptx
cmake .. -DTOTAL_PARAMS=$TOTAL_PARAMS -DKERNEL_PARAM_LIMIT=1024 > /dev/null

# PTX
nvcc ../src/main.cu -ptx -arch=compute_$(nvidia-smi --query-gpu=compute_cap --format=csv,noheader | head -n1 | tr -d '.') -o main.ptx

# SASS (requires a recent driver)
nvcc ../src/main.cu -cubin -arch=sm_$(nvidia-smi --query-gpu=compute_cap --format=csv,noheader | head -n1 | tr -d '.') -o main.cubin
nvdisasm main.cubin > main.sass

echo "✅ PTX → build_ptx/main.ptx"
echo "✅ SASS → build_ptx/main.sass"
