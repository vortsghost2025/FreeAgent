#!/usr/bin/env bash
# validate_environment.sh  portable system validation (Linux/macOS)

set -euo pipefail

echo "=== CUDA Environment Validation ==="

# 1️⃣ CUDA Toolkit ------------------------------------------------------------
if ! command -v nvcc &> /dev/null; then
    echo "❌ nvcc not found – install the CUDA Toolkit"
    exit 1
fi
echo "✓ CUDA Toolkit: $(nvcc --version | grep -i release | head -n1)"

# 2️⃣ GPU visibility ---------------------------------------------------------
if ! command -v nvidia-smi &> /dev/null; then
    echo "❌ nvidia-smi not found – NVIDIA driver may be missing"
    exit 1
fi
GPU_COUNT=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | wc -l | tr -d ' ')
if [ "$GPU_COUNT" -eq 0 ]; then
    echo "❌ No CUDA‑capable GPUs detected"
    exit 1
fi
echo "✓ GPUs detected: $GPU_COUNT"
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv

# 3️⃣ CMake version -----------------------------------------------------------
CMAKE_VER=$(cmake --version | head -n1 | grep -oE '[0-9]+\.[0-9]+')
if (( $(echo "$CMAKE_VER < 3.18" | bc -l) )); then
    echo "❌ CMake >= 3.18 required (found $CMAKE_VER)"
    exit 1
fi
echo "✓ CMake: $CMAKE_VER"

# 4️⃣ Python dependencies -----------------------------------------------------
if ! python3 -c "import pandas, matplotlib, seaborn" 2>/dev/null; then
    echo "⚠ Installing required Python packages..."
    python3 -m pip install --user pandas matplotlib seaborn
fi
echo "✓ Python environment ready"

echo "✅ All checks passed – ready to run ./run_all.sh"
