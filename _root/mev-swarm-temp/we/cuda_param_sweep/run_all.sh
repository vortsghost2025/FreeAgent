#!/usr/bin/env bash
# run_all.sh – single entry point, fully accessible

set -euo pipefail

# -------------------------------------------------------------------------
# Helper: speak a short message (works on Linux/macOS with `spd-say` or `say`)
# -------------------------------------------------------------------------
speak() {
    if command -v spd-say &> /dev/null; then
        spd-say "$1"
    elif command -v say &> /dev/null; then
        say "$1"
    else
        echo "🔊 $1"
    fi
}

speak "Starting CUDA environment validation"
./validate_environment.sh

speak "Running the benchmark sweep – this may take a few minutes"
chmod +x *.sh
# Run low & high range parts in parallel (wrappers pick GPUs)
./run_sweep_part1.sh &
./run_sweep_part2.sh &
wait

speak "Running regression test"
./test_sweep.sh

speak "Generating analysis plot"
python3 analyze_sweep.py

speak "All done – check sweep_results.png and sweep_results.csv"
