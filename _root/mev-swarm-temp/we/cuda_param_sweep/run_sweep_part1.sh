#!/usr/bin/env bash
# Run the low-range part of the sweep on the first visible GPU
set -euo pipefail
export CUDA_VISIBLE_DEVICES=0
# pass a list of TOTAL_PARAMS values; adjust as needed
./run_sweep.sh 64 128 256 512
