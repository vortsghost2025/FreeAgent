#!/usr/bin/env bash
set -euo pipefail

# Wrapper: run existing sweep workflow, generate advice JSON, and one-shot publish via bridge
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

echo "Running original run_all.sh"
chmod +x run_all.sh
./run_all.sh

# generate advice JSON using existing helper
if command -v python3 &> /dev/null; then
  echo "Generating swarm advice JSON"
  python3 ../eval/generate_swarm_advice.py || echo "generate_swarm_advice failed"
else
  echo "python3 not available; skip advice generation"
fi

# publish via bridge (one-shot). Prefer updated bridge if present.
BRIDGE="../../gpu/ai-strategy-bridge-updated.js"
if [ ! -f "$BRIDGE" ]; then
  BRIDGE="../../gpu/ai-strategy-bridge.js"
fi
if command -v node &> /dev/null; then
  echo "Running bridge (one-shot) -> $BRIDGE"
  BRIDGE_ONESHOT=true node "$BRIDGE" || echo "bridge run failed"
else
  echo "node not available; skipping bridge publish"
fi

echo "Bridge update complete. Strategy pushed to orchestrator (if reachable)."
