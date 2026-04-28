#!/usr/bin/env bash
# Simple health check script for FreeAgent components (read‑only).
# This script performs basic checks and outputs status.

set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== FreeAgent Health Check ==="
echo "Timestamp: $(date -Iseconds)"
echo "Base dir: $BASE_DIR"

# Check for expected directories
echo ""
echo "--- Directory checks ---"
for d in agents core coordination docs; do
    if [ -d "$BASE_DIR/$d" ]; then
        echo "[OK] $d/ exists"
    else
        echo "[WARN] $d/ missing"
    fi
done

# Check that key files exist
echo ""
echo "--- File checks ---"
for f in README.md CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md; do
    if [ -f "$BASE_DIR/$f" ]; then
        echo "[OK] $f exists"
    else
        echo "[WARN] $f missing"
    fi
done

# Lightweight Python syntax check if Python is available
if command -v python3 >/dev/null 2>&1; then
    echo ""
    echo "--- Python syntax check (sample) ---"
    # Check a few representative files (if they exist) without side effects
    for pf in "agents/__init__.py" "agents/base_agent.py"; do
        if [ -f "$BASE_DIR/$pf" ]; then
            if python3 -m py_compile "$BASE_DIR/$pf" 2>/dev/null; then
                echo "[OK] $pf syntax OK"
            else
                echo "[ERROR] $pf syntax error"
            fi
        fi
    done
else
    echo ""
    echo "--- Python not found, skipping syntax check ---"
fi

# Check git status (untracked changes indication)
if [ -d "$BASE_DIR/.git" ]; then
    echo ""
    echo "--- Git status (short) ---"
    cd "$BASE_DIR" && git status --short 2>/dev/null | head -10 || true
fi

echo ""
echo "=== Health check complete ==="
echo "Note: This is a read‑only, non‑invasive check. It does not verify runtime services or enforcement."
exit 0
