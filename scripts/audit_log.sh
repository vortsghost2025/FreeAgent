# Read‑only audit log helper
# Collects non‑invasive logs and status for review.

#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$BASE_DIR/audit_logs"
mkdir -p "$OUT_DIR"

TIMESTAMP=$(date +%Y%m%dT%H%M%S)
REPORT="$OUT_DIR/audit_${TIMESTAMP}.txt"

{
    echo "=== FreeAgent Audit Log ==="
    echo "Timestamp: $(date -Iseconds)"
    echo "Base dir: $BASE_DIR"
    echo ""
    echo "--- Git log (recent) ---"
    cd "$BASE_DIR" && git log --oneline -10 2>/dev/null || echo "Git log unavailable"
    echo ""
    echo "--- Git status ---"
    cd "$BASE_DIR" && git status 2>/dev/null || echo "Git status unavailable"
    echo ""
    echo "--- Recent commit diff (stat) ---"
    cd "$BASE_DIR" && git diff HEAD~1..HEAD --stat 2>/dev/null || echo "Diff unavailable"
    echo ""
    echo "--- Key files presence ---"
    for f in README.md CONTRIBUTING.md SECURITY.md FREEAGENT_ENFORCEMENT_REALITY_REGISTER.md FREEAGENT_TOPOLOGY_REPORT_FOR_LIBRARY.md; do
        if [ -f "$BASE_DIR/$f" ]; then
            echo "[PRESENT] $f"
        else
            echo "[MISSING] $f"
        fi
    done
    echo ""
    echo "--- List of .md docs (top-level) ---"
    find "$BASE_DIR" -maxdepth 1 -name '*.md' -type f | sort
    echo ""
    echo "--- Environment (safe subset) ---"
    env | grep -E '^(PATH|USER|HOME|PWD|SHELL|LANG)' || true
} > "$REPORT" 2>&1

echo "Audit log written to: $REPORT"
echo "Note: This script is read‑only and does not modify runtime state."
