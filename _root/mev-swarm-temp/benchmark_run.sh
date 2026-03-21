#!/usr/bin/env bash
# --------------------------------------------------------------
# benchmark_run.sh – one‑stop collector for a single source file
# --------------------------------------------------------------
set -euo pipefail

# ------------------- USER INPUT -------------------------------
SRC="${1:-kernel.cu}"          # source file to benchmark
ARCH="${2:-sm_80}"            # default target SM (override per file)
THREADS=(1 4 8 12 16)         # -t values to sweep
OUTBASE="${SRC%.cu}_report"   # base name for logs/artifacts
# --------------------------------------------------------------

# Create a folder for this source
mkdir -p "${OUTBASE}_logs"

# ---------- 1) Baseline build (default -Ofc) ----------
echo "=== Baseline build (default) ==="
/usr/bin/time -v -o "${OUTBASE}_logs/time_baseline.log" \
    nvcc -arch=${ARCH} "${SRC}" -o "${OUTBASE}_baseline" 2>/dev/null

# ---------- 2) Fast build (-Ofc 2) ----------
echo "=== Fast build (-Ofc 2) ==="
/usr/bin/time -v -o "${OUTBASE}_logs/time_fast.log" \
    nvcc -arch=${ARCH} -Ofc 2 "${SRC}" -o "${OUTBASE}_fast" 2>/dev/null

# ---------- 3) Parallelism sweep ----------
echo "=== Parallelism sweep ==="
for T in "${THREADS[@]}"; do
    LOG="${OUTBASE}_logs/time_t${T}.log"
    CSV="${OUTBASE}_logs/compile_times_t${T}.csv"
    echo "Running with -t ${T} ..."
    /usr/bin/time -v -o "${LOG}" \
        nvcc -arch=${ARCH} -t ${T} -time "${CSV}" "${SRC}" -o "${OUTBASE}_t${T}" 2>/dev/null
done

# ---------- 4) Optional device‑time‑trace ----------
# Uncomment if you want a .json trace for Chrome://tracing
# nvcc -arch=${ARCH} -fdevice-time-trace "${SRC}" -o "${OUTBASE}_trace"

echo "All artifacts are under ${OUTBASE}_logs/"
