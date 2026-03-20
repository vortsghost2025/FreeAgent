#!/usr/bin/env bash
# Validate required environment variables for MEV Swarm execution.
# Usage: ./scripts/validate-env.sh

required=(ETHEREUM_RPC_URL PRIVATE_KEY)
missing=()

for var in "${required[@]}"; do
  if [ -z "${!var}" ]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -ne 0 ]; then
  echo "[ERROR] Missing required environment variables:" >&2
  for var in "${missing[@]}"; do
    echo " - $var" >&2
  done
  echo "Use scripts/set-private-key-env.sh or set .env.local first." >&2
  exit 1
fi

echo "[OK] Required environment variables are set."
exit 0
