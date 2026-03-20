#!/usr/bin/env bash
# Run the high-range part of the sweep on the second visible GPU
set -euo pipefail
export CUDA_VISIBLE_DEVICES=1
# pass a list of TOTAL_PARAMS values; adjust as needed
./run_sweep.sh 1024 2048 4096 8192
